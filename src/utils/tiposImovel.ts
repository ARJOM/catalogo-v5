import type { Finalidade, TipoImovel } from '@/types'

/** Valores aceitos em `Imovel.tipo`, na ordem em que aparecem nos seletores. */
export const TIPOS_IMOVEL: readonly TipoImovel[] = [
  'Casa',
  'Apartamento',
  'Terreno',
  'Comercial',
  'Rural',
  'Outros',
]

export const FINALIDADES: readonly Finalidade[] = ['Venda', 'Aluguel']

interface AparenciaTipo {
  /** Nome do ícone Tabler, sem o prefixo "ti-". */
  icone: string
  /** Rótulo curto para o selo sobre a foto ("Apto" no lugar de "Apartamento"). */
  rotuloCurto: string
  /** Cor de fundo do placeholder sem foto, do protótipo. */
  fundo: string
}

const APARENCIA: Record<TipoImovel, AparenciaTipo> = {
  Casa: { icone: 'home', rotuloCurto: 'Casa', fundo: '#C0DD97' },
  Apartamento: { icone: 'building', rotuloCurto: 'Apto', fundo: '#B5D4F4' },
  Terreno: { icone: 'map-2', rotuloCurto: 'Terreno', fundo: '#FAEEDA' },
  Comercial: { icone: 'building-store', rotuloCurto: 'Comercial', fundo: '#EEEDFE' },
  Rural: { icone: 'plant-2', rotuloCurto: 'Rural', fundo: '#9FE1CB' },
  Outros: { icone: 'category', rotuloCurto: 'Outros', fundo: '#E4E2DA' },
}

/** Aparência do tipo; um valor fora da lista (dado antigo ou corrompido) usa a de "Outros". */
export function aparenciaDoTipo(tipo: string): AparenciaTipo {
  return APARENCIA[tipo as TipoImovel] ?? APARENCIA.Outros
}
