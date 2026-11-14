/**
 * Máscaras dos campos do formulário. Cada `mascarar*` recebe o que o usuário digitou e
 * devolve o texto como deve aparecer; cada `ler*` faz o caminho inverso, para gravar.
 */

/** Só os dígitos do texto. */
export const soDigitos = (texto: string) => texto.replace(/\D/g, '')

const milhares = (inteiro: string) => inteiro.replace(/\B(?=(\d{3})+(?!\d))/g, '.')

/**
 * Número decimal no padrão brasileiro enquanto se digita: "1234,5" → "1.234,5".
 * Só a vírgula separa os decimais; os pontos (que a própria máscara insere) são descartados.
 */
export function mascararNumero(texto: string, casasDecimais = 2): string {
  const [inteiroBruto = '', ...resto] = texto.replace(/[^\d,]/g, '').split(',')
  const inteiro = inteiroBruto.replace(/^0+(?=\d)/, '')
  const parteInteira = milhares(inteiro)
  if (resto.length === 0 || casasDecimais === 0) return parteInteira
  return `${parteInteira || '0'},${resto.join('').slice(0, casasDecimais)}`
}

/** "1.234,50" → 1234.5. Vazio ou inválido → `NaN`. */
export function lerNumero(texto: string): number {
  if (!texto.trim()) return NaN
  return Number(texto.replace(/\./g, '').replace(',', '.'))
}

/** Dígitos → "(83) 99999-0000" (celular) ou "(83) 3531-0001" (fixo), parcial enquanto digita. */
export function mascararTelefone(texto: string): string {
  const d = soDigitos(texto).slice(0, 11)
  if (d.length === 0) return ''
  if (d.length <= 2) return `(${d}`
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
}

/** Número como o campo mostra: 1234.5 → "1.234,5". Ausente → "". */
export function numeroParaCampo(valor: number | null | undefined, casasDecimais = 2): string {
  if (valor == null || !Number.isFinite(valor)) return ''
  const [inteiro = '', decimal] = valor.toFixed(casasDecimais).split('.')
  const decimais = (decimal ?? '').replace(/0+$/, '')
  return decimais ? `${milhares(inteiro)},${decimais}` : milhares(inteiro)
}
