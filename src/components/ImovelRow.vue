<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import BaseBadge from './BaseBadge.vue'
import ImovelFoto from './ImovelFoto.vue'
import type { Imovel } from '@/types'
import { formatarMoeda, sufixoFinalidade } from '@/utils/formatadores'
import { aparenciaDoTipo } from '@/utils/tiposImovel'

const props = defineProps<{ imovel: Imovel }>()

const aparencia = computed(() => aparenciaDoTipo(props.imovel.tipo))
const ativo = computed(() => props.imovel.status === 'ativo')
/** Na lista a largura é curta: rua e cidade bastam, sem o bairro. */
const endereco = computed(() => [props.imovel.rua, props.imovel.cidade].filter(Boolean).join(' — '))
</script>

<template>
  <RouterLink
    :to="{ name: 'imovel-detalhe', params: { id: imovel.id } }"
    class="imovel-row"
    data-testid="imovel-row"
  >
    <div class="ir-thumb" :style="{ background: aparencia.fundo }">
      <ImovelFoto :src="imovel.fotos[0]" :tipo="imovel.tipo" :tamanho-placeholder="32" />
    </div>
    <div class="ir-info">
      <div class="ir-valor">
        {{ formatarMoeda(imovel.valor) }}
        <span v-if="sufixoFinalidade(imovel.finalidade)" class="sfx">{{
          sufixoFinalidade(imovel.finalidade)
        }}</span>
      </div>
      <div class="ir-end">{{ endereco }}</div>
      <div class="ir-meta">
        <BaseBadge :variante="imovel.finalidade === 'Aluguel' ? 'aluguel' : 'venda'" pequeno>
          {{ imovel.finalidade }}
        </BaseBadge>
        <BaseBadge
          :variante="ativo ? 'ativo' : 'inativo'"
          :icone="ativo ? 'circle-check' : 'circle-x'"
          pequeno
        >
          {{ ativo ? 'Ativo' : 'Inativo' }}
        </BaseBadge>
      </div>
    </div>
    <i class="ti ti-chevron-right ir-arr" aria-hidden="true"></i>
  </RouterLink>
</template>
