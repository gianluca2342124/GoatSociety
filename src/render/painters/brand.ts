import type { BrandMarkElement, MascotElement } from '../../model/types'
import { withAlpha } from '../../model/tokens'
import type { RenderCtx } from '../context'
import { cachedPaint, hashKey } from '../paint/bitmapCache'
import { ellipsePath, makeCanvas, deviceScale, type Ctx } from '../paint/canvas'
import { paintGoat } from '../paint/goatPaint'
import { drawLabel, labelWidth } from '../text/draw'
import { drawImageFit } from './basic'
import { GOAT_VIEW } from '../../brand/goat'
import { setFont } from '../text/layout'

export function paintMascot(ctx: Ctx, el: MascotElement, rc: RenderCtx) {
  const opts = {
    variant: el.variant,
    base: rc.color(el.baseColor),
    shadow: rc.color(el.shadowColor),
    rim: rc.color(el.rimColor),
    rimIntensity: el.rimIntensity,
    backlight: rc.color(el.backlightColor),
    backlightAmount: el.backlight,
    lightAngle: el.lightAngle,
    eye: rc.color(el.eyeColor),
    eyeGlow: el.eyeGlow,
    fog: el.fog,
    fadeBottom: el.fadeBottom,
    facetGap: el.facetGap,
    contrast: el.contrast,
  }
  const key = hashKey(['goat', opts])
  // Padding keeps the rim glow from being cut at the element box.
  const pad = Math.ceil(Math.min(el.width, el.height) * 0.06)
  cachedPaint(ctx, key, el.width, el.height, (c) => paintGoat(c, el.width, el.height, opts), { direct: rc.mode === 'export', pad })
}

/** Small flat goat icon (cached). */
export function paintGoatIcon(ctx: Ctx, x: number, y: number, w: number, h: number, color: string, eye: string, rc: RenderCtx) {
  const opts = {
    variant: 'icon' as const,
    base: color,
    shadow: '#000000',
    rim: '#ffffff',
    rimIntensity: 0,
    backlight: '#000000',
    backlightAmount: 0,
    lightAngle: 90,
    eye,
    eyeGlow: 0,
    fog: 0,
    fadeBottom: 0,
    facetGap: 0,
    contrast: 0.5,
  }
  ctx.save()
  ctx.translate(x, y)
  cachedPaint(ctx, hashKey(['goatIcon', color, eye]), w, h, (c) => paintGoat(c, w, h, opts), { direct: rc.mode === 'export' })
  ctx.restore()
}

/** Draw the uploaded brand logo with the configured color treatment. */
function paintLogo(ctx: Ctx, rc: RenderCtx, x: number, y: number, w: number, h: number, color: string): boolean {
  const img = rc.image(rc.brand.logoAssetId)
  if (!img) return false
  const t = rc.brand.logoTreatment
  if (t === 'original') {
    ctx.save()
    ctx.translate(x, y)
    drawImageFit(ctx, img, w, h, 'contain')
    ctx.restore()
    return true
  }
  const s = deviceScale(ctx)
  const off = makeCanvas(w * s, h * s)
  const o = off.getContext('2d')!
  o.scale(s, s)
  drawImageFit(o, img, w, h, 'contain')
  o.globalCompositeOperation = 'source-in'
  o.fillStyle = t === 'gold' ? rc.color('$primary') : t === 'black' ? '#08090B' : color
  o.fillRect(0, 0, w, h)
  ctx.drawImage(off, x, y, w, h)
  return true
}

function paintMark(ctx: Ctx, rc: RenderCtx, x: number, y: number, size: number, color: string, eye: string, useLogo: boolean) {
  if (useLogo && paintLogo(ctx, rc, x, y, size, size, color)) return
  const iw = size * (GOAT_VIEW.width / GOAT_VIEW.height)
  paintGoatIcon(ctx, x + (size - iw) / 2, y, iw, size, color, eye, rc)
}

function circularText(ctx: Ctx, text: string, cx: number, cy: number, radius: number, size: number, color: string, family: string) {
  setFont(ctx, family, size, 700, false, 0)
  ctx.fillStyle = color
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  const chars = [...text]
  const widths = chars.map((c) => ctx.measureText(c).width + size * 0.18)
  const total = widths.reduce((a, b) => a + b, 0)
  const circumference = Math.PI * 2 * radius
  const scale = Math.min(1, circumference / total)
  let angle = -Math.PI / 2 - ((total * scale) / radius) / 2
  chars.forEach((c, i) => {
    const a = angle + (widths[i] * scale) / radius / 2
    ctx.save()
    ctx.translate(cx + Math.cos(a) * radius, cy + Math.sin(a) * radius)
    ctx.rotate(a + Math.PI / 2)
    ctx.fillText(c, 0, 0)
    ctx.restore()
    angle += (widths[i] * scale) / radius
  })
}

