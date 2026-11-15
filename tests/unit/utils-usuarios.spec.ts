import { describe, expect, it } from 'vitest'
import { validarUsuario } from '@/utils/usuarios'
import { mensagemDeErroCriacao } from '@/utils/mensagensAuth'

const ok = { nome: 'Maria', email: 'm@t.com', senha: '123456', perfil: 'corretor' as const }

describe('validarUsuario', () => {
  it('dados completos passam', () => expect(validarUsuario(ok, false)).toEqual({}))
  it('exige nome, e-mail, senha e perfil na criação', () => {
    expect(
      Object.keys(validarUsuario({ nome: '', email: '', senha: '', perfil: '' }, false)),
    ).toEqual(['nome', 'perfil', 'email', 'senha'])
  })
  it('rejeita e-mail malformado e senha curta', () => {
    expect(validarUsuario({ ...ok, email: 'abc', senha: '123' }, false)).toEqual({
      email: 'E-mail inválido.',
      senha: 'A senha precisa de ao menos 6 caracteres.',
    })
  })
  it('na edição ignora e-mail e senha', () => {
    expect(validarUsuario({ ...ok, email: '', senha: '' }, true)).toEqual({})
  })
})

describe('mensagemDeErroCriacao', () => {
  it('traduz e-mail duplicado', () => {
    expect(mensagemDeErroCriacao('auth/email-already-in-use')).toBe(
      'Já existe um usuário com este e-mail.',
    )
  })
  it('tem mensagem genérica para o resto', () => {
    expect(mensagemDeErroCriacao('xyz')).toBe('Não foi possível criar o usuário. Tente novamente.')
  })
})
