import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { entrar, observarSessao, sair } from '@/services/auth'
import { observarUsuario } from '@/services/users'
import type { Usuario } from '@/types'
import {
  MENSAGEM_ACESSO_SUSPENSO,
  MENSAGEM_ERRO_PERFIL,
  MENSAGEM_SEM_PERFIL,
  mensagemDeErroAuth,
} from '@/utils/mensagensAuth'

/** Por que a sessão foi encerrada pelo sistema (e não pelo próprio usuário). */
export type MotivoSaida = 'suspenso' | 'sem-perfil' | 'erro-perfil'

const MENSAGENS: Record<MotivoSaida, string> = {
  suspenso: MENSAGEM_ACESSO_SUSPENSO,
  'sem-perfil': MENSAGEM_SEM_PERFIL,
  'erro-perfil': MENSAGEM_ERRO_PERFIL,
}

/** Falha de login com mensagem pronta para exibir ao usuário. */
export class ErroLogin extends Error {
  constructor(mensagem: string) {
    super(mensagem)
    this.name = 'ErroLogin'
  }
}

export const useAuthStore = defineStore('auth', () => {
  const usuario = ref<Usuario | null>(null)
  /** Vira true quando o estado inicial da sessão foi resolvido (veja `init`). */
  const pronto = ref(false)
  const motivoSaida = ref<MotivoSaida | null>(null)

  const logado = computed(() => usuario.value !== null)
  const ehAdmin = computed(() => usuario.value?.perfil === 'admin')
  const mensagemSaida = computed(() => (motivoSaida.value ? MENSAGENS[motivoSaida.value] : ''))

  // Escuta do próprio documento em `users`. É o único lugar que decide se a sessão vale:
  // vale tanto no login e na restauração da sessão quanto quando o admin inativa a conta.
  let encerrarEscuta: (() => void) | null = null
  let uidObservado: string | null = null
  let primeiroPerfil: Promise<void> | null = null
  let iniciando: Promise<void> | null = null

  function pararEscuta() {
    encerrarEscuta?.()
    encerrarEscuta = null
    uidObservado = null
    primeiroPerfil = null
  }

  /** Encerra a sessão por decisão do sistema e registra o motivo. */
  async function bloquear(motivo: MotivoSaida) {
    pararEscuta()
    usuario.value = null
    motivoSaida.value = motivo
    await sair()
  }

  /** Começa a escutar o perfil de `uid`; a promessa resolve no primeiro retorno do servidor. */
  function observarPerfil(uid: string): Promise<void> {
    if (uidObservado === uid && primeiroPerfil) return primeiroPerfil
    pararEscuta()
    uidObservado = uid
    primeiroPerfil = new Promise<void>((resolver) => {
      const aEscuta = () => uidObservado === uid
      const decidir = async (perfil: Usuario | null) => {
        if (!aEscuta()) return
        if (!perfil) await bloquear('sem-perfil')
        else if (!perfil.ativo) await bloquear('suspenso')
        else usuario.value = perfil
        resolver()
      }
      encerrarEscuta = observarUsuario(
        uid,
        (perfil) => void decidir(perfil),
        async () => {
          if (!aEscuta()) return
          await bloquear('erro-perfil')
          resolver()
        },
      )
    })
    return primeiroPerfil
  }

  /**
   * Resolve o estado inicial da sessão. Chamar mais de uma vez devolve a mesma promessa.
   * O guard de rotas espera por ela antes de decidir.
   */
  function init(): Promise<void> {
    iniciando ??= new Promise<void>((resolver) => {
      observarSessao(async (sessao) => {
        if (sessao) {
          await observarPerfil(sessao.uid)
        } else {
          pararEscuta()
          usuario.value = null
        }
        pronto.value = true
        resolver()
      })
    })
    return iniciando
  }

  /** Lança `ErroLogin` (mensagem em português) se as credenciais falharem ou a conta estiver inativa. */
  async function login(email: string, senha: string, lembrar: boolean): Promise<void> {
    motivoSaida.value = null
    let uid: string
    try {
      uid = (await entrar(email, senha, lembrar)).uid
    } catch (erro) {
      throw new ErroLogin(mensagemDeErroAuth((erro as { code?: string }).code))
    }
    await observarPerfil(uid)
    if (motivoSaida.value) throw new ErroLogin(mensagemSaida.value)
  }

  async function logout(): Promise<void> {
    pararEscuta()
    usuario.value = null
    motivoSaida.value = null
    await sair()
  }

  function limparMotivoSaida() {
    motivoSaida.value = null
  }

  return {
    usuario,
    pronto,
    motivoSaida,
    mensagemSaida,
    logado,
    ehAdmin,
    init,
    login,
    logout,
    limparMotivoSaida,
  }
})
