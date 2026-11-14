import {
  deleteObject,
  getDownloadURL,
  listAll,
  ref,
  uploadBytesResumable,
  type StorageError,
} from 'firebase/storage'
import { storage } from '@/firebase'

/** Extensão do arquivo conforme o tipo; o nome em si nunca vem do usuário. */
const EXTENSOES: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
}

/**
 * Nome único para cada foto. O emulador do Storage avalia todo upload como `create`, e as
 * regras negam `update`, então um nome nunca é reaproveitado.
 */
export function nomeUnicoDeFoto(tipo: string): string {
  return `${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${EXTENSOES[tipo] ?? 'jpg'}`
}

/**
 * Envia uma foto para `imoveis/{imovelId}/` e devolve a URL de download. O imóvel precisa
 * existir (a regra do Storage verifica). `aoProgredir` recebe 0–100.
 */
export function uploadFoto(
  imovelId: string,
  arquivo: Blob,
  aoProgredir?: (percentual: number) => void,
): Promise<string> {
  const destino = ref(storage, `imoveis/${imovelId}/${nomeUnicoDeFoto(arquivo.type)}`)
  const tarefa = uploadBytesResumable(destino, arquivo, { contentType: arquivo.type })
  return new Promise((resolver, rejeitar) => {
    tarefa.on(
      'state_changed',
      (instantaneo) => {
        if (instantaneo.totalBytes > 0) {
          aoProgredir?.(Math.round((instantaneo.bytesTransferred / instantaneo.totalBytes) * 100))
        }
      },
      rejeitar,
      () => {
        getDownloadURL(destino).then(resolver, rejeitar)
      },
    )
  })
}

const arquivoInexistente = (erro: unknown) =>
  (erro as StorageError | undefined)?.code === 'storage/object-not-found'

/** Apaga o arquivo da URL de download. Se ele já não existe, considera feito. */
export async function deleteFoto(url: string): Promise<void> {
  try {
    await deleteObject(ref(storage, url))
  } catch (erro) {
    if (!arquivoInexistente(erro)) throw erro
  }
}

/** Apaga todos os arquivos de `imoveis/{imovelId}/` (exclusão real em cascata). */
export async function deleteFotosDoImovel(imovelId: string): Promise<void> {
  const { items } = await listAll(ref(storage, `imoveis/${imovelId}`))
  await Promise.all(
    items.map((item) =>
      deleteObject(item).catch((erro: unknown) => {
        if (!arquivoInexistente(erro)) throw erro
      }),
    ),
  )
}
