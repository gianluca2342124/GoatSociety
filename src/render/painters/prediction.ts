import type { PredictionElement } from '../../model/types'
import { mix, withAlpha } from '../../model/tokens'
import type { RenderCtx } from '../context'
import { blurredCopy, deviceScale, ellipsePath, makeCanvas, roundRect, setShadow, type Ctx } from '../paint/canvas'
import { grainTexture, seeded } from '../paint/noise'
import { drawLabel, drawLayout, labelWidth } from '../text/draw'
import { capHeightOf, fitText } from '../text/layout'
import { paintCrestBox } from './crest'
import { paintIconGlyph } from './basic'

/**
 * Decoy text for locked parts, so a locked export never contains the real
 * pick. Its shape is fixed: it ignores the real letters, length and kind
 * (words, a score, a number), so not even the outline of the blur gives
 * the pick away.
 */
export function scramble(_text: string, seed = 17): string {
  const rnd = seeded(seed)
  const letters = 'ABCDEFGHIJKLMNOPRSTUVZ'
  const word = (n: number) => Array.from({ length: n }, () => letters[Math.floor(rnd() * letters.length)]).join('')
  return `${word(4)} ${word(9)}`
}

type HidePart = 'market' | 'pick' | 'conf' | 'note'
const HIDE_ALL: HidePart[] = ['market', 'pick', 'conf', 'note']

/** The parts a locked prediction hides. */
function hiddenParts(el: PredictionElement): HidePart[] {
  if (el.mode !== 'locked') return []
  return el.hiddenPosition === 'all' ? HIDE_ALL : ['pick']
}

function drawLock(ctx: Ctx, style: PredictionElement['lockStyle'], cx: number, cy: number, size: number, accent: string) {
  if (style === 'none') return
  ctx.save()
  // Glowing medallion
  setShadow(ctx, withAlpha(accent, 0.8), size * 0.5)
  ellipsePath(ctx, cx, cy, size / 2, size / 2)
  const g = ctx.createLinearGradient(cx, cy - size / 2, cx, cy + size / 2)
  g.addColorStop(0, mix(accent, '#ffffff', 0.18))
  g.addColorStop(1, mix(accent, '#000000', 0.25))
  ctx.fillStyle = g
  ctx.fill()
  ctx.restore()
  ellipsePath(ctx, cx, cy, size / 2 + size * 0.09, size / 2 + size * 0.09)
  ctx.strokeStyle = withAlpha(accent, 0.45)
  ctx.lineWidth = Math.max(1.5, size * 0.025)
  ctx.stroke()
  const icon = style === 'shield' ? 'shield' : style === 'keyhole' ? 'key' : 'lock'
  const is = size * 0.5
  paintIconGlyph(ctx, icon, cx - is / 2, cy - is / 2, is, '#08090B', 2.6)
}

