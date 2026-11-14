import { computed, ref, watch } from 'vue'
import { defineStore } from 'pinia'
import { listUsers } from '@/services/users'
import { useAuthStore } from '@/stores/auth'
import type { Usuario } from '@/types'

/** Nome mostrado quando o captador não está na lista (documento removido). */
export const NOME_DESCONHECIDO = 'Usuário desconhecido'

const MENSAGEM_ERRO = 'Não foi possível carregar os usuários. Tente novamente.'

/**
 * Lista de usuários, carregada uma vez por sessão, para resolver o nome do captador de
 * cada imóvel e preencher o filtro e o campo "Captador". Inclui os inativos: um imóvel
 * continua mostrando o nome de quem o captou mesmo depois que a conta foi suspensa.
 */
export const useUsuariosStore = defineStore('usuarios', () => {
  const itens = ref<Usuario[]>([])
  const carregado = ref(false)
  const carregando = ref(false)
  const erro = ref('')

  // Chamadas simultâneas (várias views pedindo ao mesmo tempo) compartilham uma consulta.
  let emAndamento: Promise<void> | null = null
  let geracao = 0

  const porUid = computed(() => new Map(itens.value.map((u) => [u.uid, u])))
  /** Quem pode ser escolhido como captador de um imóvel novo. */
  const ativos = computed(() => itens.value.filter((u) => u.ativo))

  /** Nome do usuário, ou `NOME_DESCONHECIDO` se não está na lista (ou ela não carregou). */
  function nomeDe(uid: string): string {
    return porUid.value.get(uid)?.nome ?? NOME_DESCONHECIDO
  }

  /** Busca a lista no servidor uma única vez; chamar de novo depois de carregada não consulta. */
  function carregar(forcar = false): Promise<void> {
    if (carregado.value && !forcar) return Promise.resolve()
    if (emAndamento) return emAndamento
    const minha = geracao
    carregando.value = true
    erro.value = ''
    const consulta = (async () => {
      try {
        const lista = await listUsers()
        if (minha !== geracao) return
        itens.value = lista
        carregado.value = true
      } catch {
        if (minha === geracao) erro.value = MENSAGEM_ERRO
      } finally {
        if (minha === geracao) {
          carregando.value = false
          emAndamento = null
        }
      }
    })()
    emAndamento = consulta
    return consulta
  }

  /** Esquece tudo: logout ou troca de usuário. */
  function limpar() {
    geracao++
    itens.value = []
    carregado.value = false
    carregando.value = false
    erro.value = ''
    emAndamento = null
  }

  const auth = useAuthStore()
  watch(
    () => auth.usuario?.uid,
    (uid, anterior) => {
      if (uid !== anterior) limpar()
    },
  )

  return { itens, ativos, carregado, carregando, erro, porUid, nomeDe, carregar, limpar }
})
