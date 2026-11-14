<script setup lang="ts">
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useForm } from 'vee-validate'
import * as yup from 'yup'
import { ErroLogin, useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const route = useRoute()
const router = useRouter()

const { defineField, errors, handleSubmit, isSubmitting } = useForm({
  validationSchema: yup.object({
    email: yup.string().trim().required('Informe seu e-mail.').email('E-mail inválido.'),
    senha: yup.string().required('Informe sua senha.'),
  }),
  initialValues: { email: '', senha: '' },
})

// Valida ao sair do campo; depois do primeiro erro, revalida a cada digitação.
const config = (estado: { errors: string[] }) => ({
  validateOnModelUpdate: estado.errors.length > 0,
})
const [email, emailAttrs] = defineField('email', config)
const [senha, senhaAttrs] = defineField('senha', config)
const lembrar = ref(true)

// Aviso de sessão encerrada pelo sistema (ex.: conta inativada com a sessão aberta).
const erro = ref(auth.mensagemSaida)

const entrar = handleSubmit(async (valores) => {
  erro.value = ''
  try {
    await auth.login(valores.email, valores.senha, lembrar.value)
  } catch (e) {
    erro.value = e instanceof ErroLogin ? e.message : 'Não foi possível entrar. Tente novamente.'
    return
  }
  const destino = typeof route.query.redirecionar === 'string' ? route.query.redirecionar : '/'
  await router.replace(destino.startsWith('/') && !destino.startsWith('//') ? destino : '/')
})
</script>

<template>
  <div class="login-page">
    <form class="login-card" novalidate @submit.prevent="entrar">
      <div class="login-logo">
        <i class="ti ti-building-estate" aria-hidden="true"></i><span>Catálogo V5</span>
      </div>
      <div class="login-sub">Área restrita a corretores credenciados</div>

      <div v-if="erro" class="lalert" role="alert">
        <i class="ti ti-alert-circle" aria-hidden="true"></i> {{ erro }}
      </div>

      <div class="lf">
        <label for="login-email">E-mail</label>
        <input
          id="login-email"
          v-model="email"
          v-bind="emailAttrs"
          class="li"
          :class="{ invalido: errors.email }"
          type="email"
          placeholder="seu@email.com"
          autocomplete="username"
          :aria-invalid="errors.email ? true : undefined"
          :aria-describedby="errors.email ? 'login-email-erro' : undefined"
        />
        <span v-if="errors.email" id="login-email-erro" class="lferr">{{ errors.email }}</span>
      </div>

      <div class="lf">
        <label for="login-senha">Senha</label>
        <input
          id="login-senha"
          v-model="senha"
          v-bind="senhaAttrs"
          class="li"
          :class="{ invalido: errors.senha }"
          type="password"
          placeholder="••••••••"
          autocomplete="current-password"
          :aria-invalid="errors.senha ? true : undefined"
          :aria-describedby="errors.senha ? 'login-senha-erro' : undefined"
        />
        <span v-if="errors.senha" id="login-senha-erro" class="lferr">{{ errors.senha }}</span>
      </div>

      <div class="lchk">
        <input id="lembrar" v-model="lembrar" type="checkbox" />
        <label for="lembrar">Lembrar acesso neste dispositivo</label>
      </div>

      <button class="lbtn" type="submit" :disabled="isSubmitting" :aria-busy="isSubmitting">
        <i v-if="isSubmitting" class="ti ti-loader-2 girando" aria-hidden="true"></i>
        <i v-else class="ti ti-login-2" aria-hidden="true"></i>
        Entrar no sistema
      </button>

      <div class="lhint">
        <i class="ti ti-info-circle" aria-hidden="true"></i> Esqueceu a senha? Fale com o
        administrador.
      </div>
    </form>
  </div>
</template>
