<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import BaseBadge from './BaseBadge.vue'
import ImovelFoto from './ImovelFoto.vue'
import type { Imovel } from '@/types'
import {
  formatarArea,
  formatarEndereco,
  formatarMoeda,
  formatarQuartos,
  iniciais,
  sufixoFinalidade,
} from '@/utils/formatadores'
import { aparenciaDoTipo } from '@/utils/tiposImovel'

const props = defineProps<{ imovel: Imovel; captadorNome: string }>()

const aparencia = computed(() => aparenciaDoTipo(props.imovel.tipo))
const quartos = computed(() => formatarQuartos(props.imovel.quartos))
const ativo = computed(() => props.imovel.status === 'ativo')
/** Pontos de paginação sobre a foto: só fazem sentido com mais de uma foto. */
const pontos = computed(() => Math.min(props.imovel.fotos.length, 5))
</script>

<template>
  <RouterLink
    :to="{ name: 'imovel-detalhe', params: { id: imovel.id } }"
    class="imovel-card"
    data-testid="imovel-card"
  >
    <div class="imovel-foto" :style="{ background: aparencia.fundo }">
      <ImovelFoto
        :src="imovel.fotos[0]"
        :tipo="imovel.tipo"
        :alt="`Foto do imóvel: ${formatarEndereco(imovel)}`"
      />
      <BaseBadge variante="tipo" :icone="aparencia.icone" class="foto-tl">
        {{ aparencia.rotuloCurto }}
      </BaseBadge>
      <BaseBadge :variante="imovel.finalidade === 'Aluguel' ? 'aluguel' : 'venda'" class="foto-tr">
        {{ imovel.finalidade }}
      </BaseBadge>
      <div v-if="pontos > 1" class="foto-dots" aria-hidden="true">
        <div v-for="n in pontos" :key="n" class="dot" :class="{ on: n === 1 }"></div>
      </div>
    </div>
    <div class="ic-body">
      <div class="ic-valor">
        {{ formatarMoeda(imovel.valor) }}
        <span v-if="sufixoFinalidade(imovel.finalidade)" class="sfx">{{
          sufixoFinalidade(imovel.finalidade)
        }}</span>
      </div>
      <div class="ic-end">
        <i class="ti ti-map-pin" aria-hidden="true"></i>
        <span>{{ formatarEndereco(imovel) }}</span>
      </div>
      <div class="ic-meta">
        <span v-if="quartos"><i class="ti ti-door" aria-hidden="true"></i> {{ quartos }}</span>
        <span
          ><i class="ti ti-ruler-measure" aria-hidden="true"></i>
          {{ formatarArea(imovel.areaM2) }}</span
        >
      </div>
    </div>
    <div class="ic-footer">
      <div class="corretor-chip">
        <div class="av av-20" aria-hidden="true">{{ iniciais(captadorNome) }}</div>
        {{ captadorNome }}
      </div>
      <BaseBadge
        :variante="ativo ? 'ativo' : 'inativo'"
        :icone="ativo ? 'circle-check' : 'circle-x'"
      >
        {{ ativo ? 'Ativo' : 'Inativo' }}
      </BaseBadge>
    </div>
  </RouterLink>
</template>
