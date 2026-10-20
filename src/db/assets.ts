import type { AssetKind, AssetMeta, AssetRecord } from '../model/types'
import { uid } from '../model/ids'
import { db, type StoredAsset } from './db'
import { sanitizeSvg } from './svg'

export const ACCEPTED_IMAGE = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml', 'image/gif']
export const ACCEPTED_MODEL_EXT = ['.glb', '.gltf']

function toMeta(a: AssetRecord | StoredAsset): AssetMeta {
  const { id, name, kind, mime, width, height, size, createdAt } = a
  return { id, name, kind, mime, width, height, size, createdAt }
}

export async function blobToArrayBuffer(blob: Blob): Promise<ArrayBuffer> {
  if (typeof blob.arrayBuffer === 'function') return blob.arrayBuffer()
  return new Promise<ArrayBuffer>((res, rej) => {
    const r = new FileReader()
    r.onload = () => res(r.result as ArrayBuffer)
    r.onerror = () => rej(r.error)
    r.readAsArrayBuffer(blob)
  })
}

async function toStored(rec: AssetRecord): Promise<StoredAsset> {
  const { blob, ...rest } = rec
  return { ...rest, data: await blobToArrayBuffer(blob) }
}

function fromStored(s: StoredAsset): AssetRecord {
  const { data, blob, ...rest } = s
  return { ...rest, blob: blob instanceof Blob ? blob : new Blob([data], { type: s.mime }) }
}

async function imageSize(blob: Blob): Promise<{ width: number; height: number }> {
  try {
    if (typeof createImageBitmap === 'function' && blob.type !== 'image/svg+xml') {
      const bmp = await createImageBitmap(blob)
      const r = { width: bmp.width, height: bmp.height }
      bmp.close()
      return r
    }
    const url = URL.createObjectURL(blob)
    try {
      const img = new Image()
      img.src = url
      await img.decode()
      return { width: img.naturalWidth || 512, height: img.naturalHeight || 512 }
    } finally {
      URL.revokeObjectURL(url)
    }
  } catch {
    return { width: 0, height: 0 }
  }
}

export function isModelFile(file: File | { name: string; type: string }): boolean {
  const n = file.name.toLowerCase()
  return ACCEPTED_MODEL_EXT.some((e) => n.endsWith(e)) || file.type === 'model/gltf-binary' || file.type === 'model/gltf+json'
}

export class AssetError extends Error {}

/** Store a user file locally. SVGs are sanitized; 3D models are stored as-is. */
export async function addAsset(file: File | Blob, opts: { name?: string; kind: AssetKind; id?: string }): Promise<AssetMeta> {
  const name = opts.name ?? (file instanceof File ? file.name : 'recurso')
  let blob: Blob = file
  let mime = file.type
  const lower = name.toLowerCase()
  if (opts.kind === 'model3d' || lower.endsWith('.glb') || lower.endsWith('.gltf')) {
    if (!(lower.endsWith('.glb') || lower.endsWith('.gltf'))) throw new AssetError('Formato 3D no compatible. Usa .glb o .gltf')
    mime = lower.endsWith('.glb') ? 'model/gltf-binary' : 'model/gltf+json'
    blob = new Blob([await blobToArrayBuffer(file)], { type: mime })
  } else {
    if (!mime && lower.endsWith('.svg')) mime = 'image/svg+xml'
    if (!ACCEPTED_IMAGE.includes(mime)) throw new AssetError('Formato no compatible. Usa PNG, JPG, WebP o SVG.')
    if (mime === 'image/svg+xml') {
      const clean = sanitizeSvg(await file.text())
      if (!clean) throw new AssetError('El SVG no es válido o contiene contenido no permitido.')
      blob = new Blob([clean], { type: 'image/svg+xml' })
    }
  }
  if (blob.size > 40 * 1024 * 1024) throw new AssetError('El archivo supera 40 MB.')
  const size = mime.startsWith('image/') ? await imageSize(blob) : { width: 0, height: 0 }
  const rec: AssetRecord = {
    id: opts.id ?? uid('as'),
    name,
    kind: opts.kind,
    mime,
    blob,
    width: size.width,
    height: size.height,
    size: blob.size,
    createdAt: Date.now(),
  }
  await (await db()).put('assets', await toStored(rec))
  return toMeta(rec)
}

export async function listAssets(): Promise<AssetMeta[]> {
  const all = await (await db()).getAll('assets')
  return all.map(toMeta).sort((a, b) => b.createdAt - a.createdAt)
}

export async function getAssetBlob(id: string): Promise<Blob | null> {
  const rec = await (await db()).get('assets', id)
  return rec ? fromStored(rec).blob : null
}

export async function getAsset(id: string): Promise<AssetRecord | undefined> {
  const rec = await (await db()).get('assets', id)
  return rec ? fromStored(rec) : undefined
}

export async function putAssetRecord(rec: AssetRecord): Promise<void> {
  await (await db()).put('assets', await toStored(rec))
}

export async function deleteAsset(id: string): Promise<void> {
  await (await db()).delete('assets', id)
}

export async function renameAsset(id: string, name: string, kind?: AssetKind): Promise<void> {
  const d = await db()
  const rec = await d.get('assets', id)
  if (!rec) return
  rec.name = name
  if (kind) rec.kind = kind
  await d.put('assets', rec)
}
