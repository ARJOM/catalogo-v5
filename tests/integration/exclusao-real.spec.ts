import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { collection, doc, getDocs, getDoc, setDoc, Timestamp } from 'firebase/firestore'
import { createPinia, setActivePinia } from 'pinia'

vi.mock('@/firebase', async () => (await import('./ambiente')).criarFirebaseDeTeste())

import { auth, db } from '@/firebase'
import { useAuthStore } from '@/stores/auth'
import { useImoveisStore } from '@/stores/imoveis'
import type { DadosImovel, Usuario } from '@/types'
import {
  PROJECT_ID,
  ambienteAdmin,
  criarContas,
  encerrarAmbiente,
  entrarComo,
  limparTudo,
} from './ambiente'

const dados = (captadorId: string): DadosImovel => ({
  tipo: 'Casa',
  finalidade: 'Venda',
  valor: 1,
  areaM2: 1,
  quartos: null,
  caracteristicas: '',
  rua: 'Rua das Flores, 142',
  bairro: 'Centro',
  cidade: 'Cajazeiras',
  estado: 'PB',
  captadorId,
  vendedorNome: 'F',
  vendedorTelefone: '83999990000',
  status: 'ativo',
})
const foto = (id: string) => ({
  id,
  nome: `${id}.jpg`,
  arquivo: new Blob([new Uint8Array(512)], { type: 'image/jpeg' }),
})

/** Mesmo bucket que o app de teste usa (ver criarFirebaseDeTeste). */
const BUCKET = `${PROJECT_ID}.appspot.com`

let admin = ''
let joao = ''

beforeAll(async () => {
  await limparTudo()
  const uid = await criarContas(auth, [
    { email: 'admin@t.com', nome: 'Admin', perfil: 'admin' },
    { email: 'joao@t.com', nome: 'João', perfil: 'corretor' },
  ])
  admin = uid['admin@t.com']!
  joao = uid['joao@t.com']!
})
afterAll(encerrarAmbiente)

function comoUsuario(uid: string, nome: string, perfil: 'admin' | 'corretor') {
  setActivePinia(createPinia())
  useAuthStore().usuario = { uid, nome, perfil } as Usuario
}

/** Estado do imóvel visto sem passar pelas regras: o que de fato sobrou no servidor. */
async function sobras(id: string) {
  const env = await ambienteAdmin()
  let arquivos = -1
  let registros = -1
  let existe = true
  await env.withSecurityRulesDisabled(async (ctx) => {
    arquivos = (await ctx.storage(BUCKET).ref(`imoveis/${id}`).listAll()).items.length
    registros = (await getDocs(collection(ctx.firestore(), 'imoveis', id, 'historico'))).size
    existe = (await getDoc(doc(ctx.firestore(), 'imoveis', id))).exists()
  })
  return { arquivos, registros, existe }
}

describe('hardDeleteImovel (cascata do admin)', () => {
  beforeEach(async () => {
    await entrarComo(auth, 'admin@t.com')
    comoUsuario(admin, 'Admin', 'admin')
  })

  it('não sobram arquivos no Storage nem documentos de histórico; os leads ficam', async () => {
    const store = useImoveisStore()
    const criado = await store.salvar(dados(admin), undefined, {
      novas: [foto('a'), foto('b'), foto('c')],
    })
    const id = criado.imovel.id
    await store.salvar({ ...dados(admin), valor: 2, bairro: 'Sul' }, id) // + 2 registros de edição

    const antes = await sobras(id)
    expect(antes.arquivos).toBe(3)
    expect(antes.registros).toBe(1 + 3 + 2) // criacao + 3 fotos + 2 edições
    expect(antes.existe).toBe(true)

    const env = await ambienteAdmin()
    await env.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'leads', 'lead1'), {
        imovelId: id,
        imovelEndereco: 'Casa — Rua das Flores, 142',
        nomeComprador: 'Beltrano',
        telefone: '83988880000',
        criadoEm: Timestamp.now(),
        criadoPor: admin,
        atualizadoEm: Timestamp.now(),
        atualizadoPor: admin,
      })
    })

    await store.excluirDefinitivamente(id)

    expect(await sobras(id)).toEqual({ arquivos: 0, registros: 0, existe: false })
    const lead = await getDoc(doc(db, 'leads', 'lead1'))
    expect(lead.exists()).toBe(true)
    expect(lead.data()?.imovelEndereco).toBe('Casa — Rua das Flores, 142')
  })

  it('apaga mais registros de histórico do que cabem em um lote', async () => {
    const store = useImoveisStore()
    const criado = await store.salvar(dados(admin))
    const id = criado.imovel.id
    const env = await ambienteAdmin()
    await env.withSecurityRulesDisabled(async (ctx) => {
      const alvo = collection(ctx.firestore(), 'imoveis', id, 'historico')
      await Promise.all(
        Array.from({ length: 450 }, (_, i) =>
          setDoc(doc(alvo, `h${i}`), {
            tipo: 'foto_adicionada',
            usuarioId: admin,
            usuarioNome: 'Admin',
            timestamp: Timestamp.now(),
          }),
        ),
      )
    })
    expect((await sobras(id)).registros).toBe(451)

    await store.excluirDefinitivamente(id)
    expect(await sobras(id)).toEqual({ arquivos: 0, registros: 0, existe: false })
  })

  it('tira o imóvel da lista em memória', async () => {
    const store = useImoveisStore()
    const criado = await store.salvar(dados(admin))
    await store.carregar('todos', true)
    expect(store.porId(criado.imovel.id)).toBeDefined()
    await store.excluirDefinitivamente(criado.imovel.id)
    expect(store.porId(criado.imovel.id)).toBeUndefined()
  })

  it('imóvel sem fotos nem histórico (dado antigo) também é excluído', async () => {
    const env = await ambienteAdmin()
    await env.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'imoveis', 'antigo'), {
        ...dados(admin),
        fotos: [],
        criadoEm: Timestamp.now(),
        criadoPor: admin,
        atualizadoEm: Timestamp.now(),
        atualizadoPor: admin,
      })
    })
    await useImoveisStore().excluirDefinitivamente('antigo')
    expect((await sobras('antigo')).existe).toBe(false)
  })
})

describe('corretor não exclui', () => {
  it('a store recusa antes de tocar em qualquer arquivo', async () => {
    await entrarComo(auth, 'admin@t.com')
    comoUsuario(admin, 'Admin', 'admin')
    const criado = await useImoveisStore().salvar(dados(admin), undefined, { novas: [foto('a')] })
    const id = criado.imovel.id

    await entrarComo(auth, 'joao@t.com')
    comoUsuario(joao, 'João', 'corretor')
    await expect(useImoveisStore().excluirDefinitivamente(id)).rejects.toThrow(
      'Apenas administradores podem excluir imóveis.',
    )
    expect(await sobras(id)).toMatchObject({ arquivos: 1, existe: true })
  })
})
