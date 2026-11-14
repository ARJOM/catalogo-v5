<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import ImovelPlaceholder from './ImovelPlaceholder.vue'
import { aparenciaDoTipo } from '@/utils/tiposImovel'

const props = defineProps<{
  fotos: string[]
  /** Tipo do imóvel: define o placeholder quando não há foto. */
  tipo: string
  /** Descrição usada no texto alternativo das fotos. */
  descricao?: string
}>()

const atual = ref(0)
/** Fotos que falharam ao carregar; mostram o placeholder no lugar. */
const quebradas = ref(new Set<string>())

const total = computed(() => props.fotos.length)
const foto = computed(() => props.fotos[atual.value])
const aparencia = computed(() => aparenciaDoTipo(props.tipo))
const mostrarFoto = computed(() => !!foto.value && !quebradas.value.has(foto.value))

// Se a lista de fotos muda (edição, remoção), o índice não pode apontar para fora dela.
watch(total, (n) => {
  if (atual.value >= n) atual.value = Math.max(0, n - 1)
})

function ir(indice: number) {
  if (total.value === 0) return
  atual.value = (indice + total.value) % total.value
}
function marcarQuebrada() {
  quebradas.value = new Set(quebradas.value).add(foto.value!)
}
</script>

<template>
  <div>
    <div
      class="carousel tall"
      :style="{ background: aparencia.fundo }"
      role="group"
      aria-roledescription="carrossel"
      aria-label="Fotos do imóvel"
      tabindex="0"
      @keydown.left.prevent="ir(atual - 1)"
      @keydown.right.prevent="ir(atual + 1)"
    >
      <img
        v-if="mostrarFoto"
        :key="foto"
        class="foto-img"
        :src="foto"
        :alt="`${descricao ?? 'Foto do imóvel'} — foto ${atual + 1} de ${total}`"
        @error="marcarQuebrada"
      />
      <ImovelPlaceholder v-else :tipo="tipo" :tamanho="72" />

      <div v-if="total > 1" class="car-arrows">
        <button class="car-btn" type="button" aria-label="Foto anterior" @click="ir(atual - 1)">
          <i class="ti ti-chevron-left" aria-hidden="true"></i>
        </button>
        <button class="car-btn" type="button" aria-label="Próxima foto" @click="ir(atual + 1)">
          <i class="ti ti-chevron-right" aria-hidden="true"></i>
        </button>
      </div>
      <span v-if="total > 0" class="car-count" aria-live="polite">
        Foto {{ atual + 1 }} de {{ total }}
      </span>
      <span v-else class="car-count">Sem fotos</span>
    </div>

    <div v-if="total > 1" class="thumbs" role="tablist" aria-label="Miniaturas">
      <button
        v-for="(url, indice) in fotos"
        :key="url + indice"
        type="button"
        role="tab"
        class="thumb"
        :class="{ on: indice === atual }"
        :aria-selected="indice === atual"
        :aria-label="`Ver foto ${indice + 1}`"
        :style="{ background: aparencia.fundo }"
        @click="ir(indice)"
      >
        <img
          v-if="!quebradas.has(url)"
          :src="url"
          alt=""
          @error="quebradas = new Set(quebradas).add(url)"
        />
        <span v-else>{{ indice + 1 }}</span>
      </button>
    </div>
  </div>
</template>
