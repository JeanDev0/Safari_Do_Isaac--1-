import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { parseArgs } from 'node:util';
import { carregarDados, validarPresenca } from './src/convite.js';
import { configurarEmail } from './src/email.js';

// 1. Configuração e arquivos públicos
const convite = await carregarDados();
const email = configurarEmail(process.env);
const { values: opcoes } = parseArgs({
  options: {
    host: { type: 'string', default: '0.0.0.0' },
    port: { type: 'string', default: process.env.PORT || '3000' }
  },
  strict: false
});
const porta = Number(opcoes.port);

const publicos = new Map([
  ['/', ['index.html', 'text/html; charset=utf-8']],
  ['/index.html', ['index.html', 'text/html; charset=utf-8']],
  ['/css/estilos.css', ['css/estilos.css', 'text/css; charset=utf-8']],
  ['/css/animais.css', ['css/animais.css', 'text/css; charset=utf-8']],
  ['/js/principal.js', ['js/principal.js', 'text/javascript; charset=utf-8']],
  ...[
    'copa-safari', 'copa-safari-mobile', 'macaco-esquerdo', 'macaco-direito', 'safari-baby'
  ].map(nome => [`/assets/${nome}.webp`, [`assets/${nome}.webp`, 'image/webp']])
]);

// 2. Rotas do convite e da confirmação
const servidor = createServer(async (req, res) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Robots-Tag', 'noindex, nofollow');

  try {
    const rota = new URL(req.url, 'http://localhost').pathname;

    if (req.method === 'GET' && rota === '/api/convite') {
      return json(res, 200, { ...convite, demonstracao: email.demonstracao });
    }

    if (req.method === 'POST' && rota === '/api/confirmacoes') {
      return await confirmar(req, res);
    }

    if (req.method === 'GET' || req.method === 'HEAD') {
      const arquivo = publicos.get(rota);
      if (arquivo) {
        const [nome, tipo] = arquivo;
        const conteudo = await readFile(new URL(`./public/${nome}`, import.meta.url));
        res.setHeader('Content-Type', tipo);
        return res.end(req.method === 'HEAD' ? undefined : conteudo);
      }
    }

    return json(res, 404, { mensagem: 'Página não encontrada.' });
  } catch (erro) {
    console.error(erro.message);
    return json(res, 500, { mensagem: 'Não foi possível atender a solicitação.' });
  }
});

async function confirmar(req, res) {
  if (req.headers['content-type']?.split(';')[0].trim() !== 'application/json') {
    return json(res, 415, { mensagem: 'Formato de envio inválido.' });
  }

  let dados;
  try {
    dados = await lerCorpo(req);
  } catch (erro) {
    return json(res, erro.status ?? 400, { mensagem: 'Não foi possível ler a seleção.' });
  }

  const presenca = validarPresenca(dados, convite.familias);
  if (!presenca) {
    return json(res, 400, { mensagem: 'Selecione um convite e marque as pessoas da lista que vão à festa.' });
  }

  try {
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

function json(res, status, dados) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(dados));
}

servidor.listen(porta, opcoes.host, () => {
  console.log(`Safári do Isaac em http://localhost:${servidor.address().port} (${email.demonstracao ? 'demonstração' : 'envio de e-mail ativo'})`);
});
