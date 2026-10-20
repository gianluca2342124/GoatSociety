import type { FormResult, FormRowElement, ProgressRingElement, StatBarsElement, StatNumberElement, StatRow, TableElement } from '../../model/types'
import { computeBars, formatNumber, globalMaxOf } from '../../model/stats'
import { luminance, mix, parseColor, visibleOnDark, withAlpha } from '../../model/tokens'
import type { RenderCtx } from '../context'
import { clearShadow, ellipsePath, roundRect, setShadow, type Ctx } from '../paint/canvas'
import { drawLabel } from '../text/draw'
import { capHeightOf, fitText } from '../text/layout'
import { drawLayout } from '../text/draw'
import { paintCrestBox } from './crest'

function colorDistance(a: string, b: string): number {
  const x = parseColor(a)
  const y = parseColor(b)
  return Math.hypot(x.r - y.r, x.g - y.g, x.b - y.b)
}

/** Ensure home/away colors are visible on dark and distinguishable from each other. */
export function teamColors(rc: RenderCtx, home: string, away: string): [string, string] {
  let h = visibleOnDark(rc.color(home), 0.05)
  let a = visibleOnDark(rc.color(away), 0.05)
  if (colorDistance(h, a) < 90) {
    const alt = visibleOnDark(rc.match.away.secondary, 0.05)
    a = colorDistance(h, alt) >= 90 ? alt : '#F3F0E8'
  }
  // Very light colors (white kits) read as ivory, keep them slightly warm.
  if (luminance(h) > 0.85) h = mix(h, '#CBAA62', 0.15)
  if (luminance(a) > 0.85) a = mix(a, '#CBAA62', 0.15)
  return [h, a]
}

export function statRowsFor(el: StatBarsElement, rc: RenderCtx): StatRow[] {
  let rows: StatRow[]
  if (el.source === 'match') {
    rows = el.statIds.length ? el.statIds.map((id) => rc.match.stats.find((s) => s.id === id)).filter((r): r is StatRow => !!r) : rc.match.stats
  } else rows = el.rows
  return rows.slice(0, Math.max(1, el.maxRows))
}

