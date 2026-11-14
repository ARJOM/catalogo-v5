import * as yup from 'yup'
import type { DadosImovel, Imovel } from '@/types'
import { UFS } from '@/utils/estados'
import { FINALIDADES, TIPOS_IMOVEL } from '@/utils/tiposImovel'
import { lerNumero, mascararTelefone, numeroParaCampo, soDigitos } from '@/utils/mascaras'

/** Valores do formulário: tudo texto, como nos campos (os números chegam mascarados). */
export interface ValoresFormImovel {
  tipo: string
  finalidade: string
  valor: string
  areaM2: string
  quartos: string
  caracteristicas: string
  rua: string
  bairro: string
  cidade: string
  estado: string
  captadorId: string
  status: string
  vendedorNome: string
  vendedorTelefone: string
}

export const valoresIniciais = (captadorId = ''): ValoresFormImovel => ({
  tipo: 'Casa',
  finalidade: 'Venda',
  valor: '',
  areaM2: '',
  quartos: '',
  caracteristicas: '',
  rua: '',
  bairro: '',
  cidade: '',
  estado: 'PB',
  captadorId,
  status: 'ativo',
  vendedorNome: '',
  vendedorTelefone: '',
})

const obrigatorio = (mensagem: string) => yup.string().trim().required(mensagem)

export const esquemaImovel = yup.object({
  tipo: yup
    .string()
    .oneOf([...TIPOS_IMOVEL], 'Escolha o tipo.')
    .required('Escolha o tipo.'),
  finalidade: yup
    .string()
    .oneOf([...FINALIDADES], 'Escolha a finalidade.')
    .required('Escolha a finalidade.'),
  valor: yup
    .string()
    .required('Informe o valor.')
    .test('positivo', 'Informe um valor maior que zero.', (v) => lerNumero(v ?? '') > 0),
  areaM2: yup
    .string()
    .required('Informe a área.')
    .test('positiva', 'Informe uma área maior que zero.', (v) => lerNumero(v ?? '') > 0),
  quartos: yup
    .string()
    .defined()
    .test('inteiro', 'Informe um número inteiro de quartos.', (v) => {
      if (!v) return true
      const n = Number(v)
      return Number.isInteger(n) && n >= 0 && n <= 99
    }),
  caracteristicas: yup.string().defined().max(1000, 'Use no máximo 1.000 caracteres.'),
  rua: obrigatorio('Informe a rua.'),
  bairro: obrigatorio('Informe o bairro.'),
  cidade: obrigatorio('Informe a cidade.'),
  estado: yup
    .string()
    .oneOf([...UFS], 'Escolha o estado.')
    .required('Escolha o estado.'),
  captadorId: yup.string().required('Escolha o captador.'),
  status: yup.string().oneOf(['ativo', 'inativo']).required('Escolha o status.'),
  vendedorNome: obrigatorio('Informe o nome do cliente vendedor.'),
  vendedorTelefone: yup
    .string()
    .required('Informe o telefone do cliente vendedor.')
    .test('telefone', 'Telefone inválido. Use DDD + número.', (v) => {
      const digitos = soDigitos(v ?? '').length
      return digitos === 10 || digitos === 11
    }),
})

/** Converte os valores do formulário (texto mascarado) nos dados gravados. */
export function paraDadosImovel(valores: ValoresFormImovel): DadosImovel {
  const quartos = valores.quartos.trim()
  return {
    tipo: valores.tipo as DadosImovel['tipo'],
    finalidade: valores.finalidade as DadosImovel['finalidade'],
    valor: lerNumero(valores.valor),
    areaM2: lerNumero(valores.areaM2),
    quartos: quartos === '' ? null : Number(quartos),
    caracteristicas: valores.caracteristicas.trim(),
    rua: valores.rua.trim(),
    bairro: valores.bairro.trim(),
    cidade: valores.cidade.trim(),
    estado: valores.estado,
    captadorId: valores.captadorId,
    vendedorNome: valores.vendedorNome.trim(),
    vendedorTelefone: soDigitos(valores.vendedorTelefone),
    status: valores.status as DadosImovel['status'],
  }
}

/** Preenche o formulário com um imóvel existente (edição). */
export function deImovel(imovel: Imovel): ValoresFormImovel {
  return {
    tipo: imovel.tipo,
    finalidade: imovel.finalidade,
    valor: numeroParaCampo(imovel.valor),
    areaM2: numeroParaCampo(imovel.areaM2),
    quartos: imovel.quartos == null ? '' : String(imovel.quartos),
    caracteristicas: imovel.caracteristicas ?? '',
    rua: imovel.rua,
    bairro: imovel.bairro,
    cidade: imovel.cidade,
    estado: imovel.estado,
    captadorId: imovel.captadorId,
    status: imovel.status,
    vendedorNome: imovel.vendedorNome,
    vendedorTelefone: mascararTelefone(imovel.vendedorTelefone ?? ''),
  }
}
