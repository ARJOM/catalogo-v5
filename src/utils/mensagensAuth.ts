export const MENSAGEM_ACESSO_SUSPENSO =
  'Acesso suspenso. Fale com o administrador para reativar sua conta.'
export const MENSAGEM_SEM_PERFIL =
  'Sua conta não tem perfil de acesso neste sistema. Fale com o administrador.'
export const MENSAGEM_ERRO_PERFIL = 'Não foi possível carregar seu perfil. Tente entrar novamente.'

/** Traduz o código de erro do Firebase Authentication para uma mensagem em português. */
export function mensagemDeErroAuth(codigo: string | undefined): string {
  switch (codigo) {
    case 'auth/invalid-credential':
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/missing-password':
      return 'E-mail ou senha incorretos.'
    case 'auth/invalid-email':
      return 'E-mail inválido.'
    case 'auth/too-many-requests':
      return 'Muitas tentativas. Aguarde alguns minutos e tente novamente.'
    case 'auth/network-request-failed':
      return 'Sem conexão. Verifique sua internet e tente novamente.'
    case 'auth/user-disabled':
      return MENSAGEM_ACESSO_SUSPENSO
    default:
      return 'Não foi possível entrar. Tente novamente.'
  }
}

/** Traduz o erro do Firebase Authentication ao criar uma conta (cadastro de usuário pelo admin). */
export function mensagemDeErroCriacao(codigo: string | undefined): string {
  switch (codigo) {
    case 'auth/email-already-in-use':
      return 'Já existe um usuário com este e-mail.'
    case 'auth/invalid-email':
      return 'E-mail inválido.'
    case 'auth/weak-password':
      return 'Senha muito fraca. Use ao menos 6 caracteres.'
    case 'auth/network-request-failed':
      return 'Sem conexão. Verifique sua internet e tente novamente.'
    case 'permission-denied':
      return 'Você não tem permissão para criar usuários.'
    default:
      return 'Não foi possível criar o usuário. Tente novamente.'
  }
}
