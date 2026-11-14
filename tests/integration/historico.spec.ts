import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { collection, getDocs, orderBy, query } from 'firebase/firestore'
import { createPinia, setActivePinia } from 'pinia'

vi.mock('@/firebase', async () => (await import('./ambiente')).criarFirebaseDeTeste())

import { auth, db } from '@/firebase'
import { createImovel, getImovel, updateImovel } from '@/services/imoveis'
import { useAuthStore } from '@/stores/auth'
import { useImoveisStore } from '@/stores/imoveis'
import type { Autor, DadosImovel, Usuario } from '@/types'
import { criarContas, encerrarAmbiente, entrarComo, limparTudo } from './ambiente'

const dados = (captadorId: string): DadosImovel => ({
  tipo: 'Casa',
  finalidade: 'Venda',
  valor: 500000,
  areaM2: 120,
  quartos: null,
  caracteristicas: 'Quintal',
  rua: 'Rua A, 10',
  bairro: 'Centro',
  cidade: 'Cajazeiras',
  estado: 'PB',
  captadorId,
  vendedorNome: 'Fulano',
  vendedorTelefone: '83999990000',
  status: 'ativo',
})

let joao: Autor

beforeAll(async () => {
  await limparTudo()
  const uid = await criarContas(auth, [{ email: 'joao@t.com', nome: 'João', perfil: 'corretor' }])
  joao = { uid: uid['joao@t.com']!, nome: 'João' }
})
afterAll(encerrarAmbiente)
beforeEach(async () => {
  await entrarComo(auth, 'joao@t.com')
  setActivePinia(createPinia())
  useAuthStore().usuario = { uid: joao.uid, nome: 'João' } as Usuario
})

const historico = async (id: string) =>
  (
    await getDocs(query(collection(db, 'imoveis', id, 'historico'), orderBy('timestamp', 'asc')))
  ).docs.map((d) => ({ id: d.id, ...d.data() }) as Record<string, unknown>)

describe('updateImovel e o histórico', () => {
  it('editar três campos gera exatamente três registros, com valores e autor', async () => {
    const criado = await createImovel(dados(joao.uid), joao)
    await updateImovel(
      criado.id,
      { ...dados(joao.uid), valor: 480000, bairro: 'Sul', quartos: 3 },
      joao,
    )

    const registros = await historico(criado.id)
    const edicoes = registros.filter((r) => r.tipo === 'edicao')
    expect(edicoes).toHaveLength(3)
    expect(edicoes.map((r) => [r.campo, r.valorAnterior, r.valorNovo]).sort()).toEqual(
      [
        ['bairro', 'Centro', 'Sul'],
        ['quartos', null, 3],
        ['valor', 500000, 480000],
      ].sort(),
    )
    for (const r of edicoes) {
      expect(r.usuarioId).toBe(joao.uid)
      expect(r.usuarioNome).toBe('João')
      expect((r.timestamp as { toMillis(): number }).toMillis()).toBeGreaterThan(0)
    }
    expect((await getImovel(criado.id))?.valor).toBe(480000)
  })

  it('salvar sem alterações não gera registro nem mexe na auditoria', async () => {
    const criado = await createImovel(dados(joao.uid), joao)
    const antes = await historico(criado.id)
    const salvo = await updateImovel(criado.id, dados(joao.uid), joao)

    expect(await historico(criado.id)).toHaveLength(antes.length)
    expect(salvo.atualizadoEm.toMillis()).toBe(criado.atualizadoEm.toMillis())
  })

  it('campos de auditoria mudam no documento mas não geram registro', async () => {
    const criado = await createImovel(dados(joao.uid), joao)
    const antes = (await historico(criado.id)).length
    const salvo = await updateImovel(criado.id, { ...dados(joao.uid), rua: 'Rua B, 20' }, joao)

    const novos = (await historico(criado.id)).slice(antes)
    expect(novos.map((r) => r.campo)).toEqual(['rua'])
    expect(salvo.atualizadoEm.toMillis()).toBeGreaterThanOrEqual(criado.atualizadoEm.toMillis())
    expect(salvo.atualizadoPor).toBe(joao.uid)
  })

  it('imóvel inexistente: erro e nada gravado', async () => {
    await expect(updateImovel('fantasma', dados(joao.uid), joao)).rejects.toThrow(
      'Imóvel não encontrado.',
    )
  })
})

const foto = (id: string) => ({
  id,
  nome: `${id}.jpg`,
  arquivo: new Blob([new Uint8Array(512)], { type: 'image/jpeg' }),
})
const tipos = async (id: string) => (await historico(id)).map((r) => r.tipo)

describe('registros de criação e de fotos', () => {
  it('criar o imóvel grava o registro "criacao" junto, com autor e horário do servidor', async () => {
    const criado = await createImovel(dados(joao.uid), joao)
    const registros = await historico(criado.id)
    expect(registros).toHaveLength(1)
    expect(registros[0]).toMatchObject({
      tipo: 'criacao',
      usuarioId: joao.uid,
      usuarioNome: 'João',
    })
    expect((registros[0]!.timestamp as { toMillis(): number }).toMillis()).toBeGreaterThan(0)
  })

  it('cada foto enviada gera "foto_adicionada"; cada foto removida gera "foto_removida"', async () => {
    const store = useImoveisStore()
    const criado = await store.salvar(dados(joao.uid), undefined, { novas: [foto('a'), foto('b')] })
    const id = criado.imovel.id
    expect(await tipos(id)).toEqual(
      expect.arrayContaining(['criacao', 'foto_adicionada', 'foto_adicionada']),
    )
    expect((await tipos(id)).filter((t) => t === 'foto_adicionada')).toHaveLength(2)

    await store.salvar(dados(joao.uid), id, { removidas: [criado.enviadas.a!] })
    const todos = await tipos(id)
    expect(todos.filter((t) => t === 'foto_removida')).toHaveLength(1)
    expect(todos).toHaveLength(4) // criacao + 2 adicionadas + 1 removida; salvar sem mudar dados não registra edição
  })

  it('foto que falha no upload não gera registro', async () => {
    const store = useImoveisStore()
    const ruim = { id: 'x', nome: 'x.txt', arquivo: new Blob(['x'], { type: 'text/plain' }) }
    const r = await store.salvar(dados(joao.uid), undefined, { novas: [foto('ok'), ruim] })
    expect(r.falhas).toHaveLength(1)
    expect((await tipos(r.imovel.id)).filter((t) => t === 'foto_adicionada')).toHaveLength(1)
  })

  it('imóvel sem fotos novas nem removidas: nenhuma gravação extra', async () => {
    const store = useImoveisStore()
    const r = await store.salvar(dados(joao.uid))
    expect(await tipos(r.imovel.id)).toEqual(['criacao'])
  })
})
