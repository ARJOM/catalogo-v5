<script setup lang="ts">
import { useId } from 'vue'

defineOptions({ inheritAttrs: false })

defineProps<{
  rotulo: string
  erro?: string
  /** Renderiza um textarea no lugar do input. */
  multilinha?: boolean
}>()

const valor = defineModel<string>({ default: '' })
const id = useId()
</script>

<template>
  <div class="fgrp">
    <label :for="id">{{ rotulo }}</label>
    <textarea
      v-if="multilinha"
      :id="id"
      v-model="valor"
      class="finp"
      :class="{ invalido: erro }"
      :aria-invalid="erro ? true : undefined"
      :aria-describedby="erro ? `${id}-erro` : undefined"
      v-bind="$attrs"
    ></textarea>
    <input
      v-else
      :id="id"
      v-model="valor"
      class="finp"
      :class="{ invalido: erro }"
      :aria-invalid="erro ? true : undefined"
      :aria-describedby="erro ? `${id}-erro` : undefined"
      v-bind="$attrs"
    />
    <span v-if="erro" :id="`${id}-erro`" class="ferr">{{ erro }}</span>
  </div>
</template>
