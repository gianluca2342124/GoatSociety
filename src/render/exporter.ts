// High-resolution export. Uses exactly the same painters as the editor canvas.
import JSZip from 'jszip'
import type { BrandKit, Project, Slide } from '../model/types'
import { slugify } from '../model/ids'
import { resolveFont } from '../model/tokens'
import { ensureFonts } from '../fonts/fonts'
import { preloadAssets } from './assetCache'
import { makeRenderCtx } from './context'
import { paintSlide } from './painters'
import { ensure3DRender } from './three/render3dCache'
import { collectAssetIds } from '../db/serialize'

export type ExportFormat = 'png' | 'jpeg' | 'webp'

export interface ExportOptions {
  format: ExportFormat
  quality: number
  scale: number
  transparent: boolean
}

export const DEFAULT_EXPORT: ExportOptions = { format: 'png', quality: 0.92, scale: 1, transparent: false }

const MIME: Record<ExportFormat, string> = { png: 'image/png', jpeg: 'image/jpeg', webp: 'image/webp' }

/** Fonts referenced by a slide (resolving brand tokens). */
export function fontsForSlide(slide: Slide, brand: BrandKit): { family: string; weight: number; italic?: boolean }[] {
  const out: { family: string; weight: number; italic?: boolean }[] = []
  const f = brand.fonts
  for (const fam of [f.headline, f.display, f.label, f.body, f.numbers, f.serif]) for (const w of [400, 500, 600, 700, 800]) out.push({ family: fam, weight: w })
  out.push({ family: f.serif, weight: 400, italic: true })
  for (const el of slide.elements) if (el.type === 'text') out.push({ family: resolveFont(el.fontFamily, brand), weight: el.fontWeight, italic: el.italic })
  out.push({ family: 'Big Shoulders Display Variable', weight: 800 })
  out.push({ family: 'Barlow Condensed', weight: 800 })
  return out
}

/** Problems found while preparing exports (shown to the user, never silent). */
export const exportWarnings: string[] = []

/** Wait for everything a slide needs: fonts, local images and 3D renders. */
export async function prepareSlide(project: Project, slide: Slide, brand: BrandKit, scale: number): Promise<void> {
  await ensureFonts(fontsForSlide(slide, brand))
  await preloadAssets(collectAssetIds({ ...project, slides: [slide] }, brand))
  for (const el of slide.elements) {
    if ((el.type === 'stadium3d' || el.type === 'model3d') && el.visible) {
      if (el.type === 'model3d' && !el.assetId) continue
      const r = await ensure3DRender(el, project, slide, brand, scale)
      if (!r) exportWarnings.push(`«${slide.name}»: no se pudo renderizar «${el.name}» (3D). Revisa que el navegador tenga WebGL activo.`)
    }
  }
}

export async function renderSlideCanvas(project: Project, slide: Slide, brand: BrandKit, opts: Pick<ExportOptions, 'scale' | 'transparent' | 'format'>): Promise<HTMLCanvasElement> {
  await prepareSlide(project, slide, brand, opts.scale)
  const { width: W, height: H } = project.format
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(W * opts.scale)
  canvas.height = Math.round(H * opts.scale)
  // CPU-backed canvas: encoding to PNG/JPEG never waits on a GPU readback.
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!
  ctx.imageSmoothingQuality = 'high'
  ctx.scale(opts.scale, opts.scale)
  const transparent = opts.transparent && opts.format !== 'jpeg'
  if (opts.format === 'jpeg') {
    ctx.fillStyle = '#000'
    ctx.fillRect(0, 0, W, H)
  }
  const rc = makeRenderCtx(project, slide, brand, 'export', opts.scale)
  paintSlide(ctx, slide, rc, W, H, { transparent })
  return canvas
}

export function canvasToBlob(canvas: HTMLCanvasElement, format: ExportFormat, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('No se pudo codificar la imagen'))), MIME[format], format === 'png' ? undefined : quality)
  })
}

