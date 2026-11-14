<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import BaseButton from '@/components/BaseButton.vue'
import BaseInput from '@/components/BaseInput.vue'
import BaseSelect from '@/components/BaseSelect.vue'
import { useLeadsStore } from '@/stores/leads'
import type { Imovel, Lead } from '@/types'
import { formatarTelefone } from '@/utils/formatadores'
import { enderecoDoLead, normalizarTelefone, validarLead, type ErrosLead } from '@/utils/leads'

type ImovelResumo = Pick<Imovel, 'id' | 'tipo' | 'rua'>

const props = defineProps<{
  /** Lead em edição; sem ele o formulário cadastra um lead novo. */
  lead?: Lead
  /** Imóvel já definido (cadastro a partir do detalhe): o campo vira texto fixo. */
  imovelFixo?: ImovelResumo
  /** Imóveis oferecidos no cadastro pela listagem geral. */
  imoveis?: ImovelResumo[]
}>()
const emit = defineEmits<{ salvo: [lead: Lead]; cancelar: [] }>()

const leads = useLeadsStore()
const edicao = computed(() => !!props.lead)

const valores = reactive({
  imovelId: props.lead?.imovelId ?? props.imovelFixo?.id ?? '',
  nomeComprador: props.lead?.nomeComprador ?? '',
  telefone: props.lead?.telefone ?? '',
})
const erros = ref<ErrosLead>({})
const erroGeral = ref('')
const salvando = ref(false)

const opcoes = computed(() =>
  (props.imoveis ?? []).map((i) => ({ valor: i.id, rotulo: enderecoDoLead(i) })),
)
const enderecoFixo = computed(() =>
  props.lead ? props.lead.imovelEndereco : props.imovelFixo ? enderecoDoLead(props.imovelFixo) : '',
)
const mostraSelect = computed(() => !edicao.value && !props.imovelFixo)

function normalizarCampoTelefone() {
  const digitos = normalizarTelefone(valores.telefone)
  if (digitos) valores.telefone = formatarTelefone(digitos)
}

async function enviar() {
  erroGeral.value = ''
  erros.value = validarLead(valores)
  if (Object.keys(erros.value).length > 0) return
  salvando.value = true
  try {
    let salvo: Lead
    if (props.lead) {
      salvo = await leads.atualizar(props.lead, valores)
    } else {
      const imovel = props.imovelFixo ?? props.imoveis?.find((i) => i.id === valores.imovelId)
      if (!imovel) {
        erros.value = { imovelId: 'Escolha o imóvel de interesse.' }
        return
      }
      salvo = await leads.criar(valores, imovel)
      valores.nomeComprador = ''
      valores.telefone = ''
      if (mostraSelect.value) valores.imovelId = ''
    }
    emit('salvo', salvo)
  } catch (e) {
    erroGeral.value =
      e instanceof Error && e.message.startsWith('Sessão')
        ? e.message
        : 'Não foi possível salvar o lead. Tente novamente.'
  } finally {
    salvando.value = false
  }
}
</script>

<template>
  <form novalidate @submit.prevent="enviar">
    <div class="fgrid" style="margin-bottom: 10px">
      <div v-if="mostraSelect" class="ffull">
        <BaseSelect
          v-model="valores.imovelId"
          rotulo="Imóvel vinculado"
          placeholder="Selecione o imóvel…"
          :opcoes="opcoes"
          :erro="erros.imovelId"
        />
      </div>
      <div v-else class="fgrp ffull">
        <label>Imóvel vinculado</label>
        <div class="lead-imovel-fixo">
          <i class="ti ti-building-estate" aria-hidden="true"></i> {{ enderecoFixo }}
        </div>
      </div>
      <BaseInput
        v-model="valores.nomeComprador"
        rotulo="Nome do comprador"
        placeholder="Nome completo"
        autocomplete="off"
        maxlength="120"
        :erro="erros.nomeComprador"
      />
      <BaseInput
        v-model="valores.telefone"
        rotulo="Telefone"
        type="tel"
        inputmode="tel"
        autocomplete="off"
        placeholder="(83) 99999-0000"
        :erro="erros.telefone"
        @blur="normalizarCampoTelefone"
      />
    </div>
    <p v-if="erroGeral" class="ferr" role="alert" style="margin-bottom: 10px">{{ erroGeral }}</p>
    <div style="display: flex; justify-content: flex-end; gap: 8px">
      <BaseButton v-if="edicao || imovelFixo" tamanho="sm" @click="emit('cancelar')">
        Cancelar
      </BaseButton>
      <BaseButton type="submit" variante="primary" tamanho="sm" icone="check" :carregando="salvando">
        {{ edicao ? 'Salvar alterações' : 'Salvar lead' }}
      </BaseButton>
    </div>
  </form>
</template>

<style scoped>
.lead-imovel-fixo {
  display: flex;
  align-items: center;
  gap: 6px;
  min-height: 36px;
  padding: 0 11px;
  border: 1px solid var(--border);
  border-radius: var(--r);
  background: var(--surface-2);
  color: var(--text-2);
  font-size: 13px;
}
.lead-imovel-fixo i {
  color: var(--brand-text);
}
</style>
