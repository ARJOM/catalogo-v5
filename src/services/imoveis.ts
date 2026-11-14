import {
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  where,
  writeBatch,
  type DocumentSnapshot,
} from 'firebase/firestore'
import { db } from '@/firebase'
import { diffImovel } from '@/utils/diffImovel'
import type { Autor, DadosImovel, Imovel, StatusImovel } from '@/types'

function paraImovel(snap: DocumentSnapshot): Imovel | null {
  return snap.exists() ? ({ ...snap.data(), id: snap.id } as Imovel) : null
}

export interface OpcoesListagem {
  /**
   * Status a consultar no servidor. Sem ele a consulta devolve todos os imóveis
   * (uso do admin); os demais filtros do catálogo rodam no cliente.
   */
  status?: StatusImovel
}

/** Imóveis do mais recente para o mais antigo (`criadoEm` decrescente). */
export async function listImoveis({ status }: OpcoesListagem = {}): Promise<Imovel[]> {
  const ordem = orderBy('criadoEm', 'desc')
  const consulta = status
    ? query(collection(db, 'imoveis'), where('status', '==', status), ordem)
    : query(collection(db, 'imoveis'), ordem)
  const resultado = await getDocs(consulta)
  return resultado.docs.map((snap) => paraImovel(snap)!)
}

/** `null` se o imóvel não existe. */
export async function getImovel(id: string): Promise<Imovel | null> {
  return paraImovel(await getDoc(doc(db, 'imoveis', id)))
}

/** O Firestore rejeita `undefined`; o campo opcional "quartos" vazio vira `null`. */
function limpar(dados: DadosImovel): DadosImovel {
  return { ...dados, quartos: dados.quartos ?? null }
}

/** Dados comuns a todo registro de histórico. */
const autoria = (autor: Autor) => ({
  usuarioId: autor.uid,
  usuarioNome: autor.nome,
  timestamp: serverTimestamp(),
})

/**
 * Cria o imóvel com `fotos: []` e o registro `criacao` do histórico, juntos num batch (as
 * fotos entram depois, quando o documento já existe: a regra do Storage exige isso). Devolve
 * o documento como ficou no servidor.
 */
export async function createImovel(dados: DadosImovel, autor: Autor): Promise<Imovel> {
  const referencia = doc(collection(db, 'imoveis'))
  const lote = writeBatch(db)
  lote.set(referencia, {
    ...limpar(dados),
    fotos: [],
    criadoEm: serverTimestamp(),
    criadoPor: autor.uid,
    atualizadoEm: serverTimestamp(),
    atualizadoPor: autor.uid,
  })
  lote.set(doc(historicoDe(referencia.id)), { tipo: 'criacao', ...autoria(autor) })
  await lote.commit()
  return paraImovel(await getDoc(referencia))!
}

/** Referência da subcoleção de histórico de um imóvel. */
const historicoDe = (imovelId: string) => collection(db, 'imoveis', imovelId, 'historico')

/**
 * Atualiza os dados do imóvel (não mexe em `fotos`) e devolve o documento atualizado.
 *
 * Numa transação: lê o imóvel, compara com `diffImovel` e grava a atualização junto com um
 * registro de histórico por campo alterado. Se nada mudou, não grava nada (nem a auditoria).
 */
export async function updateImovel(id: string, dados: DadosImovel, autor: Autor): Promise<Imovel> {
  const referencia = doc(db, 'imoveis', id)
  await runTransaction(db, async (transacao) => {
    const atual = await transacao.get(referencia)
    if (!atual.exists()) throw new Error('Imóvel não encontrado.')
    const novo = limpar(dados)
    const mudancas = diffImovel(atual.data() as Partial<DadosImovel>, novo)
    if (mudancas.length === 0) return
    const reativado = novo.status === 'ativo' && atual.data().deletadoEm != null
    transacao.update(referencia, {
      ...novo,
      ...(reativado ? { deletadoEm: null } : {}),
      atualizadoEm: serverTimestamp(),
      atualizadoPor: autor.uid,
    })
    for (const { campo, valorAnterior, valorNovo } of mudancas) {
      transacao.set(doc(historicoDe(id)), {
        tipo: 'edicao',
        campo,
        valorAnterior,
        valorNovo,
        ...autoria(autor),
      })
    }
  })
  return paraImovel(await getDoc(referencia))!
}

export interface AlteracaoDeFotos {
  /** URLs de download das fotos recém-enviadas, a acrescentar ao fim de `fotos[]`. */
  adicionadas: string[]
  /** URLs a retirar de `fotos[]`. */
  removidas: string[]
}

/**
 * Aplica as mudanças de fotos em `fotos[]` numa transação (o array é lido e regravado, pois o
 * Firestore não aceita `arrayUnion` e `arrayRemove` no mesmo campo de uma só escrita).
 * Não mexe nos arquivos do Storage.
 */
export async function atualizarFotos(
  id: string,
  { adicionadas, removidas }: AlteracaoDeFotos,
  autor: Autor,
): Promise<Imovel> {
  const referencia = doc(db, 'imoveis', id)
  await runTransaction(db, async (transacao) => {
    const atual = await transacao.get(referencia)
    if (!atual.exists()) throw new Error('Imóvel não encontrado.')
    const fotos = (atual.data().fotos as string[] | undefined) ?? []
    // Só conta o que de fato muda: remover o que já não está lá, ou adicionar o que já está, não é evento.
    const retiradas = removidas.filter((url) => fotos.includes(url))
    const novas = fotos.filter((url) => !retiradas.includes(url))
    const incluidas = adicionadas.filter(
      (url, i) => !novas.includes(url) && adicionadas.indexOf(url) === i,
    )
    novas.push(...incluidas)
    if (retiradas.length === 0 && incluidas.length === 0) return
    transacao.update(referencia, {
      fotos: novas,
      atualizadoEm: serverTimestamp(),
      atualizadoPor: autor.uid,
    })
    const eventos = [
      ...incluidas.map(() => 'foto_adicionada' as const),
      ...retiradas.map(() => 'foto_removida' as const),
    ]
    for (const tipo of eventos) {
      transacao.set(doc(historicoDe(id)), { tipo, ...autoria(autor) })
    }
  })
  return paraImovel(await getDoc(referencia))!
}
