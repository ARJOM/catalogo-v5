import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import type { Usuario } from '@/types'

const falso = vi.hoisted(() => ({
  getEstatisticas: vi.fn<() => Promise<unknown>>(),
  listImoveis: vi.fn<(o?: unknown) => Promise<unknown[]>>(),
  hardDeleteImovel: vi.fn<(id: string) => Promise<void>>(),
}))
vi.mock('@/services/estatisticas', () => ({ getEstatisticas: falso.getEstatisticas }))
vi.mock('@/services/imoveis', () => ({
  listImoveis: falso.listImoveis,
  hardDeleteImovel: falso.hardDeleteImovel,
  getImovel: vi.fn<() => void>(),
  createImovel: vi.fn<() => void>(),
  updateImovel: vi.fn<() => void>(),
  softDeleteImovel: vi.fn<() => void>(),
  atualizarFotos: vi.fn<() => void>(),
}))
vi.mock('@/services/storage', () => ({
  uploadFoto: vi.fn<() => void>(),
  deleteFoto: vi.fn<() => void>(),
}))
vi.mock('@/services/auth', () => ({
  entrar: vi.fn<() => void>(),
  sair: vi.fn<() => void>(),
  observarSessao: vi.fn<() => void>(),
}))
vi.mock('@/services/users', () => ({
  listUsers: vi.fn<() => Promise<unknown[]>>().mockResolvedValue([]),
  observarUsuario: vi.fn<() => void>(),
  getUser: vi.fn<() => void>(),
}))
vi.mock('vue-router', () => ({
  RouterLink: { props: ['to'], template: '<a class="rl"><slot /></a>' },
}))

import AdminView from '@/views/AdminView.vue'
import { useAuthStore } from '@/stores/auth'

const imovel = (id: string, rua: string, status: string) => ({
  id,
  rua,
  cidade: 'Cajazeiras',
  tipo: 'Casa',
  finalidade: 'Venda',
  valor: 480000,
  status,
  fotos: [],
})
const contadores = {
  imoveisAtivos: 24,
  imoveisInativos: 7,
  leads: 58,
  corretoresAtivos: 4,
  imoveisAtivosNoMes: 3,
  leadsNoMes: 12,
}

beforeEach(() => {
  setActivePinia(createPinia())
  useAuthStore().usuario = { uid: 'admin', nome: 'Admin', perfil: 'admin' } as Usuario
  falso.getEstatisticas.mockReset().mockResolvedValue(contadores)
  falso.listImoveis
    .mockReset()
    .mockResolvedValue([
      imovel('a', 'Rua das Flores, 142', 'ativo'),
      imovel('b', 'Estrada Rural s/n', 'inativo'),
    ])
  falso.hardDeleteImovel.mockReset().mockResolvedValue(undefined)
  document.body.innerHTML = ''
})

async function montar() {
  const w = mount(AdminView, { attachTo: document.body })
  await flushPromises()
  return w
}
const valor = (w: ReturnType<typeof mount>, id: string) =>
  w.get(`[data-testid="${id}"] .stat-val`).text()

describe('AdminView — contadores', () => {
  it('mostra os quatro contadores e as variações do mês', async () => {
    const w = await montar()
    expect(valor(w, 'stat-ativos')).toBe('24')
    expect(valor(w, 'stat-inativos')).toBe('7')
    expect(valor(w, 'stat-leads')).toBe('58')
    expect(valor(w, 'stat-corretores')).toBe('4')
    expect(w.get('[data-testid="stat-ativos"]').text()).toContain('+3 este mês')
    expect(w.get('[data-testid="stat-leads"]').text()).toContain('+12 este mês')
  })

  it('falha nos contadores mostra aviso com "Tentar de novo"', async () => {
    falso.getEstatisticas.mockRejectedValueOnce(new Error('offline'))
    const w = await montar()
    expect(w.text()).toContain('Não foi possível carregar os contadores')
    await w
      .findAll('button')
      .find((b) => b.text().includes('Tentar de novo'))!
      .trigger('click')
    await flushPromises()
    expect(valor(w, 'stat-ativos')).toBe('24')
  })
})

describe('AdminView — todos os imóveis', () => {
  it('busca sem filtro de status e lista ativos e inativos com "Ver" e "Excluir"', async () => {
    const w = await montar()
    expect(falso.listImoveis).toHaveBeenCalledWith({})
    const linhas = w.findAll('[data-testid="linha-imovel"]')
    expect(linhas).toHaveLength(2)
    expect(linhas[0]!.text()).toContain('Rua das Flores, 142 — Cajazeiras')
    expect(linhas[1]!.text()).toContain('Inativo')
    for (const l of linhas) {
      expect(l.text()).toContain('Ver')
      expect(l.text()).toContain('Excluir')
    }
  })

  it('"Excluir" só libera depois de digitar o endereço e então apaga e remove a linha', async () => {
    const w = await montar()
    await w
      .findAll('button')
      .find((b) => b.attributes('aria-label')?.startsWith('Excluir Estrada'))!
      .trigger('click')
    const confirmar = () =>
      [...document.body.querySelectorAll('button')].find((b) =>
        b.textContent?.includes('Excluir definitivamente'),
      )!
    expect(confirmar().disabled).toBe(true)
    const campo = document.body.querySelector<HTMLInputElement>('.modal input')!
    campo.value = 'estrada rural s/n'
    campo.dispatchEvent(new Event('input'))
    await flushPromises()
    expect(confirmar().disabled).toBe(false)
    confirmar().click()
    await flushPromises()
    expect(falso.hardDeleteImovel).toHaveBeenCalledWith('b')
    expect(w.findAll('[data-testid="linha-imovel"]')).toHaveLength(1)
    expect(falso.getEstatisticas).toHaveBeenCalledTimes(2) // recontou
    w.unmount()
  })

  it('falha na exclusão mostra o erro, mantém o modal e a linha', async () => {
    falso.hardDeleteImovel.mockRejectedValue(new Error('negado'))
    const w = await montar()
    await w
      .findAll('button')
      .find((b) => b.attributes('aria-label')?.startsWith('Excluir Rua'))!
      .trigger('click')
    const campo = document.body.querySelector<HTMLInputElement>('.modal input')!
    campo.value = 'Rua das Flores, 142'
    campo.dispatchEvent(new Event('input'))
    await flushPromises()
    ;[...document.body.querySelectorAll('button')]
      .find((b) => b.textContent?.includes('Excluir definitivamente'))!
      .click()
    await flushPromises()
    expect(document.body.textContent).toContain('Não foi possível excluir o imóvel')
    expect(w.findAll('[data-testid="linha-imovel"]')).toHaveLength(2)
    w.unmount()
  })
})
