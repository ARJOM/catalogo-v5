import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest'
import {
  assertFails,
  assertSucceeds,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing'
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
} from 'firebase/firestore'
import { criarAmbiente, contextos, dadosImovel, IMOVEL_ID, semearBase, UID } from './helpers'

let env: RulesTestEnvironment
beforeAll(async () => {
  env = await criarAmbiente()
})
afterAll(async () => {
  await env.cleanup()
})
beforeEach(async () => {
  await semearBase(env)
})

type Ctx = ReturnType<typeof contextos>['admin']
const imovel = (ctx: Ctx, id = IMOVEL_ID) => doc(ctx.firestore(), 'imoveis', id)
const historico = (ctx: Ctx, id = 'h1') =>
  doc(ctx.firestore(), 'imoveis', IMOVEL_ID, 'historico', id)
const registro = (usuarioId: string) => ({
  tipo: 'edicao',
  campo: 'valor',
  valorAnterior: 1,
  valorNovo: 2,
  usuarioId,
  usuarioNome: 'Nome',
  timestamp: serverTimestamp(),
})

describe('imoveis — leitura', () => {
  it('corretor e admin ativos leem documento e lista', async () => {
    const { corretor, admin } = contextos(env)
    for (const ctx of [corretor, admin]) {
      await assertSucceeds(getDoc(imovel(ctx)))
      await assertSucceeds(getDocs(collection(ctx.firestore(), 'imoveis')))
    }
  })

  it('inativo, admin inativo, sem perfil e não autenticado não leem', async () => {
    const { inativo, adminInativo, semPerfil, anonimo } = contextos(env)
    for (const ctx of [inativo, adminInativo, semPerfil, anonimo]) {
      await assertFails(getDoc(imovel(ctx)))
      await assertFails(getDocs(collection(ctx.firestore(), 'imoveis')))
    }
  })
})

describe('imoveis — criação', () => {
  it('corretor e admin criam com criadoPor próprio e status válido', async () => {
    const { corretor, admin } = contextos(env)
    await assertSucceeds(setDoc(imovel(corretor, 'n1'), dadosImovel(UID.corretor)))
    await assertSucceeds(
      setDoc(imovel(admin, 'n2'), { ...dadosImovel(UID.admin), status: 'inativo' }),
    )
  })

  it('nega criadoPor de outro usuário', async () => {
    const { corretor } = contextos(env)
    await assertFails(setDoc(imovel(corretor, 'n1'), dadosImovel(UID.admin)))
  })

  it('nega status fora de ativo/inativo', async () => {
    const { corretor } = contextos(env)
    await assertFails(
      setDoc(imovel(corretor, 'n1'), { ...dadosImovel(UID.corretor), status: 'excluido' }),
    )
  })

  it('inativo, admin inativo e não autenticado não criam', async () => {
    const { inativo, adminInativo, anonimo } = contextos(env)
    await assertFails(setDoc(imovel(inativo, 'n1'), dadosImovel(UID.inativo)))
    await assertFails(setDoc(imovel(adminInativo, 'n1'), dadosImovel(UID.adminInativo)))
    await assertFails(setDoc(imovel(anonimo, 'n1'), dadosImovel(UID.corretor)))
  })
})

describe('imoveis — edição', () => {
  it('corretor (mesmo não sendo o criador) e admin editam', async () => {
    const { outroCorretor, admin } = contextos(env)
    await assertSucceeds(
      updateDoc(imovel(outroCorretor), { valor: 1, atualizadoPor: UID.outroCorretor }),
    )
    await assertSucceeds(
      updateDoc(imovel(admin), {
        valor: 2,
        status: 'inativo',
        deletadoEm: Timestamp.now(),
        atualizadoPor: UID.admin,
      }),
    )
  })

  it('nega alterar criadoPor ou criadoEm', async () => {
    const { corretor } = contextos(env)
    await assertFails(
      updateDoc(imovel(corretor), {
        criadoPor: UID.corretor,
        atualizadoPor: UID.corretor,
        valor: 1,
        criadoEm: Timestamp.now(),
      }),
    )
    await assertFails(
      updateDoc(imovel(corretor), { criadoPor: UID.outroCorretor, atualizadoPor: UID.corretor }),
    )
  })

  it('nega atualizadoPor diferente do usuário', async () => {
    const { corretor } = contextos(env)
    await assertFails(updateDoc(imovel(corretor), { valor: 1, atualizadoPor: UID.admin }))
  })

  it('nega status fora de ativo/inativo', async () => {
    const { corretor } = contextos(env)
    await assertFails(
      updateDoc(imovel(corretor), { status: 'excluido', atualizadoPor: UID.corretor }),
    )
  })

  it('inativo, admin inativo e não autenticado não editam', async () => {
    const { inativo, adminInativo, anonimo } = contextos(env)
    await assertFails(updateDoc(imovel(inativo), { valor: 1, atualizadoPor: UID.inativo }))
    await assertFails(
      updateDoc(imovel(adminInativo), { valor: 1, atualizadoPor: UID.adminInativo }),
    )
    await assertFails(updateDoc(imovel(anonimo), { valor: 1, atualizadoPor: UID.corretor }))
  })
})

