/** Iniciais para o avatar: "João Melo" → "JM"; nome de uma palavra só usa as duas primeiras letras ("Admin" → "AD"). */
export function iniciais(nome: string): string {
  const palavras = nome.trim().split(/\s+/).filter(Boolean)
  if (palavras.length === 0) return ''
  if (palavras.length === 1) return palavras[0]!.slice(0, 2).toUpperCase()
  return (palavras[0]![0]! + palavras[palavras.length - 1]![0]!).toUpperCase()
}

/** Qualquer coisa que se comporte como um Timestamp do Firestore, sem importar o SDK aqui. */
export type DataLike = Date | { toDate(): Date } | null | undefined

function paraDate(valor: DataLike): Date | null {
  if (!valor) return null
  const data = valor instanceof Date ? valor : valor.toDate()
  return Number.isNaN(data.getTime()) ? null : data
}

const moedaInteira = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  maximumFractionDigits: 0,
})
const moedaCentavos = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
const numeroBR = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 })

/** O Intl separa "R$" do número com espaço sem quebra; normaliza para espaço comum. */
const semNbsp = (texto: string) => texto.replace(/[  ]/g, ' ')

/** "R$ 480.000"; centavos só aparecem quando existem ("R$ 1.800,50"). Valor inválido vira "—". */
export function formatarMoeda(valor: number | null | undefined): string {
  if (valor == null || !Number.isFinite(valor)) return '—'
  const formato = Number.isInteger(valor) ? moedaInteira : moedaCentavos
  return semNbsp(formato.format(valor))
}

/** Sufixo do valor conforme a finalidade: só o aluguel é mensal. */
export function sufixoFinalidade(finalidade: string): string {
  return finalidade === 'Aluguel' ? '/mês' : ''
}

/** "120 m²", "1.200,5 m²". Valor inválido vira "—". */
export function formatarArea(areaM2: number | null | undefined): string {
  if (areaM2 == null || !Number.isFinite(areaM2)) return '—'
  return semNbsp(`${numeroBR.format(areaM2)} m²`)
}

/** "1 quarto" / "3 quartos"; vazio quando o campo não foi preenchido (ou é 0). */
export function formatarQuartos(quartos: number | null | undefined): string {
  if (!quartos || quartos < 1) return ''
  return quartos === 1 ? '1 quarto' : `${quartos} quartos`
}

/** "(83) 99999-0001" (celular) ou "(83) 3531-0001" (fixo). Outros formatos voltam como vieram. */
export function formatarTelefone(telefone: string | null | undefined): string {
  const original = telefone?.trim() ?? ''
  let digitos = original.replace(/\D/g, '')
  if (digitos.length > 11 && digitos.startsWith('55')) digitos = digitos.slice(2)
  if (digitos.length === 11)
    return `(${digitos.slice(0, 2)}) ${digitos.slice(2, 7)}-${digitos.slice(7)}`
  if (digitos.length === 10)
    return `(${digitos.slice(0, 2)}) ${digitos.slice(2, 6)}-${digitos.slice(6)}`
  return original
}

const doisDigitos = (n: number) => String(n).padStart(2, '0')

/** "28/04/2026". Data inválida vira "—". */
export function formatarData(valor: DataLike): string {
  const data = paraDate(valor)
  if (!data) return '—'
  return `${doisDigitos(data.getDate())}/${doisDigitos(data.getMonth() + 1)}/${data.getFullYear()}`
}

/** "28/04 · 14:30", como nas listas do protótipo. Data inválida vira "—". */
export function formatarDataHora(valor: DataLike): string {
  const data = paraDate(valor)
  if (!data) return '—'
  const dia = `${doisDigitos(data.getDate())}/${doisDigitos(data.getMonth() + 1)}`
  return `${dia} · ${doisDigitos(data.getHours())}:${doisDigitos(data.getMinutes())}`
}

/** "Rua das Flores, 142 — Centro, Cajazeiras". Omite as partes vazias. */
export function formatarEndereco(imovel: { rua: string; bairro: string; cidade: string }): string {
  const local = [imovel.bairro, imovel.cidade].filter(Boolean).join(', ')
  return [imovel.rua, local].filter(Boolean).join(' — ')
}
