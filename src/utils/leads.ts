/** Campos do formulário de lead, como vêm dos inputs. */
export interface ValoresLead {
  imovelId: string
  nomeComprador: string
  telefone: string
}

export type ErrosLead = Partial<Record<keyof ValoresLead, string>>

/** Formato "Tipo — Rua" gravado em `Lead.imovelEndereco` (desnormalizado no cadastro). */
export function enderecoDoLead(imovel: { tipo: string; rua: string }): string {
  return `${imovel.tipo} — ${imovel.rua.trim()}`
}

/**
 * Telefone brasileiro só com dígitos (DDD + número), ou `null` se for inválido.
 * Aceita o prefixo 55. Celular: 11 dígitos, o terceiro é 9. Fixo: 10 dígitos, o terceiro vai de 2 a 9.
 */
export function normalizarTelefone(telefone: string): string | null {
  let digitos = telefone.replace(/\D/g, '')
  if (digitos.length > 11 && digitos.startsWith('55')) digitos = digitos.slice(2)
  if (!/^[1-9][1-9]/.test(digitos)) return null
  if (digitos.length === 11) return digitos[2] === '9' ? digitos : null
  if (digitos.length === 10) return /[2-9]/.test(digitos[2]!) ? digitos : null
  return null
}

export function validarLead(valores: ValoresLead): ErrosLead {
  const erros: ErrosLead = {}
  if (!valores.imovelId) erros.imovelId = 'Escolha o imóvel de interesse.'
  const nome = valores.nomeComprador.trim()
  if (!nome) erros.nomeComprador = 'Informe o nome do comprador.'
  else if (nome.length < 2) erros.nomeComprador = 'O nome precisa ter ao menos 2 letras.'
  else if (nome.length > 120) erros.nomeComprador = 'O nome pode ter no máximo 120 caracteres.'
  if (!valores.telefone.trim()) erros.telefone = 'Informe o telefone.'
  else if (!normalizarTelefone(valores.telefone))
    erros.telefone = 'Telefone inválido. Use DDD e número, como (83) 99999-0000.'
  return erros
}
