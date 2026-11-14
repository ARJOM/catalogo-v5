import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest'
import { assertFails, assertSucceeds, type RulesTestEnvironment } from '@firebase/rules-unit-testing'
import { deleteObject, getDownloadURL, ref, updateMetadata, uploadBytes } from 'firebase/storage'
import { criarAmbiente, contextos, IMOVEL_ID, semearBase } from './helpers'

let env: RulesTestEnvironment
beforeAll(async () => {
  env = await criarAmbiente()
})
afterAll(async () => {
  await env.cleanup()
})

const MB = 1024 * 1024
const bytes = (tamanho: number) => new Uint8Array(tamanho)
const JPEG = { contentType: 'image/jpeg' }
const EXISTENTE = `imoveis/${IMOVEL_ID}/existente.jpg`

type Ctx = ReturnType<typeof contextos>['admin']
const arquivo = (ctx: Ctx, caminho: string) => ref(ctx.storage(), caminho)

beforeEach(async () => {
  await semearBase(env)
  await env.withSecurityRulesDisabled(async (ctx) => {
    await uploadBytes(ref(ctx.storage(), EXISTENTE), bytes(10), JPEG)
  })
})

describe('storage — leitura', () => {
  it('corretor e admin ativos leem', async () => {
    const { corretor, admin } = contextos(env)
    await assertSucceeds(getDownloadURL(arquivo(corretor, EXISTENTE)))
    await assertSucceeds(getDownloadURL(arquivo(admin, EXISTENTE)))
  })

  it('inativo, admin inativo, sem perfil e anônimo não leem', async () => {
    const { inativo, adminInativo, semPerfil, anonimo } = contextos(env)
    for (const ctx of [inativo, adminInativo, semPerfil, anonimo]) {
      await assertFails(getDownloadURL(arquivo(ctx, EXISTENTE)))
    }
  })
})

describe('storage — upload', () => {
  const novo = `imoveis/${IMOVEL_ID}/nova.jpg`

  it('ativos enviam imagem para imóvel existente', async () => {
    const { corretor, admin } = contextos(env)
    await assertSucceeds(uploadBytes(arquivo(corretor, novo), bytes(1000), JPEG))
    await assertSucceeds(uploadBytes(arquivo(admin, `imoveis/${IMOVEL_ID}/outra.png`), bytes(1000), { contentType: 'image/png' }))
  })

  it('nega upload para imovelId inexistente', async () => {
    const { corretor, admin } = contextos(env)
    await assertFails(uploadBytes(arquivo(corretor, 'imoveis/nao-existe/a.jpg'), bytes(1000), JPEG))
    await assertFails(uploadBytes(arquivo(admin, 'imoveis/nao-existe/a.jpg'), bytes(1000), JPEG))
  })

  it('nega arquivo que não é imagem', async () => {
    const { corretor } = contextos(env)
    await assertFails(uploadBytes(arquivo(corretor, `imoveis/${IMOVEL_ID}/a.pdf`), bytes(1000), { contentType: 'application/pdf' }))
    await assertFails(uploadBytes(arquivo(corretor, `imoveis/${IMOVEL_ID}/a.txt`), bytes(1000), { contentType: 'text/plain' }))
  })

  it('limite de 5 MB: abaixo passa; 5 MB exatos e acima são negados', async () => {
    const { corretor } = contextos(env)
    await assertSucceeds(uploadBytes(arquivo(corretor, `imoveis/${IMOVEL_ID}/quase.jpg`), bytes(5 * MB - 1), JPEG))
    await assertFails(uploadBytes(arquivo(corretor, `imoveis/${IMOVEL_ID}/exato.jpg`), bytes(5 * MB), JPEG))
    await assertFails(uploadBytes(arquivo(corretor, `imoveis/${IMOVEL_ID}/grande.jpg`), bytes(6 * MB), JPEG))
  })

  it('inativo, admin inativo, sem perfil e anônimo não enviam', async () => {
    const { inativo, adminInativo, semPerfil, anonimo } = contextos(env)
    for (const ctx of [inativo, adminInativo, semPerfil, anonimo]) {
      await assertFails(uploadBytes(arquivo(ctx, novo), bytes(1000), JPEG))
    }
  })

  it('update negado: ninguém altera os metadados de um arquivo existente', async () => {
    // O emulador do Storage avalia todo upload como `create`, inclusive o que sobrescreve um
    // arquivo existente; em produção a sobrescrita cai em `update` (negado). Por isso a regra
    // de update é exercitada aqui por updateMetadata, que o emulador avalia como `update`.
    const { corretor, admin } = contextos(env)
    await assertFails(updateMetadata(arquivo(corretor, EXISTENTE), { cacheControl: 'no-cache' }))
    await assertFails(updateMetadata(arquivo(admin, EXISTENTE), { cacheControl: 'no-cache' }))
  })
})

describe('storage — exclusão', () => {
  it('corretor e admin ativos excluem', async () => {
    const { corretor, admin } = contextos(env)
    await assertSucceeds(deleteObject(arquivo(corretor, EXISTENTE)))
    await env.withSecurityRulesDisabled(async (ctx) => {
      await uploadBytes(ref(ctx.storage(), EXISTENTE), bytes(10), JPEG)
    })
    await assertSucceeds(deleteObject(arquivo(admin, EXISTENTE)))
  })

  it('inativo, admin inativo e anônimo não excluem', async () => {
    const { inativo, adminInativo, anonimo } = contextos(env)
    for (const ctx of [inativo, adminInativo, anonimo]) {
      await assertFails(deleteObject(arquivo(ctx, EXISTENTE)))
    }
  })
})
