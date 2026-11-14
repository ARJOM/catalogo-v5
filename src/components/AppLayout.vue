<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import BaseBadge from './BaseBadge.vue'
import { iniciais } from '@/utils/formatadores'

const props = defineProps<{
  nome: string
  perfil: 'admin' | 'corretor'
}>()

const route = useRoute()
const ehAdmin = computed(() => props.perfil === 'admin')

/** Seção ativa da navegação; as rotas de imóvel (detalhe, cadastro) pertencem a "Imóveis". */
const secao = computed(() => {
  if (route.path.startsWith('/admin')) return 'admin'
  if (route.path.startsWith('/leads')) return 'leads'
  return 'imoveis'
})
</script>

<template>
  <header class="topbar">
    <RouterLink to="/" class="logo">
      <i class="ti ti-building-estate" aria-hidden="true"></i> Catálogo
      <span class="logo-v">V5</span>
    </RouterLink>
    <div class="topbar-right">
      <div class="av av-32" :class="{ admin: ehAdmin }" aria-hidden="true">
        {{ iniciais(nome) }}
      </div>
      <div class="topbar-info">
        <div v-if="ehAdmin" class="topbar-admin">
          <span class="topbar-name">{{ nome }}</span>
          <BaseBadge variante="admin" icone="shield-check" pequeno>Admin</BaseBadge>
        </div>
        <div v-else class="topbar-name">{{ nome }}</div>
        <div class="topbar-role">{{ ehAdmin ? 'Administrador' : 'Corretor' }}</div>
      </div>
    </div>
  </header>

  <div class="page-wrap">
    <nav class="sidebar" aria-label="Navegação principal">
      <div class="si-section">Menu</div>
      <RouterLink to="/" class="si" :class="{ on: secao === 'imoveis' }">
        <i class="ti ti-building-estate" aria-hidden="true"></i> Imóveis
      </RouterLink>
      <RouterLink to="/leads" class="si" :class="{ on: secao === 'leads' }">
        <i class="ti ti-users" aria-hidden="true"></i> Leads
      </RouterLink>
      <template v-if="ehAdmin">
        <div class="si-section">Administração</div>
        <RouterLink to="/admin/usuarios" class="si danger">
          <i class="ti ti-shield-check" aria-hidden="true"></i> Usuários
        </RouterLink>
      </template>
    </nav>

    <main class="main">
      <slot />
    </main>
  </div>

  <nav class="bottomnav" aria-label="Navegação principal">
    <RouterLink to="/" class="bn-item" :class="{ on: secao === 'imoveis' }">
      <i class="ti ti-building-estate" aria-hidden="true"></i> Imóveis
    </RouterLink>
    <RouterLink to="/leads" class="bn-item" :class="{ on: secao === 'leads' }">
      <i class="ti ti-users" aria-hidden="true"></i> Leads
    </RouterLink>
    <RouterLink v-if="ehAdmin" to="/admin" class="bn-item admin">
      <i class="ti ti-shield-check" aria-hidden="true"></i> Admin
    </RouterLink>
  </nav>
</template>
