import { describe, expect, it } from 'vitest'
import { descreverRegistro, iconeDoRegistro, type Segmento } from '@/utils/historico'

const frase = (partes: Segmento[]) => partes.map((p) => p.texto).join('')
const edicao = (campo: string, valorAnterior: unknown, valorNovo: unknown) =>
  frase(
    descreverRegistro(
      { tipo: 'edicao', campo, valorAnterior, valorNovo },
      (uid) => `Nome de ${uid}`,
    ),
  )

describe('descreverRegistro', () => {
  it('valor: "Valor alterado de R$ 500.000 para R$ 480.000", com os valores em destaque', () => {
    const partes = descreverRegistro({
      tipo: 'edicao',
      campo: 'valor',
      valorAnterior: 500000,
      valorNovo: 480000,
    })
    expect(frase(partes)).toBe('Valor alterado de R$ 500.000 para R$ 480.000')
    expect(partes.filter((p) => p.destaque).map((p) => p.texto)).toEqual([
      'R$ 500.000',
      'R$ 480.000',
    ])
  })

  it('concorda gênero e número com o campo', () => {
    expect(edicao('areaM2', 100, 120)).toBe('Área alterada de 100 m² para 120 m²')
    expect(edicao('rua', 'A', 'B')).toBe('Rua alterada de A para B')
    expect(edicao('quartos', 2, 3)).toBe('Quartos alterados de 2 para 3')
    expect(edicao('caracteristicas', 'a', 'b')).toBe('Características alteradas de a para b')
    expect(edicao('bairro', 'Centro', 'Sul')).toBe('Bairro alterado de Centro para Sul')
  })

  it('formata status, telefone e captador', () => {
    expect(edicao('status', 'ativo', 'inativo')).toBe('Status alterado de Ativo para Inativo')
    expect(edicao('vendedorTelefone', '83999990000', '83988887777')).toBe(
      'Telefone do cliente vendedor alterado de (83) 99999-0000 para (83) 98888-7777',
    )
    expect(edicao('captadorId', 'joao', 'maria')).toBe(
      'Captador alterado de Nome de joao para Nome de maria',
    )
  })

  it('campo opcional preenchido ou limpo tem frase própria', () => {
    expect(edicao('quartos', null, 3)).toBe('Quartos preenchidos com 3')
    expect(edicao('quartos', 3, null)).toBe('Quartos removidos (era 3)')
    expect(edicao('caracteristicas', 'x', '')).toBe('Características removidas (era x)')
  })

  it('criação e fotos', () => {
    const d = (tipo: 'criacao' | 'foto_adicionada' | 'foto_removida') =>
      frase(descreverRegistro({ tipo }))
    expect(d('criacao')).toBe('Imóvel cadastrado no sistema')
    expect(d('foto_adicionada')).toBe('Foto adicionada ao carrossel')
    expect(d('foto_removida')).toBe('Foto removida do carrossel')
  })

  it('campo desconhecido (dado antigo) não quebra', () => {
    expect(edicao('campoAntigo', 1, 2)).toBe('Campo campoAntigo alterado')
  })
})

describe('iconeDoRegistro', () => {
  it('criação é verde; as demais, âmbar', () => {
    expect(iconeDoRegistro('criacao')).toEqual({ icone: 'circle-plus', variante: 'create' })
    expect(iconeDoRegistro('edicao').variante).toBe('edit')
    expect(iconeDoRegistro('foto_removida').icone).toBe('photo-minus')
  })
})
