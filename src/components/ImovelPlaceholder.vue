<script setup lang="ts">
/** Ilustração exibida no lugar da foto quando o imóvel não tem foto (ou ela não carrega). */
defineProps<{
  tipo: string
  /** Lado do desenho em pixels; 52 no card e no detalhe, 32 na miniatura da lista. */
  tamanho?: number
}>()
</script>

<template>
  <svg
    :width="tamanho ?? 52"
    :height="tamanho ?? 52"
    viewBox="0 0 48 48"
    fill="none"
    aria-hidden="true"
    data-testid="placeholder-foto"
  >
    <template v-if="tipo === 'Casa'">
      <rect x="6" y="22" width="36" height="22" rx="2" fill="#3B6D11" opacity=".3" />
      <path d="M4 24L24 8l20 16" fill="#3B6D11" opacity=".45" />
      <rect x="19" y="32" width="10" height="12" rx="1" fill="#3B6D11" opacity=".6" />
    </template>
    <template v-else-if="tipo === 'Apartamento'">
      <rect x="10" y="8" width="28" height="36" rx="2" fill="#185FA5" opacity=".25" />
      <rect x="14" y="12" width="8" height="8" rx="1" fill="#185FA5" opacity=".5" />
      <rect x="26" y="12" width="8" height="8" rx="1" fill="#185FA5" opacity=".5" />
      <rect x="14" y="24" width="8" height="8" rx="1" fill="#185FA5" opacity=".5" />
      <rect x="26" y="24" width="8" height="8" rx="1" fill="#185FA5" opacity=".5" />
    </template>
    <template v-else-if="tipo === 'Comercial'">
      <rect x="8" y="10" width="32" height="28" rx="2" fill="#534AB7" opacity=".25" />
      <rect x="14" y="16" width="8" height="6" rx="1" fill="#534AB7" opacity=".5" />
      <rect x="26" y="16" width="8" height="6" rx="1" fill="#534AB7" opacity=".5" />
    </template>
    <template v-else-if="tipo === 'Rural'">
      <circle cx="35" cy="12" r="5" fill="#854F0B" opacity=".3" />
      <path d="M4 38L16 22l10 12 6-8 12 12z" fill="#0F6E56" opacity=".35" />
      <rect x="4" y="38" width="40" height="4" rx="1" fill="#0F6E56" opacity=".45" />
    </template>
    <template v-else-if="tipo === 'Terreno'">
      <rect x="4" y="36" width="40" height="4" rx="1" fill="#854F0B" opacity=".4" />
      <ellipse cx="24" cy="30" rx="16" ry="8" fill="#EF9F27" opacity=".2" />
    </template>
    <template v-else>
      <rect x="10" y="14" width="28" height="22" rx="3" fill="#55554F" opacity=".25" />
      <rect x="16" y="20" width="16" height="4" rx="1" fill="#55554F" opacity=".4" />
    </template>
  </svg>
</template>
