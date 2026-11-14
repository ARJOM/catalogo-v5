import { beforeEach, describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import type { Usuario } from '@/types'

const falso = vi.hoisted(() => ({
  createImovel: vi.fn<(dados: unknown, autor: unknown) => Promise<unknown>>(),
  push: vi.fn<(destino: unknown) => Promise<void>>(),
  replace: vi.fn<(destino: unknown) => Promise<void>>(),
}))
vi.mock('@/services/imoveis', () => ({
  listImoveis: vi.fn<() => void>(),
  getImovel: vi.fn<() => void>(),
  createImovel: falso.createImovel,
  updateImovel: vi.fn<() => void>(),
}))
vi.mock('@/services/auth', () => ({
  entrar: vi.fn<() => void>(),
  sair: vi.fn<() => void>(),
  observarSessao: vi.fn<() => void>(),
}))
vi.mock('@/services/users', () => ({
  observarUsuario: vi.fn<() => void>(),
  getUser: vi.fn<() => void>(),
  listUsers: vi.fn<() => Promise<unknown[]>>().mockResolvedValue([
    { uid: 'joao', nome: 'João Melo', ativo: true },
    { uid: 'maria', nome: 'Maria Lima', ativo: true },
    { uid: 'ana', nome: 'Ana Souza', ativo: false },
  ]),
}))
vi.mock('vue-router', () => ({
  useRouter: () => ({ push: falso.push, replace: falso.replace, back: vi.fn<() => void>() }),
  useRoute: () => ({ params: {} }),
}))

import ImovelFormView from '@/views/ImovelFormView.vue'
import { useAuthStore } from '@/stores/auth'

function montar() {
  setActivePinia(createPinia())
  useAuthStore().usuario = { uid: 'joao', nome: 'João Melo', perfil: 'corretor' } as Usuario
  return mount(ImovelFormView, { attachTo: document.body })
}

const campo = (w: ReturnType<typeof montar>, rotulo: string) => {
  const label = w.findAll('label').find((l) => l.text().startsWith(rotulo))
  if (!label) throw new Error(`Campo "${rotulo}" não encontrado`)
  return w.find(`#${CSS.escape(label.attributes('for')!)}`)
}

/** Envia o formulário e espera a validação (assíncrona) e a gravação terminarem. */
async function enviar(w: ReturnType<typeof montar>) {
  await w.find('form').trigger('submit')
  await nextTick()
  await vi.waitFor(() =>
    expect(w.find('button[type=submit]').attributes('disabled')).toBeUndefined(),
  )
  await flushPromises()
}

beforeEach(() => {
  falso.createImovel.mockReset()
  falso.push.mockReset()
  falso.replace.mockReset().mockResolvedValue()
})

describe('ImovelFormView', () => {
  it('captador vem preenchido com o usuário logado e lista só os ativos', async () => {
    const w = montar()
    await flushPromises()
    const select = campo(w, 'Captador')
    expect((select.element as HTMLSelectElement).value).toBe('joao')
    expect(select.findAll('option').map((o) => o.text())).toEqual([
      'Escolha o captador',
      'João Melo',
      'Maria Lima',
    ])
  })

  it('tem as 27 UFs', () => {
    const w = montar()
    expect(campo(w, 'Estado').findAll('option')).toHaveLength(27)
  })

  it('campos obrigatórios vazios impedem o envio e mostram a mensagem junto ao campo', async () => {
    const w = montar()
    await flushPromises()
    await enviar(w)
    expect(falso.createImovel).not.toHaveBeenCalled()
    const erros = w.findAll('.ferr').map((e) => e.text())
    expect(erros).toEqual(
      expect.arrayContaining([
        'Informe o valor.',
        'Informe a área.',
        'Informe a rua.',
        'Informe o bairro.',
        'Informe a cidade.',
        'Informe o nome do cliente vendedor.',
        'Informe o telefone do cliente vendedor.',
      ]),
    )
    expect(campo(w, 'Rua').attributes('aria-invalid')).toBe('true')
    w.unmount()
  })

  it('aplica as máscaras de valor, área, quartos e telefone', async () => {
    const w = montar()
    await campo(w, 'Valor').setValue('1234567,891')
    expect((campo(w, 'Valor').element as HTMLInputElement).value).toBe('1.234.567,89')
    await campo(w, 'Área').setValue('abc12')
    expect((campo(w, 'Área').element as HTMLInputElement).value).toBe('12')
    await campo(w, 'Quartos').setValue('3a')
    expect((campo(w, 'Quartos').element as HTMLInputElement).value).toBe('3')
    await campo(w, 'Telefone').setValue('83999990000')
    expect((campo(w, 'Telefone').element as HTMLInputElement).value).toBe('(83) 99999-0000')
    w.unmount()
  })

  it('envia os dados convertidos e abre o detalhe do imóvel criado', async () => {
    falso.createImovel.mockResolvedValue({
      id: 'novo',
      status: 'ativo',
      criadoEm: { toMillis: () => 1 },
    })
    const w = montar()
    await flushPromises()
    await campo(w, 'Valor').setValue('480000')
    await campo(w, 'Área').setValue('120')
    await campo(w, 'Rua').setValue('Rua A, 10')
    await campo(w, 'Bairro').setValue('Centro')
    await campo(w, 'Cidade').setValue('Cajazeiras')
    await campo(w, 'Nome do cliente').setValue('Fulano')
    await campo(w, 'Telefone').setValue('83999990000')
    await enviar(w)

    expect(falso.createImovel).toHaveBeenCalledWith(
      expect.objectContaining({
        valor: 480000,
        areaM2: 120,
        quartos: null,
        captadorId: 'joao',
        estado: 'PB',
        vendedorTelefone: '83999990000',
        status: 'ativo',
      }),
      { uid: 'joao', nome: 'João Melo' },
    )
    expect(falso.replace).toHaveBeenCalledWith({ name: 'imovel-detalhe', params: { id: 'novo' } })
    w.unmount()
  })

  it('mostra aviso se a gravação falhar e fica na tela', async () => {
    falso.createImovel.mockRejectedValue(new Error('falhou'))
    const w = montar()
    await flushPromises()
    await campo(w, 'Valor').setValue('1')
    await campo(w, 'Área').setValue('1')
    await campo(w, 'Rua').setValue('R')
    await campo(w, 'Bairro').setValue('B')
    await campo(w, 'Cidade').setValue('C')
    await campo(w, 'Nome do cliente').setValue('F')
    await campo(w, 'Telefone').setValue('83999990000')
    await enviar(w)
    expect(w.find('[role="alert"]').text()).toContain('Não foi possível salvar o imóvel')
    expect(falso.replace).not.toHaveBeenCalled()
    w.unmount()
  })
})
