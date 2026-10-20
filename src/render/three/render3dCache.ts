// Offscreen Three.js renders, cached as 2D canvases so they composite into the
// same canvas pipeline used by the editor and the exporter.
import type { BrandKit, Model3DElement, Project, Slide, SlideElement, Stadium3DElement } from '../../model/types'
import { applyOverrides, resolveColor, slideAccent } from '../../model/tokens'
import { hashKey } from '../paint/bitmapCache'
import { useAssetVersion } from '../assetCache'

export interface Resolved3D {
  kind: 'stadium3d' | 'model3d'
  el: Stadium3DElement | Model3DElement
  width: number
  height: number
  scale: number
  colors: Record<string, string>
}

const cache = new Map<string, HTMLCanvasElement>()
const pending = new Map<string, Promise<HTMLCanvasElement | null>>()
const failed = new Map<string, string>()

export const EDITOR_3D_SCALE = 1.25

function resolve(el: Stadium3DElement | Model3DElement, project: Project, slide: Slide, brand: BrandKit, scale: number): Resolved3D {
  const match = applyOverrides(project.match, slide.overrides)
  const accent = slideAccent(project, slide)
  const c = (v: string) => resolveColor(v, { match, brand, accent })
  const colors: Record<string, string> = {}
  if (el.type === 'stadium3d') {
    colors.home = c(el.tactics.homeColor)
    colors.away = c(el.tactics.awayColor)
    colors.pitch = c(el.tactics.pitchColor)
    colors.pitch2 = c(el.tactics.pitchColor2)
    colors.line = c(el.tactics.lineColor)
    colors.accent = c(el.lighting.accent)
    // Highlight rings/spots follow the slide accent (GOAT EDITORIAL).
    colors.primary = c(el.tactics.highlightColor ?? '$accent')
    colors.positive = c('$positive')
    colors.negative = c('$negative')
    colors.text = c('$text')
    colors.bg = c('$bg')
    el.tactics.annotations.forEach((a, i) => (colors[`a${i}`] = c(a.color)))
  } else {
    colors.rim = c(el.lighting.rimColor)
    colors.primary = c('$primary')
  }
  return { kind: el.type, el, width: el.width, height: el.height, scale, colors }
}

function keyOf(r: Resolved3D): string {
  const { el } = r
  // Content-only key: ids/positions must not matter, otherwise freshly built
  // copies of the same element (thumbnails, duplicates) would re-render forever.
  const core = { ...el, id: '', x: 0, y: 0, rotation: 0, opacity: 1, name: '', locked: false, visible: true, fx: undefined }
  if (core.type === 'stadium3d') core.tactics = { ...core.tactics, players: core.tactics.players.map((p) => ({ ...p, id: '' })), annotations: core.tactics.annotations.map((a) => ({ ...a, id: '' })) }
  return hashKey(['3d', core, r.colors, Math.round(r.width), Math.round(r.height), r.scale])
}

async function renderResolved(r: Resolved3D): Promise<HTMLCanvasElement | null> {
  if (r.kind === 'stadium3d') {
    const mod = await import('./stadium')
    return mod.renderStadium(r)
  }
  const mod = await import('./model')
  return mod.renderModel(r)
}

export function get3DRender(el: SlideElement, project: Project, slide: Slide, brand: BrandKit, scale = EDITOR_3D_SCALE): HTMLCanvasElement | null {
  if (el.type !== 'stadium3d' && el.type !== 'model3d') return null
  const r = resolve(el, project, slide, brand, scale)
  const key = keyOf(r)
  const hit = cache.get(key)
  if (hit) return hit
  if (!pending.has(key) && !failed.has(key)) {
    const p = renderResolved(r)
      .then((canvas) => {
        if (canvas) cache.set(key, canvas)
        else failed.set(key, 'empty')
        if (cache.size > 24) cache.delete(cache.keys().next().value as string)
        return canvas
      })
      .catch((e: unknown) => {
        failed.set(key, e instanceof Error ? e.message : String(e))
        return null
      })
      .finally(() => {
        pending.delete(key)
        useAssetVersion.getState().bump()
      })
    pending.set(key, p)
  }
  return null
}

export function get3DError(el: SlideElement, project: Project, slide: Slide, brand: BrandKit, scale = EDITOR_3D_SCALE): string | null {
  if (el.type !== 'stadium3d' && el.type !== 'model3d') return null
  return failed.get(keyOf(resolve(el, project, slide, brand, scale))) ?? null
}

/** Render (or reuse) a 3D element at a given scale — awaited by the exporter. */
export async function ensure3DRender(el: SlideElement, project: Project, slide: Slide, brand: BrandKit, scale: number): Promise<HTMLCanvasElement | null> {
  if (el.type !== 'stadium3d' && el.type !== 'model3d') return null
  const r = resolve(el, project, slide, brand, scale)
  const key = keyOf(r)
  const hit = cache.get(key)
  if (hit) return hit
  get3DRender(el, project, slide, brand, scale)
  return (await pending.get(key)) ?? cache.get(key) ?? null
}
