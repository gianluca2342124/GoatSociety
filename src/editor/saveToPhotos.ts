// «Guardar en Fotos»: get exported pages into the phone's photo library.
// A web page cannot write to Photos directly, so it picks the best route:
// - iPhone/iPad: the system share sheet («Guardar N imágenes»)
// - Android: plain image downloads, which the gallery shows (Descargas)
// - inside a claude.ai artifact: the viewer's downloads (the Claude iPhone app
//   hands them to the share sheet)
// - anything else: a screen with the images to press-and-hold and save.
import { create } from 'zustand'
import { canShareFiles, downloadFiles } from '../render/exporter'
import { hostDownloads, inArtifact } from '../host'

export type PhotoMethod = 'share' | 'download' | 'viewer' | 'gallery'

const ua = () => (typeof navigator === 'undefined' ? '' : navigator.userAgent)
export const isAndroid = () => /Android/i.test(ua())

export function photoMethod(): PhotoMethod {
  if (inArtifact) return 'viewer'
  if (isAndroid()) return 'download'
  if (canShareFiles()) return 'share'
  return 'gallery'
}

/** One line under the button saying what will happen. */
export const PHOTO_HINT: Record<PhotoMethod, string> = {
  share: 'Se abre el menú del móvil: elige «Guardar imagen» y quedan en Fotos.',
  download: 'Se guardan en la galería del móvil, en la carpeta Descargas.',
  viewer: 'Claude te pide confirmar cada imagen. En la app de Claude para iPhone, elige «Guardar imagen».',
  gallery: 'Verás las imágenes: mantén pulsada cada una y elige «Añadir a Fotos».',
}

// ── Press-and-hold gallery (manual fallback) ────────────────────────────────

export interface GalleryImage {
  name: string
  url: string
}

export const usePhotoGallery = create<{ images: GalleryImage[] | null }>(() => ({ images: null }))

function toDataUrl(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(String(r.result))
    r.onerror = () => reject(r.error)
    r.readAsDataURL(file)
  })
}

/** Show the images full screen so each one can be pressed and saved. */
export async function openPhotoGallery(files: File[]) {
  // data: URLs: the long-press «Añadir a Fotos» menu is reliable with them.
  const urls = await Promise.all(files.map(toDataUrl))
  usePhotoGallery.setState({ images: files.map((f, i) => ({ name: f.name, url: urls[i] })) })
}

export function closePhotoGallery() {
  usePhotoGallery.setState({ images: null })
}

// ── Saving ──────────────────────────────────────────────────────────────────

export interface PhotoResult {
  method: PhotoMethod
  /** Images handed over (0 = the person cancelled). */
  saved: number
  error?: string
}

async function share(files: File[]): Promise<'done' | 'cancelled' | 'failed'> {
  try {
    const nav = navigator as Navigator & { canShare?: (d: { files: File[] }) => boolean; share: (d: { files: File[] }) => Promise<void> }
    if (nav.canShare && !nav.canShare({ files })) return 'failed'
    await nav.share({ files })
    return 'done'
  } catch (e) {
    return e instanceof DOMException && e.name === 'AbortError' ? 'cancelled' : 'failed'
  }
}

export async function saveToPhotos(files: File[]): Promise<PhotoResult> {
  let method = photoMethod()
  if (method === 'viewer' && !(await hostDownloads())) method = 'gallery'
  if (method === 'share') {
    const r = await share(files)
    if (r === 'done') return { method, saved: files.length }
    if (r === 'cancelled') return { method, saved: 0 }
    method = 'gallery'
  }
  if (method === 'download' || method === 'viewer') {
    const { saved, error } = await downloadFiles(files)
    return { method, saved, error }
  }
  await openPhotoGallery(files)
  return { method: 'gallery', saved: files.length }
}

/** Toast text for a finished save; null when nothing should be said. */
export function photoMessage(r: PhotoResult, total: number): { text: string; kind: 'success' | 'info' | 'error' } | null {
  if (r.method === 'gallery') return null
  if (r.error) return { text: r.saved ? `Se guardaron ${r.saved} de ${total} imágenes. ${r.error}` : r.error, kind: 'error' }
  if (!r.saved) return { text: 'Cancelado', kind: 'info' }
  if (r.saved < total) return { text: `Se guardaron ${r.saved} de ${total} imágenes. El resto se canceló.`, kind: 'info' }
  const what = total === 1 ? '1 imagen' : `${total} imágenes`
  if (r.method === 'download') return { text: `${what} en la galería (carpeta Descargas)`, kind: 'success' }
  return { text: `Listo: ${what}`, kind: 'success' }
}
