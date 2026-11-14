<script setup lang="ts">
import { nextTick, onBeforeUnmount, useId, useTemplateRef, watch } from 'vue'
import BaseButton from './BaseButton.vue'

defineProps<{ titulo: string }>()

const aberto = defineModel<boolean>('aberto', { required: true })
const caixa = useTemplateRef<HTMLElement>('caixa')
const idTitulo = useId()

let focoAnterior: HTMLElement | null = null

function fechar() {
  aberto.value = false
}

function aoTeclar(evento: KeyboardEvent) {
  if (evento.key === 'Escape') fechar()
}

watch(
  aberto,
  async (estaAberto) => {
    if (estaAberto) {
      focoAnterior = document.activeElement as HTMLElement | null
      document.addEventListener('keydown', aoTeclar)
      await nextTick()
      caixa.value?.focus()
    } else {
      document.removeEventListener('keydown', aoTeclar)
      focoAnterior?.focus()
      focoAnterior = null
    }
  },
  { immediate: true },
)

onBeforeUnmount(() => document.removeEventListener('keydown', aoTeclar))
</script>

<template>
  <Teleport to="body">
    <div v-if="aberto" class="modal-overlay" @click.self="fechar">
      <div
        ref="caixa"
        class="modal"
        role="dialog"
        aria-modal="true"
        :aria-labelledby="idTitulo"
        tabindex="-1"
      >
        <div class="modal-hdr">
          <h2 :id="idTitulo" class="modal-title">{{ titulo }}</h2>
          <BaseButton tamanho="sm" somente-icone icone="x" aria-label="Fechar" @click="fechar" />
        </div>
        <div class="modal-body"><slot /></div>
        <div v-if="$slots.rodape" class="modal-ftr"><slot name="rodape" /></div>
      </div>
    </div>
  </Teleport>
</template>
