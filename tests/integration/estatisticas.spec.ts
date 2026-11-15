import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { doc, setDoc, Timestamp } from 'firebase/firestore'

vi.mock('@/firebase', async () => (await import('./ambiente')).criarFirebaseDeTeste())

import { auth } from '@/firebase'
import { getEstatisticas, inicioDoMes } from '@/services/estatisticas'
import { ambienteAdmin, criarContas, encerrarAmbiente, entrarComo, limparTudo } from './ambiente'

const AGORA = new Date(2026, 10, 14, 12) // 14/11/2026
const emDia = (dia: number, mes = 10) => Timestamp.fromDate(new Date(2026, mes, dia, 10))

beforeAll(async () => {
  await limparTudo()
  await criarContas(auth, [
    { email: 'admin@t.com', nome: 'Admin', perfil: 'admin' },
    { email: 'joao@t.com', nome: 'João', perfil: 'corretor' },
    { email: 'ana@t.com', nome: 'Ana', perfil: 'corretor', ativo: false },
    { email: 'bia@t.com', nome: 'Bia', perfil: 'corretor' },
  ])
  const env = await ambienteAdmin()
  const imovel = (status: string, criadoEm: Timestamp) => ({
    status,
    criadoEm,
    tipo: 'Casa',
    fotos: [],
  })
  await env.withSecurityRulesDisabled(async (ctx) => {
    const fs = ctx.firestore()
    const imoveis = [
      ['a1', 'ativo', emDia(2)], // neste mês
      ['a2', 'ativo', emDia(10)], // neste mês
      ['a3', 'ativo', emDia(25, 9)], // mês passado
      ['a4', 'ativo', emDia(1, 10)], // 1º do mês, 10h: conta
      ['i1', 'inativo', emDia(3)],
      ['i2', 'inativo', emDia(5, 8)],
    ] as const
    for (const [id, status, quando] of imoveis) {
      await setDoc(doc(fs, 'imoveis', id), imovel(status, quando))
    }
    const leads = [emDia(4), emDia(5), emDia(6), emDia(28, 9), emDia(29, 9)]
    for (const [n, quando] of leads.entries()) {
      await setDoc(doc(fs, 'leads', `l${n}`), { criadoEm: quando, imovelId: 'a1' })
    }
  })
  await entrarComo(auth, 'admin@t.com')
})
afterAll(encerrarAmbiente)

describe('getEstatisticas (contadores do painel)', () => {
  it('conta imóveis ativos e inativos, leads e corretores ativos', async () => {
    const e = await getEstatisticas(AGORA)
    expect(e.imoveisAtivos).toBe(4)
    expect(e.imoveisInativos).toBe(2)
    expect(e.leads).toBe(5)
    // joao e bia: ana está inativa e o admin não é corretor
    expect(e.corretoresAtivos).toBe(2)
  })

  it('calcula as variações do mês', async () => {
    const e = await getEstatisticas(AGORA)
    expect(e.imoveisAtivosNoMes).toBe(3)
    expect(e.leadsNoMes).toBe(3)
  })

  it('o mês seguinte recomeça do zero', async () => {
    const e = await getEstatisticas(new Date(2026, 11, 15))
    expect(e.imoveisAtivosNoMes).toBe(0)
    expect(e.leadsNoMes).toBe(0)
  })

  it('o corretor não consegue contar leads/imóveis de quem está inativo (regras valem)', async () => {
    await entrarComo(auth, 'ana@t.com')
    await expect(getEstatisticas(AGORA)).rejects.toThrow('PERMISSION_DENIED')
  })
})

describe('inicioDoMes', () => {
  it('é o dia 1 à meia-noite', () => {
    expect(inicioDoMes(new Date(2026, 10, 14, 15, 30))).toEqual(new Date(2026, 10, 1))
  })
})
