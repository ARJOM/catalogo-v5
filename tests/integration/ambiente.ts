import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { initializeApp } from 'firebase/app'
import {
  connectAuthEmulator,
  createUserWithEmailAndPassword,
  getAuth,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth'
import { connectFirestoreEmulator, doc, getFirestore, setDoc, Timestamp } from 'firebase/firestore'
import { connectStorageEmulator, getStorage } from 'firebase/storage'
import { initializeTestEnvironment, type RulesTestEnvironment } from '@firebase/rules-unit-testing'

/** O prefixo `demo-` garante que nada aqui toca um projeto real. */
export const PROJECT_ID = 'demo-catalogo-v5-int'
const raiz = resolve(import.meta.dirname, '../..')

function host(variavel: string): [string, number] {
  const valor = process.env[variavel]
  if (!valor) throw new Error(`${variavel} não definida. Rode com \`npm run test:integracao\`.`)
  const [h, p] = valor.split(':')
  return [h!, Number(p)]
}

/**
 * Substituto de `@/firebase` nos testes: mesma forma do módulo, mas apontando para o emulador
 * do projeto de teste. Os serviços reais são usados como estão.
 */
export function criarFirebaseDeTeste() {
  const app = initializeApp({
    apiKey: 'chave-de-teste',
    projectId: PROJECT_ID,
    storageBucket: `${PROJECT_ID}.appspot.com`,
  })
  const auth = getAuth(app)
  const db = getFirestore(app)
  const storage = getStorage(app)
  const [authHost, authPorta] = host('FIREBASE_AUTH_EMULATOR_HOST')
  const [fsHost, fsPorta] = host('FIRESTORE_EMULATOR_HOST')
  const [stHost, stPorta] = host('FIREBASE_STORAGE_EMULATOR_HOST')
  connectAuthEmulator(auth, `http://${authHost}:${authPorta}`, { disableWarnings: true })
  connectFirestoreEmulator(db, fsHost, fsPorta)
  connectStorageEmulator(storage, stHost, stPorta)
  return { app, auth, db, storage }
}

let ambiente: RulesTestEnvironment | null = null

/** Ambiente administrativo (ignora as regras) para semear e conferir o estado. */
export async function ambienteAdmin(): Promise<RulesTestEnvironment> {
  if (ambiente) return ambiente
  const [fsHost, fsPorta] = host('FIRESTORE_EMULATOR_HOST')
  const [stHost, stPorta] = host('FIREBASE_STORAGE_EMULATOR_HOST')
  ambiente = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      rules: readFileSync(resolve(raiz, 'firestore.rules'), 'utf8'),
      host: fsHost,
      port: fsPorta,
    },
    storage: {
      rules: readFileSync(resolve(raiz, 'storage.rules'), 'utf8'),
      host: stHost,
      port: stPorta,
    },
  })
  return ambiente
}

export async function encerrarAmbiente() {
  await ambiente?.cleanup()
  ambiente = null
}

export const SENHA = 'senha123'

export interface ContaDeTeste {
  email: string
  nome: string
  perfil: 'admin' | 'corretor'
  ativo?: boolean
}

/** Cria as contas no Auth e os documentos em `users` (sem passar pelas regras). Devolve uid por e-mail. */
export async function criarContas(
  auth: ReturnType<typeof getAuth>,
  contas: ContaDeTeste[],
): Promise<Record<string, string>> {
  const env = await ambienteAdmin()
  const uids: Record<string, string> = {}
  for (const conta of contas) {
    const credencial = await createUserWithEmailAndPassword(auth, conta.email, SENHA)
    uids[conta.email] = credencial.user.uid
    await env.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'users', credencial.user.uid), {
        uid: credencial.user.uid,
        nome: conta.nome,
        email: conta.email,
        perfil: conta.perfil,
        ativo: conta.ativo ?? true,
        criadoEm: Timestamp.now(),
        atualizadoEm: Timestamp.now(),
      })
    })
  }
  await signOut(auth)
  return uids
}

export async function entrarComo(auth: ReturnType<typeof getAuth>, email: string) {
  await signInWithEmailAndPassword(auth, email, SENHA)
}

export async function limparTudo() {
  const env = await ambienteAdmin()
  await env.clearFirestore()
  await env.clearStorage()
  // Contas do Auth também: o e-mail volta a ficar livre para o próximo teste.
  const [h, p] = host('FIREBASE_AUTH_EMULATOR_HOST')
  await fetch(`http://${h}:${p}/emulator/v1/projects/${PROJECT_ID}/accounts`, { method: 'DELETE' })
}
