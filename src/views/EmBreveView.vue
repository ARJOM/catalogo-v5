<script setup lang="ts">
/**
 * Placeholder das rotas cujas views só chegam em epics posteriores
 * (CatalogoView, ImovelFormView, ImovelDetalheView, LeadsView, AdminView, UsuariosView).
 * Cada uma substitui esta tela na sua rota quando for implementada.
 */
import { useRoute } from 'vue-router'

const route = useRoute()
</script>

<template>
  <div class="page-hdr">
    <h1 class="ph-title">{{ route.meta.titulo }}</h1>
  </div>
  <p class="login-sub">Esta tela será construída no epic {{ route.meta.epic }}.</p>
</template>