export function paintPrediction(ctx: Ctx, el: PredictionElement, rc: RenderCtx) {
  if (el.chrome === 'none') {
    paintPredictionEditorial(ctx, el, rc)
    return
  }
  const { width: w, height: h } = el
  const pred = rc.match.predictions[el.predictionIndex] ?? rc.match.predictions[0]
  const accent = rc.color(el.accentColor)
  const textC = rc.color(el.textColor)
  const cardC = rc.color(el.cardColor)
  const locked = el.mode === 'locked'
  const r = el.cornerRadius
  const pad = Math.min(56, w * 0.07)

  // Card body
  ctx.save()
  setShadow(ctx, 'rgba(0,0,0,0.55)', 50, 0, 24)
  roundRect(ctx, 0, 0, w, h, r)
  const bg = ctx.createLinearGradient(0, 0, w * 0.3, h)
  bg.addColorStop(0, mix(cardC, '#ffffff', 0.06))
  bg.addColorStop(1, mix(cardC, '#000000', 0.35))
  ctx.fillStyle = bg
  ctx.fill()
  ctx.restore()
  // Accent glow inside top
  ctx.save()
  roundRect(ctx, 0, 0, w, h, r)
  ctx.clip()
  const glow = ctx.createRadialGradient(w * 0.5, 0, 0, w * 0.5, 0, w * 0.75)
  glow.addColorStop(0, withAlpha(accent, 0.2))
  glow.addColorStop(1, withAlpha(accent, 0))
  ctx.fillStyle = glow
  ctx.fillRect(0, 0, w, h)
  ctx.restore()
  // Border
  roundRect(ctx, 1, 1, w - 2, h - 2, r)
  const bgrad = ctx.createLinearGradient(0, 0, w, h)
  bgrad.addColorStop(0, withAlpha(accent, 0.9))
  bgrad.addColorStop(0.5, withAlpha(accent, 0.18))
  bgrad.addColorStop(1, withAlpha(accent, 0.6))
  ctx.strokeStyle = bgrad
  ctx.lineWidth = 2
  ctx.stroke()

  // Header
  const headH = Math.min(70, h * 0.12)
  drawLabel(ctx, `${rc.brand.name} · PRONÓSTICO`, pad, headH * 0.75, { family: rc.font('$label'), size: Math.min(26, headH * 0.42), weight: 700, color: accent, uppercase: true, letterSpacing: 4, maxWidth: w * 0.6 })
  ctx.fillStyle = withAlpha(accent, 0.25)
  ctx.fillRect(pad, headH + 12, w - pad * 2, 1.5)
  let y = headH + 36

  if (el.showMatch) {
    const mh = Math.min(96, h * 0.15)
    const cs = mh * 0.86
    paintCrestOffset(ctx, rc, 'home', pad, y + (mh - cs) / 2, cs)
    paintCrestOffset(ctx, rc, 'away', w - pad - cs, y + (mh - cs) / 2, cs)
    const name = `${rc.match.home.shortName || rc.match.home.name}  vs  ${rc.match.away.shortName || rc.match.away.name}`
    drawLabel(ctx, name, w / 2, y + mh * 0.42, { family: rc.font('$label'), size: mh * 0.36, weight: 700, color: textC, align: 'center', uppercase: true, letterSpacing: 1.5, maxWidth: w - pad * 2 - cs * 2 - 30 })
    drawLabel(ctx, `${rc.match.competition}  ·  ${rc.text('{date}')}  ·  ${rc.match.time}`, w / 2, y + mh * 0.82, { family: rc.font('$body'), size: mh * 0.17, weight: 500, color: withAlpha(textC, 0.6), align: 'center', uppercase: true, letterSpacing: 1.5, maxWidth: w - pad * 2 - cs * 2 - 30 })
    y += mh + 28
  }

  const bodyTop = y
  const bodyH = h - bodyTop - pad * 0.8
  if (!pred) return

  // ── Body layout (vertically centered block) ─────────────────────────────
  type Part = HidePart
  const marketH = Math.min(56, bodyH * 0.12)
  const pickH = bodyH * (locked ? 0.4 : 0.34)
  const gap = bodyH * 0.05
  const confLabel = Math.min(22, bodyH * 0.05)
  const confH = el.showConfidence ? 10 + confLabel * 1.8 : 0
  const noteStyle = { family: rc.font('$body'), size: Math.min(28, bodyH * 0.06), weight: 500, italic: false, letterSpacing: 0, lineHeight: 1.35, uppercase: false }
  const hidden = hiddenParts(el)
  // Measure the note so the whole block can be centered precisely (a hidden
  // note is measured from its decoy, so the layout never depends on it).
  const noteSrc = hidden.includes('note') ? scramble(pred.note, 29) : pred.note
  const noteH = el.showNote && pred.note ? Math.min(bodyH * 0.2, fitText(noteSrc, noteStyle, w - pad * 2, bodyH * 0.2, 14).height + 4) : 0
  const total = marketH + pickH + gap + (confH ? confH + 24 : 0) + noteH
  const parts: Record<Part, { y: number; h: number }> = {} as Record<Part, { y: number; h: number }>
  let cursor = bodyTop + Math.max(0, (bodyH - total) / 2)
  parts.market = { y: cursor, h: marketH }
  cursor += marketH
  parts.pick = { y: cursor, h: pickH }
  cursor += pickH + gap
  parts.conf = { y: cursor, h: confH }
  if (confH) cursor += confH + 24
  parts.note = { y: cursor, h: noteH }

  const drawPart = (c: Ctx, part: Part, decoy: boolean) => {
    const box = parts[part]
    if (!box.h) return
    switch (part) {
      case 'market':
        drawLabel(c, decoy ? scramble(pred.market, 5) : pred.market || 'Mercado', w / 2, box.y + box.h * 0.4, { family: rc.font('$label'), size: Math.min(30, bodyH * 0.07), weight: 600, color: withAlpha(textC, 0.62), align: 'center', uppercase: true, letterSpacing: 5, maxWidth: w - pad * 2 })
        break
      case 'pick': {
        const pickText = decoy ? scramble(pred.pick) : pred.pick
        const style = { family: rc.font(el.headlineFont), size: Math.min(150, box.h * 0.85), weight: 400, italic: false, letterSpacing: 1, lineHeight: 0.95, uppercase: true }
        const lay = fitText(pickText, style, w - pad * 2, box.h, 28)
        c.save()
        c.translate(pad, box.y)
        drawLayout(c, lay, { ...style, size: lay.fontSize, letterSpacing: lay.letterSpacing }, { width: w - pad * 2, height: box.h, align: 'center', verticalAlign: 'middle', fill: textC, accent })
        c.restore()
        break
      }
      case 'conf': {
        const cw = w - pad * 2
        const pct = Math.max(0, Math.min(100, pred.confidence))
        // Locked teasers show a qualitative level instead of the exact number.
        const level = pct >= 70 ? 'ALTA' : pct >= 50 ? 'MEDIA' : 'MODERADA'
        drawLabel(c, 'CONFIANZA', pad, box.y + confLabel * 0.5, { family: rc.font('$label'), size: confLabel, weight: 700, color: withAlpha(textC, 0.6), letterSpacing: 3 })
        drawLabel(c, locked ? level : `${Math.round(pct)}%`, w - pad, box.y + confLabel * 0.5, { family: rc.font('$label'), size: confLabel, weight: 800, color: accent, align: 'right', letterSpacing: 2 })
        const by = box.y + confLabel * 1.8
        roundRect(c, pad, by, cw, 10, 5)
        c.fillStyle = 'rgba(255,255,255,0.1)'
        c.fill()
        roundRect(c, pad, by, (cw * (decoy ? 50 : pct)) / 100, 10, 5)
        c.fillStyle = accent
        c.fill()
        break
      }
      case 'note': {
        const style = noteStyle
        const lay = fitText(decoy ? noteSrc : pred.note, style, w - pad * 2, Math.max(box.h, bodyH * 0.2), 14)
        c.save()
        c.translate(pad, box.y)
        drawLayout(c, lay, { ...style, size: lay.fontSize }, { width: w - pad * 2, height: box.h, align: 'center', verticalAlign: 'top', fill: withAlpha(textC, 0.72), accent })
        c.restore()
      }
    }
  }
  for (const part of HIDE_ALL) if (!hidden.includes(part)) drawPart(ctx, part, false)

  if (!locked) {
    if (el.mode === 'revealed' && el.revealStamp) {
      ctx.save()
      ctx.translate(w - pad - 10, headH + 70)
      ctx.rotate(-0.12)
      const st = el.revealStamp.toUpperCase()
      const fs = Math.min(30, w * 0.035)
      const sw = labelWidth(st, { family: rc.font('$label'), size: fs, weight: 800, letterSpacing: 2 }) + fs * 2.6
      roundRect(ctx, -sw, -fs, sw, fs * 2, 8)
      ctx.strokeStyle = rc.color('$positive')
      ctx.lineWidth = 3
      ctx.stroke()
      ctx.fillStyle = withAlpha(rc.color('$positive'), 0.12)
      ctx.fill()
      paintIconGlyph(ctx, 'unlock', -sw + fs * 0.55, -fs * 0.5, fs, rc.color('$positive'), 2.6)
      drawLabel(ctx, st, -sw + fs * 1.85, 0, { family: rc.font('$label'), size: fs, weight: 800, color: rc.color('$positive'), letterSpacing: 2 })
      ctx.restore()
    }
    return
  }

  // ── Locked: hidden parts drawn offscreen with decoy text, blurred, frosted, locked.
  const present = hidden.filter((p) => parts[p].h > 0)
  if (!present.length) return
  const top = Math.min(...present.map((p) => parts[p].y))
  const bottom = Math.max(...present.map((p) => parts[p].y + parts[p].h))
  // The veil's padding never covers the visible parts around it (e.g. the market label).
  const shown = HIDE_ALL.filter((p) => !hidden.includes(p) && parts[p].h > 0)
  const regionY = Math.max(top - 14, ...shown.filter((p) => parts[p].y < top).map((p) => parts[p].y + parts[p].h))
  const regionBottom = Math.min(bottom + 14, ...shown.filter((p) => parts[p].y >= bottom).map((p) => parts[p].y))
  const regionH = regionBottom - regionY
  const s = deviceScale(ctx)
  const off = makeCanvas(w * s, (regionH + 40) * s)
  const octx = off.getContext('2d')!
  octx.scale(s, s)
  octx.translate(0, -regionY + 20)
  for (const part of hidden) drawPart(octx, part, true)
  // Same floor as the editorial design: the decoy text is never legible.
  const blurred = blurredCopy(off, Math.max(24, el.blurIntensity) * s)
  const bp = (blurred.width - off.width) / 2 / s
  ctx.save()
  roundRect(ctx, pad * 0.5, regionY, w - pad, regionH, Math.min(26, r))
  ctx.clip()
  ctx.fillStyle = withAlpha(mix(cardC, '#000000', 0.15), 0.6)
  ctx.fillRect(0, regionY, w, regionH)
  ctx.drawImage(blurred, -bp, regionY - 20 - bp, w + bp * 2, regionH + 40 + bp * 2)
  ctx.fillStyle = withAlpha('#08090B', el.overlayOpacity)
  ctx.fillRect(0, regionY, w, regionH)
  ctx.globalAlpha *= 0.22
  ctx.globalCompositeOperation = 'overlay'
  const pat = ctx.createPattern(grainTexture(128, 21, 1), 'repeat')
  if (pat) {
    ctx.fillStyle = pat
    ctx.fillRect(0, regionY, w, regionH)
  }
  ctx.restore()
  roundRect(ctx, pad * 0.5, regionY, w - pad, regionH, Math.min(26, r))
  ctx.strokeStyle = 'rgba(255,255,255,0.12)'
  ctx.lineWidth = 1.5
  ctx.stroke()
  const ts = el.teaser ? Math.min(34, w * 0.042) : 0
  const lockSize = Math.min(150, (regionH - ts * 3) * 0.62, w * 0.2)
  const block = lockSize + (ts ? ts * 2.4 : 0)
  const lcy = regionY + (regionH - block) / 2 + lockSize / 2
  drawLock(ctx, el.lockStyle, w / 2, lcy, lockSize, accent)
  if (el.teaser) drawLabel(ctx, rc.text(el.teaser), w / 2, lcy + lockSize / 2 + ts * 1.5, { family: rc.font('$label'), size: ts, weight: 700, color: textC, align: 'center', uppercase: true, letterSpacing: 3, maxWidth: w - pad * 2 })
}

