<script setup lang="ts">
withDefaults(
  defineProps<{
    variante?: 'padrao' | 'primary' | 'danger'
    tamanho?: 'md' | 'sm' | 'xs'
    /** Nome do ícone Tabler, sem o prefixo "ti-". */
    icone?: string
    /** Botão quadrado só com ícone; exige aria-label. */
    somenteIcone?: boolean
    /** Ocupa a largura toda (botão principal de formulário no mobile). */
    bloco?: boolean
    carregando?: boolean
    disabled?: boolean
    type?: 'button' | 'submit' | 'reset'
  }>(),
  { variante: 'padrao', tamanho: 'md', type: 'button' },
)
</script>

<template>
  <button
    class="btn"
    :class="{
      primary: variante === 'primary',
      danger: variante === 'danger',
      sm: tamanho === 'sm',
      xs: tamanho === 'xs',
      icon: somenteIcone,
      full: bloco,
    }"
    :type="type"
    :disabled="disabled || carregando"
    :aria-busy="carregando || undefined"
  >
    <i v-if="carregando" class="ti ti-loader-2 girando" aria-hidden="true"></i>
    <i v-else-if="icone" :class="`ti ti-${icone}`" aria-hidden="true"></i>
    <slot />
  </button>
</template>
