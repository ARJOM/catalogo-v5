import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import type { Usuario } from '@/types'

const falso = vi.hoisted(() => ({
  getImovel: vi.fn<(id: string) => Promise<unknown>>(),
  softDeleteImovel: vi.fn<(id: string, autor: unknown) => Promise<unknown>>(),
  replace: vi.fn<(destino: unknown) => Promise<void>>(),
}))
vi.mock('@/services/imoveis', () => ({
  listImoveis: vi.fn<() => void>(),
  getImovel: falso.getImovel,
  softDeleteImovel: falso.softDeleteImovel,
  createImovel: vi.fn<() => void>(),
  updateImovel: vi.fn<() => void>(),
  atualizarFotos: vi.fn<() => void>(),
}))
vi.mock('@/services/storage', () => ({
  uploadFoto: vi.fn<() => void>(),
  deleteFoto: vi.fn<() => void>(),
}))
vi.mock('@/services/historico', () => ({
  listHistorico: vi.fn<() => Promise<unknown[]>>().mockResolvedValue([]),
}))
vi.mock('@/services/users', () => ({
  listUsers: vi.fn<() => Promise<unknown[]>>().mockResolvedValue([]),
  observarUsuario: vi.fn<() => void>(),
  getUser: vi.fn<() => void>(),
}))
vi.mock('@/services/auth', () => ({
  entrar: vi.fn<() => void>(),
  sair: vi.fn<() => void>(),
  observarSessao: vi.fn<() => void>(),
}))
vi.mock('vue-router', () => ({
  RouterLink: { template: '<a><slot /></a>' },
  useRoute: () => ({ params: { id: 'x1' } }),
  useRouter: () => ({
    replace: falso.replace,
    push: vi.fn<() => void>(),
    back: vi.fn<() => void>(),
  }),
}))

import ImovelDetalheView from '@/views/ImovelDetalheView.vue'
import { useAuthStore } from '@/stores/auth'
import { useImoveisStore } from '@/stores/imoveis'

const imovel = (status: string) => ({
  id: 'x1',
  tipo: 'Casa',
  finalidade: 'Venda',
  valor: 1000,
  areaM2: 10,
  rua: 'Rua A',
  bairro: 'B',
  cidade: 'C',
  estado: 'PB',
  captadorId: 'joao',
  vendedorNome: 'F',
  vendedorTelefone: '',
  status,
  fotos: [],
  criadoEm: { toMillis: () => 1 },
})

const botaoInativar = (w: ReturnType<typeof mount>) =>
  w.findAll('button').find((b) => b.attributes('aria-label') === 'Inativar imóvel')

beforeEach(() => {
  setActivePinia(createPinia())
  useAuthStore().usuario = { uid: 'joao', nome: 'João Melo', perfil: 'corretor' } as Usuario
  falso.getImovel.mockReset().mockResolvedValue(imovel('ativo'))
  falso.softDeleteImovel.mockReset()
  falso.replace.mockReset().mockResolvedValue()
})

describe('ImovelDetalheView — inativar', () => {
  it('só mostra "Inativar" em imóvel ativo', async () => {
    falso.getImovel.mockResolvedValue(imovel('inativo'))
    const w = mount(ImovelDetalheView, { attachTo: document.body })
    await flushPromises()
    expect(botaoInativar(w)).toBeUndefined()
    w.unmount()
  })

  it('pede confirmação e Cancelar não inativa', async () => {
    const w = mount(ImovelDetalheView, { attachTo: document.body })
    await flushPromises()
    await botaoInativar(w)!.trigger('click')
    expect(document.body.textContent).toContain('Inativar imóvel?')

    const cancelar = [...document.body.querySelectorAll('.modal-ftr button')].find((b) =>
      b.textContent?.includes('Cancelar'),
    )
    ;(cancelar as HTMLElement).click()
    await flushPromises()
    expect(falso.softDeleteImovel).not.toHaveBeenCalled()
    expect(document.body.textContent).not.toContain('Inativar imóvel?')
    w.unmount()
  })

  it('confirmando, inativa, tira o imóvel da lista do corretor e volta ao catálogo', async () => {
    falso.softDeleteImovel.mockResolvedValue(imovel('inativo'))
    const w = mount(ImovelDetalheView, { attachTo: document.body })
    const store = useImoveisStore()
    store.itens = [imovel('ativo') as never]
    store.escopo = 'ativos'
    await flushPromises()
    await botaoInativar(w)!.trigger('click')

    const confirmar = [...document.body.querySelectorAll('.modal-ftr button')].find((b) =>
      b.textContent?.includes('Inativar'),
    )
    ;(confirmar as HTMLElement).click()
    await flushPromises()

    expect(falso.softDeleteImovel).toHaveBeenCalledWith('x1', { uid: 'joao', nome: 'João Melo' })
    expect(store.porId('x1')).toBeUndefined()
    expect(falso.replace).toHaveBeenCalledWith({ name: 'catalogo' })
    w.unmount()
  })

  it('falha ao inativar mostra aviso e mantém a tela', async () => {
    falso.softDeleteImovel.mockRejectedValue(new Error('offline'))
    const w = mount(ImovelDetalheView, { attachTo: document.body })
    await flushPromises()
    await botaoInativar(w)!.trigger('click')
    const confirmar = [...document.body.querySelectorAll('.modal-ftr button')].find((b) =>
      b.textContent?.includes('Inativar'),
    )
    ;(confirmar as HTMLElement).click()
    await flushPromises()
    expect(document.body.textContent).toContain('Não foi possível inativar o imóvel')
    expect(falso.replace).not.toHaveBeenCalled()
    w.unmount()
  })
})
