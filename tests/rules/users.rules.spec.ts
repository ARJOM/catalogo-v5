import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest'
import { assertFails, assertSucceeds, type RulesTestEnvironment } from '@firebase/rules-unit-testing'
import { collection, deleteDoc, doc, getDoc, getDocs, setDoc, Timestamp, updateDoc } from 'firebase/firestore'
import { criarAmbiente, contextos, dadosUsuario, semearBase, UID } from './helpers'

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

const ref = (ctx: ReturnType<typeof contextos>['admin'], uid: string) =>
  doc(ctx.firestore(), 'users', uid)

describe('users — leitura', () => {
  it('corretor ativo lê o próprio documento e o de outros', async () => {
    const { corretor } = contextos(env)
    await assertSucceeds(getDoc(ref(corretor, UID.corretor)))
    await assertSucceeds(getDoc(ref(corretor, UID.admin)))
    await assertSucceeds(getDocs(collection(corretor.firestore(), 'users')))
  })

  it('admin ativo lê todos', async () => {
    const { admin } = contextos(env)
    await assertSucceeds(getDoc(ref(admin, UID.corretor)))
    await assertSucceeds(getDocs(collection(admin.firestore(), 'users')))
  })

  it('usuário inativo lê só o próprio documento', async () => {
    const { inativo } = contextos(env)
    await assertSucceeds(getDoc(ref(inativo, UID.inativo)))
    await assertFails(getDoc(ref(inativo, UID.corretor)))
    await assertFails(getDocs(collection(inativo.firestore(), 'users')))
  })

  it('autenticado sem documento em users lê só o próprio caminho', async () => {
    const { semPerfil } = contextos(env)
    await assertSucceeds(getDoc(ref(semPerfil, UID.semPerfil)))
    await assertFails(getDoc(ref(semPerfil, UID.corretor)))
  })

  it('não autenticado não lê', async () => {
    const { anonimo } = contextos(env)
    await assertFails(getDoc(ref(anonimo, UID.corretor)))
    await assertFails(getDocs(collection(anonimo.firestore(), 'users')))
  })
})

describe('users — criação', () => {
  const novo = (uid: string, perfil: string) => ({ ...dadosUsuario(uid, 'corretor', true), perfil })

  it('admin cria corretor e admin', async () => {
    const { admin } = contextos(env)
    await assertSucceeds(setDoc(ref(admin, 'novo1'), novo('novo1', 'corretor')))
    await assertSucceeds(setDoc(ref(admin, 'novo2'), novo('novo2', 'admin')))
  })

  it('admin não cria com perfil fora de admin/corretor', async () => {
    const { admin } = contextos(env)
    await assertFails(setDoc(ref(admin, 'novo1'), novo('novo1', 'superadmin')))
  })

  it('admin não cria com uid diferente do id do documento', async () => {
    const { admin } = contextos(env)
    await assertFails(setDoc(ref(admin, 'novo1'), novo('outro', 'corretor')))
  })

  it('corretor, inativo, admin inativo e não autenticado não criam', async () => {
    const { corretor, inativo, adminInativo, anonimo } = contextos(env)
    for (const ctx of [corretor, inativo, adminInativo, anonimo]) {
      await assertFails(setDoc(ref(ctx, 'novo1'), novo('novo1', 'corretor')))
    }
  })

  it('corretor não cria o próprio documento como admin (auto-promoção)', async () => {
    const { semPerfil } = contextos(env)
    await assertFails(setDoc(ref(semPerfil, UID.semPerfil), novo(UID.semPerfil, 'admin')))
  })
})

