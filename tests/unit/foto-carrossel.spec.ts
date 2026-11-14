import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import FotoCarrossel from '@/components/FotoCarrossel.vue'

const fotos = ['https://x.test/1.jpg', 'https://x.test/2.jpg', 'https://x.test/3.jpg']
const montar = (lista: string[]) => mount(FotoCarrossel, { props: { fotos: lista, tipo: 'Casa' } })

describe('FotoCarrossel', () => {
  it('sem fotos mostra o placeholder, sem setas nem miniaturas', () => {
    const w = montar([])
    expect(w.find('[data-testid="placeholder-foto"]').exists()).toBe(true)
    expect(w.find('.car-btn').exists()).toBe(false)
    expect(w.find('.thumb').exists()).toBe(false)
    expect(w.text()).toContain('Sem fotos')
  })

  it('com uma foto não mostra setas nem miniaturas', () => {
    const w = montar(['https://x.test/1.jpg'])
    expect(w.find('img').attributes('src')).toBe('https://x.test/1.jpg')
    expect(w.find('.car-btn').exists()).toBe(false)
  })

  it('setas avançam e voltam circularmente; miniatura escolhe a foto', async () => {
    const w = montar(fotos)
    expect(w.text()).toContain('Foto 1 de 3')
    await w.find('[aria-label="Foto anterior"]').trigger('click')
    expect(w.text()).toContain('Foto 3 de 3')
    await w.find('[aria-label="Próxima foto"]').trigger('click')
    expect(w.text()).toContain('Foto 1 de 3')
    await w.findAll('.thumb')[1]!.trigger('click')
    expect(w.find('.carousel img').attributes('src')).toBe(fotos[1])
    expect(w.findAll('.thumb')[1]!.classes()).toContain('on')
  })

  it('setas do teclado navegam', async () => {
    const w = montar(fotos)
    await w.find('.carousel').trigger('keydown', { key: 'ArrowRight' })
    expect(w.text()).toContain('Foto 2 de 3')
  })

  it('foto que não carrega vira placeholder', async () => {
    const w = montar(fotos)
    await w.find('.carousel img').trigger('error')
    expect(w.find('.carousel img').exists()).toBe(false)
    expect(w.find('.carousel [data-testid="placeholder-foto"]').exists()).toBe(true)
  })

  it('índice acompanha a lista quando ela encolhe', async () => {
    const w = montar(fotos)
    await w.findAll('.thumb')[2]!.trigger('click')
    await w.setProps({ fotos: [fotos[0]!] })
    expect(w.text()).toContain('Foto 1 de 1')
  })
})
