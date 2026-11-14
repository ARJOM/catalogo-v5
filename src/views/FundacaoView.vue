<script setup lang="ts">
/**
 * Tela provisória do epic E0: exibe os componentes base dentro do AppLayout para
 * conferência visual contra o protótipo. Sai quando as views reais entrarem (E1 e E3).
 */
import { ref } from 'vue'
import { useRoute } from 'vue-router'
import BaseBadge from '@/components/BaseBadge.vue'
import BaseButton from '@/components/BaseButton.vue'
import BaseInput from '@/components/BaseInput.vue'
import BaseModal from '@/components/BaseModal.vue'
import BaseSelect from '@/components/BaseSelect.vue'

const route = useRoute()

const tipos = ['Casa', 'Apartamento', 'Terreno', 'Comercial', 'Rural', 'Outros'].map((t) => ({
  valor: t,
  rotulo: t,
}))

const tipo = ref('Casa')
const finalidade = ref('')
const rua = ref('Rua das Flores, 142')
const telefone = ref('')
const caracteristicas = ref('')
const modalAberto = ref(false)
</script>

<template>
  <div class="ph">
    <div>
      <h1 class="ph-title">{{ route.meta.titulo }}</h1>
      <div class="ph-sub">Tela provisória — componentes base (E0)</div>
    </div>
    <BaseButton variante="primary" tamanho="sm" icone="plus">Novo imóvel</BaseButton>
  </div>

  <section class="fsec">
    <div class="fsec-title"><i class="ti ti-click" aria-hidden="true"></i> Botões</div>
    <div class="amostra">
      <BaseButton>Cancelar</BaseButton>
      <BaseButton variante="primary" icone="check">Salvar</BaseButton>
      <BaseButton variante="danger" icone="eye-off">Inativar</BaseButton>
      <BaseButton tamanho="sm" icone="edit">Editar</BaseButton>
      <BaseButton tamanho="xs">Editar</BaseButton>
      <BaseButton tamanho="sm" somente-icone icone="arrow-left" aria-label="Voltar" />
      <BaseButton variante="primary" carregando>Salvando</BaseButton>
      <BaseButton disabled>Desabilitado</BaseButton>
      <BaseButton icone="app-window" @click="modalAberto = true">Abrir modal</BaseButton>
    </div>
    <div style="margin-top: 12px">
      <BaseButton variante="primary" bloco icone="check">Salvar imóvel</BaseButton>
    </div>
  </section>

  <section class="fsec">
    <div class="fsec-title"><i class="ti ti-tag" aria-hidden="true"></i> Badges</div>
    <div class="amostra">
      <BaseBadge variante="ativo" icone="circle-check">Ativo</BaseBadge>
      <BaseBadge variante="inativo" icone="circle-x">Inativo</BaseBadge>
      <BaseBadge variante="venda">Venda</BaseBadge>
      <BaseBadge variante="aluguel">Aluguel</BaseBadge>
      <BaseBadge variante="tipo" icone="home">Casa</BaseBadge>
      <BaseBadge variante="admin" icone="shield-check">Admin</BaseBadge>
      <BaseBadge variante="corretor">Corretor</BaseBadge>
      <BaseBadge variante="ativo" icone="circle-check" pequeno>Ativo</BaseBadge>
    </div>
  </section>

  <section class="fsec">
    <div class="fsec-title"><i class="ti ti-forms" aria-hidden="true"></i> Campos</div>
    <div class="fgrid">
      <BaseSelect v-model="tipo" rotulo="Tipo" :opcoes="tipos" />
      <BaseSelect
        v-model="finalidade"
        rotulo="Finalidade"
        placeholder="Selecione…"
        erro="Informe a finalidade."
        :opcoes="[
          { valor: 'Venda', rotulo: 'Venda' },
          { valor: 'Aluguel', rotulo: 'Aluguel' },
        ]"
      />
      <BaseInput v-model="rua" rotulo="Rua / Logradouro" placeholder="Rua das Flores, 142" />
      <BaseInput
        v-model="telefone"
        rotulo="Telefone do cliente vendedor"
        placeholder="(83) 99999-0000"
        type="tel"
        erro="Informe um telefone válido."
      />
      <BaseInput
        v-model="caracteristicas"
        class="ffull"
        rotulo="Características"
        placeholder="Ex: 3 quartos, 2 banheiros, garagem…"
        multilinha
      />
    </div>
  </section>

  <BaseModal v-model:aberto="modalAberto" titulo="Inativar imóvel">
    <p>O imóvel deixa de aparecer no catálogo dos corretores. Deseja continuar?</p>
    <template #rodape>
      <BaseButton tamanho="sm" @click="modalAberto = false">Cancelar</BaseButton>
      <BaseButton tamanho="sm" variante="danger" @click="modalAberto = false">Inativar</BaseButton>
    </template>
  </BaseModal>
</template>

<style scoped>
.amostra {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}
</style>
