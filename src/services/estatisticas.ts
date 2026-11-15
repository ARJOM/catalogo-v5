import { collection, getCountFromServer, query, where, Timestamp } from 'firebase/firestore'
import type { Query } from 'firebase/firestore'
import { db } from '@/firebase'

export interface Estatisticas {
  imoveisAtivos: number
  imoveisInativos: number
  leads: number
  corretoresAtivos: number
  /** Imóveis ativos cadastrados desde o início do mês. */
  imoveisAtivosNoMes: number
  /** Leads cadastrados desde o início do mês. */
  leadsNoMes: number
}

const contar = async (consulta: Query) => (await getCountFromServer(consulta)).data().count

/** Primeiro instante do mês de `data`, no fuso do navegador. */
export function inicioDoMes(data: Date): Date {
  return new Date(data.getFullYear(), data.getMonth(), 1)
}

/**
 * Contadores do painel do admin, por `getCountFromServer` (não baixa os documentos).
 * Todas as consultas usam índices existentes: `imoveis` por `status` + `criadoEm`
 * (firestore.indexes.json), e os demais filtros são de igualdade ou de um só campo, atendidos
 * pelos índices automáticos.
 */
export async function getEstatisticas(agora: Date = new Date()): Promise<Estatisticas> {
  const desde = Timestamp.fromDate(inicioDoMes(agora))
  const imoveis = collection(db, 'imoveis')
  const leads = collection(db, 'leads')
  const [
    imoveisAtivos,
    imoveisInativos,
    totalLeads,
    corretoresAtivos,
    imoveisAtivosNoMes,
    leadsNoMes,
  ] = await Promise.all([
    contar(query(imoveis, where('status', '==', 'ativo'))),
    contar(query(imoveis, where('status', '==', 'inativo'))),
    contar(leads),
    contar(
      query(collection(db, 'users'), where('perfil', '==', 'corretor'), where('ativo', '==', true)),
    ),
    contar(query(imoveis, where('status', '==', 'ativo'), where('criadoEm', '>=', desde))),
    contar(query(leads, where('criadoEm', '>=', desde))),
  ])
  return {
    imoveisAtivos,
    imoveisInativos,
    leads: totalLeads,
    corretoresAtivos,
    imoveisAtivosNoMes,
    leadsNoMes,
  }
}
