import type { EffectElement, GlassElement, IconElement, ImageElement, ShapeElement, TextElement } from '../../model/types'
import { withAlpha } from '../../model/tokens'
import type { RenderCtx } from '../context'
import { blurredCopy, canvasFilterSupported, deviceScale, ellipsePath, fillStyle, makeCanvas, polygonPath, roundRect, type Ctx } from '../paint/canvas'
import { cloudTexture, grainTexture, seeded } from '../paint/noise'
import { drawLayout } from '../text/draw'
import { fitText, layoutText, type TextStyle } from '../text/layout'
import { cachedPaint, hashKey } from '../paint/bitmapCache'
import { iconNodes } from '../icons'
import { pitchMarkings } from '../../tactics/pitch'
import { buildProjection } from '../../tactics/projection'

// ── Text ────────────────────────────────────────────────────────────────────

export function textStyleOf(el: TextElement, rc: RenderCtx): TextStyle {
  return {
    family: rc.font(el.fontFamily),
    size: el.fontSize,
    weight: el.fontWeight,
    italic: el.italic,
    letterSpacing: el.letterSpacing,
    lineHeight: el.lineHeight,
    uppercase: el.uppercase,
  }
}

export function layoutFor(el: TextElement, rc: RenderCtx) {
  const style = textStyleOf(el, rc)
  const text = rc.text(el.text)
  const bg = el.background
  const padX = bg ? bg.paddingX : 0
  const padY = bg ? bg.paddingY : 0
  const w = Math.max(1, el.width - padX * 2)
  const h = Math.max(1, el.height - padY * 2)
  const layout = el.autoFit ? fitText(text, style, w, h, el.minFontSize) : layoutText(text, style, w)
  return { style, layout, padX, padY, w, h }
}

export function paintText(ctx: Ctx, el: TextElement, rc: RenderCtx) {
  const { style, layout, padX, padY, w, h } = layoutFor(el, rc)
  const fstyle = { ...style, size: layout.fontSize, letterSpacing: layout.letterSpacing }
  if (el.background && el.background.opacity > 0) {
    const bg = el.background
    const bw = Math.min(el.width, layout.maxLineWidth + bg.paddingX * 2)
    const bh = Math.min(el.height, layout.height + bg.paddingY * 2)
    let bx = 0
    if (el.align === 'center') bx = (el.width - bw) / 2
    else if (el.align === 'right') bx = el.width - bw
    let by = 0
    if (el.verticalAlign === 'middle') by = (el.height - bh) / 2
    else if (el.verticalAlign === 'bottom') by = el.height - bh
    roundRect(ctx, bx, by, bw, bh, bg.radius)
    ctx.fillStyle = withAlpha(rc.color(bg.color), bg.opacity)
    ctx.fill()
  }
  ctx.save()
  ctx.translate(padX, padY)
  const fill = fillStyle(ctx, el.fill, w, h, rc.color)
  drawLayout(ctx, layout, fstyle, {
    width: w,
    height: h,
    align: el.align,
    verticalAlign: el.verticalAlign,
    fill,
    accent: rc.color(el.accentColor),
    stroke: el.stroke && el.stroke.width > 0 ? { color: rc.color(el.stroke.color), width: el.stroke.width } : undefined,
  })
  ctx.restore()
}

// ── Shapes ──────────────────────────────────────────────────────────────────