describe('imoveis — exclusão real', () => {
  it('só o admin ativo exclui', async () => {
    const { corretor, inativo, adminInativo, anonimo, admin } = contextos(env)
    for (const ctx of [corretor, inativo, adminInativo, anonimo]) {
      await assertFails(deleteDoc(imovel(ctx)))
    }
    await assertSucceeds(deleteDoc(imovel(admin)))
  })
})

describe('historico', () => {
  it('leitura: ativos leem; inativo e não autenticado não', async () => {
    const { corretor, admin, inativo, adminInativo, anonimo } = contextos(env)
    await assertSucceeds(getDoc(historico(corretor)))
    await assertSucceeds(getDocs(collection(admin.firestore(), 'imoveis', IMOVEL_ID, 'historico')))
    for (const ctx of [inativo, adminInativo, anonimo]) {
      await assertFails(getDoc(historico(ctx)))
      await assertFails(getDocs(collection(ctx.firestore(), 'imoveis', IMOVEL_ID, 'historico')))
    }
  })

  it('criação: corretor e admin criam com usuarioId próprio e timestamp do servidor', async () => {
    const { corretor, admin } = contextos(env)
    await assertSucceeds(setDoc(historico(corretor, 'r1'), registro(UID.corretor)))
    await assertSucceeds(setDoc(historico(admin, 'r2'), registro(UID.admin)))
  })

  it('criação: nega usuarioId de outro usuário', async () => {
    const { corretor } = contextos(env)
    await assertFails(setDoc(historico(corretor, 'r1'), registro(UID.admin)))
  })

  it('criação: nega timestamp que não seja o horário do servidor', async () => {
    const { corretor } = contextos(env)
    await assertFails(
      setDoc(historico(corretor, 'r1'), {
        ...registro(UID.corretor),
        timestamp: Timestamp.fromDate(new Date('2020-01-01')),
      }),
    )
    await assertFails(
      setDoc(historico(corretor, 'r1'), { ...registro(UID.corretor), timestamp: Timestamp.now() }),
    )
  })

  it('criação: inativo, admin inativo e não autenticado não criam', async () => {
    const { inativo, adminInativo, anonimo } = contextos(env)
    await assertFails(setDoc(historico(inativo, 'r1'), registro(UID.inativo)))
    await assertFails(setDoc(historico(adminInativo, 'r1'), registro(UID.adminInativo)))
    await assertFails(setDoc(historico(anonimo, 'r1'), registro(UID.corretor)))
  })

  it('edição: ninguém edita, nem o admin, nem o autor', async () => {
    const { corretor, admin, inativo, adminInativo, anonimo } = contextos(env)
    for (const ctx of [corretor, admin, inativo, adminInativo, anonimo]) {
      await assertFails(updateDoc(historico(ctx), { usuarioNome: 'Adulterado' }))
    }
  })

  it('exclusão: corretor não exclui; admin ativo exclui; admin inativo e anônimo não', async () => {
    const { corretor, inativo, adminInativo, anonimo, admin } = contextos(env)
    for (const ctx of [corretor, inativo, adminInativo, anonimo]) {
      await assertFails(deleteDoc(historico(ctx)))
    }
    await assertSucceeds(deleteDoc(historico(admin)))
  })
})
