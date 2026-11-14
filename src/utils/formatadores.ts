/** Iniciais para o avatar: "João Melo" → "JM"; nome de uma palavra só usa as duas primeiras letras ("Admin" → "AD"). */
export function iniciais(nome: string): string {
  const palavras = nome.trim().split(/\s+/).filter(Boolean)
  if (palavras.length === 0) return ''
  if (palavras.length === 1) return palavras[0]!.slice(0, 2).toUpperCase()
  return (palavras[0]![0]! + palavras[palavras.length - 1]![0]!).toUpperCase()
}
