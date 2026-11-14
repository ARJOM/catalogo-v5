import type { Finalidade, Imovel, StatusImovel, TipoImovel } from '@/types'

/**
 * Filtros do catálogo. Tudo aqui roda no cliente, sobre a lista que o servidor já
 * entregou (veja a decisão "Filtros do catálogo" na seção 5 do plano). Os valores são
 * strings porque vêm direto dos campos do formulário; a conversão é feita ao filtrar.
 */
export interface FiltrosImoveis {
  /** Texto livre, procurado em rua, bairro e cidade. */
  busca: string
  tipo: TipoImovel | ''
  finalidade: Finalidade | ''
  /** Valor mínimo/máximo digitado ("1.500", "1500,50"). Vazio ou inválido = sem limite. */
  valorMin: string
  valorMax: string
  /** uid do captador; vazio = todos. */
  captadorId: string
  /** Só tem efeito para o admin, que recebe ativos e inativos do servidor. */
  status: StatusImovel | ''
}

export function filtrosVazios(): FiltrosImoveis {
  return {
    busca: '',
    tipo: '',
    finalidade: '',
    valorMin: '',
    valorMax: '',
    captadorId: '',
    status: '',
  }
}

/** Minúsculas e sem acentos: "São João" e "sao joao" se igualam. */
export function normalizarTexto(texto: string): string {
  return texto.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().trim()
}

/**
 * Lê um valor em reais no formato brasileiro: "1.500" → 1500, "1.500,50" → 1500.5,
 * "R$ 95000" → 95000. Devolve null para vazio ou texto sem número.
 */
export function lerValor(texto: string): number | null {
  const limpo = texto.replace(/[^\d.,]/g, '')
  if (!/\d/.test(limpo)) return null
  const numero = Number(limpo.replace(/\./g, '').replace(',', '.'))
  return Number.isFinite(numero) ? numero : null
}

/** Verdadeiro se há algum filtro ativo (para mostrar "limpar filtros" e o estado vazio certo). */
export function temFiltroAtivo(filtros: FiltrosImoveis): boolean {
  return (Object.keys(filtros) as (keyof FiltrosImoveis)[]).some(
    (chave) => filtros[chave].trim() !== '',
  )
}

/**
 * Aplica os filtros, combinados com E. A busca exige que todas as palavras digitadas
 * apareçam em rua, bairro ou cidade (em qualquer ordem). Não altera a lista recebida.
 */
export function filtrarImoveis(imoveis: readonly Imovel[], filtros: FiltrosImoveis): Imovel[] {
  const palavras = normalizarTexto(filtros.busca).split(/\s+/).filter(Boolean)
  const minimo = lerValor(filtros.valorMin)
  const maximo = lerValor(filtros.valorMax)

  return imoveis.filter((imovel) => {
    if (filtros.tipo && imovel.tipo !== filtros.tipo) return false
    if (filtros.finalidade && imovel.finalidade !== filtros.finalidade) return false
    if (filtros.captadorId && imovel.captadorId !== filtros.captadorId) return false
    if (filtros.status && imovel.status !== filtros.status) return false
    if (minimo !== null && imovel.valor < minimo) return false
    if (maximo !== null && imovel.valor > maximo) return false
    if (palavras.length > 0) {
      const texto = normalizarTexto(`${imovel.rua} ${imovel.bairro} ${imovel.cidade}`)
      if (!palavras.every((palavra) => texto.includes(palavra))) return false
    }
    return true
  })
}
