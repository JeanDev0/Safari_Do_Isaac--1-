// 1. Elementos da página e estado do formulário

const formulario = document.querySelector('#formulario');
const familias = document.querySelector('#familia');
const grupo = document.querySelector('#grupo');
const pessoas = document.querySelector('#pessoas');
const enviar = document.querySelector('#enviar');
const status = document.querySelector('#status');

let enviando = false;
let confirmado = false;
let tentativa = null;

// 2. Abertura com movimento ligado à rolagem

const abertura = document.querySelector('.abertura');
const movimentoReduzido = matchMedia('(prefers-reduced-motion: reduce)');
let frame = 0;

function atualizarAbertura() {
  if (frame || movimentoReduzido.matches) return;

  frame = requestAnimationFrame(() => {
    const percurso = Math.max(1, abertura.offsetHeight * 0.55);
    const progresso = Math.max(0, Math.min(1, -abertura.getBoundingClientRect().top / percurso));
    abertura.style.setProperty('--progresso', progresso);
    frame = 0;
  });
}

addEventListener('scroll', atualizarAbertura, { passive: true });
addEventListener('resize', atualizarAbertura);
atualizarAbertura();

// 3. Carregamento da festa, famílias e caixas de seleção

function mostrarStatus(mensagem, erro = false) {
  status.textContent = mensagem;
  status.dataset.erro = String(erro);
  status.hidden = !mensagem;
}

function atualizarFormulario() {
  familias.disabled = enviando;
  grupo.disabled = enviando;
  enviar.disabled = enviando || confirmado || !pessoas.querySelector('input:checked');
  enviar.textContent = enviando ? 'Enviando…' : confirmado ? 'Presença confirmada' : 'Confirmar presença';
}

async function carregarConvite() {
  try {
    const resposta = await fetch('/api/convite');
    if (!resposta.ok) throw new Error();
    const convite = await resposta.json();

    const detalhes = document.querySelector('#detalhes-festa');
    for (const informacao of [convite.festa.data, convite.festa.hora, convite.festa.local]) {
      if (!informacao) continue;
      const item = document.createElement('li');
      item.textContent = informacao;
      detalhes.append(item);
    }
    detalhes.hidden = detalhes.childElementCount === 0;
    const dataDestaque = document.querySelector('#data-destaque');
    dataDestaque.textContent = [convite.festa.data, convite.festa.hora].filter(Boolean).join(' às ');
    dataDestaque.hidden = !dataDestaque.textContent;
    mostrarLocal(convite.festa);

    document.querySelector('#modo-demo').hidden = !convite.demonstracao;
    familias.replaceChildren(new Option('Selecione um nome', ''));
    const ordenadas = convite.familias.sort((a, b) => a.responsavel.localeCompare(b.responsavel, 'pt-BR'));

    for (const familia of ordenadas) {
      familias.add(new Option(familia.responsavel, familia.id));
    }

    familias.disabled = false;

    familias.addEventListener('change', () => {
      pessoas.replaceChildren();
      const familia = ordenadas.find(item => item.id === familias.value);

      for (const pessoa of familia?.pessoas ?? []) {
        const rotulo = document.createElement('label');
        const caixa = document.createElement('input');
        const nome = document.createElement('span');
        caixa.type = 'checkbox';
        caixa.name = 'pessoa';
        caixa.value = pessoa.id;
        nome.textContent = pessoa.nome;
        rotulo.append(caixa, nome);
        pessoas.append(rotulo);
      }

      grupo.hidden = !familia;
      revisarSelecao();
    });
  } catch {
    familias.replaceChildren(new Option('Lista indisponível', ''));
    mostrarStatus('Não conseguimos carregar a lista. Atualize a página e tente novamente.', true);
  }
}

function mostrarLocal({ local, endereco, cidade }) {
  if (!local || !endereco) return;

  const destino = [endereco, cidade].filter(Boolean).join(', ');
  const mapa = new URL('https://www.google.com/maps');
  mapa.search = new URLSearchParams({ q: destino, z: '16', hl: 'pt-BR', output: 'embed' });
  const rota = new URL('https://www.google.com/maps/dir/');
  rota.search = new URLSearchParams({ api: '1', destination: destino });

  document.querySelector('#titulo-local').textContent = local;
  document.querySelector('#endereco-festa').textContent = destino;
  document.querySelector('#rota-festa').href = rota;
  document.querySelector('#mapa-festa').src = mapa;
  document.querySelector('#local').hidden = false;
}

function revisarSelecao() {
  tentativa = null;
  confirmado = false;
  mostrarStatus('');
  atualizarFormulario();
}

pessoas.addEventListener('change', revisarSelecao);
carregarConvite();

// 4. Envio dos identificadores selecionados

formulario.addEventListener('submit', async evento => {
  evento.preventDefault();
  if (enviando || confirmado || !familias.value) return;

  const selecionados = new FormData(formulario).getAll('pessoa');
  if (selecionados.length === 0) return;

  // Reutiliza o identificador se a mesma seleção precisar de uma nova tentativa.
  tentativa ??= crypto.randomUUID();
  enviando = true;
  mostrarStatus('');
  atualizarFormulario();

  try {
    const resposta = await fetch('/api/confirmacoes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        familiaId: familias.value,
        pessoaIds: selecionados,
        tentativaId: tentativa
      })
    });
    const resultado = await resposta.json().catch(() => ({}));

    if (!resposta.ok) {
      mostrarStatus(resultado.mensagem || 'O envio falhou. Confira a seleção e tente novamente.', true);
      return;
    }

    confirmado = true;
    const nomes = resultado.confirmados.join(', ');
    const mensagem = resultado.demonstracao ? 'Confirmação simulada' : 'Presença confirmada';
    mostrarStatus(`${mensagem} — ${nomes}.`);
  } catch {
    mostrarStatus('Não foi possível concluir o envio. Tente novamente.', true);
  } finally {
    enviando = false;
    atualizarFormulario();
  }
});
