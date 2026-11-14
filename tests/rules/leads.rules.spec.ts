import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest'
import { assertFails, assertSucceeds, type RulesTestEnvironment } from '@firebase/rules-unit-testing'
import { collection, deleteDoc, doc, getDoc, getDocs, setDoc, Timestamp, updateDoc } from 'firebase/firestore'
import { criarAmbiente, contextos, dadosLead, semearBase, UID } from './helpers'

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
const lead = (ctx: Ctx, id = 'lead1') => doc(ctx.firestore(), 'leads', id)

describe('leads', () => {
  it('leitura: ativos leem; inativo, sem perfil e anônimo não', async () => {
    const { corretor, admin, inativo, adminInativo, semPerfil, anonimo } = contextos(env)
    for (const ctx of [corretor, admin]) {
      await assertSucceeds(getDoc(lead(ctx)))
      await assertSucceeds(getDocs(collection(ctx.firestore(), 'leads')))
    }
    for (const ctx of [inativo, adminInativo, semPerfil, anonimo]) {
      await assertFails(getDoc(lead(ctx)))
      await assertFails(getDocs(collection(ctx.firestore(), 'leads')))
    }
  })

  it('criação: ativos criam com criadoPor próprio', async () => {
    const { corretor, admin } = contextos(env)
    await assertSucceeds(setDoc(lead(corretor, 'n1'), dadosLead(UID.corretor)))
    await assertSucceeds(setDoc(lead(admin, 'n2'), dadosLead(UID.admin)))
  })

  it('criação: nega criadoPor de outro usuário', async () => {
    const { corretor } = contextos(env)
    await assertFails(setDoc(lead(corretor, 'n1'), dadosLead(UID.admin)))
  })

  it('criação: inativo, admin inativo e anônimo não criam', async () => {
    const { inativo, adminInativo, anonimo } = contextos(env)
    await assertFails(setDoc(lead(inativo, 'n1'), dadosLead(UID.inativo)))
    await assertFails(setDoc(lead(adminInativo, 'n1'), dadosLead(UID.adminInativo)))
    await assertFails(setDoc(lead(anonimo, 'n1'), dadosLead(UID.corretor)))
  })

  it('edição: ativos editam com atualizadoPor próprio, mesmo lead de outro', async () => {
    const { outroCorretor, admin } = contextos(env)
    await assertSucceeds(updateDoc(lead(outroCorretor), { telefone: '83911112222', atualizadoPor: UID.outroCorretor }))
    await assertSucceeds(updateDoc(lead(admin), { nomeComprador: 'Novo', atualizadoPor: UID.admin }))
  })

  it('edição: nega alterar criadoPor ou criadoEm', async () => {
    const { corretor } = contextos(env)
    await assertFails(updateDoc(lead(corretor), { criadoPor: UID.outroCorretor, atualizadoPor: UID.corretor }))
    await assertFails(updateDoc(lead(corretor), { criadoEm: Timestamp.now(), atualizadoPor: UID.corretor }))
  })

  it('edição: nega atualizadoPor de outro usuário', async () => {
    const { outroCorretor } = contextos(env)
    await assertFails(updateDoc(lead(outroCorretor), { telefone: '83911112222', atualizadoPor: UID.corretor }))
  })

  it('edição: inativo, admin inativo e anônimo não editam', async () => {
    const { inativo, adminInativo, anonimo } = contextos(env)
    await assertFails(updateDoc(lead(inativo), { telefone: '1', atualizadoPor: UID.inativo }))
    await assertFails(updateDoc(lead(adminInativo), { telefone: '1', atualizadoPor: UID.adminInativo }))
    await assertFails(updateDoc(lead(anonimo), { telefone: '1', atualizadoPor: UID.corretor }))
  })

  it('exclusão: ninguém exclui, nem o admin', async () => {
    const { corretor, admin, inativo, adminInativo, anonimo } = contextos(env)
    for (const ctx of [corretor, admin, inativo, adminInativo, anonimo]) {
      await assertFails(deleteDoc(lead(ctx)))
    }
  })
})
