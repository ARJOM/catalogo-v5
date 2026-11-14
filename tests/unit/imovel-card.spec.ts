import { describe, expect, it } from 'vitest'
import { mount, RouterLinkStub } from '@vue/test-utils'
import ImovelCard from '@/components/ImovelCard.vue'
import ImovelRow from '@/components/ImovelRow.vue'
import type { Imovel } from '@/types'

const imovel = (extra: Partial<Imovel> = {}): Imovel =>
  ({
    id: 'casa-flores',
    tipo: 'Casa',
    finalidade: 'Venda',
    valor: 480000,
    areaM2: 120,
    quartos: 3,
    rua: 'Rua das Flores, 142',
    bairro: 'Centro',
    cidade: 'Cajazeiras',
    captadorId: 'joao',
    status: 'ativo',
    fotos: [],
    ...extra,
  }) as Imovel

const montar = (componente: typeof ImovelCard | typeof ImovelRow, props: object) =>
  mount(componente as typeof ImovelCard, {
    props: props as never,
    global: { stubs: { RouterLink: RouterLinkStub } },
  })

describe('ImovelCard', () => {
  it('mostra valor, endereço, área, quartos e captador', () => {
    const t = montar(ImovelCard, { imovel: imovel(), captadorNome: 'João Melo' }).text()
    expect(t).toContain('R$ 480.000')
    expect(t).toContain('Rua das Flores, 142 — Centro, Cajazeiras')
    expect(t).toContain('3 quartos')
    expect(t).toContain('120 m²')
    expect(t).toContain('João Melo')
    expect(t).not.toContain('/mês')
  })

  it('aluguel ganha o sufixo "/mês"', () => {
    const t = montar(ImovelCard, {
      imovel: imovel({ finalidade: 'Aluguel', valor: 1800 }),
      captadorNome: 'Ana',
    }).text()
    expect(t).toContain('R$ 1.800')
    expect(t).toContain('/mês')
  })

  it.each([null, undefined, 0])('quartos %s: a linha de quartos não aparece', (quartos) => {
    const t = montar(ImovelCard, { imovel: imovel({ quartos }), captadorNome: 'x' }).text()
    expect(t).not.toContain('quarto')
    expect(t).toContain('120 m²')
  })

  it('sem foto mostra o placeholder; com foto mostra a imagem', async () => {
    const sem = montar(ImovelCard, { imovel: imovel(), captadorNome: 'x' })
    expect(sem.find('[data-testid="placeholder-foto"]').exists()).toBe(true)
    expect(sem.find('img').exists()).toBe(false)

    const com = montar(ImovelCard, {
      imovel: imovel({ fotos: ['https://exemplo.test/1.jpg', 'https://exemplo.test/2.jpg'] }),
      captadorNome: 'x',
    })
    expect(com.find('img').attributes('src')).toBe('https://exemplo.test/1.jpg')
    expect(com.find('[data-testid="placeholder-foto"]').exists()).toBe(false)
    expect(com.findAll('.dot')).toHaveLength(2)

    // Foto que não carrega volta ao placeholder.
    await com.find('img').trigger('error')
    expect(com.find('img').exists()).toBe(false)
    expect(com.find('[data-testid="placeholder-foto"]').exists()).toBe(true)
  })

  it('imóvel inativo mostra o selo Inativo e o link aponta para o detalhe', () => {
    const w = montar(ImovelCard, { imovel: imovel({ status: 'inativo' }), captadorNome: 'x' })
    expect(w.text()).toContain('Inativo')
    expect(w.findComponent(RouterLinkStub).props('to')).toEqual({
      name: 'imovel-detalhe',
      params: { id: 'casa-flores' },
    })
  })

  it('tipo desconhecido não quebra', () => {
    const w = montar(ImovelCard, { imovel: imovel({ tipo: 'Galpão' as never }), captadorNome: 'x' })
    expect(w.find('[data-testid="placeholder-foto"]').exists()).toBe(true)
  })
})

describe('ImovelRow', () => {
  it('mostra sufixo "/mês" só no aluguel e usa placeholder sem foto', () => {
    const venda = montar(ImovelRow, { imovel: imovel() })
    expect(venda.text()).toContain('R$ 480.000')
    expect(venda.text()).not.toContain('/mês')
    expect(venda.find('[data-testid="placeholder-foto"]').exists()).toBe(true)

    const aluguel = montar(ImovelRow, { imovel: imovel({ finalidade: 'Aluguel', valor: 1800 }) })
    expect(aluguel.text()).toContain('/mês')
  })
})
