import { computed, ref, watch } from 'vue'
import { defineStore } from 'pinia'
import {
  atualizarFotos,
  createImovel,
  getImovel,
  listImoveis,
  softDeleteImovel,
  updateImovel,
} from '@/services/imoveis'
import { deleteFoto, uploadFoto } from '@/services/storage'
import { useAuthStore } from '@/stores/auth'
import type { DadosImovel, Imovel } from '@/types'
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

/** Foto nova, já comprimida, à espera do envio. */
export interface NovaFoto {
  /** Identificador do item no formulário; volta em `enviadas` e `falhas`. */
  id: string
  nome: string
  arquivo: Blob
}

export interface PlanoDeFotos {
  novas?: NovaFoto[]
  /** URLs das fotos a retirar do imóvel e do Storage. */
  removidas?: string[]
  /** Acompanha o envio de cada foto nova. */
  aoAtualizar?: (
    id: string,
    parcial: { estado: 'enviando' | 'enviada' | 'falhou'; progresso: number },
  ) => void
}

export interface FalhaDeFoto {
  id: string
  nome: string
  erro: unknown
}

export interface ResultadoSalvar {
  imovel: Imovel
  /** URL de download por id das fotos novas que subiram. */
  enviadas: Record<string, string>
  /** Fotos novas que não subiram (o imóvel foi salvo mesmo assim). */
  falhas: FalhaDeFoto[]
  /** Fotos removidas do imóvel cujo arquivo não pôde ser apagado do Storage. */
  naoApagadas: number
  /** Preenchido se as mudanças de fotos não puderam ser gravadas no imóvel (passo 3). */
  erroNasFotos: unknown
}

/** Uploads simultâneos: o bastante para ganhar tempo sem abrir dezenas de conexões. */
const LOTE_DE_UPLOADS = 3

/** Executa `tarefa` para cada item, no máximo `limite` ao mesmo tempo. */
async function emLotes<T>(itens: T[], limite: number, tarefa: (item: T) => Promise<void>) {
  const fila = [...itens]
  const trabalhadores = Array.from({ length: Math.min(limite, fila.length) }, async () => {
    for (let item = fila.shift(); item !== undefined; item = fila.shift()) await tarefa(item)
  })
  await Promise.all(trabalhadores)
}

export const useImoveisStore = defineStore('imoveis', () => {
  const auth = useAuthStore()
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

  /**
   * Cria (sem `id`) ou atualiza (com `id`) um imóvel e as fotos, e atualiza a lista em memória.
   * Exige usuário logado: ele vira o autor da gravação.
   *
   * Em três passos, para que uma falha de foto nunca perca o cadastro:
   * 1. grava o documento (se isto falhar, nada foi salvo e o erro sobe);
   * 2. envia cada foto nova ao Storage (a regra exige que o imóvel já exista);
   * 3. grava as URLs enviadas em `fotos[]` e só então apaga do Storage as fotos removidas.
   * Foto que não sobe vai para `falhas` e o imóvel continua salvo; as demais seguem.
   */
  async function salvar(
    dados: DadosImovel,
    id?: string,
    fotos: PlanoDeFotos = {},
  ): Promise<ResultadoSalvar> {
    const usuario = auth.usuario
    if (!usuario) throw new Error('Sessão encerrada.')
    const autor = { uid: usuario.uid, nome: usuario.nome }
    const { novas = [], removidas = [], aoAtualizar } = fotos

    // Passo 1
    let imovel = id ? await updateImovel(id, dados, autor) : await createImovel(dados, autor)
    registrar(imovel)

    // Passo 2
    const enviadas: Record<string, string> = {}
    const falhas: FalhaDeFoto[] = []
    await emLotes(novas, LOTE_DE_UPLOADS, async (foto) => {
      aoAtualizar?.(foto.id, { estado: 'enviando', progresso: 0 })
      try {
        enviadas[foto.id] = await uploadFoto(imovel.id, foto.arquivo, (progresso) =>
          aoAtualizar?.(foto.id, { estado: 'enviando', progresso }),
        )
        aoAtualizar?.(foto.id, { estado: 'enviada', progresso: 100 })
      } catch (erro) {
        falhas.push({ id: foto.id, nome: foto.nome, erro })
        aoAtualizar?.(foto.id, { estado: 'falhou', progresso: 0 })
      }
    })

    // Passo 3
    let naoApagadas = 0
    const urlsEnviadas = Object.values(enviadas)
    if (urlsEnviadas.length > 0 || removidas.length > 0) {
      try {
        imovel = await atualizarFotos(imovel.id, { adicionadas: urlsEnviadas, removidas }, autor)
        registrar(imovel)
      } catch (erro) {
        // As fotos já estão no Storage mas não no imóvel: apaga-as para não deixar órfãs e
        // trata todas como falhas; as remoções não aconteceram, então nada foi apagado.
        await Promise.allSettled(urlsEnviadas.map((url) => deleteFoto(url)))
        for (const foto of novas) {
          if (enviadas[foto.id]) {
            falhas.push({ id: foto.id, nome: foto.nome, erro })
            aoAtualizar?.(foto.id, { estado: 'falhou', progresso: 0 })
            delete enviadas[foto.id]
          }
        }
        return { imovel, enviadas, falhas, naoApagadas: 0, erroNasFotos: erro }
      }
      const resultados = await Promise.allSettled(removidas.map((url) => deleteFoto(url)))
      naoApagadas = resultados.filter((r) => r.status === 'rejected').length
    }
    return { imovel, enviadas, falhas, naoApagadas, erroNasFotos: null }
  }

  /**
   * Inativa o imóvel (exclusão lógica). No escopo "ativos" ele sai da lista; no do admin
   * continua nela, como inativo.
   */
  async function inativar(id: string): Promise<Imovel> {
    const usuario = auth.usuario
    if (!usuario) throw new Error('Sessão encerrada.')
    const imovel = await softDeleteImovel(id, { uid: usuario.uid, nome: usuario.nome })
    registrar(imovel)
    return imovel
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
    salvar,
    inativar,
    remover,
    limparFiltros,
    limpar,
  }
})
