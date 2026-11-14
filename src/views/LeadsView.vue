<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import BaseButton from '@/components/BaseButton.vue'
import BaseSelect from '@/components/BaseSelect.vue'
import LeadForm from '@/components/LeadForm.vue'
import LeadModal from '@/components/LeadModal.vue'
import LeadTable from '@/components/LeadTable.vue'
import { useAuthStore } from '@/stores/auth'
import { useImoveisStore } from '@/stores/imoveis'
import { useLeadsStore } from '@/stores/leads'
import type { Lead } from '@/types'

const auth = useAuthStore()
const imoveis = useImoveisStore()
const leads = useLeadsStore()

const escopo = computed(() => (auth.ehAdmin ? 'todos' : 'ativos'))
/** Só imóveis ativos recebem lead novo. */
const imoveisAtivos = computed(() => imoveis.itens.filter((i) => i.status === 'ativo'))

const formAberto = ref(true)
const modalEditar = ref(false)
const editando = ref<Lead>()

async function carregar() {
  await Promise.all([leads.carregar(true), imoveis.carregar(escopo.value)])
  await leads.verificarImoveis(
    [...new Set(leads.itens.map((l) => l.imovelId))],
    new Set(imoveis.itens.map((i) => i.id)),
  )
}
onMounted(() => void carregar())

const opcoesFiltro = computed(() =>
  leads.imoveisDosLeads.map((i) => ({ valor: i.id, rotulo: i.endereco })),
)
const subtitulo = computed(() => {
  const n = leads.filtrados.length
  const base = `${n} ${n === 1 ? 'comprador cadastrado' : 'compradores cadastrados'}`
  return leads.filtroImovelId ? `${base} neste imóvel` : base
})

function editar(lead: Lead) {
  editando.value = lead
  modalEditar.value = true
}
</script>

<template>
  <div class="ph">
    <div>
      <h1 class="ph-title">Leads</h1>
      <div class="ph-sub" aria-live="polite">{{ leads.carregado ? subtitulo : 'Carregando…' }}</div>
    </div>
    <BaseButton variante="primary" tamanho="sm" icone="plus" @click="formAberto = true">
      Novo
    </BaseButton>
  </div>

  <div v-if="formAberto" class="leads-inline">
    <div class="li-title"><i class="ti ti-user-plus" aria-hidden="true"></i> Cadastrar novo lead</div>
    <LeadForm :imoveis="imoveisAtivos" />
  </div>

  <div v-if="leads.carregado && leads.itens.length > 0" class="filters">
    <div class="filter-row">
      <div class="fg wide">
        <BaseSelect
          v-model="leads.filtroImovelId"
          rotulo="Filtrar por imóvel"
          placeholder="Todos os imóveis"
          :opcoes="opcoesFiltro"
        />
      </div>
    </div>
  </div>

  <div v-if="leads.carregando" class="tbl-wrap" aria-busy="true" style="padding: 14px">
    <div class="skeleton sk-linha"></div>
    <div class="skeleton sk-linha"></div>
    <div class="skeleton sk-linha"></div>
  </div>

  <div v-else-if="leads.erro" class="vazio" role="alert">
    <i class="ti ti-cloud-off" aria-hidden="true"></i>
    <p class="vazio-titulo">{{ leads.erro }}</p>
    <BaseButton icone="refresh" @click="carregar()">Tentar de novo</BaseButton>
  </div>

  <div v-else-if="leads.carregado && leads.itens.length === 0" class="vazio">
    <i class="ti ti-users" aria-hidden="true"></i>
    <p class="vazio-titulo">Nenhum lead cadastrado</p>
    <p class="vazio-texto">Use o formulário acima para cadastrar o primeiro comprador.</p>
  </div>

  <LeadTable v-else-if="leads.carregado" :leads="leads.filtrados" mostrar-imovel @editar="editar" />

  <LeadModal v-model:aberto="modalEditar" :lead="editando" />
</template>
