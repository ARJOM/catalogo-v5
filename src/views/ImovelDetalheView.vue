<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import BaseBadge from '@/components/BaseBadge.vue'
import BaseButton from '@/components/BaseButton.vue'
import BaseModal from '@/components/BaseModal.vue'
import FotoCarrossel from '@/components/FotoCarrossel.vue'
import HistoricoList from '@/components/HistoricoList.vue'
import LeadsDoImovel from '@/components/LeadsDoImovel.vue'
import { useImoveisStore } from '@/stores/imoveis'
import { useUsuariosStore } from '@/stores/usuarios'
import {
  formatarArea,
  formatarEndereco,
  formatarMoeda,
  formatarQuartos,
  formatarTelefone,
  sufixoFinalidade,
} from '@/utils/formatadores'
import { aparenciaDoTipo } from '@/utils/tiposImovel'

const route = useRoute()
const router = useRouter()
const imoveis = useImoveisStore()
const usuarios = useUsuariosStore()

const id = computed(() => String(route.params.id))
const carregando = ref(true)
const erro = ref('')

// Mostra na hora a cópia que o catálogo já tem e confirma no servidor: o detalhe
// sempre termina com a versão mais recente (fotos, valor, status).
const imovel = computed(() => imoveis.porId(id.value) ?? lido.value)
const lido = ref<ReturnType<typeof imoveis.porId>>(undefined)
const naoEncontrado = ref(false)

async function carregar() {
  const alvo = id.value
  carregando.value = !imoveis.porId(alvo)
  erro.value = ''
  naoEncontrado.value = false
  lido.value = undefined
  void usuarios.carregar()
  try {
    const resultado = await imoveis.obter(alvo)
    if (alvo !== id.value) return
    if (resultado) lido.value = resultado
    else naoEncontrado.value = true
  } catch {
    if (alvo === id.value && !imoveis.porId(alvo)) {
      erro.value = 'Não foi possível carregar o imóvel. Tente novamente.'
    }
  } finally {
    if (alvo === id.value) carregando.value = false
  }
}
watch(id, carregar, { immediate: true })

const aparencia = computed(() => aparenciaDoTipo(imovel.value?.tipo ?? ''))
const endereco = computed(() => (imovel.value ? formatarEndereco(imovel.value) : ''))
const quartos = computed(() => formatarQuartos(imovel.value?.quartos))
const ativo = computed(() => imovel.value?.status === 'ativo')
const captador = computed(() => (imovel.value ? usuarios.nomeDe(imovel.value.captadorId) : ''))
const titulo = computed(() =>
  imovel.value ? `${imovel.value.tipo} — ${imovel.value.rua}` : 'Imóvel',
)
const telefone = computed(() => formatarTelefone(imovel.value?.vendedorTelefone))

const confirmandoInativacao = ref(false)
const inativando = ref(false)
const erroInativacao = ref('')

function pedirInativacao() {
  erroInativacao.value = ''
  confirmandoInativacao.value = true
}

async function inativar() {
  if (!imovel.value) return
  inativando.value = true
  erroInativacao.value = ''
  try {
    await imoveis.inativar(imovel.value.id)
    confirmandoInativacao.value = false
    // Sai do catálogo do corretor: volta para a lista.
    await router.replace({ name: 'catalogo' })
  } catch {
    erroInativacao.value = 'Não foi possível inativar o imóvel. Tente novamente.'
  } finally {
    inativando.value = false
  }
}

/** Volta ao catálogo; os filtros moram na store, então chegam intactos. */
function voltar() {
  if (window.history.state?.back) router.back()
  else void router.push({ name: 'catalogo' })
}
</script>

