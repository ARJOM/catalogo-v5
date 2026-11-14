import type { Timestamp } from 'firebase/firestore'

export type Perfil = 'admin' | 'corretor'
export type TipoImovel = 'Casa' | 'Apartamento' | 'Terreno' | 'Comercial' | 'Rural' | 'Outros'
export type Finalidade = 'Venda' | 'Aluguel'
export type StatusImovel = 'ativo' | 'inativo'

export interface Usuario {
  uid: string
  nome: string
  email: string
  perfil: Perfil
  ativo: boolean
  criadoEm: Timestamp
  atualizadoEm: Timestamp
}

export interface Imovel {
  id: string
  tipo: TipoImovel
  finalidade: Finalidade
  valor: number
  areaM2: number
  quartos?: number | null
  caracteristicas: string
  rua: string
  bairro: string
  cidade: string
  estado: string // sigla da UF
  captadorId: string
  vendedorNome: string
  vendedorTelefone: string
  status: StatusImovel
  fotos: string[] // URLs de download do Storage
  criadoEm: Timestamp
  criadoPor: string
  atualizadoEm: Timestamp
  atualizadoPor: string
  deletadoEm?: Timestamp | null
}

/** Campos que o formulário de cadastro/edição controla (o resto é auditoria e fotos). */
export type DadosImovel = Pick<
  Imovel,
  | 'tipo'
  | 'finalidade'
  | 'valor'
  | 'areaM2'
  | 'quartos'
  | 'caracteristicas'
  | 'rua'
  | 'bairro'
  | 'cidade'
  | 'estado'
  | 'captadorId'
  | 'vendedorNome'
  | 'vendedorTelefone'
  | 'status'
>

/** Quem executa uma gravação; vira `criadoPor`/`atualizadoPor` e o nome no histórico. */
export interface Autor {
  uid: string
  nome: string
}

export type TipoHistorico = 'criacao' | 'edicao' | 'foto_adicionada' | 'foto_removida'

export interface HistoricoRegistro {
  id: string
  tipo: TipoHistorico
  campo?: string // só em 'edicao'
  valorAnterior?: unknown // só em 'edicao'
  valorNovo?: unknown // só em 'edicao'
  usuarioId: string
  usuarioNome: string
  timestamp: Timestamp
}

export interface Lead {
  id: string
  imovelId: string
  imovelEndereco: string // desnormalizado no momento do cadastro
  nomeComprador: string
  telefone: string
  criadoEm: Timestamp
  criadoPor: string
  atualizadoEm: Timestamp
  atualizadoPor: string
}