export function shapePath(ctx: Ctx, el: ShapeElement) {
  const { width: w, height: h } = el
  switch (el.shape) {
    case 'rect':
      roundRect(ctx, 0, 0, w, h, el.cornerRadius)
      break
    case 'ellipse':
      ellipsePath(ctx, w / 2, h / 2, w / 2, h / 2)
      break
    case 'line':
      ctx.beginPath()
      ctx.moveTo(0, h / 2)
      ctx.lineTo(w, h / 2)
      break
    case 'triangle':
      polygonPath(ctx, [
        { x: w / 2, y: 0 },
        { x: w, y: h },
        { x: 0, y: h },
      ])
      break
    case 'diamond':
      polygonPath(ctx, [
        { x: w / 2, y: 0 },
        { x: w, y: h / 2 },
        { x: w / 2, y: h },
        { x: 0, y: h / 2 },
      ])
      break
    case 'parallelogram': {
      const sk = Math.min(w * 0.3, h * 0.45)
      polygonPath(ctx, [
        { x: sk, y: 0 },
        { x: w, y: 0 },
        { x: w - sk, y: h },
        { x: 0, y: h },
      ])
      break
    }
    case 'hexagon': {
      const pts = []
      for (let i = 0; i < 6; i++) {
        const a = (Math.PI / 3) * i
        pts.push({ x: w / 2 + (Math.cos(a) * w) / 2, y: h / 2 + (Math.sin(a) * h) / 2 })
      }
      polygonPath(ctx, pts)
      break
    }
    case 'star': {
      const pts = []
      for (let i = 0; i < 10; i++) {
        const a = -Math.PI / 2 + (Math.PI / 5) * i
        const r = i % 2 === 0 ? 0.5 : 0.21
        pts.push({ x: w / 2 + Math.cos(a) * w * r, y: h / 2 + Math.sin(a) * h * r })
      }
      polygonPath(ctx, pts)
      break
    }
  }
}

export function paintShape(ctx: Ctx, el: ShapeElement, rc: RenderCtx) {
  shapePath(ctx, el)
  if (el.shape !== 'line') {
    const f = fillStyle(ctx, el.fill, el.width, el.height, rc.color)
    if (f) {
      ctx.fillStyle = f
      ctx.fill()
    }
  }
  if (el.stroke && el.stroke.width > 0) {
    ctx.save()
    ctx.strokeStyle = withAlpha(rc.color(el.stroke.color), el.stroke.opacity ?? 1)
    ctx.lineWidth = el.stroke.width
    if (el.stroke.dash && el.stroke.dash.length) ctx.setLineDash(el.stroke.dash)
    ctx.lineCap = 'round'
    ctx.stroke()
    ctx.restore()
  } else if (el.shape === 'line') {
    const f = fillStyle(ctx, el.fill, el.width, el.height, rc.color)
    ctx.strokeStyle = typeof f === 'string' ? f : rc.color('$text')
    ctx.lineWidth = Math.max(1, el.height)
    ctx.stroke()
  }
}

// ── Images ──────────────────────────────────────────────────────────────────

export function drawImageFit(
  ctx: Ctx,
  img: CanvasImageSource & { width: number; height: number },
  w: number,
  h: number,
  fit: 'contain' | 'cover' | 'fill',
  focusX = 0.5,
  focusY = 0.5,
) {
  const iw = (img as HTMLImageElement).naturalWidth || img.width
  const ih = (img as HTMLImageElement).naturalHeight || img.height
  if (!iw || !ih) return
  if (fit === 'fill') {
    ctx.drawImage(img, 0, 0, w, h)
    return
  }
  const scale = fit === 'cover' ? Math.max(w / iw, h / ih) : Math.min(w / iw, h / ih)
  const dw = iw * scale
  const dh = ih * scale
  const dx = (w - dw) * (fit === 'cover' ? focusX : 0.5)
  const dy = (h - dh) * (fit === 'cover' ? focusY : 0.5)
  ctx.drawImage(img, dx, dy, dw, dh)
}

export function paintImagePlaceholder(ctx: Ctx, w: number, h: number, rc: RenderCtx, label = 'IMAGEN') {
  ctx.save()
  roundRect(ctx, 0, 0, w, h, 12)
  // Light veil only: content placed behind an empty photo slot stays visible.
  ctx.fillStyle = withAlpha(rc.color('$surface'), 0.28)
  ctx.fill()
  ctx.setLineDash([10, 8])
  ctx.strokeStyle = withAlpha(rc.color('$muted'), 0.6)
  ctx.lineWidth = 2
  ctx.stroke()
  ctx.setLineDash([])
  ctx.fillStyle = withAlpha(rc.color('$muted'), 0.9)
  ctx.font = `600 ${Math.max(12, Math.min(w, h) * 0.08)}px "Barlow Condensed"`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(label, w / 2, h / 2)
  ctx.restore()
}

