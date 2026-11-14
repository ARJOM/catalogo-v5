import {
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  where,
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

/**
 * Cria o imóvel com `fotos: []` (as fotos entram depois, quando o documento já existe:
 * a regra do Storage exige isso). Devolve o documento como ficou no servidor.
 */
export async function createImovel(dados: DadosImovel, autor: Autor): Promise<Imovel> {
  const referencia = doc(collection(db, 'imoveis'))
  await setDoc(referencia, {
    ...limpar(dados),
    fotos: [],
    criadoEm: serverTimestamp(),
    criadoPor: autor.uid,
    atualizadoEm: serverTimestamp(),
    atualizadoPor: autor.uid,
  })
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
        usuarioId: autor.uid,
        usuarioNome: autor.nome,
        timestamp: serverTimestamp(),
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
    const novas = fotos.filter((url) => !removidas.includes(url))
    for (const url of adicionadas) if (!novas.includes(url)) novas.push(url)
    transacao.update(referencia, {
      fotos: novas,
      atualizadoEm: serverTimestamp(),
      atualizadoPor: autor.uid,
    })
  })
  return paraImovel(await getDoc(referencia))!
}
