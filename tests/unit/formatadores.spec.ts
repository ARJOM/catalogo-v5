import { describe, expect, it } from 'vitest'
import { iniciais } from '@/utils/formatadores'

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
