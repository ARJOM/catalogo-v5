import type { Perfil } from '@/types'

export interface ValoresUsuario {
  nome: string
  email: string
  senha: string
  perfil: Perfil | ''
}
export type ErrosUsuario = Partial<Record<keyof ValoresUsuario, string>>

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
export const TAMANHO_MINIMO_SENHA = 6

/** Na edição só o nome (e o perfil) mudam: e-mail e senha não são validados. */
export function validarUsuario(valores: ValoresUsuario, edicao: boolean): ErrosUsuario {
  const erros: ErrosUsuario = {}
  if (!valores.nome.trim()) erros.nome = 'Informe o nome.'
  if (!valores.perfil) erros.perfil = 'Escolha o perfil.'
  if (!edicao) {
    if (!valores.email.trim()) erros.email = 'Informe o e-mail.'
    else if (!EMAIL.test(valores.email.trim())) erros.email = 'E-mail inválido.'
    if (!valores.senha) erros.senha = 'Informe a senha inicial.'
    else if (valores.senha.length < TAMANHO_MINIMO_SENHA)
      erros.senha = `A senha precisa de ao menos ${TAMANHO_MINIMO_SENHA} caracteres.`
  }
  return erros
}
