import { computed, ref, watch } from 'vue'
import { defineStore } from 'pinia'
import { createUser, listUsers, toggleAtivo, updateUser, type NovoUsuario } from '@/services/users'
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

  const auth = useAuthStore()
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

  /** Troca o usuário na lista em memória (ou o acrescenta), mantendo a ordem alfabética. */
  function registrar(usuario: Usuario) {
    const i = itens.value.findIndex((u) => u.uid === usuario.uid)
    if (i >= 0) itens.value[i] = usuario
    else itens.value = [...itens.value, usuario]
    itens.value.sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
  }

  function exigirAdmin() {
    if (!auth.ehAdmin) throw new Error('Apenas administradores podem gerir usuários.')
  }

  /** Cria a conta e o perfil sem trocar a sessão do admin. Lança `ErroCriarUsuario`. */
  async function criar(dados: NovoUsuario): Promise<Usuario> {
    exigirAdmin()
    const usuario = await createUser(dados)
    registrar(usuario)
    return usuario
  }

  /** Altera nome e/ou perfil. O admin não muda o próprio perfil (as regras também negam). */
  async function atualizar(
    uid: string,
    dados: Partial<Pick<Usuario, 'nome' | 'perfil'>>,
  ): Promise<void> {
    exigirAdmin()
    if (uid === auth.usuario?.uid && dados.perfil !== undefined) {
      throw new Error('Você não pode alterar o seu próprio perfil.')
    }
    await updateUser(uid, dados)
    const atual = porUid.value.get(uid)
    if (atual) registrar({ ...atual, ...dados })
  }

  /** Inativa ou reativa. Quem está inativo sai de `ativos` (campo "Captador" de novos imóveis). */
  async function definirAtivo(uid: string, ativo: boolean): Promise<void> {
    exigirAdmin()
    if (uid === auth.usuario?.uid) throw new Error('Você não pode inativar a sua própria conta.')
    await toggleAtivo(uid, ativo)
    const atual = porUid.value.get(uid)
    if (atual) registrar({ ...atual, ativo })
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

  watch(
    () => auth.usuario?.uid,
    (uid, anterior) => {
      if (uid !== anterior) limpar()
    },
  )

  return {
    itens,
    ativos,
    carregado,
    carregando,
    erro,
    porUid,
    nomeDe,
    carregar,
    criar,
    atualizar,
    definirAtivo,
    limpar,
  }
})
