import { beforeEach, describe, expect, it, vi } from 'vitest'
import { reactive } from 'vue'
import { createMemoryHistory } from 'vue-router'

// A store é simulada: aqui só importa como o guard reage ao estado da sessão.
const auth = reactive({
  logado: false,
  ehAdmin: false,
  init: vi.fn<() => Promise<void>>(),
})
vi.mock('@/stores/auth', () => ({ useAuthStore: () => auth }))

import { criarRouter } from '@/router'

function novoRouter() {
  return criarRouter(createMemoryHistory())
}

beforeEach(() => {
  auth.logado = false
  auth.ehAdmin = false
  auth.init.mockReset().mockResolvedValue(undefined)
})

describe('guards de rota', () => {
  it('visitante em rota protegida vai para /login e a rota de origem é guardada', async () => {
    const router = novoRouter()
    await router.push('/leads')
    expect(router.currentRoute.value.name).toBe('login')
    expect(router.currentRoute.value.query.redirecionar).toBe('/leads')
  })

  it('visitante em /admin vai para /login', async () => {
    const router = novoRouter()
    await router.push('/admin')
    expect(router.currentRoute.value.name).toBe('login')
  })

  it('visitante no catálogo vai para /login sem parâmetro de retorno', async () => {
    const router = novoRouter()
    await router.push('/')
    expect(router.currentRoute.value.name).toBe('login')
    expect(router.currentRoute.value.query.redirecionar).toBeUndefined()
  })

  it('corretor em /admin e /admin/usuarios é redirecionado para /', async () => {
    auth.logado = true
    const router = novoRouter()
    await router.push('/admin')
    expect(router.currentRoute.value.fullPath).toBe('/')
    await router.push('/admin/usuarios')
    expect(router.currentRoute.value.fullPath).toBe('/')
  })

  it('corretor acessa rotas comuns', async () => {
    auth.logado = true
    const router = novoRouter()
    await router.push('/leads')
    expect(router.currentRoute.value.fullPath).toBe('/leads')
    await router.push('/imoveis/abc/editar')
    expect(router.currentRoute.value.name).toBe('imovel-editar')
  })

  it('admin acessa /admin e /admin/usuarios', async () => {
    auth.logado = true
    auth.ehAdmin = true
    const router = novoRouter()
    await router.push('/admin')
    expect(router.currentRoute.value.name).toBe('admin')
    await router.push('/admin/usuarios')
    expect(router.currentRoute.value.name).toBe('admin-usuarios')
  })

  it('usuário logado em /login é redirecionado para /', async () => {
    auth.logado = true
    const router = novoRouter()
    await router.push('/login')
    expect(router.currentRoute.value.fullPath).toBe('/')
  })

  it('espera auth.init() terminar antes de decidir', async () => {
    let terminar!: () => void
    auth.init.mockReturnValue(new Promise<void>((r) => (terminar = r)))
    const router = novoRouter()
    let resolvida = false
    const navegacao = router.push('/leads').then(() => (resolvida = true))
    await new Promise((r) => setTimeout(r, 20))
    expect(resolvida).toBe(false)
    auth.logado = true // a sessão restaurada chega durante a espera
    terminar()
    await navegacao
    expect(router.currentRoute.value.fullPath).toBe('/leads')
  })

  it('rota inexistente cai em /', async () => {
    auth.logado = true
    const router = novoRouter()
    await router.push('/nao-existe')
    expect(router.currentRoute.value.fullPath).toBe('/')
  })
})
