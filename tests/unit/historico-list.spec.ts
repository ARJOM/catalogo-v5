import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'

const falso = vi.hoisted(() => ({
  listHistorico: vi.fn<(id: string) => Promise<unknown[]>>(),
}))
vi.mock('@/services/historico', () => ({ listHistorico: falso.listHistorico }))
vi.mock('@/services/users', () => ({
  listUsers: vi
    .fn<() => Promise<unknown[]>>()
    .mockResolvedValue([{ uid: 'joao', nome: 'João Melo', ativo: true }]),
  observarUsuario: vi.fn<() => void>(),
  getUser: vi.fn<() => void>(),
}))
vi.mock('@/services/auth', () => ({
  entrar: vi.fn<() => void>(),
  sair: vi.fn<() => void>(),
  observarSessao: vi.fn<() => void>(),
}))

import HistoricoList from '@/components/HistoricoList.vue'

const ts = (iso: string) => ({ toDate: () => new Date(iso) })

beforeEach(() => {
  setActivePinia(createPinia())
  falso.listHistorico.mockReset()
})

describe('HistoricoList', () => {
  it('mostra os registros na ordem recebida (mais recente primeiro) com autor e data', async () => {
    falso.listHistorico.mockResolvedValue([
      {
        id: '3',
        tipo: 'edicao',
        campo: 'valor',
        valorAnterior: 500000,
        valorNovo: 480000,
        usuarioNome: 'João Melo',
        timestamp: ts('2026-04-28T10:22:00'),
      },
      {
        id: '2',
        tipo: 'foto_adicionada',
        usuarioNome: 'João Melo',
        timestamp: ts('2026-04-20T16:00:00'),
      },
      { id: '1', tipo: 'criacao', usuarioNome: 'João Melo', timestamp: ts('2026-03-15T08:45:00') },
    ])
    const w = mount(HistoricoList, { props: { imovelId: 'x' } })
    await flushPromises()

    const itens = w.findAll('.hist-item')
    expect(itens.map((i) => i.find('.hist-desc').text())).toEqual([
      'Valor alterado de R$ 500.000 para R$ 480.000',
      'Foto adicionada ao carrossel',
      'Imóvel cadastrado no sistema',
    ])
    expect(itens[0]!.find('.hist-meta').text()).toContain('João Melo')
    expect(itens[0]!.find('.hist-meta').text()).toContain('28/04 · 10:22')
    expect(itens[0]!.findAll('strong').map((s) => s.text())).toEqual(['R$ 500.000', 'R$ 480.000'])
    expect(falso.listHistorico).toHaveBeenCalledWith('x')
  })

  it('resolve o nome do captador nas trocas de captador', async () => {
    falso.listHistorico.mockResolvedValue([
      {
        id: '1',
        tipo: 'edicao',
        campo: 'captadorId',
        valorAnterior: 'joao',
        valorNovo: 'fantasma',
        usuarioNome: 'A',
        timestamp: ts('2026-04-28T10:22:00'),
      },
    ])
    const w = mount(HistoricoList, { props: { imovelId: 'x' } })
    await flushPromises()
    expect(w.find('.hist-desc').text()).toBe(
      'Captador alterado de João Melo para Usuário desconhecido',
    )
  })

  it('sem registros mostra a mensagem de vazio', async () => {
    falso.listHistorico.mockResolvedValue([])
    const w = mount(HistoricoList, { props: { imovelId: 'x' } })
    await flushPromises()
    expect(w.text()).toContain('Nenhuma alteração registrada')
  })

  it('erro mostra aviso e permite tentar de novo', async () => {
    falso.listHistorico.mockRejectedValueOnce(new Error('offline'))
    const w = mount(HistoricoList, { props: { imovelId: 'x' } })
    await flushPromises()
    expect(w.find('[role=alert]').text()).toContain('Não foi possível carregar o histórico')

    falso.listHistorico.mockResolvedValue([
      { id: '1', tipo: 'criacao', usuarioNome: 'A', timestamp: ts('2026-03-15T08:45:00') },
    ])
    await w.find('[role=alert] button').trigger('click')
    await flushPromises()
    expect(w.findAll('.hist-item')).toHaveLength(1)
  })

  it('trocar de imóvel busca o histórico do novo', async () => {
    falso.listHistorico.mockResolvedValue([])
    const w = mount(HistoricoList, { props: { imovelId: 'a' } })
    await flushPromises()
    await w.setProps({ imovelId: 'b' })
    await flushPromises()
    expect(falso.listHistorico).toHaveBeenLastCalledWith('b')
  })
})
