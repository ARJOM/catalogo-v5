<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import BaseBadge from '@/components/BaseBadge.vue'
import BaseButton from '@/components/BaseButton.vue'
import ConfirmarExclusaoModal from '@/components/ConfirmarExclusaoModal.vue'
import { useEstatisticasStore } from '@/stores/estatisticas'
import { useImoveisStore } from '@/stores/imoveis'
import type { Imovel } from '@/types'
import { formatarMoeda, sufixoFinalidade } from '@/utils/formatadores'

const estatisticas = useEstatisticasStore()
const imoveis = useImoveisStore()

const alvo = ref<Imovel>()
const modalAberto = ref(false)
const excluindo = ref(false)
const erroExclusao = ref('')

function carregar() {
  void estatisticas.carregar()
  // O admin busca sem filtro de status (plano, seção 5).
  void imoveis.carregar('todos', true)
}
onMounted(carregar)

/** Rua e cidade, como na lista do catálogo. */
const endereco = (i: Imovel) => [i.rua, i.cidade].filter(Boolean).join(' — ')

function pedirExclusao(imovel: Imovel) {
  alvo.value = imovel
  erroExclusao.value = ''
  modalAberto.value = true
}

async function excluir() {
  if (!alvo.value) return
  excluindo.value = true
  erroExclusao.value = ''
  try {
    await imoveis.excluirDefinitivamente(alvo.value.id)
    modalAberto.value = false
    void estatisticas.carregar()
  } catch {
    erroExclusao.value = 'Não foi possível excluir o imóvel. Tente novamente.'
  } finally {
    excluindo.value = false
  }
}

const mais = (n: number) => `+${n} este mês`
</script>

<template>
  <div class="ph">
    <div>
      <h1 class="ph-title">Painel administrativo</h1>
      <div class="ph-sub">Visão geral do sistema</div>
    </div>
    <RouterLink to="/admin/usuarios" class="btn sm">
      <i class="ti ti-users" aria-hidden="true"></i> Usuários
    </RouterLink>
  </div>

  <div v-if="estatisticas.erro" class="vazio" role="alert">
    <i class="ti ti-cloud-off" aria-hidden="true"></i>
    <p class="vazio-titulo">{{ estatisticas.erro }}</p>
    <BaseButton icone="refresh" @click="estatisticas.carregar()">Tentar de novo</BaseButton>
  </div>
  <div v-else class="stats" :aria-busy="!estatisticas.dados">
    <div class="stat" data-testid="stat-ativos">
      <div class="stat-lbl">Imóveis ativos</div>
      <div class="stat-val">{{ estatisticas.dados?.imoveisAtivos ?? '—' }}</div>
      <div v-if="estatisticas.dados" class="stat-sub stat-up">
        <i class="ti ti-trending-up" aria-hidden="true"></i>
        {{ mais(estatisticas.dados.imoveisAtivosNoMes) }}
      </div>
    </div>
    <div class="stat" data-testid="stat-inativos">
      <div class="stat-lbl">Imóveis inativos</div>
      <div class="stat-val">{{ estatisticas.dados?.imoveisInativos ?? '—' }}</div>
      <div class="stat-sub"><i class="ti ti-archive" aria-hidden="true"></i> arquivados</div>
    </div>
    <div class="stat" data-testid="stat-leads">
      <div class="stat-lbl">Leads</div>
      <div class="stat-val">{{ estatisticas.dados?.leads ?? '—' }}</div>
      <div v-if="estatisticas.dados" class="stat-sub stat-up">
        <i class="ti ti-trending-up" aria-hidden="true"></i>
        {{ mais(estatisticas.dados.leadsNoMes) }}
      </div>
    </div>
    <div class="stat" data-testid="stat-corretores">
      <div class="stat-lbl">Corretores</div>
      <div class="stat-val">{{ estatisticas.dados?.corretoresAtivos ?? '—' }}</div>
      <div class="stat-sub"><i class="ti ti-users" aria-hidden="true"></i> ativos</div>
    </div>
  </div>

  <div class="sec-hdr">
    <div class="sec-title">
      <i class="ti ti-building-estate" aria-hidden="true"></i> Todos os imóveis
    </div>
  </div>

  <div
    v-if="imoveis.carregando && !imoveis.carregado"
    class="tbl-wrap"
    aria-busy="true"
    style="padding: 14px"
  >
    <div class="skeleton sk-linha"></div>
    <div class="skeleton sk-linha"></div>
    <div class="skeleton sk-linha"></div>
  </div>

  <div v-else-if="imoveis.erro" class="vazio" role="alert">
    <i class="ti ti-cloud-off" aria-hidden="true"></i>
    <p class="vazio-titulo">{{ imoveis.erro }}</p>
    <BaseButton icone="refresh" @click="imoveis.carregar('todos', true)">Tentar de novo</BaseButton>
  </div>

  <div v-else-if="imoveis.carregado && imoveis.itens.length === 0" class="vazio">
    <i class="ti ti-building-estate" aria-hidden="true"></i>
    <p class="vazio-titulo">Nenhum imóvel cadastrado</p>
  </div>

  <div v-else-if="imoveis.carregado" class="tbl-wrap">
    <table class="tbl">
      <thead>
        <tr>
          <th>Endereço</th>
          <th class="hide-mobile">Tipo</th>
          <th class="hide-mobile">Valor</th>
          <th>Status</th>
          <th>Ações</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="i in imoveis.itens" :key="i.id" data-testid="linha-imovel">
          <td>{{ endereco(i) }}</td>
          <td class="hide-mobile">{{ i.tipo }}</td>
          <td class="hide-mobile">
            {{ formatarMoeda(i.valor) }}{{ sufixoFinalidade(i.finalidade) }}
          </td>
          <td>
            <BaseBadge
              :variante="i.status === 'ativo' ? 'ativo' : 'inativo'"
              :icone="i.status === 'ativo' ? 'circle-check' : 'circle-x'"
            >
              {{ i.status === 'ativo' ? 'Ativo' : 'Inativo' }}
            </BaseBadge>
          </td>
          <td>
            <div class="tbl-actions">
              <RouterLink
                class="tbl-link"
                :to="{ name: 'imovel-detalhe', params: { id: i.id } }"
                :aria-label="`Ver ${endereco(i)}`"
              >
                Ver
              </RouterLink>
              <button
                type="button"
                class="tbl-danger"
                :aria-label="`Excluir ${endereco(i)}`"
                @click="pedirExclusao(i)"
              >
                <i
                  class="ti ti-trash"
                  style="font-size: 12px; vertical-align: -1px"
                  aria-hidden="true"
                ></i>
                Excluir
              </button>
            </div>
          </td>
        </tr>
      </tbody>
    </table>
  </div>

  <ConfirmarExclusaoModal
    v-model:aberto="modalAberto"
    :endereco="alvo?.rua ?? ''"
    :carregando="excluindo"
    :erro="erroExclusao"
    @confirmar="excluir"
  />
</template>
