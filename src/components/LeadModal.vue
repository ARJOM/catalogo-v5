<script setup lang="ts">
import BaseModal from '@/components/BaseModal.vue'
import LeadForm from '@/components/LeadForm.vue'
import type { Imovel, Lead } from '@/types'

/** Modal do formulário de lead: edição (com `lead`) ou cadastro vinculado (com `imovelFixo`). */
defineProps<{
  lead?: Lead
  imovelFixo?: Pick<Imovel, 'id' | 'tipo' | 'rua'>
}>()
const aberto = defineModel<boolean>('aberto', { required: true })
</script>

<template>
  <BaseModal v-model:aberto="aberto" :titulo="lead ? 'Editar lead' : 'Novo lead'">
    <LeadForm
      v-if="aberto"
      :lead="lead"
      :imovel-fixo="imovelFixo"
      @salvo="aberto = false"
      @cancelar="aberto = false"
    />
  </BaseModal>
</template>
