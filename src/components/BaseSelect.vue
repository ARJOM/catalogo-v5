<script setup lang="ts">
import { useId } from 'vue'

defineOptions({ inheritAttrs: false })

defineProps<{
  rotulo: string
  opcoes: { valor: string; rotulo: string }[]
  /** Texto da opção vazia; sem ele, o select não tem opção vazia. */
  placeholder?: string
  erro?: string
}>()

const valor = defineModel<string>({ default: '' })
const id = useId()
</script>

<template>
  <div class="fgrp">
    <label :for="id">{{ rotulo }}</label>
    <select
      :id="id"
      v-model="valor"
      class="finp"
      :class="{ invalido: erro }"
      :aria-invalid="erro ? true : undefined"
      :aria-describedby="erro ? `${id}-erro` : undefined"
      v-bind="$attrs"
    >
      <option v-if="placeholder" value="">{{ placeholder }}</option>
      <option v-for="opcao in opcoes" :key="opcao.valor" :value="opcao.valor">
        {{ opcao.rotulo }}
      </option>
    </select>
    <span v-if="erro" :id="`${id}-erro`" class="ferr">{{ erro }}</span>
  </div>
</template>