export function paintBrandMark(ctx: Ctx, el: BrandMarkElement, rc: RenderCtx) {
  const { width: w, height: h } = el
  const color = rc.color(el.color)
  const accent = rc.color(el.accentColor)
  const label = rc.text(el.text || '{brand}')
  const fam = rc.font('$label')
  switch (el.variant) {
    case 'editorial': {
      // Discreet signature: small mark + name, tight tracking.
      const icon = h
      const ts = h * 0.5
      const tw = labelWidth(label, { family: fam, size: ts, weight: 700, letterSpacing: ts * 0.05, uppercase: true })
      const gap = h * 0.28
      const iw = icon * (GOAT_VIEW.width / GOAT_VIEW.height)
      const total = iw + gap + tw
      const align = el.align ?? 'left'
      const sx = align === 'left' ? 0 : align === 'right' ? Math.max(0, w - total) : Math.max(0, (w - total) / 2)
      paintMark(ctx, rc, sx - (icon - iw) / 2, 0, icon, accent, rc.color('$bg'), el.useLogo)
      drawLabel(ctx, label, sx + iw + gap, h / 2, { family: fam, size: ts, weight: 700, color, uppercase: true, letterSpacing: ts * 0.05, maxWidth: Math.max(10, w - iw - gap) })
      return
    }
    case 'icon': {
      const size = Math.min(w, h)
      paintMark(ctx, rc, (w - size) / 2, (h - size) / 2, size, accent, rc.color('$bg'), el.useLogo)
      return
    }
    case 'watermark': {
      const size = Math.min(w, h)
      paintMark(ctx, rc, (w - size) / 2, (h - size) / 2, size, color, rc.color('$bg'), el.useLogo)
      return
    }
    case 'header': {
      const icon = h
      const ts = h * 0.46
      const tw = labelWidth(label, { family: fam, size: ts, weight: 700, letterSpacing: ts * 0.32, uppercase: true })
      const gap = h * 0.35
      const total = icon * 0.82 + gap + tw
      const align = el.align ?? 'center'
      const sx = align === 'left' ? 0 : align === 'right' ? Math.max(0, w - total) : Math.max(0, (w - total) / 2)
      paintMark(ctx, rc, sx - icon * 0.09, 0, icon, accent, rc.color('$bg'), el.useLogo)
      drawLabel(ctx, label, sx + icon * 0.82 + gap, h / 2, { family: fam, size: ts, weight: 700, color, uppercase: true, letterSpacing: ts * 0.32, maxWidth: w - icon - gap })
      return
    }
    case 'signature': {
      const ts = Math.min(h * 0.42, 30)
      const icon = h
      const tw = labelWidth(label, { family: fam, size: ts, weight: 700, letterSpacing: ts * 0.35, uppercase: true })
      const block = icon * 0.85 + 18 + tw
      const sx = (w - block) / 2
      ctx.fillStyle = withAlpha(accent, 0.5)
      const lineW = Math.max(0, sx - 30)
      ctx.fillRect(0, h / 2, lineW, 1.5)
      ctx.fillRect(w - lineW, h / 2, lineW, 1.5)
      paintMark(ctx, rc, sx - icon * 0.08, 0, icon, accent, rc.color('$bg'), el.useLogo)
      drawLabel(ctx, label, sx + icon * 0.85 + 18, h / 2, { family: fam, size: ts, weight: 700, color, uppercase: true, letterSpacing: ts * 0.35 })
      return
    }
    case 'badge': {
      const size = Math.min(w, h)
      const cx = w / 2
      const cy = h / 2
      const R = size / 2
      ellipsePath(ctx, cx, cy, R - 1, R - 1)
      ctx.fillStyle = withAlpha(rc.color('$bg'), 0.85)
      ctx.fill()
      ctx.strokeStyle = accent
      ctx.lineWidth = Math.max(1.5, size * 0.018)
      ctx.stroke()
      ellipsePath(ctx, cx, cy, R * 0.7, R * 0.7)
      ctx.strokeStyle = withAlpha(accent, 0.55)
      ctx.lineWidth = Math.max(1, size * 0.008)
      ctx.stroke()
      circularText(ctx, `${label} · ${rc.brand.handle.replace('@', '').toUpperCase()} · `, cx, cy, R * 0.85, size * 0.085, color, fam)
      const ms = R * 1.05
      paintMark(ctx, rc, cx - ms / 2, cy - ms / 2, ms, accent, rc.color('$bg'), el.useLogo)
      return
    }
    case 'wordmark': {
      const icon = h * 0.42
      paintMark(ctx, rc, (w - icon) / 2, 0, icon, accent, rc.color('$bg'), el.useLogo)
      const words = label.split(' ')
      const first = words[0] ?? ''
      const rest = words.slice(1).join(' ')
      drawLabel(ctx, first, w / 2, icon + h * 0.2, { family: rc.font('$headline'), size: h * 0.28, color, align: 'center', uppercase: true, letterSpacing: h * 0.02, maxWidth: w })
      if (rest) drawLabel(ctx, rest, w / 2, icon + h * 0.44, { family: fam, size: h * 0.11, weight: 700, color: accent, align: 'center', uppercase: true, letterSpacing: h * 0.06, maxWidth: w })
      return
    }
  }
}
