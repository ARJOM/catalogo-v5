<script setup lang="ts">
import { computed } from 'vue'
import { RouterView, useRoute } from 'vue-router'
import AppLayout from '@/components/AppLayout.vue'

// Provisório (E0): usuário fixo até a store de autenticação existir (E1.5).
// `?perfil=admin` na URL mostra a variação de administrador do layout.
const route = useRoute()
const usuario = computed(() =>
  route.query.perfil === 'admin'
    ? ({ nome: 'Admin', perfil: 'admin' } as const)
    : ({ nome: 'João Melo', perfil: 'corretor' } as const),
)
</script>

<template>
  <AppLayout :nome="usuario.nome" :perfil="usuario.perfil">
    <RouterView />
  </AppLayout>
</template>
