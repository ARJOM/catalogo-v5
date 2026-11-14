import { describe, expect, it } from 'vitest'
import {
  formatarArea,
  formatarData,
  formatarDataHora,
  formatarEndereco,
  formatarMoeda,
  formatarQuartos,
  formatarTelefone,
  iniciais,
  sufixoFinalidade,
} from '@/utils/formatadores'

describe('iniciais', () => {
  it('usa a primeira letra do primeiro e do último nome', () => {
    expect(iniciais('João Melo')).toBe('JM')
    expect(iniciais('maria aparecida da silva')).toBe('MS')
  })

  it('usa as duas primeiras letras quando há um nome só', () => {
    expect(iniciais('Admin')).toBe('AD')
  })

  it('ignora espaços sobrando e devolve vazio para nome vazio', () => {
    expect(iniciais('  Ana   Souza ')).toBe('AS')
    expect(iniciais('   ')).toBe('')
  })
})

describe('formatarMoeda', () => {
  it('usa o padrão brasileiro sem centavos quando o valor é inteiro', () => {
    expect(formatarMoeda(480000)).toBe('R$ 480.000')
    expect(formatarMoeda(1800)).toBe('R$ 1.800')
    expect(formatarMoeda(0)).toBe('R$ 0')
  })
  it('mostra centavos só quando existem', () => {
    expect(formatarMoeda(1800.5)).toBe('R$ 1.800,50')
  })
  it('valor ausente ou inválido vira traço', () => {
    expect(formatarMoeda(null)).toBe('—')
    expect(formatarMoeda(undefined)).toBe('—')
    expect(formatarMoeda(Number.NaN)).toBe('—')
  })
})

describe('sufixoFinalidade', () => {
  it('só o aluguel tem "/mês"', () => {
    expect(sufixoFinalidade('Aluguel')).toBe('/mês')
    expect(sufixoFinalidade('Venda')).toBe('')
  })
})

describe('formatarArea', () => {
  it('formata com separador de milhar e vírgula decimal', () => {
    expect(formatarArea(120)).toBe('120 m²')
    expect(formatarArea(1200.5)).toBe('1.200,5 m²')
    expect(formatarArea(undefined)).toBe('—')
  })
})

describe('formatarQuartos', () => {
  it('só devolve texto quando há quartos preenchidos', () => {
    expect(formatarQuartos(3)).toBe('3 quartos')
    expect(formatarQuartos(1)).toBe('1 quarto')
    expect(formatarQuartos(null)).toBe('')
    expect(formatarQuartos(undefined)).toBe('')
    expect(formatarQuartos(0)).toBe('')
  })
})

describe('formatarTelefone', () => {
  it('formata celular e fixo', () => {
    expect(formatarTelefone('83999990001')).toBe('(83) 99999-0001')
    expect(formatarTelefone('8335310001')).toBe('(83) 3531-0001')
  })
  it('refaz o formato de um número já formatado ou com +55', () => {
    expect(formatarTelefone('(83) 99999-0001')).toBe('(83) 99999-0001')
    expect(formatarTelefone('+55 83 99999-0001')).toBe('(83) 99999-0001')
  })
  it('devolve o original quando não reconhece o formato', () => {
    expect(formatarTelefone('12345')).toBe('12345')
    expect(formatarTelefone(undefined)).toBe('')
  })
})

describe('formatarData e formatarDataHora', () => {
  const data = new Date(2026, 3, 8, 9, 5)
  it('formatam Date e Timestamp do Firestore', () => {
    expect(formatarData(data)).toBe('08/04/2026')
    expect(formatarDataHora(data)).toBe('08/04 · 09:05')
    expect(formatarData({ toDate: () => data })).toBe('08/04/2026')
  })
  it('data ausente ou inválida vira traço', () => {
    expect(formatarData(null)).toBe('—')
    expect(formatarDataHora(new Date('x'))).toBe('—')
  })
})

describe('formatarEndereco', () => {
  it('junta rua, bairro e cidade e omite o que falta', () => {
    expect(
      formatarEndereco({ rua: 'Rua das Flores, 142', bairro: 'Centro', cidade: 'Cajazeiras' }),
    ).toBe('Rua das Flores, 142 — Centro, Cajazeiras')
    expect(formatarEndereco({ rua: 'Estrada Rural', bairro: '', cidade: 'Sousa' })).toBe(
      'Estrada Rural — Sousa',
    )
  })
})
