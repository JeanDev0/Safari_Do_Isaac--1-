import nodemailer from 'nodemailer';

// Credenciais e endereços de envio ficam no servidor.
export function configurarEmail(env) {
  const modo = env.RSVP_MODE || 'demonstracao';
  if (modo !== 'email' && modo !== 'demonstracao') {
    throw new Error('RSVP_MODE precisa ser demonstracao ou email.');
  }

  if (modo === 'demonstracao') {
    return { demonstracao: true, enviar: async () => {} };
  }

  const provedor = env.EMAIL_PROVIDER?.trim() || 'resend';
  if (provedor === 'gmail') return configurarGmail(env);
  if (provedor === 'resend') return configurarResend(env);
  throw new Error('EMAIL_PROVIDER precisa ser gmail ou resend.');
}

function montarMensagem({ responsavel, confirmados }) {
  return {
    subject: `Safári do Isaac | ${responsavel} confirmou presença`,
    text: [
      'Nova confirmação de presença no aniversário do Isaac!',
      '',
      `Nome principal do convite: ${responsavel}`,
      `Total confirmado: ${confirmados.length}`,
      '',
      'Quem vai à festa:',
      ...confirmados.map(nome => `- ${nome}`)
    ].join('\n')
  };
}

function configurarGmail(env) {
  const usuario = env.GMAIL_USER?.trim();
  const senha = env.GMAIL_APP_PASSWORD?.replace(/\s+/g, '');
  const destinatario = env.EMAIL_TO?.trim() || usuario;
  if (!usuario || !senha) {
    throw new Error('Preencha GMAIL_USER e GMAIL_APP_PASSWORD para ativar o envio pelo Gmail.');
  }

  const transporte = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: usuario, pass: senha },
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 15_000
  });

  const tentativas = new Map();

  return {
    demonstracao: false,
    async enviar(presenca) {
      const { tentativaId } = presenca;
      // Uma repetição da mesma tentativa reutiliza o envio durante esta sessão.
      if (tentativas.has(tentativaId)) return tentativas.get(tentativaId);

      const envio = transporte.sendMail({
        from: { name: 'Safári do Isaac', address: usuario },
        to: destinatario,
        ...montarMensagem(presenca)
      }).then(resultado => {
        if (resultado.accepted.length === 0) throw new Error('O Gmail recusou o destinatário.');
        setTimeout(() => tentativas.delete(tentativaId), 10 * 60_000).unref();
      }).catch(erro => {
        tentativas.delete(tentativaId);
        throw erro;
      });

      tentativas.set(tentativaId, envio);
      return envio;
    }
  };
}

function configurarResend(env) {
  const chave = env.RESEND_API_KEY?.trim();
  const remetente = env.EMAIL_FROM?.trim();
  const destinatario = env.EMAIL_TO?.trim();
  if (!chave || !remetente || !destinatario) {
    throw new Error('Preencha RESEND_API_KEY, EMAIL_FROM e EMAIL_TO para ativar o envio.');
  }

  return {
    demonstracao: false,
    async enviar(presenca) {
      const resposta = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        signal: AbortSignal.timeout(9000),
        headers: {
          Authorization: `Bearer ${chave}`,
          'Content-Type': 'application/json',
          'Idempotency-Key': `rsvp-isaac/${presenca.tentativaId}`
        },
        body: JSON.stringify({
          from: remetente,
          to: [destinatario],
          ...montarMensagem(presenca)
        })
      });

      const resultado = await resposta.json().catch(() => ({}));
      if (!resposta.ok || typeof resultado.id !== 'string') {
        throw new Error(`O Resend não confirmou o envio (HTTP ${resposta.status}).`);
      }
    }
  };
}
