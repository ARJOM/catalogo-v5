import { createRouter, createWebHistory, type RouterHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

// Enquanto as views reais não existem (epics E3 a E7), as rotas apontam para o placeholder.
const emBreve = () => import('@/views/EmBreveView.vue')

export function criarRouter(history: RouterHistory = createWebHistory(import.meta.env.BASE_URL)) {
  const router = createRouter({
    history,
    routes: [
      {
        path: '/login',
        name: 'login',
        component: () => import('@/views/LoginView.vue'),
        meta: { titulo: 'Entrar' },
      },
      {
        path: '/',
        name: 'catalogo',
        component: emBreve,
        meta: { titulo: 'Catálogo de imóveis', epic: 'E3', requiresAuth: true },
      },
      {
        path: '/imoveis/novo',
        name: 'imovel-novo',
        component: emBreve,
        meta: { titulo: 'Cadastrar imóvel', epic: 'E4', requiresAuth: true },
      },
      {
        path: '/imoveis/:id',
        name: 'imovel-detalhe',
        component: emBreve,
        meta: { titulo: 'Detalhe do imóvel', epic: 'E3', requiresAuth: true },
      },
      {
        path: '/imoveis/:id/editar',
        name: 'imovel-editar',
        component: emBreve,
        meta: { titulo: 'Editar imóvel', epic: 'E4', requiresAuth: true },
      },
      {
        path: '/leads',
        name: 'leads',
        component: emBreve,
        meta: { titulo: 'Leads', epic: 'E6', requiresAuth: true },
      },
      {
        path: '/admin',
        name: 'admin',
        component: emBreve,
        meta: {
          titulo: 'Painel administrativo',
          epic: 'E7',
          requiresAuth: true,
          requiresAdmin: true,
        },
      },
      {
        path: '/admin/usuarios',
        name: 'admin-usuarios',
        component: emBreve,
        meta: { titulo: 'Usuários', epic: 'E7', requiresAuth: true, requiresAdmin: true },
      },
      { path: '/:caminho(.*)*', redirect: '/' },
    ],
  })

  router.beforeEach(async (to) => {
    const auth = useAuthStore()
    // Só decide depois de saber se há uma sessão a restaurar; sem isso, um F5 numa rota
    // protegida mandaria o usuário logado para o login.
    await auth.init()

    if ((to.meta.requiresAuth || to.meta.requiresAdmin) && !auth.logado) {
      return {
        name: 'login',
        query: to.fullPath === '/' ? undefined : { redirecionar: to.fullPath },
      }
    }
    if (to.meta.requiresAdmin && !auth.ehAdmin) return { name: 'catalogo' }
    if (to.name === 'login' && auth.logado) return { name: 'catalogo' }
  })

  return router
}

export default criarRouter()
