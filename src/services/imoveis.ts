import {
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  where,
  type DocumentSnapshot,
} from 'firebase/firestore'
import { db } from '@/firebase'
import type { Imovel, StatusImovel } from '@/types'

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