describe('users — atualização', () => {
  const agora = () => Timestamp.now()

  it('corretor altera o próprio nome (com ou sem atualizadoEm)', async () => {
    const { corretor } = contextos(env)
    await assertSucceeds(updateDoc(ref(corretor, UID.corretor), { nome: 'Novo', atualizadoEm: agora() }))
    await assertSucceeds(updateDoc(ref(corretor, UID.corretor), { nome: 'Outro' }))
  })

  it('corretor NÃO altera o próprio perfil', async () => {
    const { corretor } = contextos(env)
    await assertFails(updateDoc(ref(corretor, UID.corretor), { perfil: 'admin' }))
    await assertFails(
      updateDoc(ref(corretor, UID.corretor), { perfil: 'admin', nome: 'X', atualizadoEm: agora() }),
    )
  })

  it('corretor NÃO altera o próprio ativo', async () => {
    const { corretor } = contextos(env)
    await assertFails(updateDoc(ref(corretor, UID.corretor), { ativo: false }))
    await assertFails(updateDoc(ref(corretor, UID.corretor), { ativo: false, nome: 'X' }))
  })

  it('corretor não altera outros campos do próprio documento', async () => {
    const { corretor } = contextos(env)
    await assertFails(updateDoc(ref(corretor, UID.corretor), { email: 'x@y.com' }))
    await assertFails(updateDoc(ref(corretor, UID.corretor), { uid: 'outro' }))
  })

  it('corretor não altera o documento de outro usuário', async () => {
    const { corretor } = contextos(env)
    await assertFails(updateDoc(ref(corretor, UID.outroCorretor), { nome: 'X' }))
    await assertFails(updateDoc(ref(corretor, UID.admin), { nome: 'X' }))
  })

  it('admin altera perfil, ativo e nome de outros usuários', async () => {
    const { admin } = contextos(env)
    await assertSucceeds(updateDoc(ref(admin, UID.corretor), { perfil: 'admin' }))
    await assertSucceeds(updateDoc(ref(admin, UID.outroCorretor), { ativo: false }))
    await assertSucceeds(updateDoc(ref(admin, UID.inativo), { ativo: true, nome: 'Reativada' }))
  })

  it('admin altera o próprio nome', async () => {
    const { admin } = contextos(env)
    await assertSucceeds(updateDoc(ref(admin, UID.admin), { nome: 'Novo', atualizadoEm: agora() }))
  })

  it('admin NÃO altera o próprio perfil', async () => {
    const { admin } = contextos(env)
    await assertFails(updateDoc(ref(admin, UID.admin), { perfil: 'corretor' }))
    await assertFails(updateDoc(ref(admin, UID.admin), { perfil: 'corretor', nome: 'X' }))
  })

  it('admin NÃO altera o próprio ativo', async () => {
    const { admin } = contextos(env)
    await assertFails(updateDoc(ref(admin, UID.admin), { ativo: false }))
    await assertFails(updateDoc(ref(admin, UID.admin), { ativo: false, nome: 'X' }))
  })

  it('inativo (corretor ou admin) e não autenticado não atualizam nada', async () => {
    const { inativo, adminInativo, anonimo } = contextos(env)
    await assertFails(updateDoc(ref(inativo, UID.inativo), { nome: 'X' }))
    await assertFails(updateDoc(ref(inativo, UID.inativo), { ativo: true }))
    await assertFails(updateDoc(ref(adminInativo, UID.adminInativo), { ativo: true }))
    await assertFails(updateDoc(ref(adminInativo, UID.corretor), { nome: 'X' }))
    await assertFails(updateDoc(ref(anonimo, UID.corretor), { nome: 'X' }))
  })
})

describe('users — exclusão', () => {
  it('ninguém exclui, nem o admin', async () => {
    const { corretor, admin, inativo, anonimo } = contextos(env)
    await assertFails(deleteDoc(ref(admin, UID.corretor)))
    await assertFails(deleteDoc(ref(admin, UID.admin)))
    await assertFails(deleteDoc(ref(corretor, UID.corretor)))
    await assertFails(deleteDoc(ref(inativo, UID.inativo)))
    await assertFails(deleteDoc(ref(anonimo, UID.corretor)))
  })
})
