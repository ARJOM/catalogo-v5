<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import BaseBadge from '@/components/BaseBadge.vue'
import BaseButton from '@/components/BaseButton.vue'
import UsuarioModal from '@/components/UsuarioModal.vue'
import { useAuthStore } from '@/stores/auth'
import { useUsuariosStore } from '@/stores/usuarios'
import type { Usuario } from '@/types'
import { iniciais } from '@/utils/formatadores'

const auth = useAuthStore()
const usuarios = useUsuariosStore()

const modalAberto = ref(false)
const editando = ref<Usuario>()
const erroAcao = ref('')
/** uid cuja inativação/reativação está em andamento (trava só a linha). */
const processando = ref('')

onMounted(() => void usuarios.carregar())

const subtitulo = computed(() => {
  const n = usuarios.itens.length
  return `${n} ${n === 1 ? 'usuário cadastrado' : 'usuários cadastrados'}`
})

const ehEu = (u: Usuario) => u.uid === auth.usuario?.uid

function novo() {
  editando.value = undefined
  modalAberto.value = true
}
function editar(usuario: Usuario) {
  editando.value = usuario
  modalAberto.value = true
}
async function alternar(usuario: Usuario) {
  erroAcao.value = ''
  processando.value = usuario.uid
  try {
    await usuarios.definirAtivo(usuario.uid, !usuario.ativo)
  } catch {
    erroAcao.value = `Não foi possível ${usuario.ativo ? 'inativar' : 'reativar'} ${usuario.nome}. Tente novamente.`
  } finally {
    processando.value = ''
  }
}
</script>

<template>
  <div class="ph">
    <div>
      <h1 class="ph-title">Usuários</h1>
      <div class="ph-sub" aria-live="polite">
        {{ usuarios.carregado ? subtitulo : 'Carregando…' }}
      </div>
    </div>
    <BaseButton variante="primary" tamanho="sm" icone="plus" @click="novo">Novo</BaseButton>
  </div>

  <p v-if="erroAcao" class="lalert" role="alert">
    <i class="ti ti-alert-circle" aria-hidden="true"></i> {{ erroAcao }}
  </p>

  <div
    v-if="usuarios.carregando && !usuarios.carregado"
    class="tbl-wrap"
    aria-busy="true"
    style="padding: 14px"
  >
    <div class="skeleton sk-linha"></div>
    <div class="skeleton sk-linha"></div>
  </div>

  <div v-else-if="usuarios.erro" class="vazio" role="alert">
    <i class="ti ti-cloud-off" aria-hidden="true"></i>
    <p class="vazio-titulo">{{ usuarios.erro }}</p>
    <BaseButton icone="refresh" @click="usuarios.carregar(true)">Tentar de novo</BaseButton>
  </div>

  <div v-else-if="usuarios.carregado" class="tbl-wrap">
    <table class="tbl">
      <thead>
        <tr>
          <th>Usuário</th>
          <th class="hide-mobile">E-mail</th>
          <th>Perfil</th>
          <th>Status</th>
          <th>Ações</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="u in usuarios.itens" :key="u.uid" data-testid="linha-usuario">
          <td>
            <div class="usuario-cel">
              <div class="av av-26" :class="{ admin: u.perfil === 'admin' }" aria-hidden="true">
                {{ iniciais(u.nome) }}
              </div>
              {{ u.nome }}
            </div>
          </td>
          <td class="hide-mobile email">{{ u.email }}</td>
          <td>
            <BaseBadge v-if="u.perfil === 'admin'" variante="admin" icone="shield-check">
              Admin
            </BaseBadge>
            <BaseBadge v-else variante="corretor">Corretor</BaseBadge>
          </td>
          <td>
            <BaseBadge
              :variante="u.ativo ? 'ativo' : 'inativo'"
              :icone="u.ativo ? 'circle-check' : 'circle-x'"
            >
              {{ u.ativo ? 'Ativo' : 'Inativo' }}
            </BaseBadge>
          </td>
          <td>
            <div class="tbl-actions">
              <button type="button" class="tbl-link" @click="editar(u)">Editar</button>
              <button
                v-if="!ehEu(u)"
                type="button"
                :class="u.ativo ? 'tbl-danger' : 'tbl-link'"
                :disabled="processando === u.uid"
                @click="alternar(u)"
              >
                {{ u.ativo ? 'Inativar' : 'Reativar' }}
              </button>
            </div>
          </td>
        </tr>
      </tbody>
    </table>
  </div>

  <UsuarioModal v-model:aberto="modalAberto" :usuario="editando" />
</template>

<style scoped>
.usuario-cel {
  display: flex;
  align-items: center;
  gap: 8px;
}
.email {
  color: var(--text-3);
  font-size: 12px;
}
</style>
