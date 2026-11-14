<script setup lang="ts">
import { computed, ref, useId, watch } from 'vue'
import BaseButton from '@/components/BaseButton.vue'
import BaseInput from '@/components/BaseInput.vue'
import BaseModal from '@/components/BaseModal.vue'

const props = defineProps<{
  /** Texto que a pessoa precisa digitar para liberar a exclusão (o endereço do imóvel). */
  endereco: string
  /** Exclusão em andamento: trava os botões. */
  carregando?: boolean
  /** Mensagem de falha da última tentativa. */
  erro?: string
}>()

const emit = defineEmits<{ confirmar: [] }>()
const aberto = defineModel<boolean>('aberto', { required: true })

const digitado = ref('')
const idAjuda = useId()

/** Compara sem diferenciar caixa nem espaços repetidos nas pontas ou no meio. */
const normalizar = (texto: string) => texto.trim().replace(/\s+/g, ' ').toLowerCase()
const confere = computed(
  () => props.endereco.trim() !== '' && normalizar(digitado.value) === normalizar(props.endereco),
)

// Cada abertura começa com o campo vazio: uma confirmação anterior não vale para a próxima.
watch(aberto, (estaAberto) => {
  if (estaAberto) digitado.value = ''
})

function confirmar() {
  if (confere.value && !props.carregando) emit('confirmar')
}
</script>

<template>
  <BaseModal v-model:aberto="aberto" titulo="Excluir imóvel definitivamente">
    <p>
      Isto apaga o imóvel, todas as fotos e o histórico de edições.
      <strong>Não pode ser desfeito.</strong> Os leads vinculados são mantidos, com o endereço
      registrado neles.
    </p>
    <p :id="idAjuda" class="instrucao">
      Para confirmar, digite o endereço: <strong class="alvo">{{ endereco }}</strong>
    </p>
    <BaseInput
      v-model="digitado"
      rotulo="Endereço do imóvel"
      autocomplete="off"
      :aria-describedby="idAjuda"
      :disabled="carregando"
      @keydown.enter.prevent="confirmar"
    />
    <p v-if="erro" class="lalert erro" role="alert">
      <i class="ti ti-alert-circle" aria-hidden="true"></i> {{ erro }}
    </p>
    <template #rodape>
      <BaseButton :disabled="carregando" @click="aberto = false">Cancelar</BaseButton>
      <BaseButton
        variante="danger"
        icone="trash"
        :disabled="!confere"
        :carregando="carregando"
        @click="confirmar"
      >
        Excluir definitivamente
      </BaseButton>
    </template>
  </BaseModal>
</template>

<style scoped>
.instrucao {
  margin: 12px 0;
}
.alvo {
  user-select: all;
}
.erro {
  margin: 12px 0 0;
}
</style>