function paintCrestOffset(ctx: Ctx, rc: RenderCtx, side: 'home' | 'away', x: number, y: number, size: number) {
  ctx.save()
  ctx.translate(x, y)
  paintCrestBox(ctx, side === 'home' ? rc.match.home : rc.match.away, size, size, rc)
  ctx.restore()
}

/** Solid, flat padlock (no medallion, no glow). */
export function drawSolidLock(ctx: Ctx, cx: number, cy: number, size: number, color: string, hole: string) {
  const bw = size * 0.78
  const bh = size * 0.6
  const bx = cx - bw / 2
  const by = cy - size / 2 + size * 0.4
  const sw = size * 0.13
  const r = bw * 0.32
  ctx.save()
  ctx.beginPath()
  ctx.moveTo(cx - r, by + 1)
  ctx.lineTo(cx - r, cy - size / 2 + r + sw / 2)
  ctx.arc(cx, cy - size / 2 + r + sw / 2, r, Math.PI, 0)
  ctx.lineTo(cx + r, by + 1)
  ctx.strokeStyle = color
  ctx.lineWidth = sw
  ctx.lineCap = 'butt'
  ctx.stroke()
  roundRect(ctx, bx, by, bw, bh, size * 0.08)
  ctx.fillStyle = color
  ctx.fill()
  ellipsePath(ctx, cx, by + bh * 0.42, size * 0.075, size * 0.075)
  ctx.fillStyle = hole
  ctx.fill()
  ctx.fillRect(cx - size * 0.03, by + bh * 0.42, size * 0.06, bh * 0.3)
  ctx.restore()
}

