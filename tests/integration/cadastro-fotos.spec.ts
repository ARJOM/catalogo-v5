import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { doc, getDoc } from 'firebase/firestore'
import { createPinia, setActivePinia } from 'pinia'

vi.mock('@/firebase', async () => (await import('./ambiente')).criarFirebaseDeTeste())

import { auth, db } from '@/firebase'
import { useAuthStore } from '@/stores/auth'
import { useImoveisStore } from '@/stores/imoveis'
import type { DadosImovel, Usuario } from '@/types'
import { criarContas, encerrarAmbiente, entrarComo, limparTudo } from './ambiente'

const dados = (captadorId: string): DadosImovel => ({
  tipo: 'Casa',
  finalidade: 'Venda',
  valor: 1,
  areaM2: 1,
  quartos: null,
  caracteristicas: '',
  rua: 'Rua A',
  bairro: 'Centro',
  cidade: 'Cajazeiras',
  estado: 'PB',
  captadorId,
  vendedorNome: 'F',
  vendedorTelefone: '83999990000',
  status: 'ativo',
})
const bom = (id: string) => ({
  id,
  nome: `${id}.jpg`,
  arquivo: new Blob([new Uint8Array(1024)], { type: 'image/jpeg' }),
})
/** A regra do Storage só aceita image/*: este arquivo é negado de verdade pelo emulador. */
const negado = (id: string) => ({
  id,
  nome: `${id}.txt`,
  arquivo: new Blob(['não é imagem'], { type: 'text/plain' }),
})

let uid = ''

beforeAll(async () => {
  await limparTudo()
  const uids = await criarContas(auth, [{ email: 'joao@t.com', nome: 'João', perfil: 'corretor' }])
  uid = uids['joao@t.com']!
})
afterAll(encerrarAmbiente)
beforeEach(async () => {
  await entrarComo(auth, 'joao@t.com')
  setActivePinia(createPinia())
  useAuthStore().usuario = { uid, nome: 'João' } as Usuario
})

const fotosDoDocumento = async (id: string) =>
  ((await getDoc(doc(db, 'imoveis', id))).data()?.fotos ?? []) as string[]

describe('salvar() com fotos contra o emulador', () => {
  it('cadastro completo: documento, upload e fotos[] com as URLs', async () => {
    const r = await useImoveisStore().salvar(dados(uid), undefined, {
      novas: [bom('a'), bom('b')],
    })
    expect(r.falhas).toEqual([])
    const fotos = await fotosDoDocumento(r.imovel.id)
    expect(fotos).toHaveLength(2)
    expect(fotos).toEqual(expect.arrayContaining(Object.values(r.enviadas)))
    for (const url of fotos) expect((await fetch(url)).status).toBe(200)
  })

  it('falha parcial real: o arquivo negado pela regra falha, o imóvel e a outra foto ficam salvos', async () => {
    const estados: string[] = []
    const r = await useImoveisStore().salvar(dados(uid), undefined, {
      novas: [bom('boa'), negado('ruim')],
      aoAtualizar: (id, p) => estados.push(`${id}:${p.estado}`),
    })

    expect(r.falhas.map((f) => f.nome)).toEqual(['ruim.txt'])
    expect(r.falhas[0]!.erro).toMatchObject({ code: 'storage/unauthorized' })
    expect(estados).toContain('ruim:falhou')
    expect((await getDoc(doc(db, 'imoveis', r.imovel.id))).exists()).toBe(true)
    expect(await fotosDoDocumento(r.imovel.id)).toEqual([r.enviadas.boa])
  })

  it('reenviar na edição: só a foto pendente sobe e fotos[] soma sem duplicar', async () => {
    const store = useImoveisStore()
    const primeira = await store.salvar(dados(uid), undefined, { novas: [bom('boa'), negado('x')] })
    const id = primeira.imovel.id
    const segunda = await store.salvar(dados(uid), id, { novas: [bom('outra')] })

    expect(segunda.falhas).toEqual([])
    const fotos = await fotosDoDocumento(id)
    expect(fotos).toHaveLength(2)
    expect(fotos[0]).toBe(primeira.enviadas.boa)
  })

  it('remover foto: sai de fotos[] e o arquivo some do Storage', async () => {
    const store = useImoveisStore()
    const criado = await store.salvar(dados(uid), undefined, { novas: [bom('a'), bom('b')] })
    const [manter, apagar] = [criado.enviadas.a!, criado.enviadas.b!]

    const r = await store.salvar(dados(uid), criado.imovel.id, { removidas: [apagar] })

    expect(r.naoApagadas).toBe(0)
    expect(await fotosDoDocumento(criado.imovel.id)).toEqual([manter])
    expect((await fetch(apagar)).ok).toBe(false)
    expect((await fetch(manter)).status).toBe(200)
  })
})
