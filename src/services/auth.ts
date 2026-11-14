import {
  browserLocalPersistence,
  browserSessionPersistence,
  onAuthStateChanged,
  setPersistence,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth'
import { auth } from '@/firebase'

export interface SessaoAuth {
  uid: string
}

/**
 * Entra com e-mail e senha. `lembrar` decide onde a sessão fica guardada:
 * local (sobrevive ao fechar o navegador) ou de sessão (some ao fechar).
 * Em caso de falha, lança o erro do SDK, cujo `code` é traduzido pela store.
 */
export async function entrar(email: string, senha: string, lembrar: boolean): Promise<SessaoAuth> {
  await setPersistence(auth, lembrar ? browserLocalPersistence : browserSessionPersistence)
  const credencial = await signInWithEmailAndPassword(auth, email, senha)
  return { uid: credencial.user.uid }
}

export function sair(): Promise<void> {
  return signOut(auth)
}

/** Avisa a cada mudança da sessão do Authentication; o primeiro aviso é o estado inicial. */
export function observarSessao(aoMudar: (sessao: SessaoAuth | null) => void): () => void {
  return onAuthStateChanged(auth, (usuario) => aoMudar(usuario ? { uid: usuario.uid } : null))
}