export function paintStatBars(ctx: Ctx, el: StatBarsElement, rc: RenderCtx) {
  const rows = statRowsFor(el, rc)
  const { width: w } = el
  let h = el.height
  if (!rows.length) return
  if (el.style === 'editorial') {
    paintEditorialBars(ctx, el, rc, rows)
    return
  }
  const [homeC, awayC] = teamColors(rc, el.homeColor, el.awayColor)
  const labelFont = rc.font(el.labelFont)
  const valueFont = rc.font(el.valueFont)
  const track = withAlpha(rc.color(el.trackColor), 0.14)
  const labelColor = rc.color(el.labelColor)
  const valueColor = rc.color(el.valueColor)
  const gmax = globalMaxOf(rows)
  let top = 0

  if (el.showCrests) {
    const ch = Math.min(110, h * 0.16)
    paintCrestBox(ctx, { ...rc.match.home }, ch, ch, rc)
    ctx.save()
    ctx.translate(w - ch, 0)
    paintCrestBox(ctx, { ...rc.match.away }, ch, ch, rc)
    ctx.restore()
    drawLabel(ctx, rc.match.home.shortName || rc.match.home.name, ch + 18, ch / 2, { family: labelFont, size: Math.min(34, ch * 0.32), weight: 700, color: valueColor, uppercase: true, letterSpacing: 1.5, maxWidth: w / 2 - ch - 30 })
    drawLabel(ctx, rc.match.away.shortName || rc.match.away.name, w - ch - 18, ch / 2, { family: labelFont, size: Math.min(34, ch * 0.32), weight: 700, color: valueColor, uppercase: true, letterSpacing: 1.5, align: 'right', maxWidth: w / 2 - ch - 30 })
    top = ch + Math.max(24, el.rowGap)
    h -= top
  }

  const n = rows.length
  if (n === 1 && el.style === 'split') {
    paintMetricCard(ctx, el, rc, rows[0], top, w, h, homeC, awayC, labelFont, valueFont, labelColor, valueColor, gmax)
    return
  }
  const rowH = (h - el.rowGap * (n - 1)) / n
  const barH = Math.min(el.barHeight, rowH * 0.3)
  const valueSize = Math.min(el.valueSize, rowH * (el.style === 'stacked' ? 0.3 : 0.52))
  const labelSize = Math.min(el.labelSize, rowH * 0.24)
  const sep = el.decimalSeparator

  rows.forEach((row, i) => {
    const y = top + i * (rowH + el.rowGap)
    const bars = computeBars(row, el.scaleMode, el.fixedMax, gmax)
    const hv = formatNumber(row.home, row.decimals, sep, row.unit)
    const av = formatNumber(row.away, row.decimals, sep, row.unit)
    const homeLead = bars.leader === 'home'
    const awayLead = bars.leader === 'away'
    const dim = (lead: boolean) => (el.highlightLeader && bars.leader !== 'tie' && bars.leader !== 'none' && !lead ? 0.55 : 1)

    if (el.style === 'stacked') {
      // Label, then home bar + value, then away bar + value.
      drawLabel(ctx, row.label, 0, y + labelSize * 0.6, { family: labelFont, size: labelSize, weight: 600, color: labelColor, uppercase: true, letterSpacing: labelSize * 0.12, maxWidth: w })
      const vw = Math.max(valueSize * 2.6, w * 0.16)
      const bw = w - vw - 16
      const lineH = (rowH - labelSize * 1.6) / 2
      ;[
        { r: bars.home, c: homeC, v: hv, lead: homeLead },
        { r: bars.away, c: awayC, v: av, lead: awayLead },
      ].forEach((b, k) => {
        const by = y + labelSize * 1.6 + k * lineH + lineH / 2
        roundRect(ctx, 0, by - barH / 2, bw, barH, barH / 2)
        ctx.fillStyle = track
        ctx.fill()
        const len = Math.max(b.r > 0 ? barH : 0, bw * b.r)
        if (len > 0) {
          ctx.save()
          ctx.globalAlpha *= dim(b.lead)
          if (b.lead && el.highlightLeader) setShadow(ctx, withAlpha(b.c, 0.7), barH * 1.4)
          const g = ctx.createLinearGradient(0, 0, len, 0)
          g.addColorStop(0, withAlpha(b.c, 0.65))
          g.addColorStop(1, b.c)
          roundRect(ctx, 0, by - barH / 2, len, barH, barH / 2)
          ctx.fillStyle = g
          ctx.fill()
          ctx.restore()
        }
        ctx.save()
        ctx.globalAlpha *= dim(b.lead)
        drawLabel(ctx, b.v, w, by, { family: valueFont, size: valueSize, weight: 800, color: valueColor, align: 'right', maxWidth: vw })
        ctx.restore()
      })
      return
    }

    // Header line: values + label
    const valueY = y + valueSize * 0.55
    ctx.save()
    ctx.globalAlpha *= dim(homeLead)
    drawLabel(ctx, hv, 0, valueY, { family: valueFont, size: valueSize, weight: 800, color: homeLead && el.highlightLeader ? valueColor : valueColor, maxWidth: w * 0.28 })
    ctx.restore()
    ctx.save()
    ctx.globalAlpha *= dim(awayLead)
    drawLabel(ctx, av, w, valueY, { family: valueFont, size: valueSize, weight: 800, color: valueColor, align: 'right', maxWidth: w * 0.28 })
    ctx.restore()
    drawLabel(ctx, row.label, w / 2, valueY, { family: labelFont, size: labelSize, weight: 600, color: labelColor, align: 'center', uppercase: true, letterSpacing: labelSize * 0.14, maxWidth: w * 0.42 })

    const by = y + rowH - barH / 2 - Math.max(2, rowH * 0.06)
    if (el.style === 'split') {
      const gap = 6
      const total = w - gap
      const hw = total * bars.homeShare
      const neutral = !bars.homeValid && !bars.awayValid
      ctx.save()
      ctx.globalAlpha *= neutral ? 0.3 : dim(homeLead)
      roundRect(ctx, 0, by - barH / 2, Math.max(0, hw), barH, [barH / 2, 2, 2, barH / 2])
      ctx.fillStyle = homeC
      ctx.fill()
      ctx.restore()
      ctx.save()
      ctx.globalAlpha *= neutral ? 0.3 : dim(awayLead)
      roundRect(ctx, hw + gap, by - barH / 2, Math.max(0, total - hw), barH, [2, barH / 2, barH / 2, 2])
      ctx.fillStyle = awayC
      ctx.fill()
      ctx.restore()
      return
    }

    // Dual: bars grow outward from the center.
    const gap = Math.max(6, w * 0.012)
    const half = (w - gap) / 2
    roundRect(ctx, 0, by - barH / 2, half, barH, barH / 2)
    ctx.fillStyle = track
    ctx.fill()
    roundRect(ctx, half + gap, by - barH / 2, half, barH, barH / 2)
    ctx.fill()
    const hl = half * bars.home
    const al = half * bars.away
    if (hl > 0) {
      ctx.save()
      ctx.globalAlpha *= dim(homeLead)
      if (homeLead && el.highlightLeader) setShadow(ctx, withAlpha(homeC, 0.75), barH * 1.6)
      const g = ctx.createLinearGradient(half, 0, half - hl, 0)
      g.addColorStop(0, withAlpha(homeC, 0.7))
      g.addColorStop(1, homeC)
      roundRect(ctx, half - hl, by - barH / 2, hl, barH, barH / 2)
      ctx.fillStyle = g
      ctx.fill()
      ctx.restore()
    }
    if (al > 0) {
      ctx.save()
      ctx.globalAlpha *= dim(awayLead)
      if (awayLead && el.highlightLeader) setShadow(ctx, withAlpha(awayC, 0.75), barH * 1.6)
      const g = ctx.createLinearGradient(half + gap, 0, half + gap + al, 0)
      g.addColorStop(0, withAlpha(awayC, 0.7))
      g.addColorStop(1, awayC)
      roundRect(ctx, half + gap, by - barH / 2, al, barH, barH / 2)
      ctx.fillStyle = g
      ctx.fill()
      ctx.restore()
    }
  })
  clearShadow(ctx)
}

