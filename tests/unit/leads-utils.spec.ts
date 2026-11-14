import { describe, expect, it } from 'vitest'
import { enderecoDoLead, normalizarTelefone, validarLead } from '@/utils/leads'

describe('enderecoDoLead', () => {
  it('usa o formato "Tipo — Rua"', () => {
    expect(enderecoDoLead({ tipo: 'Casa', rua: ' Rua das Flores, 142 ' })).toBe(
      'Casa — Rua das Flores, 142',
    )
  })
})

describe('normalizarTelefone', () => {
  it.each([
    ['(83) 99999-0000', '83999990000'],
    ['83 3531-0001', '8335310001'],
    ['+55 83 99999-0000', '83999990000'],
  ])('aceita %s', (entrada, saida) => expect(normalizarTelefone(entrada)).toBe(saida))

  it.each(['', '12345', '(03) 99999-0000', '(83) 89999-0000', '(83) 1531-0001', 'abc'])(
    'rejeita "%s"',
    (entrada) => expect(normalizarTelefone(entrada)).toBeNull(),
  )
})

describe('validarLead', () => {
  const ok = { imovelId: 'i1', nomeComprador: 'Maria Aparecida', telefone: '(83) 98888-1234' }
  it('aceita lead completo', () => expect(validarLead(ok)).toEqual({}))
  it('exige imóvel, nome e telefone', () => {
    expect(Object.keys(validarLead({ imovelId: '', nomeComprador: ' ', telefone: '' })).sort()).toEqual(
      ['imovelId', 'nomeComprador', 'telefone'],
    )
  })
  it('rejeita telefone inválido', () => {
    expect(validarLead({ ...ok, telefone: '123' }).telefone).toMatch(/inválido/)
  })
})
