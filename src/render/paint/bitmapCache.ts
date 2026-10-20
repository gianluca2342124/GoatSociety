import { deviceScale, makeCanvas, type Ctx } from './canvas'

interface Entry {
  canvas: HTMLCanvasElement
  pixels: number
}

const cache = new Map<string, Entry>()
let totalPixels = 0
const BUDGET = 48_000_000

function touch(key: string, e: Entry) {
  cache.delete(key)
  cache.set(key, e)
}

function evict() {
  for (const [k, e] of cache) {
    if (totalPixels <= BUDGET) break
    cache.delete(k)
    totalPixels -= e.pixels
  }
}

/** Quantize device scale so zooming doesn't re-render on every tiny step. */
function quantize(s: number): number {
  if (s <= 0.25) return 0.25
  const step = s < 1 ? 0.125 : 0.25
  return Math.ceil(s / step) * step
}

/**
 * Paint expensive content once into an offscreen bitmap at the current device
 * scale and blit it. `pad` adds room around the box for glows/shadows.
 * When `direct` is true (exports), paint at the exact output scale without caching.
 */
export function cachedPaint(ctx: Ctx, key: string, w: number, h: number, paint: (c: Ctx) => void, opts: { pad?: number; direct?: boolean } = {}) {
  const pad = opts.pad ?? 0
  if (w <= 0 || h <= 0) return
  if (opts.direct) {
    // Exports: render at the exact output resolution, but still in an isolated
    // layer so masking operations (destination-in, source-in…) only affect
    // this element — exactly like the cached editor path.
    const ds = deviceScale(ctx)
    const cw = (w + pad * 2) * ds
    const ch = (h + pad * 2) * ds
    const layer = makeCanvas(cw, ch)
    const lc = layer.getContext('2d')!
    lc.scale(ds, ds)
    lc.translate(pad, pad)
    paint(lc)
    ctx.drawImage(layer, -pad, -pad, w + pad * 2, h + pad * 2)
    return
  }
  const s = quantize(deviceScale(ctx))
  const fullKey = `${key}|${Math.round(w)}x${Math.round(h)}|${s}|${pad}`
  let e = cache.get(fullKey)
  if (!e) {
    const cw = (w + pad * 2) * s
    const ch = (h + pad * 2) * s
    const canvas = makeCanvas(cw, ch)
    const c = canvas.getContext('2d')!
    c.scale(s, s)
    c.translate(pad, pad)
    paint(c)
    e = { canvas, pixels: canvas.width * canvas.height }
    cache.set(fullKey, e)
    totalPixels += e.pixels
    evict()
  } else {
    touch(fullKey, e)
  }
  ctx.drawImage(e.canvas, -pad, -pad, w + pad * 2, h + pad * 2)
}

export function clearBitmapCache() {
  cache.clear()
  totalPixels = 0
}

/** Cheap stable hash for cache keys. */
export function hashKey(v: unknown): string {
  const s = typeof v === 'string' ? v : JSON.stringify(v)
  let h1 = 0x811c9dc5
  let h2 = 0x01000193
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i)
    h1 = Math.imul(h1 ^ c, 16777619)
    h2 = Math.imul(h2 ^ c, 2246822519)
  }
  return (h1 >>> 0).toString(36) + (h2 >>> 0).toString(36) + s.length.toString(36)
}
