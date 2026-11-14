import { beforeEach, describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'
import { createPinia, setActivePinia } from 'pinia'
import type { Usuario } from '@/types'

const falso = vi.hoisted(() => ({
  listUsers: vi.fn<() => Promise<unknown[]>>(),
}))
vi.mock('@/services/users', () => ({
  listUsers: falso.listUsers,
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
