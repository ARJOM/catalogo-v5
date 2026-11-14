<script setup lang="ts">
import { computed, nextTick, onMounted, reactive, ref } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { useForm } from 'vee-validate'
import BaseButton from '@/components/BaseButton.vue'
import BaseInput from '@/components/BaseInput.vue'
import BaseSelect from '@/components/BaseSelect.vue'
import FotoUploader from '@/components/FotoUploader.vue'
import { useAuthStore } from '@/stores/auth'
import { useImoveisStore } from '@/stores/imoveis'
import { useUsuariosStore } from '@/stores/usuarios'
import { UFS } from '@/utils/estados'
import type { ItemFoto } from '@/utils/fotos'
import { mascararNumero, mascararTelefone, soDigitos } from '@/utils/mascaras'
import { FINALIDADES, TIPOS_IMOVEL } from '@/utils/tiposImovel'
import {
  esquemaImovel,
  paraDadosImovel,
  valoresIniciais,
  type ValoresFormImovel,
} from '@/utils/validacaoImovel'

const router = useRouter()
const auth = useAuthStore()
const imoveis = useImoveisStore()
const usuarios = useUsuariosStore()

const { errors, values, setFieldValue, validateField, handleSubmit, isSubmitting } =
  useForm<ValoresFormImovel>({
    validationSchema: esquemaImovel,
    initialValues: valoresIniciais(auth.usuario?.uid ?? ''),
  })

/**
 * Cada campo vira um modelo para `v-model`. Valida ao sair do campo; depois do primeiro erro,
 * revalida a cada digitação (como no login).
 */
const campos = Object.keys(valoresIniciais()) as (keyof ValoresFormImovel)[]
const m = reactive(
  Object.fromEntries(
    campos.map((nome) => [
      nome,
      computed({
        get: () => values[nome] ?? '',
        set: (valor: string) => void setFieldValue(nome, valor, Boolean(errors.value[nome])),
      }),
    ]),
  ) as unknown as Record<keyof ValoresFormImovel, string>,
)
const sair = (nome: keyof ValoresFormImovel) => void validateField(nome)

onMounted(() => void usuarios.carregar())

const opcoesTipo = TIPOS_IMOVEL.map((t) => ({ valor: t, rotulo: t }))
const opcoesFinalidade = FINALIDADES.map((f) => ({ valor: f, rotulo: f }))
const opcoesUf = UFS.map((uf) => ({ valor: uf, rotulo: uf }))
const opcoesStatus = [
  { valor: 'ativo', rotulo: 'Ativo' },
  { valor: 'inativo', rotulo: 'Inativo' },
]
/** Corretores ativos; o captador atual entra mesmo que a lista ainda não tenha carregado. */
const opcoesCaptador = computed(() => {
  const lista = usuarios.ativos.map((u) => ({ valor: u.uid, rotulo: u.nome }))
  const atual = values.captadorId
  if (atual && !lista.some((o) => o.valor === atual)) {
    lista.unshift({ valor: atual, rotulo: usuarios.nomeDe(atual) })
  }
  return lista
})

const erroGeral = ref('')
const avisoFotos = ref('')
const fotos = ref<ItemFoto[]>([])
/**
 * Id do imóvel já gravado. Fica preenchido depois do primeiro "Salvar": se alguma foto falhar,
 * o formulário continua aberto e um novo "Salvar" atualiza o mesmo imóvel (sem duplicar).
 */
const idAtual = ref<string | null>(null)
/** URLs das fotos que o imóvel já tem no servidor; as que sumirem da lista são removidas. */
const urlsSalvas = ref<string[]>([])

const editando = computed(() => idAtual.value !== null)

const nomesDe = (itens: { nome: string }[]) => itens.map((i) => `"${i.nome}"`).join(', ')

