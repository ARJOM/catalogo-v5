<script setup lang="ts">
import { RouterLink } from 'vue-router'
import { useLeadsStore } from '@/stores/leads'
import type { Lead } from '@/types'
import { formatarDataHora, iniciais } from '@/utils/formatadores'
import { formatarTelefone } from '@/utils/formatadores'

/**
 * Lista de leads: tabela no desktop e cards no mobile (`mostrarImovel`, listagem geral) ou
 * só a tabela enxuta do detalhe do imóvel.
 */
defineProps<{ leads: Lead[]; mostrarImovel?: boolean }>()
const emit = defineEmits<{ editar: [lead: Lead] }>()

const store = useLeadsStore()
</script>

<template>
  <template v-if="mostrarImovel">
    <div class="tbl-wrap leads-tbl">
      <table class="tbl">
        <thead>
          <tr>
            <th>Nome</th>
            <th>Telefone</th>
            <th>Imóvel vinculado</th>
            <th>Data</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="lead in leads" :key="lead.id">
            <td>{{ lead.nomeComprador }}</td>
            <td>{{ formatarTelefone(lead.telefone) }}</td>
            <td>
              <RouterLink
                v-if="store.imovelExiste(lead.imovelId)"
                class="lead-imovel"
                :to="{ name: 'imovel-detalhe', params: { id: lead.imovelId } }"
              >
                {{ lead.imovelEndereco }}
              </RouterLink>
              <span v-else class="lead-imovel excluido" title="Este imóvel foi excluído">
                {{ lead.imovelEndereco }} <em>(imóvel excluído)</em>
              </span>
            </td>
            <td class="lead-data">{{ formatarDataHora(lead.criadoEm) }}</td>
            <td>
              <button type="button" class="tbl-link" @click="emit('editar', lead)">Editar</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="tbl-wrap leads-cards" style="display: none">
      <div v-for="lead in leads" :key="lead.id" class="lead-row">
        <div class="lead-av" aria-hidden="true">{{ iniciais(lead.nomeComprador) }}</div>
        <div class="lead-info">
          <div class="lead-name">{{ lead.nomeComprador }}</div>
          <div class="lead-meta">
            <i class="ti ti-phone" style="font-size: 12px" aria-hidden="true"></i>
            {{ formatarTelefone(lead.telefone) }}
          </div>
          <div class="lead-meta" :class="{ 'lead-meta-excluido': !store.imovelExiste(lead.imovelId) }">
            <i class="ti ti-building-estate" style="font-size: 12px" aria-hidden="true"></i>
            <RouterLink
              v-if="store.imovelExiste(lead.imovelId)"
              class="lead-imovel"
              :to="{ name: 'imovel-detalhe', params: { id: lead.imovelId } }"
            >
              {{ lead.imovelEndereco }}
            </RouterLink>
            <span v-else>{{ lead.imovelEndereco }} <em>(imóvel excluído)</em></span>
          </div>
        </div>
        <div class="lead-right">
          <div class="lead-data">{{ formatarDataHora(lead.criadoEm) }}</div>
          <button type="button" class="btn xs" @click="emit('editar', lead)">Editar</button>
        </div>
      </div>
    </div>
  </template>

  <div v-else class="tbl-wrap">
    <table class="tbl">
      <thead>
        <tr>
          <th>Nome</th>
          <th class="hide-mobile">Telefone</th>
          <th>Data</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="lead in leads" :key="lead.id">
          <td>
            {{ lead.nomeComprador }}
            <div class="lead-tel-mobile">{{ formatarTelefone(lead.telefone) }}</div>
          </td>
          <td class="hide-mobile">{{ formatarTelefone(lead.telefone) }}</td>
          <td class="lead-data">{{ formatarDataHora(lead.criadoEm) }}</td>
          <td>
            <button type="button" class="tbl-link" @click="emit('editar', lead)">Editar</button>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<style scoped>
.lead-imovel {
  color: var(--brand-text);
  font-weight: 500;
  text-decoration: none;
}
a.lead-imovel:hover {
  text-decoration: underline;
}
.lead-imovel.excluido,
.lead-meta-excluido {
  color: var(--text-3);
  font-weight: 400;
}
em {
  font-style: normal;
  font-size: 11px;
}
.lead-data {
  color: var(--text-3);
  font-size: 12px;
}
.lead-tel-mobile {
  display: none;
  font-size: 11px;
  color: var(--text-3);
}
@media (max-width: 680px) {
  .lead-tel-mobile {
    display: block;
  }
}
</style>
