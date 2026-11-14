<script setup lang="ts">
import { computed, useId } from 'vue'
import BaseButton from './BaseButton.vue'
import type { FiltrosImoveis } from '@/utils/filtros'
import { FINALIDADES, TIPOS_IMOVEL } from '@/utils/tiposImovel'

defineProps<{
  /** Opções do filtro de captador. */
  captadores: { valor: string; rotulo: string }[]
  /** O filtro de status só existe para o admin. */
  mostrarStatus?: boolean
  /** Há algum filtro aplicado: habilita o botão de limpar. */
  ativo?: boolean
}>()

const emit = defineEmits<{ limpar: [] }>()
const filtros = defineModel<FiltrosImoveis>({ required: true })

/** Cada campo troca o objeto inteiro, sem mutar o que veio da store por props. */
function campo<K extends keyof FiltrosImoveis>(chave: K) {
  return computed({
    get: () => filtros.value[chave],
    set: (valor: FiltrosImoveis[K]) => {
      filtros.value = { ...filtros.value, [chave]: valor }
    },
  })
}
const busca = campo('busca')
const tipo = campo('tipo')
const finalidade = campo('finalidade')
const valorMin = campo('valorMin')
const valorMax = campo('valorMax')
const captadorId = campo('captadorId')
const status = campo('status')

const id = useId()
</script>

<template>
  <form class="filters" role="search" aria-label="Filtros do catálogo" @submit.prevent>
    <div class="filter-row">
      <div class="fg wide">
        <label :for="`${id}-busca`">Busca</label>
        <input
          :id="`${id}-busca`"
          v-model="busca"
          type="search"
          autocomplete="off"
          placeholder="Rua, bairro ou cidade…"
        />
      </div>
      <div class="fg">
        <label :for="`${id}-tipo`">Tipo</label>
        <select :id="`${id}-tipo`" v-model="tipo">
          <option value="">Todos os tipos</option>
          <option v-for="opcao in TIPOS_IMOVEL" :key="opcao" :value="opcao">{{ opcao }}</option>
        </select>
      </div>
      <div class="fg">
        <label :for="`${id}-finalidade`">Finalidade</label>
        <select :id="`${id}-finalidade`" v-model="finalidade">
          <option value="">Venda e aluguel</option>
          <option v-for="opcao in FINALIDADES" :key="opcao" :value="opcao">{{ opcao }}</option>
        </select>
      </div>
      <div class="fg">
        <label :for="`${id}-min`">Valor mín.</label>
        <input
          :id="`${id}-min`"
          v-model="valorMin"
          type="text"
          inputmode="decimal"
          autocomplete="off"
          placeholder="R$ 0"
        />
      </div>
      <div class="fg">
        <label :for="`${id}-max`">Valor máx.</label>
        <input
          :id="`${id}-max`"
          v-model="valorMax"
          type="text"
          inputmode="decimal"
          autocomplete="off"
          placeholder="Sem limite"
        />
      </div>
      <div class="fg">
        <label :for="`${id}-captador`">Captador</label>
        <select :id="`${id}-captador`" v-model="captadorId">
          <option value="">Todos</option>
          <option v-for="opcao in captadores" :key="opcao.valor" :value="opcao.valor">
            {{ opcao.rotulo }}
          </option>
        </select>
      </div>
      <div v-if="mostrarStatus" class="fg">
        <label :for="`${id}-status`">Status</label>
        <select :id="`${id}-status`" v-model="status">
          <option value="">Todos</option>
          <option value="ativo">Ativo</option>
          <option value="inativo">Inativo</option>
        </select>
      </div>
      <BaseButton
        v-if="ativo"
        tamanho="sm"
        icone="filter-off"
        class="filter-clear"
        @click="emit('limpar')"
      >
        Limpar
      </BaseButton>
    </div>
  </form>
</template>
