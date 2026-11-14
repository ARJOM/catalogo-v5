<script setup lang="ts">
defineProps<{
  variante: 'ativo' | 'inativo' | 'venda' | 'aluguel' | 'tipo' | 'admin' | 'corretor'
  /** Nome do ícone Tabler, sem o prefixo "ti-". */
  icone?: string
  pequeno?: boolean
}>()
</script>

<template>
  <span class="badge" :class="[`b-${variante}`, { sm: pequeno }]">
    <i v-if="icone" :class="`ti ti-${icone}`" aria-hidden="true"></i>
    <slot />
  </span>
</template>