const enviar = handleSubmit(
  async (valores) => {
    erroGeral.value = ''
    avisoFotos.value = ''
    if (fotos.value.some((f) => f.estado === 'comprimindo')) {
      erroGeral.value = 'Aguarde o fim da compressão das fotos para salvar.'
      return
    }
    const pendentes = fotos.value.filter((f) => f.arquivo)
    const urlsAtuais = fotos.value.flatMap((f) => (f.url ? [f.url] : []))
    let resultado
    try {
      resultado = await imoveis.salvar(paraDadosImovel(valores), idAtual.value ?? undefined, {
        novas: pendentes.map((f) => ({ id: f.id, nome: f.nome, arquivo: f.arquivo! })),
        removidas: urlsSalvas.value.filter((url) => !urlsAtuais.includes(url)),
        aoAtualizar: (id, parcial) => {
          const item = fotos.value.find((f) => f.id === id)
          if (item) Object.assign(item, parcial)
        },
      })
    } catch {
      erroGeral.value = 'Não foi possível salvar o imóvel. Tente novamente.'
      return
    }

    idAtual.value = resultado.imovel.id
    for (const item of fotos.value) {
      const url = resultado.enviadas[item.id]
      if (url) {
        item.url = url
        item.arquivo = undefined
      }
    }
    urlsSalvas.value = resultado.imovel.fotos

    if (resultado.erroNasFotos) {
      avisoFotos.value =
        'O imóvel foi salvo, mas as alterações nas fotos não puderam ser gravadas. ' +
        'Salve de novo para tentar outra vez.'
    } else if (resultado.falhas.length > 0) {
      const quantas = resultado.falhas.length
      avisoFotos.value =
        `O imóvel foi salvo, mas ${quantas === 1 ? '1 foto não subiu' : `${quantas} fotos não subiram`}: ` +
        `${nomesDe(resultado.falhas)}. Salve de novo para tentar outra vez ou envie-as depois, ` +
        'editando o imóvel.'
    }
    if (avisoFotos.value) return
    await router.replace({ name: 'imovel-detalhe', params: { id: resultado.imovel.id } })
  },
  // Leva o foco ao primeiro campo com erro.
  async () => {
    erroGeral.value = ''
    await nextTick()
    document.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus()
  },
)

function cancelar() {
  if (window.history.state?.back) router.back()
  else void router.push({ name: 'catalogo' })
}

const mascaraQuartos = (texto: string) => soDigitos(texto).slice(0, 2)
const mascaraValor = (texto: string) => mascararNumero(texto, 2)
const mascaraArea = (texto: string) => mascararNumero(texto, 2)
</script>

