import { describe, expect, it } from 'vitest'
import { CAMPOS_AUDITADOS, diffImovel } from '@/utils/diffImovel'
import type { DadosImovel } from '@/types'

const base: DadosImovel = {
  tipo: 'Casa',
  finalidade: 'Venda',
  valor: 500000,
  areaM2: 120,
  quartos: 3,
  caracteristicas: 'Quintal',
  rua: 'Rua A, 10',
  bairro: 'Centro',
  cidade: 'Cajazeiras',
  estado: 'PB',
  captadorId: 'joao',
  vendedorNome: 'Fulano',
  vendedorTelefone: '83999990000',
  status: 'ativo',
}

describe('diffImovel', () => {
  it('sem alterações, não há mudanças', () => {
    expect(diffImovel(base, { ...base })).toEqual([])
  })

  it('devolve uma mudança por campo alterado, com valor anterior e novo', () => {
    const mudancas = diffImovel(base, { ...base, valor: 480000, bairro: 'Sul', status: 'inativo' })
    expect(mudancas).toEqual([
      { campo: 'valor', valorAnterior: 500000, valorNovo: 480000 },
      { campo: 'bairro', valorAnterior: 'Centro', valorNovo: 'Sul' },
      { campo: 'status', valorAnterior: 'ativo', valorNovo: 'inativo' },
    ])
  })

  it('ignora fotos e campos de auditoria que venham junto do documento', () => {
    const gravado = {
      ...base,
      fotos: ['a'],
      criadoEm: 1,
      criadoPor: 'x',
      atualizadoEm: 1,
      atualizadoPor: 'x',
      deletadoEm: null,
    }
    const novo = {
      ...base,
      fotos: ['b'],
      criadoEm: 2,
      criadoPor: 'y',
      atualizadoEm: 2,
      atualizadoPor: 'y',
      deletadoEm: 9,
    }
    expect(diffImovel(gravado as Partial<DadosImovel>, novo as Partial<DadosImovel>)).toEqual([])
  })

  it('quartos ausente e quartos nulo são a mesma coisa; preencher ou limpar é mudança', () => {
    const semQuartos = { ...base, quartos: undefined }
    expect(diffImovel(semQuartos, { ...base, quartos: null })).toEqual([])
    expect(diffImovel(semQuartos, { ...base, quartos: 2 })).toEqual([
      { campo: 'quartos', valorAnterior: null, valorNovo: 2 },
    ])
    expect(diffImovel(base, { ...base, quartos: null })).toEqual([
      { campo: 'quartos', valorAnterior: 3, valorNovo: null },
    ])
  })

  it('texto diferente só no espaço ou na caixa também é mudança (comparação exata)', () => {
    expect(diffImovel(base, { ...base, rua: 'rua a, 10' })).toHaveLength(1)
  })

  it('cada um dos campos auditados, sozinho, gera exatamente uma mudança', () => {
    const outro: Record<string, unknown> = {
      tipo: 'Terreno',
      finalidade: 'Aluguel',
      valor: 1,
      areaM2: 1,
      quartos: 9,
      caracteristicas: 'x',
      rua: 'x',
      bairro: 'x',
      cidade: 'x',
      estado: 'CE',
      captadorId: 'maria',
      vendedorNome: 'x',
      vendedorTelefone: '1',
      status: 'inativo',
    }
    for (const campo of CAMPOS_AUDITADOS) {
      const mudancas = diffImovel(base, { ...base, [campo]: outro[campo] })
      expect(mudancas.map((m) => m.campo)).toEqual([campo])
    }
  })
})
