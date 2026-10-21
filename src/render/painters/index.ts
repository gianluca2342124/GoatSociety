// The single composition pipeline: every element type is drawn by a pure
// painter onto a Canvas2D context. The Konva editor calls these painters from
// custom shapes; the exporter calls them on an offscreen canvas.
import type { Slide, SlideElement } from '../../model/types'
import { withAlpha } from '../../model/tokens'
import type { RenderCtx } from '../context'
import { blurredCopy, deviceScale, fillStyle, makeCanvas, setShadow, type Ctx } from '../paint/canvas'
import { drawImageFit, paintEffect, paintGlass, paintIcon, paintImage, paintShape, paintText } from './basic'
import { paintCrest } from './crest'
import { paintFormRow, paintProgressRing, paintStatBars, paintStatNumber, paintTable } from './stats'
import { paintMatchList, paintPlayerList, paintResultsList } from './lists'
import { paintPrediction } from './prediction'
import { paintTactics } from './tactics'
import { paintBrandMark, paintMascot } from './brand'
import { paint3D } from './three'
import { paintBadge, paintProbability, paintRanking, paintScoreboard } from './editorial'

type Painter = (ctx: Ctx, el: never, rc: RenderCtx) => void

export const PAINTERS: Record<SlideElement['type'], Painter> = {
  text: paintText as Painter,
  shape: paintShape as Painter,
  image: paintImage as Painter,
  crest: paintCrest as Painter,
  statBars: paintStatBars as Painter,
  statNumber: paintStatNumber as Painter,
  progressRing: paintProgressRing as Painter,
  formRow: paintFormRow as Painter,
  table: paintTable as Painter,
  playerList: paintPlayerList as Painter,
  matchList: paintMatchList as Painter,
  prediction: paintPrediction as Painter,
  resultsList: paintResultsList as Painter,
  ranking: paintRanking as Painter,
  probability: paintProbability as Painter,
  badge: paintBadge as Painter,
  scoreboard: paintScoreboard as Painter,
  tactics: paintTactics as Painter,
  stadium3d: paint3D as Painter,
  model3d: paint3D as Painter,
  mascot: paintMascot as Painter,
  brandMark: paintBrandMark as Painter,
  icon: paintIcon as Painter,
  effect: paintEffect as Painter,
  glass: paintGlass as Painter,
}

function callPainter(ctx: Ctx, el: SlideElement, rc: RenderCtx) {
  try {
    PAINTERS[el.type](ctx, el as never, rc)
  } catch (e) {
    // A broken element must never break the whole slide.
    if (rc.mode === 'editor') {
      ctx.save()
      ctx.strokeStyle = 'rgba(239,70,85,0.9)'
      ctx.setLineDash([8, 6])
      ctx.strokeRect(0, 0, el.width, el.height)
      ctx.restore()
    }
    console.error('Painter error', el.type, e)
  }
}

/** Paint an element in its local coordinate space (transform already applied). */
export function paintElementLocal(ctx: Ctx, el: SlideElement, rc: RenderCtx) {
  const fx = el.fx
  const blur = fx?.blur ?? 0
  const shadow = fx?.shadow?.enabled ? fx.shadow : null
  const glow = fx?.glow?.enabled ? fx.glow : null
  if (!blur && !shadow && !glow) {
    callPainter(ctx, el, rc)
    return
  }
  const s = deviceScale(ctx)
  const pad = Math.ceil(Math.max(blur * 3, shadow ? shadow.blur * 2 + Math.abs(shadow.offsetX) + Math.abs(shadow.offsetY) : 0, glow ? glow.blur * 2 : 0, 8))
  const w = el.width + pad * 2
  const h = el.height + pad * 2
  // Large tactical labels can sit outside the box; keep generous room.
  const off = makeCanvas(w * s, h * s)
  const octx = off.getContext('2d')!
  octx.scale(s, s)
  octx.translate(pad, pad)
  callPainter(octx, el, rc)
  let src: HTMLCanvasElement = off
  let extra = 0
  if (blur > 0) {
    src = blurredCopy(off, blur * s)
    extra = (src.width - off.width) / 2 / s
  }
  const dx = -pad - extra
  const dy = -pad - extra
  const dw = w + extra * 2
  const dh = h + extra * 2
  const FAR = 100000
  // Shadow-only passes using the offset trick (the image itself lands far away).
  if (shadow) {
    ctx.save()
    setShadow(ctx, withAlpha(rc.color(shadow.color), shadow.opacity), shadow.blur, shadow.offsetX + FAR, shadow.offsetY)
    ctx.drawImage(src, dx - FAR, dy, dw, dh)
    ctx.restore()
  }
  if (glow) {
    ctx.save()
    setShadow(ctx, withAlpha(rc.color(glow.color), glow.opacity), glow.blur, FAR, 0)
    ctx.drawImage(src, dx - FAR, dy, dw, dh)
    ctx.drawImage(src, dx - FAR, dy, dw, dh)
    ctx.restore()
  }
  ctx.drawImage(src, dx, dy, dw, dh)
}

