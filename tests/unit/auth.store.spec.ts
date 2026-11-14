import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import type { Usuario } from '@/types'

// Simula os serviços: nenhum teste toca o Firebase, nem o emulador.
const falso = vi.hoisted(() => ({
  aoMudarSessao: null as null | ((s: { uid: string } | null) => void),
  aoMudarPerfil: null as null | ((u: unknown) => void),
  aoFalharPerfil: null as null | ((e: Error) => void),
  escutaEncerrada: false,
  entrar: vi.fn<(email: string, senha: string, lembrar: boolean) => Promise<{ uid: string }>>(),
  sair: vi.fn<() => Promise<void>>(),
}))

vi.mock('@/services/auth', () => ({
  entrar: falso.entrar,
  sair: falso.sair,
  observarSessao: (cb: (s: { uid: string } | null) => void) => {
    falso.aoMudarSessao = cb
    return () => {}
  },
}))
vi.mock('@/services/users', () => ({
  observarUsuario: (_uid: string, aoMudar: (u: unknown) => void, aoFalhar: (e: Error) => void) => {
    falso.aoMudarPerfil = aoMudar
    falso.aoFalharPerfil = aoFalhar
    falso.escutaEncerrada = false
    return () => {
      falso.escutaEncerrada = true
    }
  },
}))

import { ErroLogin, useAuthStore } from '@/stores/auth'
import { MENSAGEM_ACESSO_SUSPENSO, mensagemDeErroAuth } from '@/utils/mensagensAuth'

const perfil = (extra: Partial<Usuario> = {}) =>
  ({
    uid: 'joao',
    nome: 'João Melo',
    email: 'joao@x.com',
    perfil: 'corretor',
    ativo: true,
    ...extra,
  }) as Usuario

/** Deixa as promessas pendentes (e as chamadas assíncronas dos callbacks) andarem. */
const esvaziar = () => new Promise((r) => setTimeout(r, 0))

beforeEach(() => {
  setActivePinia(createPinia())
  falso.aoMudarSessao = null
  falso.aoMudarPerfil = null
  falso.aoFalharPerfil = null
  falso.entrar.mockReset()
  falso.sair.mockReset().mockResolvedValue(undefined)
})

describe('auth.init', () => {
  it('sem sessão: fica pronto e sem usuário', async () => {
    const auth = useAuthStore()
    const p = auth.init()
    expect(auth.pronto).toBe(false)
    falso.aoMudarSessao!(null)
    await p
    expect(auth.pronto).toBe(true)
    expect(auth.usuario).toBeNull()
  })

  it('só fica pronto depois de carregar o perfil da sessão restaurada', async () => {
    const auth = useAuthStore()
    const p = auth.init()
    falso.aoMudarSessao!({ uid: 'joao' })
    await esvaziar()
    expect(auth.pronto).toBe(false)
    falso.aoMudarPerfil!(perfil())
    await p
    expect(auth.pronto).toBe(true)
    expect(auth.usuario?.nome).toBe('João Melo')
    expect(auth.ehAdmin).toBe(false)
  })

  it('chamar duas vezes registra a escuta da sessão uma vez só e ambas resolvem', async () => {
    const auth = useAuthStore()
    const primeira = auth.init()
    const escuta = falso.aoMudarSessao
    const segunda = auth.init()
    expect(falso.aoMudarSessao).toBe(escuta)
    falso.aoMudarSessao!(null)
    await Promise.all([primeira, segunda])
    expect(auth.pronto).toBe(true)
  })

  it('sessão restaurada de conta inativa é encerrada com o aviso de suspensão', async () => {
    const auth = useAuthStore()
    const p = auth.init()
    falso.aoMudarSessao!({ uid: 'ana' })
    falso.aoMudarPerfil!(perfil({ uid: 'ana', ativo: false }))
    await p
    expect(auth.usuario).toBeNull()
    expect(auth.mensagemSaida).toBe(MENSAGEM_ACESSO_SUSPENSO)
    expect(falso.sair).toHaveBeenCalledOnce()
  })
})