// ── GOAT EDITORIAL comparison ───────────────────────────────────────────────
// Two huge numbers per row and one thick, flat, proportional split bar.
// colorMode 'leader' (default): the leading side carries the slide accent,
// the other side stays neutral. 'teams' uses the (legible) team colors.
const NEUTRAL_BAR = '#3A3A3A'
const EMPTY_BAR = '#242424'

function editorialColors(el: StatBarsElement, rc: RenderCtx, leader: 'home' | 'away' | 'tie' | 'none') {
  const valueC = rc.color(el.valueColor)
  const mutedC = rc.color(el.labelColor)
  if ((el.colorMode ?? 'leader') === 'teams') {
    const [h, a] = teamColors(rc, el.homeColor, el.awayColor)
    return { homeBar: h, awayBar: a, homeText: valueC, awayText: valueC }
  }
  const accent = rc.color(el.accentColor ?? '$accent')
  if (leader === 'home') return { homeBar: accent, awayBar: NEUTRAL_BAR, homeText: valueC, awayText: mutedC }
  if (leader === 'away') return { homeBar: NEUTRAL_BAR, awayBar: accent, homeText: mutedC, awayText: valueC }
  return { homeBar: '#8A8A8A', awayBar: '#8A8A8A', homeText: valueC, awayText: valueC }
}