/**
 * GOAT EDITORIAL prediction: no card, no header, no pills, no gauges.
 * A muted market label and the pick as the hero. Locked mode blurs decoy
 * text in place and puts one solid lock on it.
 */
function paintPredictionEditorial(ctx: Ctx, el: PredictionElement, rc: RenderCtx) {
  const { width: w, height: h } = el
  const pred = rc.match.predictions[el.predictionIndex] ?? rc.match.predictions[0]
  if (!pred) return
  const accent = rc.color(el.accentColor)
  const textC = rc.color(el.textColor)
  const muted = rc.color('$muted')
  const locked = el.mode === 'locked'
  const labelFont = rc.font('$label')
  const headFont = rc.font(el.headlineFont)
  type Part = 'stamp' | 'market' | 'pick' | 'conf' | 'note'
  // Natural sizes at full scale (1080 wide story), shrunk below if needed.
  const stampS = el.mode === 'revealed' && el.revealStamp ? 46 : 0
  const marketS = 44
  const pickS = Math.min(170, w * 0.182)
  const confS = el.showConfidence ? 50 : 0
  const noteStyle = { family: rc.font('$body'), size: 44, weight: 500, italic: false, letterSpacing: 0, lineHeight: 1.25, uppercase: false }
  const hidden = hiddenParts(el)
  // Hidden parts are laid out from their decoys: the layout (sizes, positions,
  // the veil and the lock) is the same whatever the real pick or note says.
  const pickText = hidden.includes('pick') ? scramble(pred.pick) : pred.pick || 'Pronóstico'
  // Leading leaves room for Spanish accents on two-line picks (MÁS, Á…).
  const pickStyle = { family: headFont, size: pickS, weight: 400, italic: false, letterSpacing: 0, lineHeight: 1.04, uppercase: true }
  const pickLay = fitText(pickText, pickStyle, w, pickS * 2.15, 40)
  const noteLay = el.showNote && pred.note ? fitText(hidden.includes('note') ? scramble(pred.note, 29) : pred.note, noteStyle, w, 44 * 1.25 * 3, 28) : null
  const capOf = (f: string, s: number, wt = 400) => capHeightOf(f, s, wt, false)
  const heights: Record<Part, number> = {
    stamp: stampS ? capOf(labelFont, stampS, 700) : 0,
    market: capOf(labelFont, marketS, 600),
    pick: pickLay.height,
    conf: confS ? capOf(rc.font('$body'), confS, 600) : 0,
    note: noteLay ? noteLay.height : 0,
  }
  const gaps: Record<Part, number> = { stamp: 30, market: 34, pick: 60, conf: 40, note: 0 }
  const order: Part[] = ['stamp', 'market', 'pick', 'conf', 'note']
  const used = order.filter((p) => heights[p] > 0)
  let total = used.reduce((a, p, i) => a + heights[p] + (i < used.length - 1 ? gaps[p] : 0), 0)
  const k = total > h ? h / total : 1
  total *= k
  const box: Record<Part, { y: number; h: number }> = {} as Record<Part, { y: number; h: number }>
  let y = (h - total) / 2
  for (const p of order) {
    box[p] = { y, h: heights[p] * k }
    if (heights[p] > 0) y += (heights[p] + gaps[p]) * k
  }
  const cx = w / 2
  const draw = (c: Ctx, part: Part, decoy: boolean) => {
    const b = box[part]
    if (!b.h) return
    switch (part) {
      case 'stamp':
        drawLabel(c, el.revealStamp, cx, b.y, { family: labelFont, size: stampS * k, weight: 700, color: accent, align: 'center', baseline: 'top', uppercase: true, maxWidth: w })
        break
      case 'market':
        drawLabel(c, decoy ? scramble(pred.market, 5) : pred.market || 'Mercado', cx, b.y, { family: labelFont, size: Math.max(Math.min(32, marketS), marketS * k), weight: 600, color: muted, align: 'center', baseline: 'top', uppercase: true, maxWidth: w })
        break
      case 'pick': {
        const lay = pickLay
        c.save()
        c.translate((w * (1 - k)) / 2, b.y)
        c.scale(k, k)
        drawLayout(c, lay, { ...pickStyle, size: lay.fontSize, letterSpacing: lay.letterSpacing }, { width: w, height: heights.pick, align: 'center', verticalAlign: 'middle', fill: textC, accent })
        c.restore()
        break
      }
      case 'conf': {
        const pct = Math.max(0, Math.min(100, pred.confidence))
        const level = pct >= 70 ? 'alta' : pct >= 50 ? 'media' : 'moderada'
        drawLabel(c, locked ? `Confianza ${level}` : `${Math.round(pct)}% de confianza`, cx, b.y, { family: rc.font('$body'), size: confS * k, weight: 600, color: muted, align: 'center', baseline: 'top', maxWidth: w })
        break
      }
      case 'note': {
        const lay = noteLay!
        c.save()
        c.translate((w * (1 - k)) / 2, b.y)
        c.scale(k, k)
        drawLayout(c, lay, { ...noteStyle, size: lay.fontSize }, { width: w, height: heights.note, align: 'center', verticalAlign: 'top', fill: muted, accent })
        c.restore()
      }
    }
  }
  for (const part of order) if (!hidden.includes(part as HidePart)) draw(ctx, part, false)
  if (!locked) return
  const present = hidden.filter((p) => box[p] && box[p].h > 0)
  if (!present.length) return
  const regionY = Math.min(...present.map((p) => box[p].y)) - 30
  const regionBottom = Math.max(...present.map((p) => box[p].y + box[p].h)) + 30
  const regionH = regionBottom - regionY
  const s = deviceScale(ctx)
  // Strong obscuration: decoy text, smeared horizontally, then a heavy blur.
  const blur = Math.max(24, el.blurIntensity)
  const pad = Math.max(30, blur * 2.2)
  const off = makeCanvas((w + pad * 2) * s, (regionH + pad * 2) * s)
  const octx = off.getContext('2d')!
  octx.scale(s, s)
  octx.translate(pad, -regionY + pad)
  for (const dx of [-w * 0.035, 0, w * 0.035]) {
    octx.save()
    octx.globalAlpha = dx === 0 ? 1 : 0.55
    octx.translate(dx, 0)
    for (const part of hidden) draw(octx, part, true)
    octx.restore()
  }
  const blurred = blurredCopy(off, blur * s)
  const bp = (blurred.width - off.width) / 2 / s
  ctx.save()
  ctx.globalAlpha *= Math.max(0.3, 1 - el.overlayOpacity * 0.55)
  ctx.drawImage(blurred, -pad - bp, regionY - pad - bp, w + pad * 2 + bp * 2, regionH + pad * 2 + bp * 2)
  ctx.restore()
  if (el.frost !== false) {
    // Frosted veil: a soft elliptical light that fades out in every direction.
    ctx.save()
    const fcx = w / 2
    const fcy = regionY + regionH / 2
    const rx = w * 0.62
    const ry = regionH * 0.72
    ctx.translate(fcx, fcy)
    ctx.scale(1, ry / rx)
    const fg = ctx.createRadialGradient(0, 0, 0, 0, 0, rx)
    fg.addColorStop(0, 'rgba(255,255,255,0.07)')
    fg.addColorStop(0.6, 'rgba(255,255,255,0.035)')
    fg.addColorStop(1, 'rgba(255,255,255,0)')
    ctx.fillStyle = fg
    ctx.fillRect(-rx, -rx, rx * 2, rx * 2)
    ctx.restore()
  }
  if (el.lockStyle !== 'none') {
    const ts = el.teaser ? Math.min(46, w * 0.045) : 0
    const lockSize = Math.min(170, regionH * 0.5, w * 0.18)
    const blockH = lockSize + (ts ? ts * 2 : 0)
    const lcy = regionY + (regionH - blockH) / 2 + lockSize / 2
    const glow = el.lockGlow ?? 0
    if (glow > 0) {
      const gr = ctx.createRadialGradient(cx, lcy, 0, cx, lcy, lockSize * 1.7)
      gr.addColorStop(0, withAlpha(accent, 0.38 * glow))
      gr.addColorStop(0.5, withAlpha(accent, 0.12 * glow))
      gr.addColorStop(1, withAlpha(accent, 0))
      ctx.fillStyle = gr
      ctx.fillRect(cx - lockSize * 1.7, lcy - lockSize * 1.7, lockSize * 3.4, lockSize * 3.4)
    }
    if (el.lockStyle === 'padlock') drawSolidLock(ctx, cx, lcy, lockSize, accent, rc.color('$bg'))
    else {
      const icon = el.lockStyle === 'shield' ? 'shield' : 'key'
      paintIconGlyph(ctx, icon, cx - lockSize / 2, lcy - lockSize / 2, lockSize, accent, 2.6)
    }
    if (ts) drawLabel(ctx, rc.text(el.teaser), cx, lcy + lockSize / 2 + ts * 0.9, { family: labelFont, size: ts, weight: 700, color: textC, align: 'center', baseline: 'top', uppercase: true, maxWidth: w })
  }
}