<template>
  <div class="back-bar">
    <BaseButton tamanho="sm" somente-icone icone="arrow-left" aria-label="Voltar" @click="voltar" />
    <h1 class="back-title">{{ titulo }}</h1>
    <template v-if="imovel">
      <BaseBadge
        class="back-status"
        :variante="ativo ? 'ativo' : 'inativo'"
        :icone="ativo ? 'circle-check' : 'circle-x'"
      >
        {{ ativo ? 'Ativo' : 'Inativo' }}
      </BaseBadge>
      <BaseButton
        v-if="ativo"
        tamanho="sm"
        variante="danger"
        icone="circle-x"
        aria-label="Inativar imóvel"
        @click="pedirInativacao"
      >
        <span class="hide-on-mobile">Inativar</span>
      </BaseButton>
      <RouterLink :to="{ name: 'imovel-editar', params: { id: imovel.id } }" class="btn sm">
        <i class="ti ti-edit" aria-hidden="true"></i>
        <span class="hide-on-mobile">Editar</span>
      </RouterLink>
    </template>
  </div>

  <div v-if="carregando" class="detail-grid" aria-busy="true" aria-label="Carregando imóvel">
    <div class="carousel tall skeleton"></div>
    <div class="dinfo">
      <div class="skeleton sk-linha sk-valor"></div>
      <div class="skeleton sk-linha"></div>
      <div class="skeleton sk-linha sk-curta"></div>
    </div>
  </div>

  <div v-else-if="erro" class="vazio" role="alert">
    <i class="ti ti-cloud-off" aria-hidden="true"></i>
    <p class="vazio-titulo">{{ erro }}</p>
    <BaseButton icone="refresh" @click="carregar()">Tentar de novo</BaseButton>
  </div>

  <div v-else-if="naoEncontrado || !imovel" class="vazio">
    <i class="ti ti-home-off" aria-hidden="true"></i>
    <p class="vazio-titulo">Imóvel não encontrado</p>
    <p class="vazio-texto">Ele pode ter sido excluído ou o endereço está incorreto.</p>
    <BaseButton icone="arrow-left" @click="router.push({ name: 'catalogo' })">
      Voltar ao catálogo
    </BaseButton>
  </div>

  <div v-else class="detail-grid">
    <FotoCarrossel :fotos="imovel.fotos" :tipo="imovel.tipo" :descricao="titulo" />

    <div class="dinfo">
      <div>
        <div class="d-valor">
          {{ formatarMoeda(imovel.valor) }}
          <span v-if="sufixoFinalidade(imovel.finalidade)" class="sfx">{{
            sufixoFinalidade(imovel.finalidade)
          }}</span>
        </div>
        <div class="d-badges">
          <BaseBadge
            :variante="imovel.finalidade === 'Aluguel' ? 'aluguel' : 'venda'"
            :icone="aparencia.icone"
          >
            {{ imovel.tipo }} · {{ imovel.finalidade }}
          </BaseBadge>
        </div>
      </div>

      <div class="d-row">
        <div class="d-item">
          <label>Área</label><span>{{ formatarArea(imovel.areaM2) }}</span>
        </div>
        <div v-if="quartos" class="d-item">
          <label>Quartos</label><span>{{ quartos }}</span>
        </div>
        <div class="d-item">
          <label>Cidade</label><span>{{ imovel.cidade }} - {{ imovel.estado }}</span>
        </div>
      </div>
      <div class="d-item">
        <label>Endereço</label>
        <p>{{ endereco }} - {{ imovel.estado }}</p>
      </div>
      <div v-if="imovel.caracteristicas" class="d-item">
        <label>Características</label>
        <p>{{ imovel.caracteristicas }}</p>
      </div>

      <hr class="divider" />
      <div class="d-item">
        <label>Captador</label>
        <p>{{ captador }}</p>
      </div>
      <div class="d-item">
        <label>Cliente vendedor</label>
        <p>
          {{ imovel.vendedorNome }}
          <template v-if="telefone">
            ·
            <a class="tel" :href="`tel:${imovel.vendedorTelefone.replace(/\D/g, '')}`">
              <i class="ti ti-phone" aria-hidden="true"></i> {{ telefone }}
            </a>
          </template>
        </p>
      </div>
      <LeadsDoImovel :imovel="imovel" />
    </div>
  </div>

  <BaseModal v-model:aberto="confirmandoInativacao" titulo="Inativar imóvel?">
    <p>
      <strong>{{ titulo }}</strong> deixa de aparecer no catálogo dos corretores. O histórico e as
      fotos são mantidos, e é possível reativá-lo depois, editando o status.
    </p>
    <p v-if="erroInativacao" class="lalert modal-erro" role="alert">
      <i class="ti ti-alert-circle" aria-hidden="true"></i> {{ erroInativacao }}
    </p>
    <template #rodape>
      <BaseButton :disabled="inativando" @click="confirmandoInativacao = false"
        >Cancelar</BaseButton
      >
      <BaseButton variante="danger" icone="circle-x" :carregando="inativando" @click="inativar">
        Inativar
      </BaseButton>
    </template>
  </BaseModal>

  <HistoricoList v-if="imovel" :imovel-id="imovel.id" />
</template>

<style scoped>
.modal-erro {
  margin-top: 12px;
  margin-bottom: 0;
}
</style>
