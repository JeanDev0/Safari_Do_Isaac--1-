import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { parseArgs } from 'node:util';
import { confirmarPresenca, consultarConvite, emDemonstracao, json } from './src/rsvp.js';

// 1. Configuração e arquivos públicos
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

    if (rota === '/api/convite') {
      return await consultarConvite(req, res);
    }

    if (rota === '/api/confirmacoes') {
      return await confirmarPresenca(req, res);
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

servidor.listen(porta, opcoes.host, () => {
  console.log(`Safári do Isaac em http://localhost:${servidor.address().port} (${emDemonstracao() ? 'demonstração' : 'envio de e-mail ativo'})`);
});
