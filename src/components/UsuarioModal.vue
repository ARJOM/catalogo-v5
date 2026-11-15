<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import BaseButton from '@/components/BaseButton.vue'
import BaseInput from '@/components/BaseInput.vue'
import BaseModal from '@/components/BaseModal.vue'
import BaseSelect from '@/components/BaseSelect.vue'
import { useAuthStore } from '@/stores/auth'
import { useUsuariosStore } from '@/stores/usuarios'
import type { Usuario } from '@/types'
import { validarUsuario, type ErrosUsuario } from '@/utils/usuarios'

const props = defineProps<{
  /** Usuário em edição; sem ele o modal cria um usuário novo. */
  usuario?: Usuario
}>()
const aberto = defineModel<boolean>('aberto', { required: true })

const auth = useAuthStore()
const usuarios = useUsuariosStore()

const edicao = computed(() => !!props.usuario)
/** O admin não muda o próprio perfil (a regra do Firestore também nega). */
const perfilTravado = computed(() => !!props.usuario && props.usuario.uid === auth.usuario?.uid)

const valores = reactive({ nome: '', email: '', senha: '', perfil: '' as Usuario['perfil'] | '' })
const erros = ref<ErrosUsuario>({})
const erroGeral = ref('')
const salvando = ref(false)

const opcoesPerfil = [
  { valor: 'corretor', rotulo: 'Corretor' },
  { valor: 'admin', rotulo: 'Administrador' },
]

// Cada abertura recomeça do zero (ou dos dados do usuário editado).
watch(aberto, (estaAberto) => {
  if (!estaAberto) return
  valores.nome = props.usuario?.nome ?? ''
  valores.email = props.usuario?.email ?? ''
  valores.senha = ''
  valores.perfil = props.usuario?.perfil ?? 'corretor'
  erros.value = {}
  erroGeral.value = ''
})

async function enviar() {
  if (salvando.value) return
  erroGeral.value = ''
  erros.value = validarUsuario(valores, edicao.value)
  if (Object.keys(erros.value).length > 0) return
  salvando.value = true
  try {
    const perfil = valores.perfil as Usuario['perfil']
    if (props.usuario) {
      await usuarios.atualizar(props.usuario.uid, {
        nome: valores.nome.trim(),
        ...(perfilTravado.value ? {} : { perfil }),
      })
    } else {
      await usuarios.criar({
        nome: valores.nome.trim(),
        email: valores.email.trim(),
        senha: valores.senha,
        perfil,
      })
    }
    aberto.value = false
  } catch (e) {
    erroGeral.value =
      e instanceof Error && e.name === 'ErroCriarUsuario'
        ? e.message
        : 'Não foi possível salvar o usuário. Tente novamente.'
  } finally {
    salvando.value = false
  }
}
</script>

<template>
  <BaseModal v-model:aberto="aberto" :titulo="edicao ? 'Editar usuário' : 'Novo usuário'">
    <form id="form-usuario" novalidate @submit.prevent="enviar">
      <div class="fgrid">
        <div class="ffull">
          <BaseInput
            v-model="valores.nome"
            rotulo="Nome"
            autocomplete="off"
            maxlength="120"
            :erro="erros.nome"
          />
        </div>
        <div class="ffull">
          <BaseInput
            v-model="valores.email"
            rotulo="E-mail"
            type="email"
            autocomplete="off"
            :disabled="edicao"
            :erro="erros.email"
          />
        </div>
        <div v-if="!edicao" class="ffull">
          <BaseInput
            v-model="valores.senha"
            rotulo="Senha inicial"
            type="password"
            autocomplete="new-password"
            :erro="erros.senha"
          />
        </div>
        <div class="ffull">
          <BaseSelect
            v-model="valores.perfil"
            rotulo="Perfil"
            :opcoes="opcoesPerfil"
            :disabled="perfilTravado"
            :erro="erros.perfil"
          />
        </div>
      </div>
      <p v-if="perfilTravado" class="dica">Você não pode alterar o seu próprio perfil.</p>
      <p v-if="erroGeral" class="lalert" role="alert">
        <i class="ti ti-alert-circle" aria-hidden="true"></i> {{ erroGeral }}
      </p>
    </form>
    <template #rodape>
      <BaseButton :disabled="salvando" @click="aberto = false">Cancelar</BaseButton>
      <BaseButton variante="primary" :carregando="salvando" @click="enviar">
        {{ edicao ? 'Salvar' : 'Criar usuário' }}
      </BaseButton>
    </template>
  </BaseModal>
</template>

<style scoped>
.dica {
  margin: 10px 0 0;
  font-size: 12px;
  color: var(--text-3);
}
.lalert {
  margin: 12px 0 0;
}
</style>