describe('auth.login', () => {
  it('credenciais válidas de conta ativa: guarda o usuário e repassa "lembrar"', async () => {
    const auth = useAuthStore()
    falso.entrar.mockImplementation(async () => {
      setTimeout(() => falso.aoMudarPerfil!(perfil()), 0)
      return { uid: 'joao' }
    })
    await auth.login('joao@x.com', 'senha123', false)
    expect(falso.entrar).toHaveBeenCalledWith('joao@x.com', 'senha123', false)
    expect(auth.usuario?.uid).toBe('joao')
    expect(auth.logado).toBe(true)
  })

  it('credenciais inválidas: lança ErroLogin em português e não guarda usuário', async () => {
    const auth = useAuthStore()
    falso.entrar.mockRejectedValue({ code: 'auth/invalid-credential' })
    await expect(auth.login('a@b.com', 'x', true)).rejects.toThrow(ErroLogin)
    await expect(auth.login('a@b.com', 'x', true)).rejects.toThrow('E-mail ou senha incorretos.')
    expect(auth.usuario).toBeNull()
  })

  it('conta inativa: desloga e lança a mensagem de acesso suspenso', async () => {
    const auth = useAuthStore()
    falso.entrar.mockImplementation(async () => {
      setTimeout(() => falso.aoMudarPerfil!(perfil({ uid: 'ana', ativo: false })), 0)
      return { uid: 'ana' }
    })
    await expect(auth.login('ana@x.com', 'senha123', true)).rejects.toThrow(
      MENSAGEM_ACESSO_SUSPENSO,
    )
    expect(falso.sair).toHaveBeenCalledOnce()
    expect(auth.usuario).toBeNull()
  })
})

describe('sessão em andamento', () => {
  async function logadoComoJoao() {
    const auth = useAuthStore()
    const p = auth.init()
    falso.aoMudarSessao!({ uid: 'joao' })
    falso.aoMudarPerfil!(perfil())
    await p
    return auth
  }

  it('inativado em tempo real: perde a sessão sem recarregar e para a escuta', async () => {
    const auth = await logadoComoJoao()
    falso.aoMudarPerfil!(perfil({ ativo: false }))
    await esvaziar()
    expect(auth.usuario).toBeNull()
    expect(auth.motivoSaida).toBe('suspenso')
    expect(falso.sair).toHaveBeenCalledOnce()
    expect(falso.escutaEncerrada).toBe(true)
  })

  it('mudança de perfil continua refletida na store enquanto ativo', async () => {
    const auth = await logadoComoJoao()
    falso.aoMudarPerfil!(perfil({ nome: 'João M.' }))
    expect(auth.usuario?.nome).toBe('João M.')
  })

  it('logout para a escuta, limpa o usuário e chama signOut sem aviso de suspensão', async () => {
    const auth = await logadoComoJoao()
    await auth.logout()
    expect(falso.escutaEncerrada).toBe(true)
    expect(auth.usuario).toBeNull()
    expect(auth.motivoSaida).toBeNull()
    expect(falso.sair).toHaveBeenCalledOnce()
  })

  it('erro ao ler o próprio perfil encerra a sessão', async () => {
    const auth = await logadoComoJoao()
    falso.aoFalharPerfil!(new Error('permission-denied'))
    await esvaziar()
    expect(auth.usuario).toBeNull()
    expect(auth.motivoSaida).toBe('erro-perfil')
  })
})

describe('mensagemDeErroAuth', () => {
  it.each([
    ['auth/invalid-credential', 'E-mail ou senha incorretos.'],
    ['auth/wrong-password', 'E-mail ou senha incorretos.'],
    ['auth/invalid-email', 'E-mail inválido.'],
    ['auth/too-many-requests', 'Muitas tentativas. Aguarde alguns minutos e tente novamente.'],
    ['auth/network-request-failed', 'Sem conexão. Verifique sua internet e tente novamente.'],
    ['auth/user-disabled', MENSAGEM_ACESSO_SUSPENSO],
    ['qualquer-outro', 'Não foi possível entrar. Tente novamente.'],
    [undefined, 'Não foi possível entrar. Tente novamente.'],
  ])('%s', (codigo, esperado) => {
    expect(mensagemDeErroAuth(codigo)).toBe(esperado)
  })
})
