import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { ref } from 'vue'
import type { ItemFoto } from '@/utils/fotos'

const falso = vi.hoisted(() => ({
  comprimir: vi.fn<(arquivo: File) => Promise<File>>(),
}))
vi.mock('browser-image-compression', () => ({ default: falso.comprimir }))

import FotoUploader from '@/components/FotoUploader.vue'

const imagem = (nome: string, tipo = 'image/png') =>
  new File([new Uint8Array(10)], nome, { type: tipo })

function montar(inicial: ItemFoto[] = []) {
  const itens = ref<ItemFoto[]>(inicial)
  const w = mount(FotoUploader, {
    props: {
      modelValue: itens.value,
      'onUpdate:modelValue': (v: ItemFoto[]) => {
        itens.value = v
        void w.setProps({ modelValue: v })
      },
    },
  })
  return { w, itens }
}

async function escolher(w: ReturnType<typeof montar>['w'], arquivos: File[]) {
  const input = w.find('input[type=file]')
  Object.defineProperty(input.element, 'files', { value: arquivos, configurable: true })
  await input.trigger('change')
  await flushPromises()
}

beforeEach(() => {
  falso.comprimir
    .mockReset()
    .mockImplementation((a) =>
      Promise.resolve(new File([new Uint8Array(3)], a.name, { type: a.type })),
    )
  let n = 0
  vi.stubGlobal('URL', {
    ...URL,
    createObjectURL: () => `blob:fake-${n++}`,
    revokeObjectURL: vi.fn<() => void>(),
  })
})

describe('FotoUploader', () => {
  it('aceita várias fotos, comprime cada uma e mostra as miniaturas', async () => {
    const { w, itens } = montar()
    await escolher(w, [imagem('a.png'), imagem('b.jpg', 'image/jpeg')])

    expect(falso.comprimir).toHaveBeenCalledTimes(2)
    expect(itens.value).toHaveLength(2)
    expect(itens.value.every((i) => i.estado === 'pronta')).toBe(true)
    // o arquivo guardado é o comprimido (3 bytes), não o original (10)
    expect(itens.value.map((i) => i.arquivo?.size)).toEqual([3, 3])
    expect(w.findAll('.fthumb img')).toHaveLength(2)
  })

  it('ignora arquivos que não são imagens aceitas e avisa', async () => {
    const { w, itens } = montar()
    await escolher(w, [imagem('doc.pdf', 'application/pdf'), imagem('ok.png')])
    expect(itens.value.map((i) => i.nome)).toEqual(['ok.png'])
    expect(w.find('[role=alert]').text()).toContain('"doc.pdf" não é uma imagem')
  })

  it('recusa arquivo com mais de 25 MB sem tentar comprimir', async () => {
    const { w, itens } = montar()
    const enorme = imagem('enorme.png')
    Object.defineProperty(enorme, 'size', { value: 26 * 1024 * 1024 })
    await escolher(w, [enorme])
    expect(itens.value).toEqual([])
    expect(falso.comprimir).not.toHaveBeenCalled()
    expect(w.find('[role=alert]').text()).toContain('"enorme.png" é grande demais')
  })

  it('se a compressão falha, tira a foto e avisa', async () => {
    falso.comprimir.mockRejectedValueOnce(new Error('x'))
    const { w, itens } = montar()
    await escolher(w, [imagem('ruim.png')])
    expect(itens.value).toEqual([])
    expect(w.find('[role=alert]').text()).toContain('Não foi possível processar "ruim.png"')
  })

  it('remove uma foto pelo botão ×, nova ou já salva', async () => {
    const existente: ItemFoto = {
      id: 'e1',
      url: 'https://x/e1',
      previa: 'https://x/e1',
      nome: 'e1',
      estado: 'enviada',
      progresso: 100,
    }
    const { w, itens } = montar([existente])
    await escolher(w, [imagem('nova.png')])
    expect(itens.value).toHaveLength(2)

    await w.findAll('.frm')[0]!.trigger('click')
    expect(itens.value.map((i) => i.nome)).toEqual(['nova.png'])
    await w.find('.frm').trigger('click')
    expect(itens.value).toEqual([])
  })

  it('mostra progresso e falha por foto e trava a remoção quando desabilitado', async () => {
    const base = { previa: 'blob:x', estado: 'pronta' as const, progresso: 0 }
    const { w } = montar([
      { ...base, id: '1', nome: 'a', estado: 'enviando', progresso: 42 },
      { ...base, id: '2', nome: 'b', estado: 'falhou' },
    ])
    const estados = w.findAll('.fthumb-estado').map((e) => e.text())
    expect(estados).toEqual(['42%', 'Falhou'])
    await w.setProps({ desabilitado: true })
    expect(w.findAll('.frm').every((b) => b.attributes('disabled') !== undefined)).toBe(true)
  })
})