export function paintEditorialBars(ctx: Ctx, el: StatBarsElement, rc: RenderCtx, rows: StatRow[]) {
  const { width: w } = el
  let h = el.height
  const labelFont = rc.font(el.labelFont)
  const valueFont = rc.font(el.valueFont)
  const labelColor = rc.color(el.labelColor)
  const textColor = rc.color(el.valueColor)
  const gmax = globalMaxOf(rows)
  const sep = el.decimalSeparator
  let top = 0
  if (el.showCrests) {
    const cs = Math.min(120, h * 0.16)
    paintCrestBox(ctx, { ...rc.match.home }, cs, cs, rc)
    ctx.save()
    ctx.translate(w - cs, 0)
    paintCrestBox(ctx, { ...rc.match.away }, cs, cs, rc)
    ctx.restore()
    const ns = Math.min(46, cs * 0.4)
    drawLabel(ctx, rc.match.home.shortName || rc.match.home.name, cs + 22, cs / 2, { family: labelFont, size: ns, weight: 700, color: textColor, uppercase: true, maxWidth: w / 2 - cs - 34 })
    drawLabel(ctx, rc.match.away.shortName || rc.match.away.name, w - cs - 22, cs / 2, { family: labelFont, size: ns, weight: 700, color: textColor, uppercase: true, align: 'right', maxWidth: w / 2 - cs - 34 })
    top = cs + Math.max(36, el.rowGap)
    h -= top
  }
  const n = rows.length
  const single = n === 1
  const rowH = (h - el.rowGap * (n - 1)) / n
  const barH = Math.max(6, Math.min(el.barHeight, rowH * 0.18))
  const labelSize = Math.min(el.labelSize, rowH * (single ? 0.16 : 0.22))
  const labelBlock = single ? labelSize * 1.9 : 0
  const gapVB = Math.max(12, rowH * 0.08)
  const capK = capHeightOf(valueFont, 100, 400, false) / 100 || 0.72
  const valueSize = Math.max(10, Math.min(el.valueSize, (rowH - labelBlock - barH - gapVB) / capK))
  const cap = valueSize * capK
  rows.forEach((row, i) => {
    const y = top + i * (rowH + el.rowGap)
    const bars = computeBars(row, el.scaleMode, el.fixedMax, gmax)
    const col = editorialColors(el, rc, bars.leader)
    const hv = formatNumber(row.home, row.decimals, sep, row.unit)
    const av = formatNumber(row.away, row.decimals, sep, row.unit)
    // Center the row block vertically inside its slot.
    const block = labelBlock + cap + gapVB + barH
    const y0 = y + Math.max(0, (rowH - block) / 2)
    if (single) drawLabel(ctx, row.label, w / 2, y0, { family: labelFont, size: labelSize, weight: 600, color: labelColor, align: 'center', baseline: 'top', uppercase: true, letterSpacing: labelSize * 0.04, maxWidth: w })
    const vy = y0 + labelBlock
    const valueMax = single ? w * 0.48 : w * 0.3
    drawLabel(ctx, hv, 0, vy, { family: valueFont, size: valueSize, color: col.homeText, baseline: 'top', maxWidth: valueMax })
    drawLabel(ctx, av, w, vy, { family: valueFont, size: valueSize, color: col.awayText, align: 'right', baseline: 'top', maxWidth: valueMax })
    if (!single) drawLabel(ctx, row.label, w / 2, vy + cap / 2, { family: labelFont, size: labelSize, weight: 600, color: labelColor, align: 'center', uppercase: true, letterSpacing: labelSize * 0.04, maxWidth: w * 0.38 })
    const by = vy + cap + gapVB
    const gap = Math.max(4, barH * 0.35)
    const total = w - gap
    const neutral = !bars.homeValid && !bars.awayValid
    const hw = neutral ? total / 2 : total * bars.homeShare
    const r = Math.min(4, barH / 2)
    if (hw > 0.5) {
      roundRect(ctx, 0, by, hw, barH, r)
      ctx.fillStyle = neutral ? EMPTY_BAR : col.homeBar
      ctx.fill()
    }
    if (total - hw > 0.5) {
      roundRect(ctx, hw + gap, by, total - hw, barH, r)
      ctx.fillStyle = neutral ? EMPTY_BAR : col.awayBar
      ctx.fill()
    }
  })
}

