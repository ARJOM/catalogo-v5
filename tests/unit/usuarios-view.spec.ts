import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
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

import UsuariosView from '@/views/UsuariosView.vue'
import { useAuthStore } from '@/stores/auth'

const u = (uid: string, nome: string, perfil: string, ativo = true) =>
  ({ uid, nome, email: `${uid}@t.com`, perfil, ativo }) as Usuario

beforeEach(() => {
  setActivePinia(createPinia())
  useAuthStore().usuario = u('admin', 'Admin', 'admin')
  falso.listUsers
    .mockReset()
    .mockResolvedValue([
      u('admin', 'Admin', 'admin'),
      u('ana', 'Ana Souza', 'corretor', false),
      u('joao', 'João Melo', 'corretor'),
    ])
  falso.createUser.mockReset()
  falso.updateUser.mockReset().mockResolvedValue(undefined)
  falso.toggleAtivo.mockReset().mockResolvedValue(undefined)
  document.body.innerHTML = ''
})

async function montar() {
  const w = mount(UsuariosView, { attachTo: document.body })
  await flushPromises()
  return w
}
const linha = (w: ReturnType<typeof mount>, nome: string) =>
  w.findAll('[data-testid="linha-usuario"]').find((l) => l.text().includes(nome))!
const botoes = (l: ReturnType<typeof linha>) => l.findAll('button').map((b) => b.text())

describe('UsuariosView', () => {
  it('lista todos os usuários, inclusive os inativos', async () => {
    const w = await montar()
    expect(w.findAll('[data-testid="linha-usuario"]')).toHaveLength(3)
    expect(w.text()).toContain('3 usuários cadastrados')
  })

  it('na linha do próprio admin só aparece "Editar"; nas demais, inativar ou reativar', async () => {
    const w = await montar()
    expect(botoes(linha(w, 'Admin'))).toEqual(['Editar'])
    expect(botoes(linha(w, 'João Melo'))).toEqual(['Editar', 'Inativar'])
    expect(botoes(linha(w, 'Ana Souza'))).toEqual(['Editar', 'Reativar'])
  })

  it('inativar chama o serviço e a linha passa a oferecer "Reativar"', async () => {
    const w = await montar()
    await linha(w, 'João Melo').findAll('button')[1]!.trigger('click')
    await flushPromises()
    expect(falso.toggleAtivo).toHaveBeenCalledWith('joao', false)
    expect(botoes(linha(w, 'João Melo'))).toEqual(['Editar', 'Reativar'])
  })

  it('falha ao inativar mostra aviso e mantém a linha', async () => {
    falso.toggleAtivo.mockRejectedValue(new Error('negado'))
    const w = await montar()
    await linha(w, 'João Melo').findAll('button')[1]!.trigger('click')
    await flushPromises()
    expect(w.find('[role="alert"]').text()).toContain('Não foi possível inativar João Melo')
    expect(botoes(linha(w, 'João Melo'))).toContain('Inativar')
  })

  it('"Novo" abre o modal e valida os campos antes de chamar o serviço', async () => {
    const w = await montar()
    await w
      .findAll('button')
      .find((b) => b.text().includes('Novo'))!
      .trigger('click')
    expect(document.body.textContent).toContain('Novo usuário')
    const criar = [...document.body.querySelectorAll('button')].find((b) =>
      b.textContent?.includes('Criar usuário'),
    )!
    criar.click()
    await flushPromises()
    expect(document.body.textContent).toContain('Informe o nome.')
    expect(document.body.textContent).toContain('Informe o e-mail.')
    expect(document.body.textContent).toContain('Informe a senha inicial.')
    expect(falso.createUser).not.toHaveBeenCalled()
    w.unmount()
  })

  it('cria o usuário, fecha o modal e mostra a nova linha', async () => {
    falso.createUser.mockResolvedValue(u('maria', 'Maria Lima', 'corretor'))
    const w = await montar()
    await w
      .findAll('button')
      .find((b) => b.text().includes('Novo'))!
      .trigger('click')
    const campo = (rotulo: string) =>
      [...document.body.querySelectorAll('.fgrp')]
        .find((g) => g.querySelector('label')?.textContent === rotulo)!
        .querySelector('input')!
    for (const [rotulo, valor] of [
      ['Nome', 'Maria Lima'],
      ['E-mail', 'maria@t.com'],
      ['Senha inicial', 'abc12345'],
    ] as const) {
      const input = campo(rotulo)
      input.value = valor
      input.dispatchEvent(new Event('input'))
    }
    ;[...document.body.querySelectorAll('button')]
      .find((b) => b.textContent?.includes('Criar usuário'))!
      .click()
    await flushPromises()
    expect(falso.createUser).toHaveBeenCalledWith({
      nome: 'Maria Lima',
      email: 'maria@t.com',
      senha: 'abc12345',
      perfil: 'corretor',
    })
    expect(document.body.textContent).not.toContain('Novo usuário')
    expect(w.findAll('[data-testid="linha-usuario"]')).toHaveLength(4)
    w.unmount()
  })

  it('e-mail duplicado: mostra a mensagem no modal e o mantém aberto', async () => {
    const erro = Object.assign(new Error('Já existe um usuário com este e-mail.'), {
      name: 'ErroCriarUsuario',
    })
    falso.createUser.mockRejectedValue(erro)
    const w = await montar()
    await w
      .findAll('button')
      .find((b) => b.text().includes('Novo'))!
      .trigger('click')
    const preencher = (rotulo: string, valor: string) => {
      const input = [...document.body.querySelectorAll('.fgrp')]
        .find((g) => g.querySelector('label')?.textContent === rotulo)!
        .querySelector('input')!
      input.value = valor
      input.dispatchEvent(new Event('input'))
    }
    preencher('Nome', 'Outro')
    preencher('E-mail', 'joao@t.com')
    preencher('Senha inicial', 'abc12345')
    ;[...document.body.querySelectorAll('button')]
      .find((b) => b.textContent?.includes('Criar usuário'))!
      .click()
    await flushPromises()
    expect(document.body.textContent).toContain('Já existe um usuário com este e-mail.')
    expect(document.body.textContent).toContain('Novo usuário')
    w.unmount()
  })

  it('editar o próprio admin trava o perfil', async () => {
    const w = await montar()
    await linha(w, 'Admin').findAll('button')[0]!.trigger('click')
    const selects = document.body.querySelectorAll('select')
    expect(selects[0]!.disabled).toBe(true)
    expect(document.body.textContent).toContain('Você não pode alterar o seu próprio perfil.')
    w.unmount()
  })
})