export function paintImage(ctx: Ctx, el: ImageElement, rc: RenderCtx) {
  const img = rc.image(el.assetId)
  const { width: w, height: h } = el
  if (!img) {
    if (rc.mode === 'editor') paintImagePlaceholder(ctx, w, h, rc, el.assetId ? 'CARGANDO…' : 'IMAGEN')
    return
  }
  const needsOffscreen = el.fadeBottom > 0 || (el.grayscale && !canvasFilterSupported()) || !!el.tint
  const draw = (c: Ctx) => {
    c.save()
    if (el.cornerRadius > 0) {
      roundRect(c, 0, 0, w, h, el.cornerRadius)
      c.clip()
    } else if (el.fit === 'cover') {
      c.beginPath()
      c.rect(0, 0, w, h)
      c.clip()
    }
    if (el.flipX) {
      c.translate(w, 0)
      c.scale(-1, 1)
    }
    if (el.grayscale && canvasFilterSupported()) c.filter = 'grayscale(1) contrast(1.08)'
    drawImageFit(c, img, w, h, el.fit, el.focusX, el.focusY)
    c.filter = 'none'
    c.restore()
    if (el.tint && el.tint.opacity > 0) {
      c.save()
      c.globalCompositeOperation = 'source-atop'
      c.globalAlpha = el.tint.opacity
      c.fillStyle = rc.color(el.tint.color)
      c.fillRect(0, 0, w, h)
      c.restore()
    }
    if (el.fadeBottom > 0) {
      c.save()
      c.globalCompositeOperation = 'destination-in'
      const g = c.createLinearGradient(0, 0, 0, h)
      g.addColorStop(0, 'rgba(0,0,0,1)')
      g.addColorStop(Math.max(0, 1 - el.fadeBottom), 'rgba(0,0,0,1)')
      g.addColorStop(1, 'rgba(0,0,0,0)')
      c.fillStyle = g
      c.fillRect(0, 0, w, h)
      c.restore()
    }
    if (el.grayscale && !canvasFilterSupported()) {
      const d = c.getImageData(0, 0, c.canvas.width, c.canvas.height)
      for (let i = 0; i < d.data.length; i += 4) {
        const l = d.data[i] * 0.3 + d.data[i + 1] * 0.59 + d.data[i + 2] * 0.11
        d.data[i] = d.data[i + 1] = d.data[i + 2] = l
      }
      c.putImageData(d, 0, 0)
    }
  }
  if (!needsOffscreen) {
    draw(ctx)
    return
  }
  const s = deviceScale(ctx)
  const off = makeCanvas(w * s, h * s)
  const octx = off.getContext('2d')!
  octx.scale(s, s)
  draw(octx)
  ctx.drawImage(off, 0, 0, w, h)
}

// ── Icons (lucide geometry) ────────────────────────────────────────────────

export function paintIconGlyph(ctx: Ctx, name: string, x: number, y: number, size: number, color: string, strokeWidth = 2) {
  const nodes = iconNodes(name)
  if (!nodes) return
  ctx.save()
  ctx.translate(x, y)
  ctx.scale(size / 24, size / 24)
  ctx.strokeStyle = color
  ctx.lineWidth = strokeWidth
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  for (const [tag, a] of nodes) {
    const n = (k: string) => parseFloat((a as Record<string, string>)[k] ?? '0')
    switch (tag) {
      case 'path':
        ctx.stroke(new Path2D((a as Record<string, string>).d))
        break
      case 'circle':
        ctx.beginPath()
        ctx.arc(n('cx'), n('cy'), n('r'), 0, Math.PI * 2)
        ctx.stroke()
        break
      case 'ellipse':
        ctx.beginPath()
        ctx.ellipse(n('cx'), n('cy'), n('rx'), n('ry'), 0, 0, Math.PI * 2)
        ctx.stroke()
        break
      case 'rect':
        roundRect(ctx, n('x'), n('y'), n('width'), n('height'), n('rx'))
        ctx.stroke()
        break
      case 'line':
        ctx.beginPath()
        ctx.moveTo(n('x1'), n('y1'))
        ctx.lineTo(n('x2'), n('y2'))
        ctx.stroke()
        break
      case 'polyline':
      case 'polygon': {
        const pts = ((a as Record<string, string>).points || '').trim().split(/[\s,]+/).map(Number)
        ctx.beginPath()
        for (let i = 0; i < pts.length; i += 2) (i === 0 ? ctx.moveTo(pts[i], pts[i + 1]) : ctx.lineTo(pts[i], pts[i + 1]))
        if (tag === 'polygon') ctx.closePath()
        ctx.stroke()
        break
      }
    }
  }
  ctx.restore()
}