/** Single metric presented as a card: label on top, big values, split bar. */
function paintMetricCard(ctx: Ctx, el: StatBarsElement, _rc: RenderCtx, row: StatRow, top: number, w: number, h: number, homeC: string, awayC: string, labelFont: string, valueFont: string, labelColor: string, valueColor: string, gmax: number) {
  const bars = computeBars(row, el.scaleMode, el.fixedMax, gmax)
  const labelSize = Math.min(el.labelSize, h * 0.12)
  drawLabel(ctx, row.label, w / 2, top + labelSize * 0.7, { family: labelFont, size: labelSize, weight: 700, color: labelColor, align: 'center', uppercase: true, letterSpacing: labelSize * 0.16, maxWidth: w })
  const barH = Math.min(el.barHeight, h * 0.08)
  const barY = top + h - barH
  const valueSize = Math.min(el.valueSize, (barY - top - labelSize * 1.6) * 0.8)
  const vy = top + labelSize * 1.5 + (barY - top - labelSize * 1.5) / 2
  const dim = (lead: boolean) => (el.highlightLeader && (bars.leader === 'home' || bars.leader === 'away') && !lead ? 0.5 : 1)
  ctx.save()
  ctx.globalAlpha *= dim(bars.leader === 'home')
  drawLabel(ctx, formatNumber(row.home, row.decimals, el.decimalSeparator, row.unit), 0, vy, { family: valueFont, size: valueSize, weight: 800, color: valueColor, maxWidth: w * 0.46 })
  ctx.restore()
  ctx.save()
  ctx.globalAlpha *= dim(bars.leader === 'away')
  drawLabel(ctx, formatNumber(row.away, row.decimals, el.decimalSeparator, row.unit), w, vy, { family: valueFont, size: valueSize, weight: 800, color: valueColor, align: 'right', maxWidth: w * 0.46 })
  ctx.restore()
  const gap = 6
  const total = w - gap
  const hw = total * bars.homeShare
  const neutral = !bars.homeValid && !bars.awayValid
  ctx.save()
  ctx.globalAlpha *= neutral ? 0.3 : dim(bars.leader === 'home')
  roundRect(ctx, 0, barY, Math.max(0, hw), barH, [barH / 2, 2, 2, barH / 2])
  ctx.fillStyle = homeC
  ctx.fill()
  ctx.restore()
  ctx.save()
  ctx.globalAlpha *= neutral ? 0.3 : dim(bars.leader === 'away')
  roundRect(ctx, hw + gap, barY, Math.max(0, total - hw), barH, [2, barH / 2, barH / 2, 2])
  ctx.fillStyle = awayC
  ctx.fill()
  ctx.restore()
}

