<script setup lang="ts">
import { watch } from 'vue'
import { RouterView, useRoute, useRouter } from 'vue-router'
import AppLayout from '@/components/AppLayout.vue'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const route = useRoute()
const router = useRouter()

// Sessão encerrada com uma rota protegida aberta (logout, ou conta inativada pelo admin
// enquanto o usuário usava o sistema): volta ao login sem precisar recarregar.
watch(
  () => auth.usuario,
  (usuario, anterior) => {
    if (anterior && !usuario && route.meta.requiresAuth) void router.replace({ name: 'login' })
  },
)
</script>

<template>
  <AppLayout
    v-if="auth.usuario && route.meta.requiresAuth"
    :nome="auth.usuario.nome"
    :perfil="auth.usuario.perfil"
  >
    <RouterView />
  </AppLayout>
  <RouterView v-else />
</template>