/** Paint an element including its own transform (used by the exporter). */
export function paintElement(ctx: Ctx, el: SlideElement, rc: RenderCtx) {
  if (!el.visible || el.opacity <= 0 || !rc.shown(el)) return
  ctx.save()
  ctx.translate(el.x, el.y)
  if (el.rotation) ctx.rotate((el.rotation * Math.PI) / 180)
  ctx.globalAlpha *= el.opacity
  if (el.fx?.blend && el.fx.blend !== 'source-over') ctx.globalCompositeOperation = el.fx.blend
  paintElementLocal(ctx, el, rc)
  ctx.restore()
}

export function paintBackground(ctx: Ctx, slide: Slide, rc: RenderCtx, W: number, H: number, transparent = false) {
  const bg = slide.background
  if (!transparent && !bg.transparent) {
    const f = fillStyle(ctx, bg.fill, W, H, rc.color)
    ctx.fillStyle = f ?? rc.color('$bg')
    ctx.fillRect(0, 0, W, H)
  }
  if (bg.imageAssetId) {
    const img = rc.image(bg.imageAssetId)
    if (img) {
      ctx.save()
      ctx.globalAlpha *= bg.imageOpacity
      if (bg.imageBlur > 0) {
        const s = deviceScale(ctx)
        const off = makeCanvas(W * s, H * s)
        const o = off.getContext('2d')!
        o.scale(s, s)
        drawImageFit(o, img, W, H, bg.imageFit)
        const b = blurredCopy(off, bg.imageBlur * s)
        const e = (b.width - off.width) / 2 / s
        ctx.beginPath()
        ctx.rect(0, 0, W, H)
        ctx.clip()
        ctx.drawImage(b, -e, -e, W + e * 2, H + e * 2)
      } else drawImageFit(ctx, img, W, H, bg.imageFit)
      ctx.restore()
    }
  }
}

/** Global brand watermark from the Brand Kit (drawn last, optional). */
export function paintWatermark(ctx: Ctx, rc: RenderCtx, W: number, H: number) {
  const wm = rc.brand.watermark
  if (!wm.enabled) return
  const size = wm.size
  const m = 48
  let x = W - size - m
  let y = H - size - m
  if (wm.position === 'tl') {
    x = m
    y = m
  } else if (wm.position === 'tr') {
    y = m
  } else if (wm.position === 'bl') {
    x = m
  } else if (wm.position === 'center') {
    x = (W - size) / 2
    y = (H - size) / 2
  }
  ctx.save()
  ctx.globalAlpha *= wm.opacity
  ctx.translate(x, y)
  paintBrandMark(ctx, { id: 'wm', type: 'brandMark', name: 'wm', x: 0, y: 0, width: size, height: size, rotation: 0, opacity: 1, visible: true, locked: false, variant: 'watermark', color: '$text', accentColor: '$primary', useLogo: true, text: '{brand}' }, rc)
  ctx.restore()
}

export function paintSlide(ctx: Ctx, slide: Slide, rc: RenderCtx, W: number, H: number, opts: { transparent?: boolean } = {}) {
  paintBackground(ctx, slide, rc, W, H, opts.transparent)
  for (const el of slide.elements) paintElement(ctx, el, rc)
  paintWatermark(ctx, rc, W, H)
}