<template>
  <form novalidate @submit.prevent="enviar">
    <div class="ph">
      <div>
        <h1 class="ph-title">{{ editando ? 'Editar imóvel' : 'Novo imóvel' }}</h1>
        <div class="ph-sub">Preencha os dados abaixo</div>
      </div>
      <div class="acoes-topo">
        <BaseButton tamanho="sm" :disabled="isSubmitting" @click="cancelar">Cancelar</BaseButton>
        <BaseButton
          tamanho="sm"
          variante="primary"
          type="submit"
          icone="check"
          :carregando="isSubmitting"
        >
          Salvar
        </BaseButton>
      </div>
    </div>

    <div v-if="erroGeral" class="lalert" role="alert">
      <i class="ti ti-alert-circle" aria-hidden="true"></i> {{ erroGeral }}
    </div>

    <div v-if="avisoFotos" class="lalert" role="alert">
      <i class="ti ti-photo-exclamation" aria-hidden="true"></i>
      <div>
        {{ avisoFotos }}
        <RouterLink
          v-if="idAtual"
          class="link-aviso"
          :to="{ name: 'imovel-detalhe', params: { id: idAtual } }"
        >
          Abrir o imóvel
        </RouterLink>
      </div>
    </div>

    <div class="fsec">
      <div class="fsec-title"><i class="ti ti-photo" aria-hidden="true"></i> Fotos</div>
      <FotoUploader v-model="fotos" :desabilitado="isSubmitting" />
    </div>

    <div class="fsec">
      <div class="fsec-title"><i class="ti ti-info-circle" aria-hidden="true"></i> Informações</div>
      <div class="fgrid">
        <BaseSelect
          v-model="m.tipo"
          rotulo="Tipo"
          :opcoes="opcoesTipo"
          :erro="errors.tipo"
          @blur="sair('tipo')"
        />
        <BaseSelect
          v-model="m.finalidade"
          rotulo="Finalidade"
          :opcoes="opcoesFinalidade"
          :erro="errors.finalidade"
        />
        <BaseInput
          v-model="m.valor"
          rotulo="Valor (R$)"
          placeholder="0,00"
          inputmode="decimal"
          autocomplete="off"
          :mascara="mascaraValor"
          :erro="errors.valor"
          @blur="sair('valor')"
        />
        <BaseInput
          v-model="m.areaM2"
          rotulo="Área (m²)"
          placeholder="0"
          inputmode="decimal"
          autocomplete="off"
          :mascara="mascaraArea"
          :erro="errors.areaM2"
          @blur="sair('areaM2')"
        />
        <BaseInput
          v-model="m.quartos"
          rotulo="Quartos (opcional)"
          placeholder="0"
          inputmode="numeric"
          autocomplete="off"
          :mascara="mascaraQuartos"
          :erro="errors.quartos"
          @blur="sair('quartos')"
        />
        <div class="ffull">
          <BaseInput
            v-model="m.caracteristicas"
            rotulo="Características"
            multilinha
            placeholder="Ex: 3 quartos, 2 banheiros, garagem…"
            :erro="errors.caracteristicas"
            @blur="sair('caracteristicas')"
          />
        </div>
      </div>
    </div>

    <div class="fsec">
      <div class="fsec-title"><i class="ti ti-map-pin" aria-hidden="true"></i> Endereço</div>
      <div class="fgrid">
        <div class="ffull">
          <BaseInput
            v-model="m.rua"
            rotulo="Rua / Logradouro"
            placeholder="Rua das Flores, 142"
            autocomplete="off"
            :erro="errors.rua"
            @blur="sair('rua')"
          />
        </div>
        <BaseInput
          v-model="m.bairro"
          rotulo="Bairro"
          placeholder="Centro"
          autocomplete="off"
          :erro="errors.bairro"
          @blur="sair('bairro')"
        />
        <BaseInput
          v-model="m.cidade"
          rotulo="Cidade"
          placeholder="Cajazeiras"
          autocomplete="off"
          :erro="errors.cidade"
          @blur="sair('cidade')"
        />
        <BaseSelect v-model="m.estado" rotulo="Estado" :opcoes="opcoesUf" :erro="errors.estado" />
      </div>
    </div>

    <div class="fsec">
      <div class="fsec-title"><i class="ti ti-user-check" aria-hidden="true"></i> Responsáveis</div>
      <div class="fgrid">
        <BaseSelect
          v-model="m.captadorId"
          rotulo="Captador"
          :opcoes="opcoesCaptador"
          placeholder="Escolha o captador"
          :erro="errors.captadorId"
        />
        <BaseSelect
          v-model="m.status"
          rotulo="Status"
          :opcoes="opcoesStatus"
          :erro="errors.status"
        />
        <div class="ffull">
          <BaseInput
            v-model="m.vendedorNome"
            rotulo="Nome do cliente vendedor"
            placeholder="Nome completo"
            autocomplete="off"
            :erro="errors.vendedorNome"
            @blur="sair('vendedorNome')"
          />
        </div>
        <div class="ffull">
          <BaseInput
            v-model="m.vendedorTelefone"
            rotulo="Telefone do cliente vendedor"
            placeholder="(83) 99999-0000"
            inputmode="tel"
            autocomplete="off"
            :mascara="mascararTelefone"
            :erro="errors.vendedorTelefone"
            @blur="sair('vendedorTelefone')"
          />
        </div>
      </div>
    </div>

    <div class="so-mobile">
      <BaseButton variante="primary" bloco type="submit" icone="check" :carregando="isSubmitting">
        Salvar imóvel
      </BaseButton>
    </div>
  </form>
</template>

<style scoped>
.acoes-topo {
  display: flex;
  gap: 8px;
}
.link-aviso {
  display: block;
  margin-top: 4px;
  font-weight: 600;
  color: inherit;
  text-decoration: underline;
}
.so-mobile {
  display: none;
  padding: 4px 0 20px;
}
@media (max-width: 680px) {
  .acoes-topo {
    display: none;
  }
  .so-mobile {
    display: block;
  }
}
</style>
