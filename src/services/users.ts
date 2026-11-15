import { deleteApp, initializeApp } from 'firebase/app'
import { createUserWithEmailAndPassword, deleteUser, getAuth, signOut } from 'firebase/auth'
import {
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  type DocumentSnapshot,
} from 'firebase/firestore'
import { configurarAuth, db, firebaseConfig } from '@/firebase'
import type { Perfil, Usuario } from '@/types'
import { mensagemDeErroCriacao } from '@/utils/mensagensAuth'

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

export interface NovoUsuario {
  nome: string
  email: string
  senha: string
  perfil: Perfil
}

/** Falha ao criar usuário, com mensagem pronta para exibir. */
export class ErroCriarUsuario extends Error {
  constructor(mensagem: string) {
    super(mensagem)
    this.name = 'ErroCriarUsuario'
  }
}

let sequencia = 0

/**
 * Cria a conta no Authentication e o documento `users/{uid}`. `createUserWithEmailAndPassword`
 * na instância principal trocaria a sessão do admin pela do novo usuário; por isso a conta é
 * criada numa instância secundária do app, descartada ao final (sucesso ou erro). O documento é
 * gravado pela instância principal, com a sessão do admin (as regras exigem admin).
 */
export async function createUser(dados: NovoUsuario): Promise<Usuario> {
  const secundaria = initializeApp(firebaseConfig, `secundaria-${++sequencia}`)
  try {
    const authSecundario = getAuth(secundaria)
    configurarAuth(authSecundario)
    const credencial = await createUserWithEmailAndPassword(
      authSecundario,
      dados.email,
      dados.senha,
    )
    const { uid } = credencial.user
    try {
      await setDoc(doc(db, 'users', uid), {
        uid,
        nome: dados.nome,
        email: dados.email,
        perfil: dados.perfil,
        ativo: true,
        criadoEm: serverTimestamp(),
        atualizadoEm: serverTimestamp(),
      })
    } catch (erro) {
      // Sem o documento a conta não teria perfil: desfaz para o e-mail não ficar preso.
      await deleteUser(credencial.user).catch(() => undefined)
      throw erro
    }
    const agora = Timestamp.now()
    const { nome, email, perfil } = dados
    return { uid, nome, email, perfil, ativo: true, criadoEm: agora, atualizadoEm: agora }
  } catch (erro) {
    if (erro instanceof ErroCriarUsuario) throw erro
    throw new ErroCriarUsuario(mensagemDeErroCriacao((erro as { code?: string }).code))
  } finally {
    await signOut(getAuth(secundaria)).catch(() => undefined)
    await deleteApp(secundaria).catch(() => undefined)
  }
}

/** Altera nome e/ou perfil. As regras negam ao admin mudar o próprio perfil. */
export async function updateUser(
  uid: string,
  dados: Partial<Pick<Usuario, 'nome' | 'perfil'>>,
): Promise<void> {
  await updateDoc(doc(db, 'users', uid), { ...dados, atualizadoEm: serverTimestamp() })
}

/** Inativa ou reativa. As regras negam ao admin alterar o próprio `ativo`. */
export async function toggleAtivo(uid: string, ativo: boolean): Promise<void> {
  await updateDoc(doc(db, 'users', uid), { ativo, atualizadoEm: serverTimestamp() })
}
