// Loads locally stored assets (IndexedDB blobs) into decoded images for canvas use.
import { create } from 'zustand'
import { getAssetBlob } from '../db/assets'

interface Entry {
  status: 'loading' | 'ready' | 'error'
  img: HTMLImageElement | null
  url: string | null
  promise: Promise<void>
}

const entries = new Map<string, Entry>()

/** Bumped whenever an asset finishes loading so canvases can redraw. */
export const useAssetVersion = create<{ version: number; bump: () => void }>((set) => ({
  version: 0,
  bump: () => set((s) => ({ version: s.version + 1 })),
}))

function load(id: string): Entry {
  let e = entries.get(id)
  if (e) return e
  const entry: Entry = { status: 'loading', img: null, url: null, promise: Promise.resolve() }
  entry.promise = (async () => {
    try {
      const blob = await getAssetBlob(id)
      if (!blob) throw new Error('missing')
      if (blob.type.startsWith('model/') || blob.type === 'application/octet-stream') {
        entry.status = 'error'
        return
      }
      const url = URL.createObjectURL(blob)
      const img = new Image()
      img.decoding = 'async'
      img.src = url
      await img.decode().catch(
        () =>
          new Promise<void>((res, rej) => {
            img.onload = () => res()
            img.onerror = () => rej(new Error('decode'))
          }),
      )
      entry.img = img
      entry.url = url
      entry.status = 'ready'
    } catch {
      entry.status = 'error'
    } finally {
      useAssetVersion.getState().bump()
    }
  })()
  entries.set(id, entry)
  e = entry
  return e
}

export function getImage(id: string): HTMLImageElement | null {
  const e = load(id)
  return e.status === 'ready' ? e.img : null
}

export function assetStatus(id: string): Entry['status'] {
  return load(id).status
}

export async function preloadAssets(ids: Iterable<string>): Promise<void> {
  await Promise.all([...new Set(ids)].filter(Boolean).map((id) => load(id).promise))
}

/** Forget a cached asset (after deletion/replacement). */
export function invalidateAsset(id: string) {
  const e = entries.get(id)
  if (e?.url) URL.revokeObjectURL(e.url)
  entries.delete(id)
  useAssetVersion.getState().bump()
}

export function assetUrl(id: string): string | null {
  return entries.get(id)?.url ?? null
}
