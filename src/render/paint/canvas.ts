import type { Fill } from '../../model/types'
import { withAlpha } from '../../model/tokens'

export type Ctx = CanvasRenderingContext2D

/** Uniform scale of the current transform (CSS px → device px). */
export function deviceScale(ctx: Ctx): number {
  const m = ctx.getTransform()
  return Math.sqrt(m.a * m.a + m.b * m.b) || 1
}

/** Canvas shadows ignore the transform — scale them so editor and 2× export match. */
export function setShadow(ctx: Ctx, color: string, blur: number, ox = 0, oy = 0) {
  const s = deviceScale(ctx)
  const m = ctx.getTransform()
  // Offsets are applied in device space: rotate them with the current transform.
  const angle = Math.atan2(m.b, m.a)
  const cos = Math.cos(angle)
  const sin = Math.sin(angle)
  ctx.shadowColor = color
  ctx.shadowBlur = blur * s
  ctx.shadowOffsetX = (ox * cos - oy * sin) * s
  ctx.shadowOffsetY = (ox * sin + oy * cos) * s
}

export function clearShadow(ctx: Ctx) {
  ctx.shadowColor = 'rgba(0,0,0,0)'
  ctx.shadowBlur = 0
  ctx.shadowOffsetX = 0
  ctx.shadowOffsetY = 0
}

export function roundRect(ctx: Ctx, x: number, y: number, w: number, h: number, r: number | [number, number, number, number]) {
  const rr = Array.isArray(r) ? r : [r, r, r, r]
  const max = Math.min(Math.abs(w), Math.abs(h)) / 2
  const [tl, tr, br, bl] = rr.map((v) => Math.max(0, Math.min(max, v)))
  ctx.beginPath()
  ctx.moveTo(x + tl, y)
  ctx.lineTo(x + w - tr, y)
  ctx.arcTo(x + w, y, x + w, y + tr, tr)
  ctx.lineTo(x + w, y + h - br)
  ctx.arcTo(x + w, y + h, x + w - br, y + h, br)
  ctx.lineTo(x + bl, y + h)
  ctx.arcTo(x, y + h, x, y + h - bl, bl)
  ctx.lineTo(x, y + tl)
  ctx.arcTo(x, y, x + tl, y, tl)
  ctx.closePath()
}

/** Build a canvas fill style for a box of size w×h at origin. */
export function fillStyle(ctx: Ctx, fill: Fill, w: number, h: number, color: (c: string) => string, x = 0, y = 0): string | CanvasGradient | null {
  switch (fill.kind) {
    case 'none':
      return null
    case 'solid':
      return fill.opacity != null && fill.opacity < 1 ? withAlpha(color(fill.color), fill.opacity) : color(fill.color)
    case 'linear': {
      const a = ((fill.angle - 90) * Math.PI) / 180
      const cx = x + w / 2
      const cy = y + h / 2
      const len = Math.abs(w * Math.cos(a)) / 2 + Math.abs(h * Math.sin(a)) / 2
      const g = ctx.createLinearGradient(cx - Math.cos(a) * len, cy - Math.sin(a) * len, cx + Math.cos(a) * len, cy + Math.sin(a) * len)
      for (const s of fill.stops) g.addColorStop(Math.max(0, Math.min(1, s.offset)), withAlpha(color(s.color), s.opacity ?? 1))
      return g
    }
    case 'radial': {
      const cx = x + fill.cx * w
      const cy = y + fill.cy * h
      const r = Math.max(1, fill.radius * Math.max(w, h))
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r)
      for (const s of fill.stops) g.addColorStop(Math.max(0, Math.min(1, s.offset)), withAlpha(color(s.color), s.opacity ?? 1))
      return g
    }
  }
}

export function polygonPath(ctx: Ctx, pts: { x: number; y: number }[], close = true) {
  ctx.beginPath()
  pts.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)))
  if (close) ctx.closePath()
}

const supportsFilter = (() => {
  try {
    if (typeof document === 'undefined' || /jsdom/i.test(navigator.userAgent)) return false
    const c = document.createElement('canvas').getContext('2d')
    return !!c && typeof (c as Ctx).filter === 'string'
  } catch {
    return false
  }
})()

export function canvasFilterSupported() {
  return supportsFilter
}

export function makeCanvas(w: number, h: number): HTMLCanvasElement {
  const c = document.createElement('canvas')
  c.width = Math.max(1, Math.ceil(w))
  c.height = Math.max(1, Math.ceil(h))
  return c
}

/** Box blur fallback (3 passes ≈ gaussian) for browsers without ctx.filter. */
export function boxBlurCanvas(src: HTMLCanvasElement, radius: number): HTMLCanvasElement {
  const r = Math.max(1, Math.round(radius))
  const w = src.width
  const h = src.height
  const ctx = src.getContext('2d')!
  const img = ctx.getImageData(0, 0, w, h)
  const data = img.data
  const tmp = new Uint8ClampedArray(data.length)
  const pass = (from: Uint8ClampedArray, to: Uint8ClampedArray, horizontal: boolean) => {
    const len = horizontal ? w : h
    const lines = horizontal ? h : w
    for (let line = 0; line < lines; line++) {
      let sr = 0
      let sg = 0
      let sb = 0
      let sa = 0
      const idx = (i: number) => {
        const c = Math.min(len - 1, Math.max(0, i))
        return horizontal ? (line * w + c) * 4 : (c * w + line) * 4
      }
      for (let i = -r; i <= r; i++) {
        const k = idx(i)
        sr += from[k]
        sg += from[k + 1]
        sb += from[k + 2]
        sa += from[k + 3]
      }
      const n = r * 2 + 1
      for (let i = 0; i < len; i++) {
        const k = idx(i)
        to[k] = sr / n
        to[k + 1] = sg / n
        to[k + 2] = sb / n
        to[k + 3] = sa / n
        const out = idx(i - r)
        const inn = idx(i + r + 1)
        sr += from[inn] - from[out]
        sg += from[inn + 1] - from[out + 1]
        sb += from[inn + 2] - from[out + 2]
        sa += from[inn + 3] - from[out + 3]
      }
    }
  }
  for (let k = 0; k < 3; k++) {
    pass(data, tmp, true)
    pass(tmp, data, false)
  }
  ctx.putImageData(img, 0, 0)
  return src
}

/** Returns a blurred copy of a canvas. */
export function blurredCopy(src: HTMLCanvasElement, radius: number): HTMLCanvasElement {
  const pad = Math.ceil(radius * 2)
  const out = makeCanvas(src.width + pad * 2, src.height + pad * 2)
  const octx = out.getContext('2d')!
  if (supportsFilter) {
    octx.filter = `blur(${radius}px)`
    octx.drawImage(src, pad, pad)
    octx.filter = 'none'
    return out
  }
  octx.drawImage(src, pad, pad)
  return boxBlurCanvas(out, radius * 0.6)
}

export function ellipsePath(ctx: Ctx, cx: number, cy: number, rx: number, ry: number) {
  ctx.beginPath()
  ctx.ellipse(cx, cy, Math.max(0.01, rx), Math.max(0.01, ry), 0, 0, Math.PI * 2)
}
