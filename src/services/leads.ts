import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
  type DocumentSnapshot,
} from 'firebase/firestore'
import { db } from '@/firebase'
import type { Lead } from '@/types'

function paraLead(snap: DocumentSnapshot): Lead {
  return { ...snap.data(), id: snap.id } as Lead
}

export interface NovoLead {
  imovelId: string
  imovelEndereco: string
  nomeComprador: string
  telefone: string
}

export interface EdicaoLead {
  nomeComprador: string
  telefone: string
}

/** Todos os leads, do mais recente para o mais antigo. */
export async function listLeads(): Promise<Lead[]> {
  const resultado = await getDocs(query(collection(db, 'leads'), orderBy('criadoEm', 'desc')))
  return resultado.docs.map(paraLead)
}

/** Leads de um imóvel, do mais recente para o mais antigo (índice `imovelId ASC, criadoEm DESC`). */
export async function listLeadsPorImovel(imovelId: string): Promise<Lead[]> {
  const consulta = query(
    collection(db, 'leads'),
    where('imovelId', '==', imovelId),
    orderBy('criadoEm', 'desc'),
  )
  return (await getDocs(consulta)).docs.map(paraLead)
}

/** Grava o lead e devolve o documento já com os carimbos de data do servidor. */
export async function createLead(dados: NovoLead, uid: string): Promise<Lead> {
  const ref = await addDoc(collection(db, 'leads'), {
    ...dados,
    criadoEm: serverTimestamp(),
    criadoPor: uid,
    atualizadoEm: serverTimestamp(),
    atualizadoPor: uid,
  })
  return paraLead(await getDoc(ref))
}

/** Altera nome e telefone; o imóvel vinculado e o endereço gravado não mudam. */
export async function updateLead(id: string, dados: EdicaoLead, uid: string): Promise<Lead> {
  const ref = doc(db, 'leads', id)
  await updateDoc(ref, { ...dados, atualizadoEm: serverTimestamp(), atualizadoPor: uid })
  return paraLead(await getDoc(ref))
}
