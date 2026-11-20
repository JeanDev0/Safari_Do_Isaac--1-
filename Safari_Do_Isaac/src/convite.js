import { readFile } from 'node:fs/promises';

// Os arquivos ficam no servidor. O navegador recebe apenas os campos da lista.
export async function carregarDados() {
  const [festa, familias] = await Promise.all([
    lerJson('../data/festa.json'),
    lerJson('../data/convidados.json')
  ]);

  if (!festa || ['data', 'hora', 'local'].some(campo => typeof festa[campo] !== 'string')) {
    throw new Error('Confira os campos data, hora e local em data/festa.json.');
  }
  if (['endereco', 'cidade'].some(campo => festa[campo] !== undefined && typeof festa[campo] !== 'string')) {
    throw new Error('Preencha endereço e cidade como texto em data/festa.json.');
  }

  if (!Array.isArray(familias) || familias.length === 0) {
    throw new Error('Cadastre pelo menos uma família em data/convidados.json.');
  }

  const ids = new Set();
  for (const familia of familias) {
    if (!textoValido(familia?.id) || !textoValido(familia.responsavel) ||
        !Array.isArray(familia.pessoas) || familia.pessoas.length === 0 || ids.has(familia.id)) {
      throw new Error('Confira o id, o responsável e a lista de pessoas de cada família.');
    }

    ids.add(familia.id);
    const pessoasValidas = familia.pessoas.every(pessoa => textoValido(pessoa?.id) && textoValido(pessoa.nome));
    if (!pessoasValidas || new Set(familia.pessoas.map(pessoa => pessoa.id)).size !== familia.pessoas.length) {
      throw new Error(`Confira os nomes e IDs únicos das pessoas no grupo "${familia.responsavel}".`);
    }
  }

  return {
    festa,
    familias: familias.map(({ id, responsavel, pessoas }) => ({
      id,
      responsavel,
      pessoas: pessoas.map(({ id, nome }) => ({ id, nome }))
    }))
  };
}

async function lerJson(caminho) {
  try {
    return JSON.parse(await readFile(new URL(caminho, import.meta.url), 'utf8'));
  } catch {
    throw new Error(`Não foi possível ler ${caminho.replace('../', '')}. Confira a sintaxe do JSON.`);
  }
}

function textoValido(valor) {
  return typeof valor === 'string' && valor.trim().length > 0;
}

export function validarPresenca(dados, familias) {
  const { familiaId, pessoaIds, tentativaId } = dados ?? {};
  const familia = familias.find(item => item.id === familiaId);

  if (!familia || !Array.isArray(pessoaIds) || pessoaIds.length < 1 ||
      pessoaIds.length > familia.pessoas.length || new Set(pessoaIds).size !== pessoaIds.length ||
      typeof tentativaId !== 'string' || !/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i.test(tentativaId)) {
    return null;
  }

  const confirmados = familia.pessoas.filter(pessoa => pessoaIds.includes(pessoa.id)).map(pessoa => pessoa.nome);
  if (confirmados.length !== pessoaIds.length) return null;

  return { responsavel: familia.responsavel, confirmados, tentativaId };
}
