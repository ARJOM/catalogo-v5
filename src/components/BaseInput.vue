<script setup lang="ts">
import { useId } from 'vue'

defineOptions({ inheritAttrs: false })

const props = defineProps<{
  rotulo: string
  erro?: string
  /** Renderiza um textarea no lugar do input. */
  multilinha?: boolean
  /** Formata o texto a cada digitação (ex.: máscara de telefone). */
  mascara?: (texto: string) => string
}>()

const valor = defineModel<string>({ default: '' })
const id = useId()

function aoDigitar(evento: Event) {
  const campo = evento.target as HTMLInputElement | HTMLTextAreaElement
  const texto = props.mascara ? props.mascara(campo.value) : campo.value
  // Se a máscara devolve o mesmo valor de antes (ex.: letra num campo numérico), o Vue não
  // re-renderiza; por isso o texto do campo é corrigido direto.
  if (campo.value !== texto) campo.value = texto
  valor.value = texto
}
</script>

<template>
  <div class="fgrp">
    <label :for="id">{{ rotulo }}</label>
    <textarea
      v-if="multilinha"
      :id="id"
      :value="valor"
      class="finp"
      :class="{ invalido: erro }"
      :aria-invalid="erro ? true : undefined"
      :aria-describedby="erro ? `${id}-erro` : undefined"
      v-bind="$attrs"
      @input="aoDigitar"
    ></textarea>
    <input
      v-else
      :id="id"
      :value="valor"
      class="finp"
      :class="{ invalido: erro }"
      :aria-invalid="erro ? true : undefined"
      :aria-describedby="erro ? `${id}-erro` : undefined"
      v-bind="$attrs"
      @input="aoDigitar"
    />
    <span v-if="erro" :id="`${id}-erro`" class="ferr">{{ erro }}</span>
  </div>
</template>
