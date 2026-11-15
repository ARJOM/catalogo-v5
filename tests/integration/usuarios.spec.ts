import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { doc, getDoc, getDocs, collection } from 'firebase/firestore'
import { createPinia, setActivePinia } from 'pinia'
import { signInWithEmailAndPassword } from 'firebase/auth'

vi.mock('@/firebase', async () => (await import('./ambiente')).criarFirebaseDeTeste())

import { auth, db } from '@/firebase'
import { ErroCriarUsuario } from '@/services/users'
import { useAuthStore } from '@/stores/auth'
import { useUsuariosStore } from '@/stores/usuarios'
import type { Usuario } from '@/types'
import { SENHA, criarContas, encerrarAmbiente, entrarComo, limparTudo } from './ambiente'

let admin = ''
let joao = ''

beforeAll(async () => {
  await limparTudo()
  const uid = await criarContas(auth, [
    { email: 'admin@t.com', nome: 'Admin', perfil: 'admin' },
    { email: 'joao@t.com', nome: 'João', perfil: 'corretor' },
  ])
  admin = uid['admin@t.com']!
  joao = uid['joao@t.com']!
})
afterAll(encerrarAmbiente)

function comoUsuario(uid: string, nome: string, perfil: 'admin' | 'corretor') {
  setActivePinia(createPinia())
  useAuthStore().usuario = { uid, nome, perfil } as Usuario
}

const novo = (email: string) => ({
  nome: 'Maria Lima',
  email,
  senha: SENHA,
  perfil: 'corretor' as const,
})

describe('criar usuário (instância secundária)', () => {
  it('cria conta e perfil sem derrubar a sessão do admin, e o novo usuário consegue entrar', async () => {
    await entrarComo(auth, 'admin@t.com')
    comoUsuario(admin, 'Admin', 'admin')

    const criado = await useUsuariosStore().criar(novo('maria@t.com'))

    // a sessão principal continua sendo a do admin
    expect(auth.currentUser?.uid).toBe(admin)
    const perfil = (await getDoc(doc(db, 'users', criado.uid))).data()
    expect(perfil).toMatchObject({
      uid: criado.uid,
      nome: 'Maria Lima',
      email: 'maria@t.com',
      perfil: 'corretor',
      ativo: true,
    })
    expect(perfil?.criadoEm).toBeDefined()
    // e o admin ainda escreve com a própria sessão (prova que não foi trocada)
    expect((await getDocs(collection(db, 'users'))).size).toBe(3)

    // o novo usuário entra
    await entrarComo(auth, 'admin@t.com') // garante estado conhecido
    await signInWithEmailAndPassword(auth, 'maria@t.com', SENHA)
    expect(auth.currentUser?.uid).toBe(criado.uid)
  })

  it('e-mail já cadastrado: mensagem clara em português e nenhum documento em users', async () => {
    await entrarComo(auth, 'admin@t.com')
    comoUsuario(admin, 'Admin', 'admin')
    const antes = (await getDocs(collection(db, 'users'))).size

    const tentativa = useUsuariosStore().criar(novo('joao@t.com'))
    await expect(tentativa).rejects.toBeInstanceOf(ErroCriarUsuario)
    await expect(tentativa).rejects.toThrow('Já existe um usuário com este e-mail.')

    expect((await getDocs(collection(db, 'users'))).size).toBe(antes)
    expect(auth.currentUser?.uid).toBe(admin)
  })

  it('corretor não cria usuário: a store recusa e, se ignorada, as regras negam sem deixar conta órfã', async () => {
    await entrarComo(auth, 'joao@t.com')
    comoUsuario(joao, 'João', 'corretor')
    await expect(useUsuariosStore().criar(novo('x@t.com'))).rejects.toThrow(
      'Apenas administradores podem gerir usuários.',
    )

    // direto no serviço (sem a barreira da store): as regras negam o documento e a conta é desfeita
    const { createUser } = await import('@/services/users')
    await expect(createUser(novo('y@t.com'))).rejects.toThrow('Você não tem permissão')
    await entrarComo(auth, 'admin@t.com')
    comoUsuario(admin, 'Admin', 'admin')
    // o e-mail ficou livre: a conta criada na instância secundária foi removida
    const livre = await useUsuariosStore().criar(novo('y@t.com'))
    expect(livre.email).toBe('y@t.com')
  })
})

describe('inativar e reativar', () => {
  it('o admin inativa e reativa um corretor; a lista de captadores acompanha', async () => {
    await entrarComo(auth, 'admin@t.com')
    comoUsuario(admin, 'Admin', 'admin')
    const store = useUsuariosStore()
    await store.carregar()
    expect(store.ativos.some((u) => u.uid === joao)).toBe(true)

    await store.definirAtivo(joao, false)
    expect(store.ativos.some((u) => u.uid === joao)).toBe(false)
    expect((await getDoc(doc(db, 'users', joao))).data()?.ativo).toBe(false)

    await store.definirAtivo(joao, true)
    expect(store.ativos.some((u) => u.uid === joao)).toBe(true)
  })

  it('o admin não inativa nem muda o próprio perfil (e as regras também negam)', async () => {
    await entrarComo(auth, 'admin@t.com')
    comoUsuario(admin, 'Admin', 'admin')
    const store = useUsuariosStore()
    await expect(store.definirAtivo(admin, false)).rejects.toThrow('própria conta')
    await expect(store.atualizar(admin, { perfil: 'corretor' })).rejects.toThrow('próprio perfil')

    // contornando a store, a regra é a barreira real
    const { toggleAtivo, updateUser } = await import('@/services/users')
    await expect(toggleAtivo(admin, false)).rejects.toThrow('PERMISSION_DENIED')
    await expect(updateUser(admin, { perfil: 'corretor' })).rejects.toThrow('PERMISSION_DENIED')
    expect((await getDoc(doc(db, 'users', admin))).data()).toMatchObject({
      perfil: 'admin',
      ativo: true,
    })
    // mas o próprio nome pode mudar
    await store.atualizar(admin, { nome: 'Admin Geral' })
    expect((await getDoc(doc(db, 'users', admin))).data()?.nome).toBe('Admin Geral')
  })
})
