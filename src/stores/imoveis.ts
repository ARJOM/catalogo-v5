import { computed, ref, watch } from 'vue'
import { defineStore } from 'pinia'
import { getImovel, listImoveis } from '@/services/imoveis'
import { useAuthStore } from '@/stores/auth'
import type { Imovel } from '@/types'
import { filtrarImoveis, filtrosVazios, temFiltroAtivo, type FiltrosImoveis } from '@/utils/filtros'

/**
 * Quais imóveis o servidor entrega: o corretor recebe só os ativos; o admin, todos
 * (e usa o filtro de status no cliente).
 */
export type EscopoImoveis = 'ativos' | 'todos'

const MENSAGEM_ERRO_LISTA = 'Não foi possível carregar os imóveis. Tente novamente.'

/** Mais recentes primeiro, como a consulta do servidor. */
const maisRecentePrimeiro = (a: Imovel, b: Imovel) =>
  (b.criadoEm?.toMillis?.() ?? Date.now()) - (a.criadoEm?.toMillis?.() ?? Date.now())

export const useImoveisStore = defineStore('imoveis', () => {
  const itens = ref<Imovel[]>([])
  const escopo = ref<EscopoImoveis | null>(null)
  const carregando = ref(false)
  const erro = ref('')
  /**
   * Filtros do catálogo. Moram na store (e não no componente) para sobreviverem à
   * navegação: voltar do detalhe devolve o catálogo como foi deixado.
   */
  const filtros = ref<FiltrosImoveis>(filtrosVazios())

  /** Só os dados do escopo carregado valem; um refresh descarta respostas atrasadas. */
  let consultaAtual = 0

  const carregado = computed(() => escopo.value !== null)
  const total = computed(() => itens.value.length)
  const filtrados = computed(() => filtrarImoveis(itens.value, filtros.value))
  const filtroAtivo = computed(() => temFiltroAtivo(filtros.value))

  function porId(id: string): Imovel | undefined {
    return itens.value.find((imovel) => imovel.id === id)
  }

  /**
   * Busca os imóveis no servidor. Não repete a consulta se o escopo já está carregado,
   * a menos que `forcar` seja verdadeiro. Os filtros nunca disparam consulta.
   */
  async function carregar(novoEscopo: EscopoImoveis, forcar = false): Promise<void> {
    if (!forcar && escopo.value === novoEscopo) return
    const minha = ++consultaAtual
    carregando.value = true
    erro.value = ''
    try {
      const lista = await listImoveis(novoEscopo === 'ativos' ? { status: 'ativo' } : {})
      if (minha !== consultaAtual) return
      itens.value = lista
      escopo.value = novoEscopo
    } catch {
      if (minha !== consultaAtual) return
      erro.value = MENSAGEM_ERRO_LISTA
    } finally {
      if (minha === consultaAtual) carregando.value = false
    }
  }

  /** Lê um imóvel direto do servidor (o detalhe quer sempre a versão mais recente). */
  async function obter(id: string): Promise<Imovel | null> {
    const imovel = await getImovel(id)
    if (imovel) registrar(imovel)
    return imovel
  }

  /**
   * Põe um imóvel na lista em memória: substitui se já existe, insere se não. No escopo
   * "ativos", um imóvel inativo sai da lista (ou nem entra), como se a consulta fosse refeita.
   * É o ponto de entrada do E4: depois de gravar no servidor, `salvar()` chama `registrar()`.
   */
  function registrar(imovel: Imovel) {
    const indice = itens.value.findIndex((i) => i.id === imovel.id)
    const foraDoEscopo = escopo.value === 'ativos' && imovel.status !== 'ativo'
    if (foraDoEscopo) {
      if (indice >= 0) itens.value.splice(indice, 1)
      return
    }
    if (indice >= 0) itens.value[indice] = imovel
    else if (escopo.value !== null) itens.value = [...itens.value, imovel].sort(maisRecentePrimeiro)
  }

  /** Remove da lista em memória (exclusão real, E5). */
  function remover(id: string) {
    itens.value = itens.value.filter((imovel) => imovel.id !== id)
  }

  function limparFiltros() {
    filtros.value = filtrosVazios()
  }

  /** Esquece tudo: troca de usuário ou logout. */
  function limpar() {
    consultaAtual++
    itens.value = []
    escopo.value = null
    carregando.value = false
    erro.value = ''
    limparFiltros()
  }

  // Dados e filtros pertencem à sessão: quem entra depois não herda a lista de quem saiu.
  const auth = useAuthStore()
  watch(
    () => auth.usuario?.uid,
    (uid, anterior) => {
      if (uid !== anterior) limpar()
    },
  )

  return {
    itens,
    escopo,
    carregando,
    erro,
    filtros,
    carregado,
    total,
    filtrados,
    filtroAtivo,
    porId,
    carregar,
    obter,
    registrar,
    remover,
    limparFiltros,
    limpar,
  }
})
