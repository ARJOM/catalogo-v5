import { ref, watch } from 'vue'
import { defineStore } from 'pinia'
import { getEstatisticas, type Estatisticas } from '@/services/estatisticas'
import { useAuthStore } from '@/stores/auth'

const MENSAGEM_ERRO = 'Não foi possível carregar os contadores. Tente novamente.'

/** Contadores do painel do admin. Sempre refeitos ao carregar: são baratos e devem estar atuais. */
export const useEstatisticasStore = defineStore('estatisticas', () => {
  const dados = ref<Estatisticas | null>(null)
  const carregando = ref(false)
  const erro = ref('')
  let consultaAtual = 0

  async function carregar(): Promise<void> {
    const minha = ++consultaAtual
    carregando.value = true
    erro.value = ''
    try {
      const resultado = await getEstatisticas()
      if (minha === consultaAtual) dados.value = resultado
    } catch {
      if (minha === consultaAtual) erro.value = MENSAGEM_ERRO
    } finally {
      if (minha === consultaAtual) carregando.value = false
    }
  }

  function limpar() {
    consultaAtual++
    dados.value = null
    carregando.value = false
    erro.value = ''
  }

  const auth = useAuthStore()
  watch(
    () => auth.usuario?.uid,
    (uid, anterior) => {
      if (uid !== anterior) limpar()
    },
  )

  return { dados, carregando, erro, carregar, limpar }
})
