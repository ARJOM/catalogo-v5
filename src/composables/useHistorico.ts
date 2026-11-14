import { ref, type Ref } from 'vue'
import { listHistorico } from '@/services/historico'
import type { HistoricoRegistro } from '@/types'

/** Carrega o histórico de um imóvel (mais recente primeiro) e guarda estado de carga e erro. */
export function useHistorico(imovelId: Ref<string>) {
  const registros = ref<HistoricoRegistro[]>([])
  const carregando = ref(false)
  const erro = ref('')
  let consulta = 0

  async function carregar() {
    const minha = ++consulta
    const alvo = imovelId.value
    carregando.value = true
    erro.value = ''
    try {
      const lista = await listHistorico(alvo)
      if (minha !== consulta) return
      registros.value = lista
    } catch {
      if (minha !== consulta) return
      registros.value = []
      erro.value = 'Não foi possível carregar o histórico. Tente novamente.'
    } finally {
      if (minha === consulta) carregando.value = false
    }
  }

  return { registros, carregando, erro, carregar }
}
