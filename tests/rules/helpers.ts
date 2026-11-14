import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import {
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing'
import { doc, setDoc, Timestamp } from 'firebase/firestore'

/**
 * Projeto de teste: o prefixo `demo-` garante que o emulador nunca fale com um projeto real.
 * Precisa ser o mesmo valor passado a `firebase emulators:exec --project` (ver `test:rules`).
 */
export const PROJECT_ID = 'demo-catalogo-v5-rules'

const raiz = resolve(import.meta.dirname, '../..')

/** UIDs usados nos testes. Os documentos correspondentes em `users` vêm de `semearBase`. */
export const UID = {
  admin: 'admin',
  corretor: 'joao',
  outroCorretor: 'maria',
  inativo: 'ana',
  adminInativo: 'admin-inativo',
  semPerfil: 'sem-perfil', // autenticado no Auth, sem documento em `users`
} as const

export const IMOVEL_ID = 'imv1'

export async function criarAmbiente(): Promise<RulesTestEnvironment> {
  const [firestoreHost, firestorePort] = lerHost('FIRESTORE_EMULATOR_HOST')
  const [storageHost, storagePort] = lerHost('FIREBASE_STORAGE_EMULATOR_HOST')
  return initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      rules: readFileSync(resolve(raiz, 'firestore.rules'), 'utf8'),
      host: firestoreHost,
      port: firestorePort,
    },
    storage: {
      rules: readFileSync(resolve(raiz, 'storage.rules'), 'utf8'),
      host: storageHost,
      port: storagePort,
    },
  })
}

function lerHost(variavel: string): [string, number] {
  const valor = process.env[variavel]
  if (!valor) {
    throw new Error(
      `${variavel} não definida. Rode os testes com \`npm run test:rules\` (emulators:exec).`,
    )
  }
  const [host, porta] = valor.split(':')
  return [host!, Number(porta)]
}

const agora = () => Timestamp.now()

export const dadosUsuario = (uid: string, perfil: 'admin' | 'corretor', ativo: boolean) => ({
  uid,
  nome: `Usuário ${uid}`,
  email: `${uid}@teste.com`,
  perfil,
  ativo,
  criadoEm: agora(),
  atualizadoEm: agora(),
})

export const dadosImovel = (criadoPor: string) => ({
  tipo: 'Casa',
  finalidade: 'Venda',
  valor: 500000,
  areaM2: 120,
  quartos: 3,
  caracteristicas: 'Quintal',
  rua: 'Rua A, 10',
  bairro: 'Centro',
  cidade: 'João Pessoa',
  estado: 'PB',
  captadorId: criadoPor,
  vendedorNome: 'Fulano',
  vendedorTelefone: '83999990000',
  status: 'ativo',
  fotos: [],
  criadoEm: agora(),
  criadoPor,
  atualizadoEm: agora(),
  atualizadoPor: criadoPor,
})

export const dadosLead = (criadoPor: string) => ({
  imovelId: IMOVEL_ID,
  imovelEndereco: 'Casa — Rua A, 10',
  nomeComprador: 'Beltrano',
  telefone: '83988880000',
  criadoEm: agora(),
  criadoPor,
  atualizadoEm: agora(),
  atualizadoPor: criadoPor,
})

/**
 * Estado inicial de cada teste, gravado sem passar pelas regras:
 * 5 documentos em `users`, o imóvel `imv1` com o registro `h1` no histórico e o lead `lead1`.
 */
export async function semearBase(env: RulesTestEnvironment) {
  await env.clearFirestore()
  await env.clearStorage()
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore()
    await setDoc(doc(db, 'users', UID.admin), dadosUsuario(UID.admin, 'admin', true))
    await setDoc(doc(db, 'users', UID.corretor), dadosUsuario(UID.corretor, 'corretor', true))
    await setDoc(
      doc(db, 'users', UID.outroCorretor),
      dadosUsuario(UID.outroCorretor, 'corretor', true),
    )
    await setDoc(doc(db, 'users', UID.inativo), dadosUsuario(UID.inativo, 'corretor', false))
    await setDoc(doc(db, 'users', UID.adminInativo), dadosUsuario(UID.adminInativo, 'admin', false))
    await setDoc(doc(db, 'imoveis', IMOVEL_ID), dadosImovel(UID.corretor))
    await setDoc(doc(db, 'imoveis', IMOVEL_ID, 'historico', 'h1'), {
      tipo: 'criacao',
      usuarioId: UID.corretor,
      usuarioNome: 'Usuário joao',
      timestamp: agora(),
    })
    await setDoc(doc(db, 'leads', 'lead1'), dadosLead(UID.corretor))
  })
}

/** Os quatro perfis da matriz, mais variações que as regras tratam à parte. */
export function contextos(env: RulesTestEnvironment) {
  return {
    corretor: env.authenticatedContext(UID.corretor),
    outroCorretor: env.authenticatedContext(UID.outroCorretor),
    admin: env.authenticatedContext(UID.admin),
    inativo: env.authenticatedContext(UID.inativo),
    adminInativo: env.authenticatedContext(UID.adminInativo),
    semPerfil: env.authenticatedContext(UID.semPerfil),
    anonimo: env.unauthenticatedContext(),
  }
}
