<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import BaseButton from '@/components/BaseButton.vue'
import FiltrosImoveis from '@/components/FiltrosImoveis.vue'
import ImovelCard from '@/components/ImovelCard.vue'
import ImovelRow from '@/components/ImovelRow.vue'
import { useAuthStore } from '@/stores/auth'
import { useImoveisStore } from '@/stores/imoveis'
import { useUsuariosStore } from '@/stores/usuarios'

const auth = useAuthStore()
const imoveis = useImoveisStore()
const usuarios = useUsuariosStore()
const router = useRouter()

const escopo = computed(() => (auth.ehAdmin ? 'todos' : 'ativos'))

function carregar(forcar = false) {
  // Os nomes dos captadores chegam em paralelo; se falharem, os cards mostram um nome neutro.
  void usuarios.carregar()
  return imoveis.carregar(escopo.value, forcar)
}
onMounted(() => void carregar())

const captadores = computed(() =>
  usuarios.itens.map((u) => ({ valor: u.uid, rotulo: u.ativo ? u.nome : `${u.nome} (inativo)` })),
)

const subtitulo = computed(() => {
  const n = imoveis.filtrados.length
  const palavra = n === 1 ? 'imóvel' : 'imóveis'
  if (imoveis.filtroAtivo)
    return `${n} de ${imoveis.total} ${imoveis.total === 1 ? 'imóvel' : 'imóveis'}`
  return `${n} ${palavra}${auth.ehAdmin ? '' : n === 1 ? ' ativo' : ' ativos'}`
})

const carregandoPrimeiraVez = computed(() => imoveis.carregando && !imoveis.carregado)
const semNenhum = computed(() => imoveis.carregado && imoveis.total === 0)
const semResultado = computed(
  () => imoveis.carregado && imoveis.total > 0 && imoveis.filtrados.length === 0,
)
</script>

<template>
  <div class="ph">
    <div>
      <h1 class="ph-title">Catálogo de imóveis</h1>
      <div class="ph-sub" aria-live="polite">
        {{ imoveis.carregado ? subtitulo : 'Carregando…' }}
      </div>
    </div>
    <BaseButton
      variante="primary"
      tamanho="sm"
      icone="plus"
      @click="router.push({ name: 'imovel-novo' })"
    >
      Novo imóvel
    </BaseButton>
  </div>

  <FiltrosImoveis
    v-model="imoveis.filtros"
    :captadores="captadores"
    :mostrar-status="auth.ehAdmin"
    :ativo="imoveis.filtroAtivo"
    @limpar="imoveis.limparFiltros()"
  />

  <div
    v-if="carregandoPrimeiraVez"
    class="imoveis-grid"
    aria-busy="true"
    aria-label="Carregando imóveis"
  >
    <div v-for="n in 6" :key="n" class="imovel-card skeleton-card" aria-hidden="true">
      <div class="imovel-foto skeleton"></div>
      <div class="ic-body">
        <div class="skeleton sk-linha sk-valor"></div>
        <div class="skeleton sk-linha"></div>
        <div class="skeleton sk-linha sk-curta"></div>
      </div>
    </div>
  </div>

  <div v-else-if="imoveis.erro && !imoveis.carregado" class="vazio" role="alert">
    <i class="ti ti-cloud-off" aria-hidden="true"></i>
    <p class="vazio-titulo">{{ imoveis.erro }}</p>
    <BaseButton icone="refresh" @click="carregar(true)">Tentar de novo</BaseButton>
  </div>

  <div v-else-if="semNenhum" class="vazio">
    <i class="ti ti-building-estate" aria-hidden="true"></i>
    <p class="vazio-titulo">Nenhum imóvel cadastrado ainda</p>
    <p class="vazio-texto">Os imóveis cadastrados aparecem aqui.</p>
    <BaseButton variante="primary" icone="plus" @click="router.push({ name: 'imovel-novo' })">
      Cadastrar o primeiro imóvel
    </BaseButton>
  </div>

  <div v-else-if="semResultado" class="vazio">
    <i class="ti ti-search-off" aria-hidden="true"></i>
    <p class="vazio-titulo">Nenhum imóvel encontrado</p>
    <p class="vazio-texto">Nenhum imóvel combina com os filtros escolhidos.</p>
    <BaseButton icone="filter-off" @click="imoveis.limparFiltros()">Limpar filtros</BaseButton>
  </div>

  <template v-else-if="imoveis.carregado">
    <div class="imoveis-grid">
      <ImovelCard
        v-for="imovel in imoveis.filtrados"
        :key="imovel.id"
        :imovel="imovel"
        :captador-nome="usuarios.nomeDe(imovel.captadorId)"
      />
    </div>
    <div class="imoveis-list">
      <ImovelRow v-for="imovel in imoveis.filtrados" :key="imovel.id" :imovel="imovel" />
    </div>
  </template>
</template>
