import {
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  type DocumentSnapshot,
} from 'firebase/firestore'
import { db } from '@/firebase'
import type { Usuario } from '@/types'

function paraUsuario(snap: DocumentSnapshot): Usuario | null {
  return snap.exists() ? ({ ...snap.data(), uid: snap.id } as Usuario) : null
}

export async function getUser(uid: string): Promise<Usuario | null> {
  return paraUsuario(await getDoc(doc(db, 'users', uid)))
}

/** Todos os usuários (ativos e inativos), em ordem alfabética de nome. */
export async function listUsers(): Promise<Usuario[]> {
  const resultado = await getDocs(query(collection(db, 'users'), orderBy('nome')))
  return resultado.docs.map((snap) => paraUsuario(snap)!)
}

/**
 * Acompanha o documento de um usuário em tempo real. Recebe `null` se o documento
 * não existe. Retorna a função que encerra a escuta.
 */
export function observarUsuario(
  uid: string,
  aoMudar: (usuario: Usuario | null) => void,
  aoFalhar: (erro: Error) => void,
): () => void {
  return onSnapshot(doc(db, 'users', uid), (snap) => aoMudar(paraUsuario(snap)), aoFalhar)
}
