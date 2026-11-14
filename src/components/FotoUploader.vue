<script setup lang="ts">
import { onBeforeUnmount, ref, useId } from 'vue'
import {
  comprimirFoto,
  ehFotoAceita,
  TAMANHO_MAXIMO_ORIGINAL,
  TIPOS_DE_FOTO,
  type ItemFoto,
} from '@/utils/fotos'

const props = defineProps<{
  /** Trava a adição e a remoção (durante o envio). */
  desabilitado?: boolean
}>()

/** Fotos do formulário: as já salvas no imóvel e as novas, na ordem de exibição. */
const itens = defineModel<ItemFoto[]>({ required: true })

const entrada = ref<HTMLInputElement | null>(null)
const aviso = ref('')
const idAviso = useId()
const previasCriadas = new Set<string>()

function abrirSeletor() {
  if (!props.desabilitado) entrada.value?.click()
}

function criarPrevia(arquivo: File): string {
  const url = URL.createObjectURL(arquivo)
  previasCriadas.add(url)
  return url
}

function liberarPrevia(url: string) {
  if (previasCriadas.delete(url)) URL.revokeObjectURL(url)
}

async function adicionar(evento: Event) {
  const campo = evento.target as HTMLInputElement
  const escolhidas = [...(campo.files ?? [])]
  campo.value = '' // permite escolher o mesmo arquivo de novo
  const avisos: string[] = []

  const novas: ItemFoto[] = []
  for (const arquivo of escolhidas) {
    if (!ehFotoAceita(arquivo)) {
      avisos.push(`"${arquivo.name}" não é uma imagem JPG, PNG ou WebP.`)
      continue
    }
    if (arquivo.size > TAMANHO_MAXIMO_ORIGINAL) {
      avisos.push(`"${arquivo.name}" é grande demais (máximo de 25 MB).`)
      continue
    }
    novas.push({
      id: crypto.randomUUID(),
      arquivo,
      previa: criarPrevia(arquivo),
      nome: arquivo.name,
      estado: 'comprimindo',
      progresso: 0,
    })
  }
  aviso.value = avisos.join(' ')
  if (novas.length === 0) return
  itens.value = [...itens.value, ...novas]

  // A compressão roda em paralelo; cada miniatura passa a "pronta" quando termina.
  await Promise.all(
    novas.map(async (nova) => {
      try {
        const comprimida = await comprimirFoto(nova.arquivo!)
        const atual = itens.value.find((i) => i.id === nova.id)
        if (!atual) return // removida enquanto comprimia
        atual.arquivo = comprimida
        atual.estado = 'pronta'
      } catch {
        remover(nova.id)
        aviso.value = `${aviso.value} Não foi possível processar "${nova.nome}".`.trim()
      }
    }),
  )
}

function remover(id: string) {
  const alvo = itens.value.find((i) => i.id === id)
  if (alvo) liberarPrevia(alvo.previa)
  itens.value = itens.value.filter((i) => i.id !== id)
}

onBeforeUnmount(() => {
  for (const url of previasCriadas) URL.revokeObjectURL(url)
  previasCriadas.clear()
})

const rotuloEstado = (item: ItemFoto) =>
  ({
    comprimindo: 'Comprimindo…',
    pronta: '',
    enviando: `${item.progresso}%`,
    enviada: '',
    falhou: 'Falhou',
  })[item.estado]
</script>

<template>
  <div>
    <div
      class="upload-area"
      :class="{ travada: desabilitado }"
      role="button"
      :tabindex="desabilitado ? -1 : 0"
      :aria-disabled="desabilitado || undefined"
      :aria-describedby="aviso ? idAviso : undefined"
      @click="abrirSeletor"
      @keydown.enter.prevent="abrirSeletor"
      @keydown.space.prevent="abrirSeletor"
    >
      <i class="ti ti-cloud-upload" aria-hidden="true"></i>
      <p>Toque para adicionar fotos</p>
      <small>JPG, PNG ou WebP — comprimidas automaticamente antes do envio</small>
    </div>
    <input
      ref="entrada"
      type="file"
      class="entrada-oculta"
      multiple
      :accept="TIPOS_DE_FOTO.join(',')"
      aria-label="Selecionar fotos"
      tabindex="-1"
      @change="adicionar"
    />

    <p v-if="aviso" :id="idAviso" class="aviso-fotos" role="alert">{{ aviso }}</p>

    <ul v-if="itens.length" class="foto-row" aria-label="Fotos do imóvel">
      <li
        v-for="(item, indice) in itens"
        :key="item.id"
        class="fthumb"
        :class="{ falhou: item.estado === 'falhou' }"
      >
        <img :src="item.previa" :alt="`Foto ${indice + 1}`" />
        <span v-if="rotuloEstado(item)" class="fthumb-estado">{{ rotuloEstado(item) }}</span>
        <button
          type="button"
          class="frm"
          :disabled="desabilitado"
          :aria-label="`Remover foto ${indice + 1}`"
          @click="remover(item.id)"
        >
          ×
        </button>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.entrada-oculta {
  display: none;
}
.upload-area.travada {
  opacity: 0.6;
  cursor: not-allowed;
}
.foto-row {
  list-style: none;
  padding: 0;
}
.fthumb {
  overflow: visible;
}
.fthumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: inherit;
}
.fthumb.falhou {
  border-color: var(--red);
}
.fthumb-estado {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: inherit;
  background: rgba(0, 0, 0, 0.55);
  color: #fff;
  font-size: 9px;
  font-weight: 600;
  text-align: center;
}
.frm {
  border: 0;
  padding: 0;
  cursor: pointer;
  z-index: 1;
}
.frm:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}
.aviso-fotos {
  margin-top: 8px;
  font-size: 12px;
  color: var(--red);
}
</style>
