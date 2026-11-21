import { carregarDados, validarPresenca } from './convite.js';
import { configurarEmail } from './email.js';

let dadosCarregados;
let emailConfigurado;

function dadosConvite() {
  dadosCarregados ??= carregarDados().catch(erro => {
    dadosCarregados = undefined;
    throw erro;
  });
  return dadosCarregados;
}

export function emDemonstracao() {
  return (process.env.RSVP_MODE || 'demonstracao') === 'demonstracao';
}

function obterEmail() {
  emailConfigurado ??= configurarEmail(process.env);
  return emailConfigurado;
}

export async function consultarConvite(req, res) {
  if (req.method !== 'GET') return metodoInvalido(res, 'GET');

  try {
    const convite = await dadosConvite();
    return json(res, 200, { ...convite, demonstracao: emDemonstracao() });
  } catch (erro) {
    console.error(erro.message);
    return json(res, 500, { mensagem: 'A lista de convidados está indisponível.' });
  }
}

function metodoInvalido(res, metodo) {
  res.setHeader('Allow', metodo);
  return json(res, 405, { mensagem: 'Método não permitido.' });
}

export async function confirmarPresenca(req, res) {
  if (req.method !== 'POST') return metodoInvalido(res, 'POST');
  if (req.headers['content-type']?.split(';')[0].trim() !== 'application/json') {
    return json(res, 415, { mensagem: 'Formato de envio inválido.' });
  }

  let dados;
  try {
    dados = await lerCorpo(req);
  } catch (erro) {
    return json(res, erro.status ?? 400, { mensagem: 'Não foi possível ler a seleção.' });
  }

  let convite;
  try {
    convite = await dadosConvite();
  } catch (erro) {
    console.error(erro.message);
    return json(res, 500, { mensagem: 'A lista de convidados está indisponível.' });
  }

  const presenca = validarPresenca(dados, convite.familias);
  if (!presenca) {
    return json(res, 400, { mensagem: 'Selecione um convite e marque as pessoas da lista que vão à festa.' });
  }

  let email;
  try {
    email = obterEmail();
    await email.enviar(presenca);
  } catch (erro) {
    console.error(erro.message);
    return json(res, 502, { mensagem: 'Não foi possível enviar a confirmação. Tente novamente em instantes.' });
  }

  return json(res, 200, {
    confirmados: presenca.confirmados,
    demonstracao: email.demonstracao
  });
}

// 3. Leitura e resposta HTTP
async function lerCorpo(req) {
  const partes = [];
  let tamanho = 0;
  for await (const parte of req.iterator({ destroyOnReturn: false })) {
    tamanho += parte.length;
    if (tamanho > 16_384) {
      req.resume();
      throw Object.assign(new Error('Corpo muito grande'), { status: 413 });
    }
    partes.push(parte);
  }
  return JSON.parse(Buffer.concat(partes).toString('utf8'));
}

export function json(res, status, dados) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(dados));
}