export function paintIcon(ctx: Ctx, el: IconElement, rc: RenderCtx) {
  const size = Math.min(el.width, el.height)
  const ox = (el.width - size) / 2
  const oy = (el.height - size) / 2
  if (el.background && el.background.opacity > 0) {
    ctx.fillStyle = withAlpha(rc.color(el.background.color), el.background.opacity)
    if (el.background.shape === 'circle') ellipsePath(ctx, el.width / 2, el.height / 2, size / 2, size / 2)
    else roundRect(ctx, ox, oy, size, size, size * 0.22)
    ctx.fill()
    const inner = size * 0.56
    paintIconGlyph(ctx, el.icon, ox + (size - inner) / 2, oy + (size - inner) / 2, inner, rc.color(el.color), el.strokeWidth)
    return
  }
  paintIconGlyph(ctx, el.icon, ox, oy, size, rc.color(el.color), el.strokeWidth)
}

// ── Frosted glass (true backdrop blur) ─────────────────────────────────────

export function backdropBlur(ctx: Ctx, w: number, h: number, radius: number, cornerRadius: number) {
  if (radius <= 0) return
  const canvas = ctx.canvas as HTMLCanvasElement
  if (!canvas || !canvas.width) return
  const m = ctx.getTransform()
  const s = deviceScale(ctx)
  const corners = [
    [0, 0],
    [w, 0],
    [w, h],
    [0, h],
  ].map(([x, y]) => ({ x: m.a * x + m.c * y + m.e, y: m.b * x + m.d * y + m.f }))
  const r = radius * s
  const pad = Math.ceil(r * 2)
  let bx = Math.floor(Math.min(...corners.map((p) => p.x)) - pad)
  let by = Math.floor(Math.min(...corners.map((p) => p.y)) - pad)
  let bx2 = Math.ceil(Math.max(...corners.map((p) => p.x)) + pad)
  let by2 = Math.ceil(Math.max(...corners.map((p) => p.y)) + pad)
  bx = Math.max(0, bx)
  by = Math.max(0, by)
  bx2 = Math.min(canvas.width, bx2)
  by2 = Math.min(canvas.height, by2)
  const bw = bx2 - bx
  const bh = by2 - by
  if (bw <= 0 || bh <= 0) return
  const tmp = makeCanvas(bw, bh)
  tmp.getContext('2d')!.drawImage(canvas, bx, by, bw, bh, 0, 0, bw, bh)
  const blurred = blurredCopy(tmp, r)
  const bp = (blurred.width - bw) / 2
  ctx.save()
  roundRect(ctx, 0, 0, w, h, cornerRadius)
  ctx.clip()
  ctx.setTransform(1, 0, 0, 1, 0, 0)
  ctx.globalAlpha = 1
  ctx.drawImage(blurred, bx - bp, by - bp)
  ctx.restore()
}

export function paintGlass(ctx: Ctx, el: GlassElement, rc: RenderCtx) {
  const { width: w, height: h, cornerRadius: r } = el
  backdropBlur(ctx, w, h, el.backdropBlur, r)
  roundRect(ctx, 0, 0, w, h, r)
  ctx.fillStyle = withAlpha(rc.color(el.tint), el.tintOpacity)
  ctx.fill()
  if (el.highlight > 0) {
    const g = ctx.createLinearGradient(0, 0, w * 0.6, h)
    g.addColorStop(0, `rgba(255,255,255,${0.16 * el.highlight})`)
    g.addColorStop(0.45, `rgba(255,255,255,${0.03 * el.highlight})`)
    g.addColorStop(1, 'rgba(255,255,255,0)')
    ctx.fillStyle = g
    roundRect(ctx, 0, 0, w, h, r)
    ctx.fill()
  }
  if (el.noise > 0) {
    ctx.save()
    roundRect(ctx, 0, 0, w, h, r)
    ctx.clip()
    ctx.globalAlpha *= el.noise
    ctx.globalCompositeOperation = 'overlay'
    const pat = ctx.createPattern(grainTexture(160, 11, 0.9), 'repeat')
    if (pat) {
      ctx.fillStyle = pat
      ctx.fillRect(0, 0, w, h)
    }
    ctx.restore()
  }
  if (el.borderOpacity > 0) {
    roundRect(ctx, 0.75, 0.75, w - 1.5, h - 1.5, r)
    const g = ctx.createLinearGradient(0, 0, w, h)
    const bc = rc.color(el.borderColor)
    g.addColorStop(0, withAlpha(bc, el.borderOpacity))
    g.addColorStop(0.5, withAlpha(bc, el.borderOpacity * 0.25))
    g.addColorStop(1, withAlpha(bc, el.borderOpacity * 0.7))
    ctx.strokeStyle = g
    ctx.lineWidth = 1.5
    ctx.stroke()
  }
}

