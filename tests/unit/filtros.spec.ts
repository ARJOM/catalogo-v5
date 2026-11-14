import { describe, expect, it } from 'vitest'
import type { Imovel } from '@/types'
import {
  filtrarImoveis,
  filtrosVazios,
  lerValor,
  normalizarTexto,
  temFiltroAtivo,
} from '@/utils/filtros'

const imovel = (extra: Partial<Imovel>): Imovel =>
  ({
    id: 'x',
    tipo: 'Casa',
    finalidade: 'Venda',
    valor: 100000,
    areaM2: 100,
    quartos: null,
    caracteristicas: '',
    rua: 'Rua A',
    bairro: 'Centro',
    cidade: 'Cajazeiras',
    estado: 'PB',
    captadorId: 'joao',
    status: 'ativo',
    fotos: [],
    ...extra,
  }) as Imovel

const lista = [
  imovel({ id: 'casa', rua: 'Rua das Flores, 142', valor: 480000 }),
  imovel({
    id: 'apto',
    tipo: 'Apartamento',
    finalidade: 'Aluguel',
    valor: 1800,
    rua: 'Av. Brasil, 88',
    bairro: 'Bairro Novo',
    cidade: 'Sousa',
    captadorId: 'ana',
  }),
  imovel({ id: 'terreno', tipo: 'Terreno', valor: 95000, bairro: 'Zona Sul', status: 'inativo' }),
  imovel({ id: 'sjp', cidade: 'São João do Rio do Peixe', valor: 250000 }),
]
const ids = (r: Imovel[]) => r.map((i) => i.id)

describe('normalizarTexto', () => {
  it('ignora acentos, maiúsculas e espaços nas pontas', () => {
    expect(normalizarTexto('  São João ÇÃ ')).toBe('sao joao ca')
  })
})

describe('lerValor', () => {
  it('lê o formato brasileiro', () => {
    expect(lerValor('1.500')).toBe(1500)
    expect(lerValor('1.500,50')).toBe(1500.5)
    expect(lerValor('R$ 95000')).toBe(95000)
    expect(lerValor('0')).toBe(0)
  })
  it('devolve null para vazio ou sem número', () => {
    expect(lerValor('')).toBeNull()
    expect(lerValor('abc')).toBeNull()
    expect(lerValor(' R$ ')).toBeNull()
  })
})

describe('filtrarImoveis', () => {
  it('sem filtros devolve tudo, em nova lista e na mesma ordem', () => {
    const r = filtrarImoveis(lista, filtrosVazios())
    expect(ids(r)).toEqual(['casa', 'apto', 'terreno', 'sjp'])
    expect(r).not.toBe(lista)
  })

  it('busca em rua, bairro e cidade sem distinguir acentos nem maiúsculas', () => {
    expect(ids(filtrarImoveis(lista, { ...filtrosVazios(), busca: 'FLORES' }))).toEqual(['casa'])
    expect(ids(filtrarImoveis(lista, { ...filtrosVazios(), busca: 'bairro novo' }))).toEqual([
      'apto',
    ])
    expect(ids(filtrarImoveis(lista, { ...filtrosVazios(), busca: 'sao joao' }))).toEqual(['sjp'])
    expect(ids(filtrarImoveis(lista, { ...filtrosVazios(), busca: 'SOUSA' }))).toEqual(['apto'])
  })

  it('na busca todas as palavras precisam aparecer, em qualquer ordem', () => {
    expect(ids(filtrarImoveis(lista, { ...filtrosVazios(), busca: 'cajazeiras flores' }))).toEqual([
      'casa',
    ])
    expect(filtrarImoveis(lista, { ...filtrosVazios(), busca: 'flores sousa' })).toEqual([])
  })

  it('filtra por tipo, finalidade, captador e status', () => {
    expect(ids(filtrarImoveis(lista, { ...filtrosVazios(), tipo: 'Terreno' }))).toEqual(['terreno'])
    expect(ids(filtrarImoveis(lista, { ...filtrosVazios(), finalidade: 'Aluguel' }))).toEqual([
      'apto',
    ])
    expect(ids(filtrarImoveis(lista, { ...filtrosVazios(), captadorId: 'ana' }))).toEqual(['apto'])
    expect(ids(filtrarImoveis(lista, { ...filtrosVazios(), status: 'inativo' }))).toEqual([
      'terreno',
    ])
  })

  it('faixa de valor é inclusiva e aceita só um dos limites', () => {
    expect(ids(filtrarImoveis(lista, { ...filtrosVazios(), valorMin: '95.000' }))).toEqual([
      'casa',
      'terreno',
      'sjp',
    ])
    expect(ids(filtrarImoveis(lista, { ...filtrosVazios(), valorMax: '1.800' }))).toEqual(['apto'])
    expect(
      ids(filtrarImoveis(lista, { ...filtrosVazios(), valorMin: '95000', valorMax: '250000' })),
    ).toEqual(['terreno', 'sjp'])
  })

  it('limite digitado de forma inválida é ignorado', () => {
    expect(filtrarImoveis(lista, { ...filtrosVazios(), valorMin: 'abc' })).toHaveLength(4)
  })

  it('combina todos os filtros com E', () => {
    const filtros = {
      ...filtrosVazios(),
      tipo: 'Casa' as const,
      valorMin: '300000',
      busca: 'cajazeiras',
    }
    expect(ids(filtrarImoveis(lista, filtros))).toEqual(['casa'])
    expect(filtrarImoveis(lista, { ...filtros, finalidade: 'Aluguel' })).toEqual([])
  })

  it('lista vazia continua vazia', () => {
    expect(filtrarImoveis([], { ...filtrosVazios(), busca: 'x' })).toEqual([])
  })
})

describe('temFiltroAtivo', () => {
  it('é falso para filtros vazios ou só com espaços e verdadeiro com qualquer um preenchido', () => {
    expect(temFiltroAtivo(filtrosVazios())).toBe(false)
    expect(temFiltroAtivo({ ...filtrosVazios(), busca: '  ' })).toBe(false)
    expect(temFiltroAtivo({ ...filtrosVazios(), status: 'inativo' })).toBe(true)
  })
})
