import { createRouter, createWebHistory } from 'vue-router'
import FundacaoView from '@/views/FundacaoView.vue'

// Rotas provisórias do epic E0. As rotas reais e os guards entram no E1.4.
const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/', component: FundacaoView, meta: { titulo: 'Catálogo de imóveis' } },
    { path: '/leads', component: FundacaoView, meta: { titulo: 'Leads' } },
    { path: '/admin', component: FundacaoView, meta: { titulo: 'Painel administrativo' } },
    { path: '/admin/usuarios', component: FundacaoView, meta: { titulo: 'Usuários' } },
  ],
})

export default router