// ── Atmosphere effects ─────────────────────────────────────────────────────

function radial(ctx: Ctx, cx: number, cy: number, r: number, color: string, alpha: number, inner = 0) {
  const g = ctx.createRadialGradient(cx, cy, Math.max(0, r * inner), cx, cy, Math.max(1, r))
  g.addColorStop(0, withAlpha(color, alpha))
  g.addColorStop(1, withAlpha(color, 0))
  ctx.fillStyle = g
  ctx.fillRect(cx - r, cy - r, r * 2, r * 2)
}

export function paintEffect(ctx: Ctx, el: EffectElement, rc: RenderCtx) {
  const { width: w, height: h } = el
  const c1 = rc.color(el.color)
  const c2 = rc.color(el.color2)
  const k = el.intensity
  const key = hashKey(['fx', el.effect, c1, c2, k, el.spread, el.angle, el.seed, w, h])
  const direct = rc.mode === 'export'
  switch (el.effect) {
    case 'vignette': {
      const cx = w / 2
      const cy = h / 2
      const r = Math.hypot(w, h) / 2
      const g = ctx.createRadialGradient(cx, cy, r * Math.max(0.05, el.spread), cx, cy, r)
      g.addColorStop(0, withAlpha(c1, 0))
      g.addColorStop(0.6, withAlpha(c1, k * 0.45))
      g.addColorStop(1, withAlpha(c1, k))
      ctx.fillStyle = g
      ctx.fillRect(0, 0, w, h)
      return
    }
    case 'gradient': {
      const a = ((el.angle - 90) * Math.PI) / 180
      const len = Math.abs(w * Math.cos(a)) / 2 + Math.abs(h * Math.sin(a)) / 2
      const g = ctx.createLinearGradient(w / 2 - Math.cos(a) * len, h / 2 - Math.sin(a) * len, w / 2 + Math.cos(a) * len, h / 2 + Math.sin(a) * len)
      const mid = Math.max(0.01, Math.min(0.99, el.spread))
      g.addColorStop(0, withAlpha(c1, 0))
      g.addColorStop(mid, withAlpha(c1, k * 0.35))
      g.addColorStop(1, withAlpha(c2 || c1, k))
      ctx.fillStyle = g
      ctx.fillRect(0, 0, w, h)
      return
    }
    case 'glow': {
      ctx.save()
      ctx.translate(w / 2, h / 2)
      ctx.scale(1, h / Math.max(1, w))
      radial(ctx, 0, 0, w / 2, c1, k, el.spread * 0.5)
      ctx.restore()
      return
    }
    case 'spotlight': {
      cachedPaint(
        ctx,
        key,
        w,
        h,
        (c) => {
          const tilt = (el.angle * Math.PI) / 180
          const topW = w * 0.06
          const botW = w * (0.35 + el.spread * 0.9)
          const cx = w / 2
          const bx = cx + Math.tan(tilt) * h
          c.save()
          c.filter = canvasFilterSupported() ? `blur(${Math.max(4, w * 0.02)}px)` : 'none'
          const g = c.createLinearGradient(0, 0, 0, h)
          g.addColorStop(0, withAlpha(c1, k * 0.85))
          g.addColorStop(0.55, withAlpha(c1, k * 0.25))
          g.addColorStop(1, withAlpha(c1, 0))
          c.fillStyle = g
          c.beginPath()
          c.moveTo(cx - topW / 2, 0)
          c.lineTo(cx + topW / 2, 0)
          c.lineTo(bx + botW / 2, h)
          c.lineTo(bx - botW / 2, h)
          c.closePath()
          c.fill()
          c.filter = 'none'
          c.restore()
          radial(c, cx, 0, w * 0.18, c1, k)
          c.save()
          c.translate(bx, h * 0.92)
          c.scale(1, 0.22)
          radial(c, 0, 0, botW * 0.7, c1, k * 0.5)
          c.restore()
        },
        { direct },
      )
      return
    }
    case 'fog': {
      cachedPaint(
        ctx,
        key,
        w,
        h,
        (c) => {
          const tex = cloudTexture(Math.min(512, w / 2), Math.min(512, h / 2), el.seed || 3, 3 + el.spread * 6)
          c.save()
          c.globalAlpha = k
          c.drawImage(tex, 0, 0, w, h)
          c.globalCompositeOperation = 'source-in'
          c.fillStyle = c1
          c.fillRect(0, 0, w, h)
          c.restore()
          // Denser at the bottom.
          c.save()
          c.globalCompositeOperation = 'destination-in'
          const g = c.createLinearGradient(0, 0, 0, h)
          g.addColorStop(0, 'rgba(0,0,0,0.25)')
          g.addColorStop(1, 'rgba(0,0,0,1)')
          c.fillStyle = g
          c.fillRect(0, 0, w, h)
          c.restore()
        },
        { direct },
      )
      return
    }
    case 'grain': {
      ctx.save()
      ctx.globalAlpha *= k
      const tex = grainTexture(256, el.seed || 1, 1)
      const pat = ctx.createPattern(tex, 'repeat')
      if (pat) {
        const scale = 0.5 + el.spread
        pat.setTransform(new DOMMatrix().scale(scale, scale))
        ctx.fillStyle = pat
        ctx.fillRect(0, 0, w, h)
      }
      ctx.restore()
      return
    }
    case 'scanlines': {
      ctx.save()
      ctx.fillStyle = withAlpha(c1, k)
      const step = 3 + el.spread * 10
      for (let y = 0; y < h; y += step) ctx.fillRect(0, y, w, Math.max(0.6, step * 0.22))
      ctx.restore()
      return
    }
    case 'grid': {
      cachedPaint(
        ctx,
        key,
        w,
        h,
        (c) => {
          c.strokeStyle = withAlpha(c1, k)
          c.lineWidth = 1
          const step = 40 + el.spread * 120
          c.beginPath()
          for (let x = (w % step) / 2; x <= w; x += step) {
            c.moveTo(x, 0)
            c.lineTo(x, h)
          }
          for (let y = (h % step) / 2; y <= h; y += step) {
            c.moveTo(0, y)
            c.lineTo(w, y)
          }
          c.stroke()
          // Fade toward edges (mask stays inside this isolated layer).
          c.globalCompositeOperation = 'destination-in'
          const g = c.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, Math.max(w, h) * 0.6)
          g.addColorStop(0, 'rgba(0,0,0,1)')
          g.addColorStop(1, 'rgba(0,0,0,0)')
          c.fillStyle = g
          c.fillRect(0, 0, w, h)
        },
        { direct },
      )
      return
    }
    case 'lightRays': {
      cachedPaint(
        ctx,
        key,
        w,
        h,
        (c) => {
          const rnd = seeded(el.seed || 5)
          const ox = w * 0.5 + Math.tan((el.angle * Math.PI) / 180) * h * 0.3
          const oy = -h * 0.05
          c.save()
          c.globalCompositeOperation = 'lighter'
          const rays = 9
          for (let i = 0; i < rays; i++) {
            const t = (i + 0.5) / rays - 0.5
            const ang = Math.PI / 2 + t * (0.6 + el.spread * 1.4) + (rnd() - 0.5) * 0.08
            const len = h * (0.8 + rnd() * 0.5)
            const width = w * (0.02 + rnd() * 0.05)
            const ex = ox + Math.cos(ang) * len
            const ey = oy + Math.sin(ang) * len
            const g = c.createLinearGradient(ox, oy, ex, ey)
            const a = k * (0.25 + rnd() * 0.35)
            g.addColorStop(0, withAlpha(c1, a))
            g.addColorStop(1, withAlpha(c1, 0))
            c.fillStyle = g
            const nx = -Math.sin(ang)
            const ny = Math.cos(ang)
            c.beginPath()
            c.moveTo(ox - nx * 2, oy - ny * 2)
            c.lineTo(ox + nx * 2, oy + ny * 2)
            c.lineTo(ex + nx * width, ey + ny * width)
            c.lineTo(ex - nx * width, ey - ny * width)
            c.closePath()
            c.fill()
          }
          c.restore()
        },
        { direct },
      )
      return
    }
    case 'bokeh': {
      cachedPaint(
        ctx,
        key,
        w,
        h,
        (c) => {
          const rnd = seeded(el.seed || 9)
          const n = 18 + Math.round(el.spread * 30)
          for (let i = 0; i < n; i++) {
            const x = rnd() * w
            const y = rnd() * h * 0.7
            const r = (0.01 + rnd() * 0.045) * w
            const col = rnd() > 0.7 ? c2 || c1 : c1
            radial(c, x, y, r, col, k * (0.25 + rnd() * 0.5), 0.55)
          }
        },
        { direct },
      )
      return
    }
    case 'stadiumLights': {
      cachedPaint(
        ctx,
        key,
        w,
        h,
        (c) => {
          const count = 5
          const rnd = seeded(el.seed || 4)
          for (let i = 0; i < count; i++) {
            const x = w * (0.08 + (0.84 * i) / (count - 1))
            const y = h * (0.06 + Math.abs(i - (count - 1) / 2) * 0.02)
            // Beam
            const g = c.createLinearGradient(x, y, w / 2, h * 0.9)
            g.addColorStop(0, withAlpha(c1, k * 0.32))
            g.addColorStop(1, withAlpha(c1, 0))
            c.fillStyle = g
            c.beginPath()
            c.moveTo(x - 6, y)
            c.lineTo(x + 6, y)
            const tx = w / 2 + (x - w / 2) * 0.25
            c.lineTo(tx + w * (0.12 + el.spread * 0.2), h)
            c.lineTo(tx - w * (0.12 + el.spread * 0.2), h)
            c.closePath()
            c.fill()
            // Lamp + flare
            radial(c, x, y, w * 0.07, c1, k * 0.9, 0.05)
            radial(c, x, y, w * 0.018, '#ffffff', Math.min(1, k * 1.2))
            c.fillStyle = withAlpha('#ffffff', Math.min(1, k))
            c.fillRect(x - w * 0.045, y - 1, w * 0.09, 2)
            void rnd
          }
        },
        { direct },
      )
      return
    }
    case 'pitchLines': {
      cachedPaint(
        ctx,
        key,
        w,
        h,
        (c) => {
          const proj = buildProjection({ width: w, height: h, view: 'half', camera: 'perspective', vertical: true, tilt: 0.85 + el.spread * 0.15 })
          const { lines } = pitchMarkings()
          c.strokeStyle = withAlpha(c1, k)
          c.lineWidth = Math.max(1, w * 0.002)
          for (const line of lines) {
            c.beginPath()
            line.forEach((p, i) => {
              const s = proj.toScreen(p)
              if (i === 0) c.moveTo(s.x, s.y)
              else c.lineTo(s.x, s.y)
            })
            c.stroke()
          }
          c.globalCompositeOperation = 'destination-in'
          const g = c.createLinearGradient(0, 0, 0, h)
          g.addColorStop(0, 'rgba(0,0,0,0)')
          g.addColorStop(0.5, 'rgba(0,0,0,0.6)')
          g.addColorStop(1, 'rgba(0,0,0,1)')
          c.fillStyle = g
          c.fillRect(0, 0, w, h)
        },
        { direct },
      )
      return
    }
    case 'noiseGradient': {
      cachedPaint(
        ctx,
        key,
        w,
        h,
        (c) => {
          const rnd = seeded(el.seed || 2)
          const blobs = [c1, c2 || c1, c1]
          blobs.forEach((col, i) => {
            const x = w * (0.15 + rnd() * 0.7)
            const y = h * (i / blobs.length + rnd() * 0.25)
            const r = Math.max(w, h) * (0.35 + el.spread * 0.35)
            radial(c, x, y, r, col, k * (0.6 - i * 0.12))
          })
        },
        { direct },
      )
      return
    }
  }
}
