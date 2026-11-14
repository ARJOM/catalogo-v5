<script setup lang="ts">
import { ref, watch } from 'vue'
import ImovelPlaceholder from './ImovelPlaceholder.vue'

const props = defineProps<{
  /** URL da foto; vazia ou ausente mostra o placeholder. */
  src?: string
  tipo: string
  alt?: string
  tamanhoPlaceholder?: number
}>()

// Uma URL quebrada (arquivo apagado do Storage, sem rede) cai no placeholder em vez de
// mostrar o ícone de imagem rachada do navegador.
const falhou = ref(false)
watch(
  () => props.src,
  () => (falhou.value = false),
)
</script>

<template>
  <img
    v-if="src && !falhou"
    class="foto-img"
    :src="src"
    :alt="alt ?? ''"
    loading="lazy"
    @error="falhou = true"
  />
  <ImovelPlaceholder v-else :tipo="tipo" :tamanho="tamanhoPlaceholder" />
</template>
