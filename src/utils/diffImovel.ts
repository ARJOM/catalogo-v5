import type { DadosImovel } from '@/types'

/** Campos do imóvel que entram no histórico, na ordem em que o formulário os apresenta. */
export const CAMPOS_AUDITADOS = [
  'tipo',
  'finalidade',
  'valor',
  'areaM2',
  'quartos',
  'caracteristicas',
  'rua',
  'bairro',
  'cidade',
  'estado',
  'captadorId',
  'vendedorNome',
  'vendedorTelefone',
  'status',
] as const satisfies readonly (keyof DadosImovel)[]

export type CampoAuditado = (typeof CAMPOS_AUDITADOS)[number]

export interface MudancaDeCampo {
  campo: CampoAuditado
  valorAnterior: string | number | null
  valorNovo: string | number | null
}

/** Ausente (`undefined`) e vazio (`null`) são a mesma coisa: o campo opcional não foi preenchido. */
const normalizar = (valor: unknown) => (valor === undefined ? null : valor)

/**
 * Compara o imóvel gravado com os dados que o formulário vai gravar e devolve uma mudança por
 * campo alterado. Função pura (sem Firebase): `fotos` e os campos de auditoria
 * (`atualizadoEm`, `atualizadoPor`, `criadoEm`, `criadoPor`, `deletadoEm`) não entram na
 * comparação, então nunca geram registro de histórico.
 */
export function diffImovel(
  anterior: Partial<DadosImovel>,
  novo: Partial<DadosImovel>,
): MudancaDeCampo[] {
  const mudancas: MudancaDeCampo[] = []
  for (const campo of CAMPOS_AUDITADOS) {
    const antes = normalizar(anterior[campo])
    const depois = normalizar(novo[campo])
    if (antes !== depois) {
      mudancas.push({
        campo,
        valorAnterior: antes as MudancaDeCampo['valorAnterior'],
        valorNovo: depois as MudancaDeCampo['valorNovo'],
      })
    }
  }
  return mudancas
}