export function paintStatNumber(ctx: Ctx, el: StatNumberElement, rc: RenderCtx) {
  const { width: w, height: h } = el
  const valueFont = rc.font(el.valueFont)
  const valueColor = rc.color(el.valueColor)
  const accent = rc.color(el.accentColor)
  const labelColor = rc.color(el.labelColor)
  const textColor = rc.color(el.textColor)
  const value = `${el.prefix}${rc.text(el.value)}${el.suffix}`
  const pad = el.layout === 'card' ? Math.min(48, w * 0.07) : 0
  if (el.layout === 'card') {
    roundRect(ctx, 0, 0, w, h, Math.min(28, h * 0.12))
    ctx.fillStyle = withAlpha(rc.color(el.cardFill), el.cardOpacity)
    ctx.fill()
    ctx.strokeStyle = withAlpha(accent, 0.35)
    ctx.lineWidth = 1.5
    ctx.stroke()
    roundRect(ctx, 0, h * 0.18, 5, h * 0.64, 3)
    ctx.fillStyle = accent
    ctx.fill()
  }
  if (el.layout === 'hero') {
    paintHeroNumber(ctx, el, rc, value)
    return
  }
  const iw = w - pad * 2
  const ih = h - pad * 2
  ctx.save()
  ctx.translate(pad, pad)
  if (el.layout === 'inline') {
    const vw = iw * 0.42
    const size = Math.min(el.valueSize, ih)
    drawLabel(ctx, value, el.align === 'center' ? vw / 2 : 0, ih / 2, { family: valueFont, size, weight: 400, color: valueColor, align: el.align === 'center' ? 'center' : 'left', maxWidth: vw })
    const tx = vw + iw * 0.04
    ctx.fillStyle = accent
    ctx.fillRect(tx - iw * 0.02, ih * 0.15, 3, ih * 0.7)
    const labelSize = Math.min(34, ih * 0.22)
    drawLabel(ctx, rc.text(el.label), tx + 10, ih * 0.32, { family: rc.font('$label'), size: labelSize, weight: 700, color: labelColor, uppercase: true, letterSpacing: 2, maxWidth: iw - tx - 10 })
    const desc = rc.text(el.description)
    if (desc) {
      const style = { family: rc.font('$body'), size: Math.min(28, ih * 0.17), weight: 500, italic: false, letterSpacing: 0, lineHeight: 1.25, uppercase: false }
      const lay = fitText(desc, style, iw - tx - 10, ih * 0.5, 12)
      ctx.save()
      ctx.translate(tx + 10, ih * 0.46)
      drawLayout(ctx, lay, { ...style, size: lay.fontSize }, { width: iw - tx - 10, height: ih * 0.5, align: 'left', verticalAlign: 'top', fill: textColor, accent })
      ctx.restore()
    }
    ctx.restore()
    return
  }
  // stacked / card
  const align = el.align === 'center' ? 'center' : 'left'
  const ax = align === 'center' ? iw / 2 : 0
  const label = rc.text(el.label)
  const desc = rc.text(el.description)
  const valueSize = Math.min(el.valueSize, ih * (desc ? 0.55 : 0.7))
  drawLabel(ctx, value, ax, valueSize * 0.5, { family: valueFont, size: valueSize, weight: 400, color: valueColor, align, maxWidth: iw })
  let y = valueSize + Math.max(10, valueSize * 0.12)
  if (label) {
    const ls = Math.min(40, Math.max(18, valueSize * 0.2))
    drawLabel(ctx, label, ax, y + ls * 0.5, { family: rc.font('$label'), size: ls, weight: 700, color: labelColor === valueColor ? accent : labelColor, align, uppercase: true, letterSpacing: ls * 0.12, maxWidth: iw })
    y += ls * 1.5
  }
  if (desc) {
    const style = { family: rc.font('$body'), size: Math.min(30, Math.max(16, valueSize * 0.16)), weight: 500, italic: false, letterSpacing: 0, lineHeight: 1.3, uppercase: false }
    const lay = fitText(desc, style, iw, Math.max(10, ih - y), 12)
    ctx.save()
    ctx.translate(0, y)
    drawLayout(ctx, lay, { ...style, size: lay.fontSize }, { width: iw, height: Math.max(10, ih - y), align, verticalAlign: 'top', fill: textColor, accent })
    ctx.restore()
  }
  ctx.restore()
}

/** GOAT EDITORIAL single dominant stat: giant number, large label, short support line. */
function paintHeroNumber(ctx: Ctx, el: StatNumberElement, rc: RenderCtx, value: string) {
  const { width: w, height: h } = el
  const align = el.align ?? 'left'
  const ax = align === 'center' ? w / 2 : align === 'right' ? w : 0
  const valueFont = rc.font(el.valueFont)
  const label = rc.text(el.label)
  const desc = rc.text(el.description)
  const capK = capHeightOf(valueFont, 100, 400, false) / 100 || 0.72
  // Reserve room for the label and support line, then size the number.
  const labelSize0 = Math.max(40, Math.min(85, el.valueSize * 0.3))
  const descSize0 = Math.max(36, Math.min(52, el.valueSize * 0.2))
  const reserve = (label ? labelSize0 * 1.45 : 0) + (desc ? descSize0 * 2.9 : 0)
  const valueSize = Math.max(20, Math.min(el.valueSize, (h - reserve) / capK, h / capK))
  const k = valueSize / Math.max(1, el.valueSize)
  const labelSize = Math.max(28, labelSize0 * Math.min(1, k * 1.2))
  const descSize = Math.max(26, descSize0 * Math.min(1, k * 1.2))
  const cap = valueSize * capK
  drawLabel(ctx, value, ax, 0, { family: valueFont, size: valueSize, color: rc.color(el.valueColor), align, baseline: 'top', maxWidth: w })
  let y = cap + Math.max(18, valueSize * 0.12)
  if (label) {
    drawLabel(ctx, label, ax, y, { family: rc.font('$label'), size: labelSize, weight: 700, color: rc.color(el.labelColor), align, baseline: 'top', uppercase: true, letterSpacing: labelSize * 0.01, maxWidth: w })
    y += capHeightOf(rc.font('$label'), labelSize, 700, false) + Math.max(16, labelSize * 0.42)
  }
  if (desc) {
    const style = { family: rc.font('$body'), size: descSize, weight: 500, italic: false, letterSpacing: 0, lineHeight: 1.22, uppercase: false }
    const room = Math.max(10, h - y)
    const lay = fitText(desc, style, w, room, 18)
    ctx.save()
    ctx.translate(0, y)
    drawLayout(ctx, lay, { ...style, size: lay.fontSize }, { width: w, height: room, align, verticalAlign: 'top', fill: rc.color(el.textColor), accent: rc.color(el.accentColor) })
    ctx.restore()
  }
}

