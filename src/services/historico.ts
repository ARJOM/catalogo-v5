import { collection, getDocs, orderBy, query } from 'firebase/firestore'
import { db } from '@/firebase'
import type { HistoricoRegistro } from '@/types'

/** Histórico do imóvel, do registro mais recente para o mais antigo. */
export async function listHistorico(imovelId: string): Promise<HistoricoRegistro[]> {
  const resultado = await getDocs(
    query(collection(db, 'imoveis', imovelId, 'historico'), orderBy('timestamp', 'desc')),
  )
  return resultado.docs.map((snap) => ({ ...snap.data(), id: snap.id }) as HistoricoRegistro)
}
