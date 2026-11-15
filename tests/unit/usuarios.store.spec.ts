import { beforeEach, describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'
import { createPinia, setActivePinia } from 'pinia'
import type { Usuario } from '@/types'

const falso = vi.hoisted(() => ({
  listUsers: vi.fn<() => Promise<unknown[]>>(),
  createUser: vi.fn<(d: unknown) => Promise<unknown>>(),
  updateUser: vi.fn<(uid: string, d: unknown) => Promise<void>>(),
  toggleAtivo: vi.fn<(uid: string, ativo: boolean) => Promise<void>>(),
}))
vi.mock('@/services/users', () => ({
  listUsers: falso.listUsers,
  createUser: falso.createUser,
  updateUser: falso.updateUser,
  toggleAtivo: falso.toggleAtivo,
  getUser: vi.fn<() => void>(),
  observarUsuario: vi.fn<() => void>(),
}))
vi.mock('@/services/auth', () => ({
  entrar: vi.fn<() => void>(),
  sair: vi.fn<() => void>(),
  observarSessao: vi.fn<() => void>(),
}))

import { useAuthStore } from '@/stores/auth'
import { NOME_DESCONHECIDO, useUsuariosStore } from '@/stores/usuarios'

const usuario = (uid: string, nome: string, ativo = true) => ({ uid, nome, ativo }) as Usuario

beforeEach(() => {
  setActivePinia(createPinia())
  falso.listUsers
    .mockReset()
    .mockResolvedValue([usuario('joao', 'João Melo'), usuario('ana', 'Ana Souza', false)])
})

describe('usuarios', () => {
  it('carrega a lista uma única vez, mesmo com chamadas repetidas ou simultâneas', async () => {
    const store = useUsuariosStore()
    await Promise.all([store.carregar(), store.carregar()])
    await store.carregar()
    expect(falso.listUsers).toHaveBeenCalledTimes(1)
    expect(store.carregado).toBe(true)
    expect(store.itens).toHaveLength(2)
  })

  it('resolve nomes, inclusive de inativos, e cai num nome neutro para uid desconhecido', async () => {
    const store = useUsuariosStore()
    expect(store.nomeDe('joao')).toBe(NOME_DESCONHECIDO) // antes de carregar
    await store.carregar()
    expect(store.nomeDe('joao')).toBe('João Melo')
    expect(store.nomeDe('ana')).toBe('Ana Souza')
    expect(store.nomeDe('fantasma')).toBe(NOME_DESCONHECIDO)
  })

  it('ativos exclui as contas suspensas', async () => {
    const store = useUsuariosStore()
    await store.carregar()
    expect(store.ativos.map((u) => u.uid)).toEqual(['joao'])
  })

  it('falha: guarda a mensagem e deixa tentar de novo', async () => {
    falso.listUsers.mockRejectedValueOnce(new Error('offline'))
    const store = useUsuariosStore()
    await store.carregar()
    expect(store.erro).toMatch(/Não foi possível/)
    expect(store.carregado).toBe(false)
    await store.carregar()
    expect(store.erro).toBe('')
    expect(store.carregado).toBe(true)
  })

  it('forçar consulta de novo', async () => {
    const store = useUsuariosStore()
    await store.carregar()
    await store.carregar(true)
    expect(falso.listUsers).toHaveBeenCalledTimes(2)
  })

  it('limpa ao trocar de usuário e a resposta atrasada de antes é descartada', async () => {
    const auth = useAuthStore()
    auth.usuario = { uid: 'admin' } as Usuario
    let resolverLenta!: (lista: unknown[]) => void
    falso.listUsers.mockImplementationOnce(() => new Promise((r) => (resolverLenta = r)))
    const store = useUsuariosStore()
    const lenta = store.carregar()
    auth.usuario = null
    await nextTick()
    resolverLenta([usuario('velho', 'Velho')])
    await lenta
    expect(store.itens).toEqual([])
    expect(store.carregado).toBe(false)
    await store.carregar()
    expect(store.itens.map((u) => u.uid)).toEqual(['joao', 'ana'])
  })
})

describe('usuarios — ações do admin', () => {
  beforeEach(() => {
    falso.createUser.mockReset()
    falso.updateUser.mockReset().mockResolvedValue(undefined)
    falso.toggleAtivo.mockReset().mockResolvedValue(undefined)
  })

  async function comoAdmin() {
    const auth = useAuthStore()
    auth.usuario = { uid: 'admin', nome: 'Admin', perfil: 'admin' } as Usuario
    const store = useUsuariosStore()
    await store.carregar()
    return store
  }

  it('criar acrescenta o novo usuário à lista, em ordem alfabética', async () => {
    const store = await comoAdmin()
    falso.createUser.mockResolvedValue({ ...usuario('maria', 'Maria Lima'), perfil: 'corretor' })
    await store.criar({ nome: 'Maria Lima', email: 'm@t.com', senha: '123456', perfil: 'corretor' })
    expect(store.itens.map((u) => u.uid)).toEqual(['ana', 'joao', 'maria'])
  })

  it('inativar tira o corretor de "ativos" e reativar o devolve', async () => {
    const store = await comoAdmin()
    await store.definirAtivo('joao', false)
    expect(falso.toggleAtivo).toHaveBeenCalledWith('joao', false)
    expect(store.ativos).toEqual([])
    await store.definirAtivo('joao', true)
    expect(store.ativos.map((u) => u.uid)).toEqual(['joao'])
  })

  it('o admin não inativa a si mesmo nem muda o próprio perfil, sem chamar o serviço', async () => {
    const store = await comoAdmin()
    store.itens.push(usuario('admin', 'Admin'))
    await expect(store.definirAtivo('admin', false)).rejects.toThrow('própria conta')
    await expect(store.atualizar('admin', { perfil: 'corretor' })).rejects.toThrow('próprio perfil')
    expect(falso.toggleAtivo).not.toHaveBeenCalled()
    expect(falso.updateUser).not.toHaveBeenCalled()
    await store.atualizar('admin', { nome: 'Novo Nome' })
    expect(store.nomeDe('admin')).toBe('Novo Nome')
  })

  it('corretor não executa nenhuma ação', async () => {
    useAuthStore().usuario = { uid: 'joao', perfil: 'corretor' } as Usuario
    const store = useUsuariosStore()
    await expect(
      store.criar({ nome: 'x', email: 'x@x.com', senha: '123456', perfil: 'admin' }),
    ).rejects.toThrow('Apenas administradores')
    await expect(store.definirAtivo('ana', true)).rejects.toThrow('Apenas administradores')
    expect(falso.createUser).not.toHaveBeenCalled()
    expect(falso.toggleAtivo).not.toHaveBeenCalled()
  })

  it('falha do serviço não altera a lista', async () => {
    const store = await comoAdmin()
    falso.toggleAtivo.mockRejectedValue(new Error('negado'))
    await expect(store.definirAtivo('joao', false)).rejects.toThrow('negado')
    expect(store.ativos.map((u) => u.uid)).toEqual(['joao'])
  })
})
