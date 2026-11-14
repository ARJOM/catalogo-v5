import imageCompression from 'browser-image-compression'

/** Tipos aceitos no seletor de fotos. */
export const TIPOS_DE_FOTO = ['image/jpeg', 'image/png', 'image/webp'] as const

/** Estado de uma foto no formulário. */
export type EstadoFoto = 'comprimindo' | 'pronta' | 'enviando' | 'enviada' | 'falhou'

/** Uma foto do formulário: já salva no imóvel (`url`) ou nova, ainda no navegador (`arquivo`). */
export interface ItemFoto {
  id: string
  /** URL de download, nas fotos que já pertencem ao imóvel. */
  url?: string
  /** Arquivo já comprimido, nas fotos novas. */
  arquivo?: File
  /** Imagem para a miniatura (URL do arquivo ou a própria URL de download). */
  previa: string
  nome: string
  estado: EstadoFoto
  /** 0–100 durante o envio. */
  progresso: number
}

/**
 * Reduz a foto antes do envio: no máximo ~1 MB e 1920 px no lado maior, bem abaixo do limite
 * de 5 MB das regras do Storage. Lança erro se o arquivo não for uma imagem que o navegador
 * consiga decodificar.
 */
export async function comprimirFoto(arquivo: File): Promise<File> {
  return imageCompression(arquivo, {
    maxSizeMB: 1,
    maxWidthOrHeight: 1920,
    useWebWorker: true,
    initialQuality: 0.8,
  })
}

export const ehFotoAceita = (arquivo: File) =>
  (TIPOS_DE_FOTO as readonly string[]).includes(arquivo.type)
