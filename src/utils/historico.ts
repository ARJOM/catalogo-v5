import type { HistoricoRegistro } from '@/types'
import { formatarArea, formatarMoeda, formatarTelefone } from '@/utils/formatadores'

/** Trecho de uma frase; os valores aparecem em destaque, como no protótipo. */
export interface Segmento {
  texto: string
  destaque?: boolean
}

interface InfoCampo {
  rotulo: string
  /** Particípio concordando com o rótulo: "Valor alterado", "Área alterada", "Quartos alterados". */
  alterado: string
  preenchido: string
  removido: string
  formatar: (valor: unknown, nomeDe: (uid: string) => string) => string
}

const texto = (valor: unknown) => String(valor)

const masculino = (rotulo: string, formatar: InfoCampo['formatar'] = texto): InfoCampo => ({
  rotulo,
  alterado: 'alterado',
  preenchido: 'preenchido',
  removido: 'removido',
  formatar,
})
const feminino = (rotulo: string, formatar: InfoCampo['formatar'] = texto): InfoCampo => ({
  rotulo,
  alterado: 'alterada',
  preenchido: 'preenchida',
  removido: 'removida',
  formatar,
})
const plural = (rotulo: string, formatar: InfoCampo['formatar'] = texto): InfoCampo => ({
  rotulo,
  alterado: 'alterados',
  preenchido: 'preenchidos',
  removido: 'removidos',
  formatar,
})

const femininoPlural = (rotulo: string): InfoCampo => ({
  rotulo,
  alterado: 'alteradas',
  preenchido: 'preenchidas',
  removido: 'removidas',
  formatar: texto,
})

const CAMPOS: Record<string, InfoCampo> = {
  tipo: masculino('Tipo'),
  finalidade: feminino('Finalidade'),
  valor: masculino('Valor', (v) => formatarMoeda(Number(v))),
  areaM2: feminino('Área', (v) => formatarArea(Number(v))),
  quartos: plural('Quartos'),
  caracteristicas: femininoPlural('Características'),
  rua: feminino('Rua'),
  bairro: masculino('Bairro'),
  cidade: feminino('Cidade'),
  estado: masculino('Estado'),
  captadorId: masculino('Captador', (uid, nomeDe) => nomeDe(String(uid))),
  vendedorNome: masculino('Nome do cliente vendedor'),
  vendedorTelefone: masculino('Telefone do cliente vendedor', (v) => formatarTelefone(String(v))),
  status: masculino('Status', (v) =>
    v === 'ativo' ? 'Ativo' : v === 'inativo' ? 'Inativo' : texto(v),
  ),
}

const vazio = (valor: unknown) => valor === null || valor === undefined || valor === ''

/**
 * Frase do registro, em partes: "Valor alterado de **R$ 500.000** para **R$ 480.000**".
 * `nomeDe` resolve o uid do captador no nome.
 */
export function descreverRegistro(
  registro: Pick<HistoricoRegistro, 'tipo' | 'campo' | 'valorAnterior' | 'valorNovo'>,
  nomeDe: (uid: string) => string = (uid) => uid,
): Segmento[] {
  switch (registro.tipo) {
    case 'criacao':
      return [{ texto: 'Imóvel cadastrado no sistema' }]
    case 'foto_adicionada':
      return [{ texto: 'Foto adicionada ao carrossel' }]
    case 'foto_removida':
      return [{ texto: 'Foto removida do carrossel' }]
    case 'edicao': {
      const info = registro.campo ? CAMPOS[registro.campo] : undefined
      if (!info) return [{ texto: `Campo ${registro.campo ?? 'desconhecido'} alterado` }]
      const anterior = vazio(registro.valorAnterior)
        ? null
        : info.formatar(registro.valorAnterior, nomeDe)
      const novo = vazio(registro.valorNovo) ? null : info.formatar(registro.valorNovo, nomeDe)
      if (anterior === null && novo !== null) {
        return [
          { texto: `${info.rotulo} ${info.preenchido} com ` },
          { texto: novo, destaque: true },
        ]
      }
      if (novo === null && anterior !== null) {
        return [
          { texto: `${info.rotulo} ${info.removido} (era ` },
          { texto: anterior, destaque: true },
          { texto: ')' },
        ]
      }
      return [
        { texto: `${info.rotulo} ${info.alterado} de ` },
        { texto: anterior ?? '—', destaque: true },
        { texto: ' para ' },
        { texto: novo ?? '—', destaque: true },
      ]
    }
    default:
      return [{ texto: 'Registro desconhecido' }]
  }
}

/** Ícone Tabler e variante de cor do círculo do registro. */
export function iconeDoRegistro(tipo: HistoricoRegistro['tipo']): {
  icone: string
  variante: 'create' | 'edit'
} {
  switch (tipo) {
    case 'criacao':
      return { icone: 'circle-plus', variante: 'create' }
    case 'foto_adicionada':
      return { icone: 'photo-plus', variante: 'edit' }
    case 'foto_removida':
      return { icone: 'photo-minus', variante: 'edit' }
    default:
      return { icone: 'pencil', variante: 'edit' }
  }
}