export function exportBaseName(project: Project): string {
  const teams = slugify(`${project.match.home.name}-${project.match.away.name}`)
  return `goat-society-${teams || slugify(project.name) || 'proyecto'}`
}

export function slideFileName(project: Project, index: number, format: ExportFormat): string {
  const n = String(index + 1).padStart(2, '0')
  return `${exportBaseName(project)}-${n}.${format === 'jpeg' ? 'jpg' : format}`
}

export async function exportSlideBlob(project: Project, index: number, brand: BrandKit, opts: ExportOptions): Promise<{ blob: Blob; name: string }> {
  const slide = project.slides[index]
  const canvas = await renderSlideCanvas(project, slide, brand, opts)
  const blob = await canvasToBlob(canvas, opts.format, opts.quality)
  return { blob, name: slideFileName(project, index, opts.format) }
}

export async function exportCarouselZip(project: Project, brand: BrandKit, opts: ExportOptions, onProgress?: (done: number, total: number) => void, indices?: number[]): Promise<{ blob: Blob; name: string }> {
  const zip = new JSZip()
  const list = indices ?? project.slides.map((_, i) => i)
  for (let k = 0; k < list.length; k++) {
    const { blob, name } = await exportSlideBlob(project, list[k], brand, opts)
    zip.file(name, blob)
    onProgress?.(k + 1, list.length)
    // Yield so the UI can update between heavy renders.
    await new Promise((r) => setTimeout(r, 0))
  }
  const blob = await zip.generateAsync({ type: 'blob', compression: 'STORE' })
  return { blob, name: `${exportBaseName(project)}.zip` }
}

/** Render several pages as individual files (for separate downloads or the share sheet). */
export async function exportSlideFiles(project: Project, brand: BrandKit, opts: ExportOptions, indices: number[], onProgress?: (done: number, total: number) => void): Promise<File[]> {
  const files: File[] = []
  for (let k = 0; k < indices.length; k++) {
    const { blob, name } = await exportSlideBlob(project, indices[k], brand, opts)
    files.push(new File([blob], name, { type: blob.type }))
    onProgress?.(k + 1, indices.length)
    await new Promise((r) => setTimeout(r, 0))
  }
  return files
}

/** True when the device can hand image files to the system share sheet (save to Photos on phones). */
export function canShareFiles(): boolean {
  try {
    const nav = navigator as Navigator & { canShare?: (d: { files: File[] }) => boolean }
    return typeof nav.share === 'function' && !!nav.canShare?.({ files: [new File([new Blob(['x'], { type: 'image/png' })], 'x.png', { type: 'image/png' })] })
  } catch {
    return false
  }
}

export async function shareFiles(files: File[], title: string): Promise<boolean> {
  try {
    await (navigator as Navigator & { share: (d: { files: File[]; title?: string }) => Promise<void> }).share({ files, title })
    return true
  } catch (e) {
    // The user closing the share sheet is not an error.
    if (e instanceof DOMException && e.name === 'AbortError') return true
    return false
  }
}

/** Download files one by one (browsers handle a short pause between them better). */
export async function downloadFiles(files: File[]) {
  for (const f of files) {
    downloadBlob(f, f.name)
    await new Promise((r) => setTimeout(r, 350))
  }
}

export function downloadBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 4000)
}

/** Small JPEG data URL for thumbnails (same pipeline, low scale). */
export async function renderThumbnail(project: Project, slide: Slide, brand: BrandKit, width = 240): Promise<string> {
  const scale = width / project.format.width
  await ensureFonts(fontsForSlide(slide, brand))
  await preloadAssets(collectAssetIds({ ...project, slides: [slide] }, brand))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(project.format.width * scale)
  canvas.height = Math.round(project.format.height * scale)
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!
  ctx.scale(scale, scale)
  const rc = makeRenderCtx(project, slide, brand, 'editor')
  paintSlide(ctx, slide, rc, project.format.width, project.format.height)
  return canvas.toDataURL('image/jpeg', 0.82)
}