export function paintProgressRing(ctx: Ctx, el: ProgressRingElement, rc: RenderCtx) {
  const { width: w, height: h } = el
  const labelSpace = el.label ? Math.min(h * 0.22, 70) : 0
  const size = Math.min(w, h - labelSpace)
  const cx = w / 2
  const cy = size / 2
  const r = size / 2 - el.thickness / 2 - 4
  const max = el.max > 0 ? el.max : 100
  const ratio = Number.isFinite(el.value) ? Math.max(0, Math.min(1, el.value / max)) : 0
  const color = rc.color(el.color)
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.arc(cx, cy, r, 0, Math.PI * 2)
  ctx.strokeStyle = withAlpha(rc.color(el.trackColor), 0.16)
  ctx.lineWidth = el.thickness
  ctx.stroke()
  if (ratio > 0) {
    ctx.save()
    setShadow(ctx, withAlpha(color, 0.65), el.thickness * 1.2)
    ctx.beginPath()
    ctx.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * ratio)
    ctx.strokeStyle = color
    ctx.lineWidth = el.thickness
    ctx.stroke()
    ctx.restore()
  }
  const text = Number.isFinite(el.value) ? (el.showPercent ? `${(ratio * 100).toFixed(el.decimals)}%` : formatNumber(el.value, el.decimals)) : '—'
  drawLabel(ctx, text, cx, cy - (el.sublabel ? size * 0.05 : 0), { family: rc.font(el.valueFont), size: size * 0.28, weight: 800, color: rc.color(el.textColor), align: 'center', maxWidth: r * 1.5 })
  if (el.sublabel) drawLabel(ctx, el.sublabel, cx, cy + size * 0.17, { family: rc.font('$label'), size: size * 0.08, weight: 600, color: withAlpha(rc.color(el.textColor), 0.7), align: 'center', uppercase: true, letterSpacing: 2, maxWidth: r * 1.4 })
  if (el.label) drawLabel(ctx, rc.text(el.label), cx, size + labelSpace * 0.55, { family: rc.font('$label'), size: Math.min(34, labelSpace * 0.5), weight: 700, color: rc.color(el.textColor), align: 'center', uppercase: true, letterSpacing: 2, maxWidth: w })
}

export const FORM_LETTER: Record<FormResult, string> = { W: 'V', D: 'E', L: 'D' }

export function formResultsFor(el: FormRowElement, rc: RenderCtx): FormResult[] {
  if (el.source === 'home') return rc.match.home.form
  if (el.source === 'away') return rc.match.away.form
  return el.results
}

