import { computed, ref, watch } from 'vue'
import { defineStore } from 'pinia'
import { createLead, listLeads, listLeadsPorImovel, updateLead } from '@/services/leads'
import { getImovel } from '@/services/imoveis'
import { useAuthStore } from '@/stores/auth'
import type { Lead } from '@/types'
import { enderecoDoLead, normalizarTelefone, type ValoresLead } from '@/utils/leads'
import { formatarTelefone } from '@/utils/formatadores'

const MENSAGEM_ERRO_LISTA = 'Não foi possível carregar os leads. Tente novamente.'

export const useLeadsStore = defineStore('leads', () => {
  const itens = ref<Lead[]>([])
  const carregado = ref(false)
  const carregando = ref(false)
  const erro = ref('')
  /** Filtro da listagem geral: id do imóvel; vazio = todos. */
  const filtroImovelId = ref('')

  /** Leads por imóvel (bloco do detalhe). */
  const doImovel = ref<Record<string, Lead[]>>({})
  const doImovelCarregando = ref<Record<string, boolean>>({})
  const doImovelErro = ref<Record<string, string>>({})

  /** `true`/`false` conforme o imóvel ainda existe; ausente = ainda não verificado. */
  const existencia = ref<Record<string, boolean>>({})

  let geracao = 0

  const filtrados = computed(() =>
    filtroImovelId.value
      ? itens.value.filter((l) => l.imovelId === filtroImovelId.value)
      : itens.value,
  )

  /** Imóveis que aparecem nos leads, para o filtro (inclui imóveis já excluídos). */
  const imoveisDosLeads = computed(() => {
    const mapa = new Map<string, string>()
    for (const l of itens.value) if (!mapa.has(l.imovelId)) mapa.set(l.imovelId, l.imovelEndereco)
    return [...mapa].map(([id, endereco]) => ({ id, endereco }))
  })

  /** Primeira carga mostra carregamento; as seguintes atualizam em segundo plano. */
  async function carregar(forcar = false): Promise<void> {
    if (carregado.value && !forcar) return
    const minha = geracao
    carregando.value = !carregado.value
    erro.value = ''
    try {
      const lista = await listLeads()
      if (minha !== geracao) return
      itens.value = lista
      carregado.value = true
    } catch {
      if (minha === geracao && !carregado.value) erro.value = MENSAGEM_ERRO_LISTA
    } finally {
      if (minha === geracao) carregando.value = false
    }
  }

  async function carregarDoImovel(imovelId: string): Promise<void> {
    const minha = geracao
    doImovelCarregando.value[imovelId] = !(imovelId in doImovel.value)
    doImovelErro.value[imovelId] = ''
    try {
      const lista = await listLeadsPorImovel(imovelId)
      if (minha !== geracao) return
      doImovel.value[imovelId] = lista
    } catch {
      if (minha === geracao && !(imovelId in doImovel.value))
        doImovelErro.value[imovelId] = MENSAGEM_ERRO_LISTA
    } finally {
      if (minha === geracao) doImovelCarregando.value[imovelId] = false
    }
  }

  /**
   * Confere no servidor quais imóveis ainda existem. O corretor só carrega os ativos no
   * catálogo, então "fora da lista" não basta para dizer que foi excluído.
   */
  async function verificarImoveis(ids: string[], conhecidos: Set<string>): Promise<void> {
    const minha = geracao
    for (const id of ids) {
      if (conhecidos.has(id)) existencia.value[id] = true
    }
    const faltam = ids.filter((id) => !conhecidos.has(id) && !(id in existencia.value))
    await Promise.all(
      faltam.map(async (id) => {
        try {
          const imovel = await getImovel(id)
          if (minha === geracao) existencia.value[id] = imovel !== null
        } catch {
          // Sem resposta, não afirma que foi excluído: mantém o link.
          if (minha === geracao) existencia.value[id] = true
        }
      }),
    )
  }

  /** Imóvel sem verificação conta como existente, para não esconder o link à toa. */
  function imovelExiste(id: string): boolean {
    return existencia.value[id] !== false
  }

  function usuarioAtual(): string {
    const uid = useAuthStore().usuario?.uid
    if (!uid) throw new Error('Sessão expirada. Entre de novo.')
    return uid
  }

  /** Cria o lead; aparece de imediato na listagem geral e no bloco do imóvel. */
  async function criar(
    valores: ValoresLead,
    imovel: { tipo: string; rua: string },
  ): Promise<Lead> {
    const lead = await createLead(
      {
        imovelId: valores.imovelId,
        imovelEndereco: enderecoDoLead(imovel),
        nomeComprador: valores.nomeComprador.trim(),
        telefone: formatarTelefone(normalizarTelefone(valores.telefone) ?? valores.telefone),
      },
      usuarioAtual(),
    )
    itens.value = [lead, ...itens.value.filter((l) => l.id !== lead.id)]
    if (valores.imovelId in doImovel.value) {
      doImovel.value[valores.imovelId] = [lead, ...doImovel.value[valores.imovelId]!]
    }
    existencia.value[lead.imovelId] = true
    return lead
  }

  async function atualizar(
    lead: Lead,
    valores: { nomeComprador: string; telefone: string },
  ): Promise<Lead> {
    const novo = await updateLead(
      lead.id,
      {
        nomeComprador: valores.nomeComprador.trim(),
        telefone: formatarTelefone(normalizarTelefone(valores.telefone) ?? valores.telefone),
      },
      usuarioAtual(),
    )
    const trocar = (l: Lead) => (l.id === novo.id ? novo : l)
    itens.value = itens.value.map(trocar)
    if (novo.imovelId in doImovel.value)
      doImovel.value[novo.imovelId] = doImovel.value[novo.imovelId]!.map(trocar)
    return novo
  }

  function limpar() {
    geracao++
    itens.value = []
    carregado.value = false
    carregando.value = false
    erro.value = ''
    filtroImovelId.value = ''
    doImovel.value = {}
    doImovelCarregando.value = {}
    doImovelErro.value = {}
    existencia.value = {}
  }

  const auth = useAuthStore()
  watch(
    () => auth.usuario?.uid,
    (uid, anterior) => {
      if (uid !== anterior) limpar()
    },
  )

  return {
    itens,
    carregado,
    carregando,
    erro,
    filtroImovelId,
    filtrados,
    imoveisDosLeads,
    doImovel,
    doImovelCarregando,
    doImovelErro,
    carregar,
    carregarDoImovel,
    verificarImoveis,
    imovelExiste,
    criar,
    atualizar,
    limpar,
  }
})
