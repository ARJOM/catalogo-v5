import { createRouter, createWebHistory, type RouterHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

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
        component: () => import('@/views/CatalogoView.vue'),
        meta: { titulo: 'Catálogo de imóveis', requiresAuth: true },
      },
      {
        path: '/imoveis/novo',
        name: 'imovel-novo',
        component: () => import('@/views/ImovelFormView.vue'),
        meta: { titulo: 'Cadastrar imóvel', requiresAuth: true },
      },
      {
        path: '/imoveis/:id',
        name: 'imovel-detalhe',
        component: () => import('@/views/ImovelDetalheView.vue'),
        meta: { titulo: 'Detalhe do imóvel', requiresAuth: true },
      },
      {
        path: '/imoveis/:id/editar',
        name: 'imovel-editar',
        component: () => import('@/views/ImovelFormView.vue'),
        meta: { titulo: 'Editar imóvel', requiresAuth: true },
      },
      {
        path: '/leads',
        name: 'leads',
        component: () => import('@/views/LeadsView.vue'),
        meta: { titulo: 'Leads', requiresAuth: true },
      },
      {
        path: '/admin',
        name: 'admin',
        component: () => import('@/views/AdminView.vue'),
        meta: { titulo: 'Painel administrativo', requiresAuth: true, requiresAdmin: true },
      },
      {
        path: '/admin/usuarios',
        name: 'admin-usuarios',
        component: () => import('@/views/UsuariosView.vue'),
        meta: { titulo: 'Usuários', requiresAuth: true, requiresAdmin: true },
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
