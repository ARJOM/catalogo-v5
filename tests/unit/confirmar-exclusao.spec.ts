import { describe, expect, it } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import ConfirmarExclusaoModal from '@/components/ConfirmarExclusaoModal.vue'

const montar = (props: Record<string, unknown> = {}) =>
  mount(ConfirmarExclusaoModal, {
    props: { aberto: true, 'onUpdate:aberto': () => {}, endereco: 'Rua das Flores, 142', ...props },
    attachTo: document.body,
  })

const campo = () => document.body.querySelector<HTMLInputElement>('.modal input')!
const excluir = () =>
  [...document.body.querySelectorAll<HTMLButtonElement>('.modal-ftr button')].find((b) =>
    b.textContent?.includes('Excluir definitivamente'),
  )!

async function digitar(texto: string) {
  campo().value = texto
  campo().dispatchEvent(new Event('input', { bubbles: true }))
  await flushPromises()
}

describe('ConfirmarExclusaoModal', () => {
  it('mostra o endereço a digitar e começa com o botão travado', () => {
    const w = montar()
    expect(document.body.textContent).toContain('Rua das Flores, 142')
    expect(excluir().disabled).toBe(true)
    w.unmount()
  })

  it('só libera o botão quando o endereço digitado confere (sem diferenciar caixa e espaços)', async () => {
    const w = montar()
    await digitar('Rua das Flores')
    expect(excluir().disabled).toBe(true)
    await digitar('  rua  das flores, 142 ')
    expect(excluir().disabled).toBe(false)
    await digitar('Rua das Flores, 143')
    expect(excluir().disabled).toBe(true)
    w.unmount()
  })

  it('confirma ao clicar ou apertar Enter, e só quando confere', async () => {
    const w = montar()
    await digitar('errado')
    excluir().click()
    campo().dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
    await flushPromises()
    expect(w.emitted('confirmar')).toBeUndefined()

    await digitar('Rua das Flores, 142')
    excluir().click()
    expect(w.emitted('confirmar')).toHaveLength(1)
    campo().dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
    expect(w.emitted('confirmar')).toHaveLength(2)
    w.unmount()
  })

  it('endereço vazio nunca libera a exclusão', async () => {
    const w = montar({ endereco: '  ' })
    await digitar('')
    expect(excluir().disabled).toBe(true)
    w.unmount()
  })

  it('durante a exclusão trava tudo; com erro mostra o aviso', async () => {
    const w = montar({ carregando: true, erro: 'Falhou ao apagar.' })
    await digitar('Rua das Flores, 142')
    expect(excluir().disabled).toBe(true)
    expect(campo().disabled).toBe(true)
    expect(document.body.querySelector('[role=alert]')?.textContent).toContain('Falhou ao apagar.')
    w.unmount()
  })

  it('ao reabrir, o campo volta vazio', async () => {
    const w = montar()
    await digitar('Rua das Flores, 142')
    await w.setProps({ aberto: false })
    await w.setProps({ aberto: true })
    await flushPromises()
    expect(campo().value).toBe('')
    expect(excluir().disabled).toBe(true)
    w.unmount()
  })
})