export function paintFormRow(ctx: Ctx, el: FormRowElement, rc: RenderCtx) {
  const res = formResultsFor(el, rc)
  const list = el.newestFirst ? res : [...res].reverse()
  const n = Math.max(1, list.length)
  const { width: w, height: h } = el
  const size = Math.min(h, (w - el.gap * (n - 1)) / n)
  const total = n * size + (n - 1) * el.gap
  let x = (w - total) / 2
  const y = (h - size) / 2
  if (el.shape === 'letter' || el.shape === 'dot') {
    list.forEach((r) => {
      const c = rc.color(r === 'W' ? el.winColor : r === 'D' ? el.drawColor : el.lossColor)
      if (el.shape === 'letter') {
        drawLabel(ctx, FORM_LETTER[r], x + size / 2, h / 2, { family: rc.font('$numbers'), size: size * 1.02, color: c, align: 'center', maxWidth: size })
      } else {
        ellipsePath(ctx, x + size / 2, y + size / 2, size / 2, size / 2)
        ctx.fillStyle = c
        ctx.fill()
        if (el.showLetters) drawLabel(ctx, FORM_LETTER[r], x + size / 2, y + size / 2, { family: rc.font('$label'), size: size * 0.5, weight: 800, color: luminance(c) > 0.35 ? '#050505' : rc.color(el.textColor), align: 'center' })
      }
      x += size + el.gap
    })
    return
  }
  list.forEach((r) => {
    const c = rc.color(r === 'W' ? el.winColor : r === 'D' ? el.drawColor : el.lossColor)
    ctx.save()
    if (el.shape === 'circle') ellipsePath(ctx, x + size / 2, y + size / 2, size / 2, size / 2)
    else roundRect(ctx, x, y, size, size, el.shape === 'pill' ? size / 2 : size * 0.18)
    const g = ctx.createLinearGradient(x, y, x, y + size)
    g.addColorStop(0, mix(c, '#ffffff', 0.12))
    g.addColorStop(1, mix(c, '#000000', 0.18))
    ctx.fillStyle = g
    ctx.fill()
    ctx.restore()
    if (el.showLetters) drawLabel(ctx, FORM_LETTER[r], x + size / 2, y + size / 2, { family: rc.font('$label'), size: size * 0.52, weight: 800, color: r === 'D' ? '#0B0C0F' : rc.color(el.textColor), align: 'center' })
    x += size + el.gap
  })
}

export function paintTable(ctx: Ctx, el: TableElement, rc: RenderCtx) {
  const { width: w } = el
  const cols = Math.max(1, el.columns.length)
  const colW = w / cols
  const rh = el.rowHeight
  const font = rc.font(el.font)
  const headerFont = rc.font(el.headerFont)
  const line = withAlpha(rc.color(el.lineColor), 0.25)
  const size = Math.min(el.fontSize, rh * 0.48)
  el.columns.forEach((c, i) => {
    const x = i === 0 ? 0 : i === cols - 1 ? w : colW * i + colW / 2
    drawLabel(ctx, c, x, rh / 2, { family: headerFont, size: size * 0.78, weight: 700, color: rc.color(el.headerColor), uppercase: true, letterSpacing: 2, align: i === 0 ? 'left' : i === cols - 1 ? 'right' : 'center', maxWidth: colW - 8 })
  })
  ctx.fillStyle = withAlpha(rc.color(el.headerColor), 0.6)
  ctx.fillRect(0, rh - 1, w, 2)
  el.rows.forEach((row, ri) => {
    const y = rh * (ri + 1)
    if (el.zebra && ri % 2 === 0) {
      ctx.fillStyle = 'rgba(255,255,255,0.035)'
      ctx.fillRect(0, y, w, rh)
    }
    row.forEach((cell, i) => {
      const x = i === 0 ? 0 : i === cols - 1 ? w : colW * i + colW / 2
      const accent = i === el.accentColumn
      drawLabel(ctx, rc.text(cell), x + (i === 0 ? 12 : i === cols - 1 ? -12 : 0), y + rh / 2, {
        family: accent ? rc.font('$numbers') : font,
        size: accent ? size * 1.1 : size,
        weight: accent ? 800 : 500,
        color: accent ? rc.color(el.accentColor) : rc.color(el.textColor),
        align: i === 0 ? 'left' : i === cols - 1 ? 'right' : 'center',
        maxWidth: colW - 16,
      })
    })
    ctx.fillStyle = line
    ctx.fillRect(0, y + rh - 0.5, w, 1)
  })
}
