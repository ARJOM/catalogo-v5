import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { doc, getDoc } from 'firebase/firestore'

vi.mock('@/firebase', async () => (await import('./ambiente')).criarFirebaseDeTeste())

import { auth, db } from '@/firebase'
import { createImovel, getImovel, updateImovel } from '@/services/imoveis'
import type { DadosImovel } from '@/types'
import { criarContas, encerrarAmbiente, entrarComo, limparTudo } from './ambiente'

const dados: DadosImovel = {
  tipo: 'Casa',
  finalidade: 'Venda',
  valor: 500000,
  areaM2: 120,
  quartos: undefined,
  caracteristicas: 'Quintal',
  rua: 'Rua A, 10',
  bairro: 'Centro',
  cidade: 'Cajazeiras',
  estado: 'PB',
  captadorId: '',
  vendedorNome: 'Fulano',
  vendedorTelefone: '83999990000',
  status: 'ativo',
}

let uid: Record<string, string> = {}

beforeAll(async () => {
  await limparTudo()
  uid = await criarContas(auth, [
    { email: 'joao@t.com', nome: 'João', perfil: 'corretor' },
    { email: 'ana@t.com', nome: 'Ana', perfil: 'corretor', ativo: false },
  ])
})
afterAll(encerrarAmbiente)
beforeEach(async () => {
  await entrarComo(auth, 'joao@t.com')
})

describe('createImovel / updateImovel', () => {
  it('cria com fotos vazias, quartos nulo e auditoria preenchida pelo servidor', async () => {
    const autor = { uid: uid['joao@t.com']!, nome: 'João' }
    const criado = await createImovel({ ...dados, captadorId: autor.uid }, autor)

    expect(criado.id).toBeTruthy()
    expect(criado.fotos).toEqual([])
    expect(criado.quartos).toBeNull()
    expect(criado.criadoPor).toBe(autor.uid)
    expect(criado.atualizadoPor).toBe(autor.uid)
    expect(criado.criadoEm.toMillis()).toBeGreaterThan(0)
    expect((await getImovel(criado.id))?.rua).toBe('Rua A, 10')
  })

  it('atualiza os dados sem tocar em fotos nem na criação', async () => {
    const autor = { uid: uid['joao@t.com']!, nome: 'João' }
    const criado = await createImovel({ ...dados, captadorId: autor.uid }, autor)
    const atualizado = await updateImovel(
      criado.id,
      { ...dados, captadorId: autor.uid, valor: 480000, quartos: 3 },
      autor,
    )
    expect(atualizado.valor).toBe(480000)
    expect(atualizado.quartos).toBe(3)
    expect(atualizado.criadoEm.toMillis()).toBe(criado.criadoEm.toMillis())
    expect(atualizado.atualizadoEm.toMillis()).toBeGreaterThanOrEqual(criado.atualizadoEm.toMillis())
    const bruto = (await getDoc(doc(db, 'imoveis', criado.id))).data()
    expect(bruto?.fotos).toEqual([])
  })

  it('usuário inativo não consegue criar (regra do Firestore)', async () => {
    await entrarComo(auth, 'ana@t.com')
    const autor = { uid: uid['ana@t.com']!, nome: 'Ana' }
    await expect(createImovel({ ...dados, captadorId: autor.uid }, autor)).rejects.toMatchObject({
      code: 'permission-denied',
    })
  })
})
