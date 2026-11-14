<script setup lang="ts">
import { toRef, watch } from 'vue'
import BaseButton from '@/components/BaseButton.vue'
import { useHistorico } from '@/composables/useHistorico'
import { useUsuariosStore } from '@/stores/usuarios'
import { formatarDataHora } from '@/utils/formatadores'
import { descreverRegistro, iconeDoRegistro } from '@/utils/historico'

const props = defineProps<{ imovelId: string }>()

const usuarios = useUsuariosStore()
const { registros, carregando, erro, carregar } = useHistorico(toRef(props, 'imovelId'))

// Um imóvel novo (ou a mesma tela reaberta) sempre busca o histórico de novo.
watch(
  () => props.imovelId,
  () => {
    void usuarios.carregar()
    void carregar()
  },
  { immediate: true },
)
</script>

<template>
  <section class="historico" aria-labelledby="historico-titulo">
    <h2 id="historico-titulo" class="sec-title">
      <i class="ti ti-history" aria-hidden="true"></i> Histórico de edições
    </h2>

    <div v-if="carregando && registros.length === 0" aria-busy="true" class="historico-lista">
      <div v-for="n in 3" :key="n" class="skeleton sk-linha sk-hist" aria-hidden="true"></div>
    </div>

    <div v-else-if="erro" class="historico-aviso" role="alert">
      <span>{{ erro }}</span>
      <BaseButton tamanho="sm" icone="refresh" @click="carregar()">Tentar de novo</BaseButton>
    </div>

    <p v-else-if="registros.length === 0" class="historico-aviso">
      Nenhuma alteração registrada para este imóvel.
    </p>

    <ol v-else class="historico-lista">
      <li v-for="registro in registros" :key="registro.id" class="hist-item">
        <div class="hist-left">
          <div class="hicon" :class="iconeDoRegistro(registro.tipo).variante">
            <i :class="`ti ti-${iconeDoRegistro(registro.tipo).icone}`" aria-hidden="true"></i>
          </div>
          <div class="hist-desc">
            <template v-for="(parte, i) in descreverRegistro(registro, usuarios.nomeDe)" :key="i">
              <strong v-if="parte.destaque">{{ parte.texto }}</strong>
              <template v-else>{{ parte.texto }}</template>
            </template>
          </div>
        </div>
        <div class="hist-meta">
          {{ registro.usuarioNome }}<br />{{ formatarDataHora(registro.timestamp) }}
        </div>
      </li>
    </ol>
  </section>
</template>

<style scoped>
.historico {
  margin-top: 24px;
}
.historico .sec-title {
  margin-bottom: 10px;
}
.historico-lista {
  list-style: none;
  padding: 0;
  margin: 0;
}
.sk-hist {
  height: 48px;
  border-radius: var(--r);
}
.historico-aviso {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  font-size: 13px;
  color: var(--text-2);
}
</style>
