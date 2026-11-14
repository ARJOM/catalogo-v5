import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/firebase', async () => (await import('./ambiente')).criarFirebaseDeTeste())

import { auth } from '@/firebase'
import { createImovel } from '@/services/imoveis'
import { deleteFoto, uploadFoto } from '@/services/storage'
import type { DadosImovel } from '@/types'
import { criarContas, encerrarAmbiente, entrarComo, limparTudo } from './ambiente'

const foto = (bytes = 2048, tipo = 'image/jpeg') =>
  new Blob([new Uint8Array(bytes)], { type: tipo })

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

let imovelId = ''

beforeAll(async () => {
  await limparTudo()
  const uid = await criarContas(auth, [
    { email: 'joao@t.com', nome: 'João', perfil: 'corretor' },
    { email: 'ana@t.com', nome: 'Ana', perfil: 'corretor', ativo: false },
  ])
  await entrarComo(auth, 'joao@t.com')
  const joao = { uid: uid['joao@t.com']!, nome: 'João' }
  imovelId = (await createImovel(dados(joao.uid), joao)).id
})
afterAll(encerrarAmbiente)
beforeEach(async () => {
  await entrarComo(auth, 'joao@t.com')
})

describe('uploadFoto / deleteFoto', () => {
  it('envia, devolve uma URL que baixa o mesmo conteúdo e informa o progresso até 100', async () => {
    const progresso: number[] = []
    const url = await uploadFoto(imovelId, foto(4096), (p) => progresso.push(p))

    expect(url).toContain(`imoveis%2F${imovelId}%2F`)
    expect(progresso.at(-1)).toBe(100)
    const resposta = await fetch(url)
    expect(resposta.status).toBe(200)
    expect((await resposta.arrayBuffer()).byteLength).toBe(4096)
  })

  it('cada envio usa um nome novo (nada é sobrescrito)', async () => {
    const [a, b] = await Promise.all([uploadFoto(imovelId, foto()), uploadFoto(imovelId, foto())])
    expect(a).not.toBe(b)
  })

  it('apaga o arquivo; apagar de novo não é erro', async () => {
    const url = await uploadFoto(imovelId, foto())
    await deleteFoto(url)
    expect((await fetch(url)).ok).toBe(false)
    await expect(deleteFoto(url)).resolves.toBeUndefined()
  })

  it('a regra nega imóvel inexistente, arquivo que não é imagem, 5 MB ou mais e usuário inativo', async () => {
    await expect(uploadFoto('nao-existe', foto())).rejects.toMatchObject({
      code: 'storage/unauthorized',
    })
    await expect(uploadFoto(imovelId, foto(100, 'text/plain'))).rejects.toMatchObject({
      code: 'storage/unauthorized',
    })
    await expect(uploadFoto(imovelId, foto(5 * 1024 * 1024))).rejects.toMatchObject({
      code: 'storage/unauthorized',
    })
    await entrarComo(auth, 'ana@t.com')
    await expect(uploadFoto(imovelId, foto())).rejects.toMatchObject({
      code: 'storage/unauthorized',
    })
  })
})
