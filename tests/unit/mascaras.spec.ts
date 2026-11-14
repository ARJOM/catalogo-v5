import { describe, expect, it } from 'vitest'
import { lerNumero, mascararNumero, mascararTelefone, numeroParaCampo } from '@/utils/mascaras'
import { UFS } from '@/utils/estados'
import { deImovel, esquemaImovel, paraDadosImovel, valoresIniciais } from '@/utils/validacaoImovel'
import type { Imovel } from '@/types'

describe('mascararNumero', () => {
  it.each([
    ['', ''],
    ['abc', ''],
    ['1', '1'],
    ['1234', '1.234'],
    ['1234567', '1.234.567'],
    ['1234,5', '1.234,5'],
    ['1234,567', '1.234,56'],
    ['0,5', '0,5'],
    [',5', '0,5'],
    ['007', '7'],
    ['1.234,50', '1.234,50'],
    ['12,3,4', '12,34'],
  ])('%j → %j', (entrada, esperado) => {
    expect(mascararNumero(entrada)).toBe(esperado)
  })

  it('sem casas decimais, a vírgula e o que vem depois são descartados', () => {
    expect(mascararNumero('12,5', 0)).toBe('12')
  })

  it('é idempotente', () => {
    for (const t of ['1234,5', '9.876.543,21', '0,05']) {
      expect(mascararNumero(mascararNumero(t))).toBe(mascararNumero(t))
    }
  })
})

describe('lerNumero / numeroParaCampo', () => {
  it('lê o padrão brasileiro', () => {
    expect(lerNumero('1.234,5')).toBe(1234.5)
    expect(lerNumero('500.000')).toBe(500000)
    expect(lerNumero('')).toBeNaN()
  })
  it('escreve de volta sem zeros à direita', () => {
    expect(numeroParaCampo(1234.5)).toBe('1.234,5')
    expect(numeroParaCampo(500000)).toBe('500.000')
    expect(numeroParaCampo(null)).toBe('')
    expect(lerNumero(numeroParaCampo(480000.75))).toBe(480000.75)
  })
})

describe('mascararTelefone', () => {
  it.each([
    ['', ''],
    ['8', '(8'],
    ['839', '(83) 9'],
    ['83999', '(83) 999'],
    ['8399999', '(83) 9999-9'],
    ['8335310001', '(83) 3531-0001'],
    ['83999990000', '(83) 99999-0000'],
    ['839999900001234', '(83) 99999-0000'],
    ['(83) 99999-0000', '(83) 99999-0000'],
  ])('%j → %j', (entrada, esperado) => {
    expect(mascararTelefone(entrada)).toBe(esperado)
  })
})

describe('UFS', () => {
  it('tem as 27 unidades, sem repetição', () => {
    expect(UFS).toHaveLength(27)
    expect(new Set(UFS).size).toBe(27)
    expect(UFS).toContain('DF')
  })
})

describe('esquemaImovel', () => {
  const valido = () => ({
    ...valoresIniciais('joao'),
    valor: '480.000',
    areaM2: '120',
    rua: 'Rua A, 10',
    bairro: 'Centro',
    cidade: 'Cajazeiras',
    vendedorNome: 'Fulano',
    vendedorTelefone: '(83) 99999-0000',
  })

  it('aceita valores completos', async () => {
    await expect(esquemaImovel.validate(valido())).resolves.toBeTruthy()
  })

  it('mostra a mensagem de cada obrigatório vazio', async () => {
    const erro = await esquemaImovel
      .validate({ ...valoresIniciais(''), rua: '  ' }, { abortEarly: false })
      .catch((e: { errors: string[] }) => e.errors)
    expect(erro).toEqual(
      expect.arrayContaining([
        'Informe o valor.',
        'Informe a área.',
        'Informe a rua.',
        'Informe o bairro.',
        'Informe a cidade.',
        'Escolha o captador.',
        'Informe o nome do cliente vendedor.',
        'Informe o telefone do cliente vendedor.',
      ]),
    )
  })

  it('recusa valor zero, telefone curto e quartos fracionados; quartos vazio é aceito', async () => {
    const e = (campos: object) =>
      esquemaImovel
        .validate({ ...valido(), ...campos }, { abortEarly: false })
        .then(() => [] as string[])
        .catch((x: { errors: string[] }) => x.errors)
    expect(await e({ valor: '0' })).toEqual(['Informe um valor maior que zero.'])
    expect(await e({ vendedorTelefone: '(83) 9999' })).toEqual([
      'Telefone inválido. Use DDD + número.',
    ])
    expect(await e({ quartos: '2,5' })).toEqual(['Informe um número inteiro de quartos.'])
    expect(await e({ quartos: '' })).toEqual([])
    expect(await e({ estado: 'XX' })).toEqual(['Escolha o estado.'])
  })
})

describe('paraDadosImovel / deImovel', () => {
  it('converte texto mascarado em dados e volta', () => {
    const valores = {
      ...valoresIniciais('joao'),
      valor: '1.800,5',
      areaM2: '85',
      quartos: '',
      rua: ' Rua A, 10 ',
      bairro: 'Centro',
      cidade: 'Cajazeiras',
      vendedorNome: ' Fulano ',
      vendedorTelefone: '(83) 99999-0000',
    }
    const dados = paraDadosImovel(valores)
    expect(dados).toMatchObject({
      valor: 1800.5,
      areaM2: 85,
      quartos: null,
      rua: 'Rua A, 10',
      vendedorNome: 'Fulano',
      vendedorTelefone: '83999990000',
    })
    const volta = deImovel({ ...dados, id: 'x', fotos: [] } as unknown as Imovel)
    expect(volta.valor).toBe('1.800,5')
    expect(volta.vendedorTelefone).toBe('(83) 99999-0000')
    expect(volta.quartos).toBe('')
  })
})
