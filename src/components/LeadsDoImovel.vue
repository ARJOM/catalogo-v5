<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import BaseButton from '@/components/BaseButton.vue'
import LeadModal from '@/components/LeadModal.vue'
import LeadTable from '@/components/LeadTable.vue'
import { useLeadsStore } from '@/stores/leads'
import type { Imovel, Lead } from '@/types'

/** Bloco "Leads interessados" do detalhe do imóvel. */
const props = defineProps<{ imovel: Pick<Imovel, 'id' | 'tipo' | 'rua'> }>()

const leads = useLeadsStore()
const id = computed(() => props.imovel.id)
const lista = computed(() => leads.doImovel[id.value] ?? [])
const carregando = computed(() => leads.doImovelCarregando[id.value] ?? false)
const erro = computed(() => leads.doImovelErro[id.value] ?? '')

const modalNovo = ref(false)
const modalEditar = ref(false)
const editando = ref<Lead>()

function editar(lead: Lead) {
  editando.value = lead
  modalEditar.value = true
}

onMounted(() => void leads.carregarDoImovel(id.value))
watch(id, (novo) => void leads.carregarDoImovel(novo))
</script>

<template>
  <div class="gap">
    <div class="sec-hdr">
      <div class="sec-title">
        <i class="ti ti-users" aria-hidden="true"></i> Leads interessados
      </div>
      <BaseButton variante="primary" tamanho="sm" icone="plus" @click="modalNovo = true">
        Novo
      </BaseButton>
    </div>

    <div v-if="carregando" class="tbl-wrap" aria-busy="true" style="padding: 14px">
      <div class="skeleton sk-linha"></div>
      <div class="skeleton sk-linha"></div>
    </div>
    <p v-else-if="erro" class="ferr" role="alert">
      {{ erro }}
      <button type="button" class="tbl-link" @click="leads.carregarDoImovel(id)">
        Tentar de novo
      </button>
    </p>
    <p v-else-if="lista.length === 0" class="vazio-texto">
      Nenhum lead cadastrado para este imóvel.
    </p>
    <LeadTable v-else :leads="lista" @editar="editar" />

    <LeadModal v-model:aberto="modalNovo" :imovel-fixo="imovel" />
    <LeadModal v-model:aberto="modalEditar" :lead="editando" />
  </div>
</template>
