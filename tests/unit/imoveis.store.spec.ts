import { beforeEach, describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'
import { createPinia, setActivePinia } from 'pinia'
import type { DadosImovel, Imovel, Usuario } from '@/types'

// Nenhum teste toca o Firebase: os serviços são trocados por funções simuladas.
const falso = vi.hoisted(() => ({
  listImoveis: vi.fn<(opcoes?: { status?: string }) => Promise<unknown[]>>(),
  getImovel: vi.fn<(id: string) => Promise<unknown>>(),
  createImovel: vi.fn<(dados: unknown, autor: unknown) => Promise<unknown>>(),
  updateImovel: vi.fn<(id: string, dados: unknown, autor: unknown) => Promise<unknown>>(),
}))
vi.mock('@/services/imoveis', () => ({
  listImoveis: falso.listImoveis,
  getImovel: falso.getImovel,
  createImovel: falso.createImovel,
  updateImovel: falso.updateImovel,
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
import { useImoveisStore } from '@/stores/imoveis'

const imovel = (id: string, extra: Record<string, unknown> = {}) =>
  ({
    id,
    tipo: 'Casa',
    finalidade: 'Venda',
    valor: 100000,
    rua: `Rua ${id}`,
    bairro: 'Centro',
    cidade: 'Cajazeiras',
    captadorId: 'joao',
    status: 'ativo',
    fotos: [],
    criadoEm: { toMillis: () => 1000 },
    ...extra,
  }) as unknown as Imovel

beforeEach(() => {
  setActivePinia(createPinia())
  falso.listImoveis.mockReset().mockResolvedValue([imovel('a'), imovel('b', { tipo: 'Terreno' })])
  falso.getImovel.mockReset()
  falso.createImovel.mockReset()
  falso.updateImovel.mockReset()
})

describe('carregar', () => {
  it('o corretor consulta só os ativos; o admin consulta sem filtro de status', async () => {
    const store = useImoveisStore()
    await store.carregar('ativos')
    expect(falso.listImoveis).toHaveBeenLastCalledWith({ status: 'ativo' })
    await store.carregar('todos')
    expect(falso.listImoveis).toHaveBeenLastCalledWith({})
    expect(falso.listImoveis).toHaveBeenCalledTimes(2)
  })

  it('não repete a consulta para o mesmo escopo, a não ser que seja forçada', async () => {
    const store = useImoveisStore()
    await store.carregar('ativos')
    await store.carregar('ativos')
    expect(falso.listImoveis).toHaveBeenCalledTimes(1)
    await store.carregar('ativos', true)
    expect(falso.listImoveis).toHaveBeenCalledTimes(2)
  })

  it('mudar os filtros atualiza a lista sem nova consulta', async () => {
    const store = useImoveisStore()
    await store.carregar('ativos')
    expect(store.filtrados).toHaveLength(2)
    store.filtros.tipo = 'Terreno'
    expect(store.filtrados.map((i) => i.id)).toEqual(['b'])
    store.filtros.busca = 'nada que combine'
    expect(store.filtrados).toEqual([])
    expect(store.total).toBe(2)
    expect(store.filtroAtivo).toBe(true)
    store.limparFiltros()
    expect(store.filtrados).toHaveLength(2)
    expect(falso.listImoveis).toHaveBeenCalledTimes(1)
  })

  it('falha: guarda a mensagem, não marca como carregado e permite tentar de novo', async () => {
    falso.listImoveis.mockRejectedValueOnce(new Error('permission-denied'))
    const store = useImoveisStore()
    await store.carregar('ativos')
    expect(store.erro).toMatch(/Não foi possível carregar/)
    expect(store.carregado).toBe(false)
    expect(store.carregando).toBe(false)
    await store.carregar('ativos')
    expect(store.erro).toBe('')
    expect(store.total).toBe(2)
  })

  it('ignora a resposta de uma consulta que já foi superada', async () => {
    let resolverLenta!: (lista: unknown[]) => void
    falso.listImoveis.mockImplementationOnce(() => new Promise((r) => (resolverLenta = r)))
    const store = useImoveisStore()
    const lenta = store.carregar('ativos')
    await store.carregar('todos') // devolve a lista padrão do mock
    resolverLenta([imovel('velho')])
    await lenta
    expect(store.escopo).toBe('todos')
    expect(store.itens.map((i) => i.id)).toEqual(['a', 'b'])
  })
})

describe('obter e registrar', () => {
  it('obter lê do servidor e atualiza a cópia que já está na lista', async () => {
    const store = useImoveisStore()
    await store.carregar('ativos')
    falso.getImovel.mockResolvedValue(imovel('a', { valor: 1 }))
    expect((await store.obter('a'))?.valor).toBe(1)
    expect(store.porId('a')?.valor).toBe(1)
    falso.getImovel.mockResolvedValue(null)
    expect(await store.obter('zzz')).toBeNull()
  })

  it('registrar substitui o existente e insere o novo no topo (mais recente)', async () => {
    const store = useImoveisStore()
    await store.carregar('todos')
    store.registrar(imovel('a', { valor: 7 }))
    expect(store.porId('a')?.valor).toBe(7)
    store.registrar(imovel('nova', { criadoEm: { toMillis: () => 5000 } }))
    expect(store.itens.map((i) => i.id)).toEqual(['nova', 'a', 'b'])
  })

  it('no escopo "ativos", um imóvel inativado sai da lista e um inativo não entra', async () => {
    const store = useImoveisStore()
    await store.carregar('ativos')
    store.registrar(imovel('a', { status: 'inativo' }))
    expect(store.porId('a')).toBeUndefined()
    store.registrar(imovel('c', { status: 'inativo' }))
    expect(store.porId('c')).toBeUndefined()
  })

  it('sem lista carregada, registrar não inventa uma lista parcial', () => {
    const store = useImoveisStore()
    store.registrar(imovel('a'))
    expect(store.itens).toEqual([])
  })

  it('remover tira da lista', async () => {
    const store = useImoveisStore()
    await store.carregar('todos')
    store.remover('a')
    expect(store.itens.map((i) => i.id)).toEqual(['b'])
  })
})

describe('troca de usuário', () => {
  it('limpa lista e filtros quando o usuário muda ou sai', async () => {
    const auth = useAuthStore()
    auth.usuario = { uid: 'admin' } as Usuario
    const store = useImoveisStore()
    await store.carregar('todos')
    store.filtros.busca = 'flores'
    auth.usuario = null
    await nextTick()
    expect(store.itens).toEqual([])
    expect(store.carregado).toBe(false)
    expect(store.filtros.busca).toBe('')
  })
})

describe('salvar', () => {
  const dados = { tipo: 'Casa', valor: 1 } as unknown as DadosImovel

  it('cria sem id, com o usuário logado como autor, e põe o imóvel na lista', async () => {
    const auth = useAuthStore()
    auth.usuario = { uid: 'joao', nome: 'João Melo' } as Usuario
    const store = useImoveisStore()
    await store.carregar('ativos')
    falso.createImovel.mockResolvedValue(imovel('novo', { criadoEm: { toMillis: () => 5000 } }))

    const salvo = await store.salvar(dados)

    expect(falso.createImovel).toHaveBeenCalledWith(dados, { uid: 'joao', nome: 'João Melo' })
    expect(salvo.id).toBe('novo')
    expect(store.itens.map((i) => i.id)).toEqual(['novo', 'a', 'b'])
  })

  it('atualiza com id e substitui o imóvel na lista', async () => {
    const auth = useAuthStore()
    auth.usuario = { uid: 'joao', nome: 'João Melo' } as Usuario
    const store = useImoveisStore()
    await store.carregar('ativos')
    falso.updateImovel.mockResolvedValue(imovel('a', { valor: 7 }))

    await store.salvar(dados, 'a')

    expect(falso.updateImovel).toHaveBeenCalledWith('a', dados, { uid: 'joao', nome: 'João Melo' })
    expect(store.porId('a')?.valor).toBe(7)
  })

  it('inativar no escopo "ativos" tira o imóvel da lista', async () => {
    const auth = useAuthStore()
    auth.usuario = { uid: 'joao', nome: 'João' } as Usuario
    const store = useImoveisStore()
    await store.carregar('ativos')
    falso.updateImovel.mockResolvedValue(imovel('a', { status: 'inativo' }))
    await store.salvar(dados, 'a')
    expect(store.porId('a')).toBeUndefined()
  })

  it('sem usuário logado, recusa e não grava', async () => {
    const store = useImoveisStore()
    await expect(store.salvar(dados)).rejects.toThrow('Sessão encerrada.')
    expect(falso.createImovel).not.toHaveBeenCalled()
  })
})
