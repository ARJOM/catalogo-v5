import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import type { Lead } from '@/types'

const falso = vi.hoisted(() => ({
  listLeads: vi.fn<() => Promise<unknown[]>>(),
  listLeadsPorImovel: vi.fn<(id: string) => Promise<unknown[]>>(),
  createLead: vi.fn<(d: Record<string, unknown>, uid: string) => Promise<unknown>>(),
  updateLead: vi.fn<(id: string, d: Record<string, unknown>, uid: string) => Promise<unknown>>(),
  getImovel: vi.fn<(id: string) => Promise<unknown>>(),
}))
vi.mock('@/services/leads', () => ({
  listLeads: falso.listLeads,
  listLeadsPorImovel: falso.listLeadsPorImovel,
  createLead: falso.createLead,
  updateLead: falso.updateLead,
}))
vi.mock('@/services/imoveis', () => ({
  getImovel: falso.getImovel,
  listImoveis: vi.fn<() => void>(),
}))
vi.mock('@/services/auth', () => ({
  entrar: vi.fn<() => void>(),
  sair: vi.fn<() => void>(),
  observarSessao: vi.fn<() => void>(),
}))
vi.mock('@/services/users', () => ({
  observarUsuario: vi.fn<() => void>(),
  getUser: vi.fn<() => void>(),
}))

import { useAuthStore } from '@/stores/auth'
import { useLeadsStore } from '@/stores/leads'

const lead = (id: string, imovelId = 'i1') =>
  ({ id, imovelId, imovelEndereco: 'Casa — Rua A', nomeComprador: id, telefone: '83999990000' }) as Lead

beforeEach(() => {
  setActivePinia(createPinia())
  useAuthStore().usuario = { uid: 'joao' } as never
  Object.values(falso).forEach((f) => f.mockReset())
  falso.listLeads.mockResolvedValue([lead('a')])
  falso.listLeadsPorImovel.mockResolvedValue([lead('a')])
})

describe('criar', () => {
  it('grava "Tipo — Rua" e aparece na lista geral e na do imóvel', async () => {
    const store = useLeadsStore()
    await store.carregar()
    await store.carregarDoImovel('i1')
    falso.createLead.mockResolvedValue(lead('novo'))
    await store.criar(
      { imovelId: 'i1', nomeComprador: ' Novo ', telefone: '(83) 98888-1234' },
      { tipo: 'Casa', rua: 'Rua A' },
    )
    expect(falso.createLead).toHaveBeenCalledWith(
      {
        imovelId: 'i1',
        imovelEndereco: 'Casa — Rua A',
        nomeComprador: 'Novo',
        telefone: '(83) 98888-1234',
      },
      'joao',
    )
    expect(store.itens.map((l) => l.id)).toEqual(['novo', 'a'])
    expect(store.doImovel['i1']!.map((l) => l.id)).toEqual(['novo', 'a'])
  })
})

describe('filtro por imóvel', () => {
  it('mostra só os leads do imóvel escolhido', async () => {
    falso.listLeads.mockResolvedValue([lead('a', 'i1'), lead('b', 'i2')])
    const store = useLeadsStore()
    await store.carregar()
    store.filtroImovelId = 'i2'
    expect(store.filtrados.map((l) => l.id)).toEqual(['b'])
  })
})

describe('imóvel excluído', () => {
  it('marca como inexistente o que o servidor não devolve, e mantém o lead', async () => {
    falso.getImovel.mockImplementation(async (id) => (id === 'i2' ? null : { id }))
    const store = useLeadsStore()
    await store.verificarImoveis(['i1', 'i2', 'i3'], new Set(['i3']))
    expect(store.imovelExiste('i1')).toBe(true)
    expect(store.imovelExiste('i2')).toBe(false)
    expect(store.imovelExiste('i3')).toBe(true)
    expect(falso.getImovel).not.toHaveBeenCalledWith('i3')
  })
})
