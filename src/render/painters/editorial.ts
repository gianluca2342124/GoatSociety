// GOAT EDITORIAL charts: rankings list and three-way probability bar.
// Flat, thick, proportional — one accent, everything else neutral.
import type { ProbabilityElement, RankingElement, RankingRow } from '../../model/types'
import { formatNumber } from '../../model/stats'
import type { RenderCtx } from '../context'
import { roundRect, type Ctx } from '../paint/canvas'
import { drawLabel } from '../text/draw'
import { capHeightOf } from '../text/layout'
import { teamColors } from './stats'

export function rankingRows(el: RankingElement): RankingRow[] {
  return el.rows.slice(0, Math.max(1, el.maxRows))
}

export function paintRanking(ctx: Ctx, el: RankingElement, rc: RenderCtx) {
  const rows = rankingRows(el)
  const { width: w, height: h } = el
  if (!rows.length) return
  const n = rows.length
  const rowH = h / n
  const accent = rc.color(el.accentColor)
  const textC = rc.color(el.textColor)
  const mutedC = rc.color(el.mutedColor)
  const line = rc.color(el.lineColor)
  const nameFont = rc.font(el.nameFont)
  const valueFont = rc.font(el.valueFont)
  const max = Math.max(0, ...rows.map((r) => (Number.isFinite(r.value) ? Math.abs(r.value as number) : 0)))
  const valueSize = Math.min(el.valueSize, rowH * 0.62)
  const nameSize = Math.min(el.nameSize, rowH * (el.showBars ? 0.3 : 0.36))
  const rankW = el.showRank ? Math.max(valueSize * 0.62, nameSize * 1.5) : 0
  const valueW = Math.max(valueSize * 1.6, w * 0.2)
  rows.forEach((r, i) => {
    const y = i * rowH
    if (i > 0) {
      ctx.fillStyle = line
      ctx.fillRect(0, Math.round(y) - 1, w, 2)
    }
    const hot = i === el.highlightIndex
    const cy = y + rowH / 2
    if (el.showRank) drawLabel(ctx, String(i + 1), 0, cy, { family: valueFont, size: valueSize * 0.62, color: hot ? accent : rc.color('$dim'), maxWidth: rankW - 12 })
    const x = rankW
    const textW = w - x - valueW - 24
    const sub = rc.text(r.sub)
    const capN = capHeightOf(nameFont, nameSize, 700, false)
    const subSize = Math.max(24, nameSize * 0.58)
    const barH = el.showBars ? Math.max(8, Math.min(22, rowH * 0.1)) : 0
    const block = capN + (sub ? subSize * 1.35 : 0) + (barH ? barH + rowH * 0.1 : 0)
    let ty = cy - block / 2
    drawLabel(ctx, rc.text(r.label), x, ty, { family: nameFont, size: nameSize, weight: 700, color: textC, uppercase: true, baseline: 'top', maxWidth: textW })
    ty += capN
    if (sub) {
      drawLabel(ctx, sub, x, ty + subSize * 0.35, { family: rc.font('$body'), size: subSize, weight: 500, color: mutedC, baseline: 'top', maxWidth: textW })
      ty += subSize * 1.35
    }
    if (barH) {
      const by = ty + rowH * 0.1
      const ratio = max > 0 && Number.isFinite(r.value) ? Math.abs(r.value as number) / max : 0
      const len = Math.max(ratio > 0 ? barH : 0, textW * ratio)
      roundRect(ctx, x, by, textW, barH, Math.min(3, barH / 2))
      ctx.fillStyle = '#1A1A1A'
      ctx.fill()
      if (len > 0) {
        roundRect(ctx, x, by, len, barH, Math.min(3, barH / 2))
        ctx.fillStyle = hot ? accent : rc.color(el.barColor)
        ctx.fill()
      }
    }
    const shown = r.display ? rc.text(r.display) : formatNumber(r.value, el.decimals, ',', el.unit)
    drawLabel(ctx, shown, w, cy, { family: valueFont, size: valueSize, color: hot ? accent : textC, align: 'right', maxWidth: valueW })
  })
}

export function probabilityShares(el: ProbabilityElement): { home: number; draw: number; away: number } {
  const v = (x: number | null) => (x != null && Number.isFinite(x) && x > 0 ? x : 0)
  const home = v(el.home)
  const draw = el.showDraw ? v(el.draw) : 0
  const away = v(el.away)
  const total = home + draw + away
  if (total <= 0) return { home: 0, draw: 0, away: 0 }
  if (!el.normalize) return { home: home / 100, draw: draw / 100, away: away / 100 }
  return { home: home / total, draw: draw / total, away: away / total }
}

export function paintProbability(ctx: Ctx, el: ProbabilityElement, rc: RenderCtx) {
  const { width: w, height: h } = el
  const sh = probabilityShares(el)
  const keys = el.showDraw ? (['home', 'draw', 'away'] as const) : (['home', 'away'] as const)
  const raw = { home: el.home, draw: el.draw, away: el.away }
  let best: (typeof keys)[number] | null = null
  for (const k of keys) {
    const v = raw[k]
    if (v != null && Number.isFinite(v) && (best == null || v > (raw[best] as number))) best = k
  }
  const tie = best != null && keys.filter((k) => raw[k] === raw[best!]).length > 1
  const accent = rc.color(el.accentColor)
  const track = rc.color(el.trackColor)
  const textC = rc.color(el.textColor)
  const mutedC = rc.color(el.mutedColor)
  const [homeC, awayC] = teamColors(rc, '$home', '$away')
  const barColor = (k: string) => {
    if (el.colorMode === 'teams') return k === 'home' ? homeC : k === 'away' ? awayC : '#8A8A8A'
    return !tie && k === best ? accent : track
  }
  const valueColor = (k: string) => (el.colorMode === 'leader' && !tie && k === best ? accent : textC)
  const labelFont = rc.font(el.labelFont)
  const valueFont = rc.font(el.valueFont)
  const barH = Math.min(el.barHeight, h * 0.12)
  const labelSize = Math.min(el.labelSize, h * 0.12)
  const capK = capHeightOf(valueFont, 100, 400, false) / 100 || 0.72
  const gapA = labelSize * 0.7
  const gapB = Math.max(18, h * 0.07)
  const valueSize = Math.max(10, Math.min(el.valueSize, (h - labelSize - gapA - gapB - barH) / capK))
  const cap = valueSize * capK
  const capL = capHeightOf(labelFont, labelSize, 600, false)
  const block = capL + gapA + cap + gapB + barH
  const y0 = Math.max(0, (h - block) / 2)
  const colW = w / keys.length
  const labels = { home: rc.text(el.homeLabel), draw: rc.text(el.drawLabel), away: rc.text(el.awayLabel) }
  keys.forEach((k, i) => {
    const align = i === 0 ? 'left' : i === keys.length - 1 ? 'right' : 'center'
    const x = align === 'left' ? 0 : align === 'right' ? w : w / 2
    const maxW = colW - 16
    drawLabel(ctx, labels[k], x, y0, { family: labelFont, size: labelSize, weight: 600, color: mutedC, align, baseline: 'top', uppercase: true, maxWidth: maxW })
    const v = raw[k]
    const txt = v == null || !Number.isFinite(v) ? '—' : `${formatNumber(v, Number.isInteger(v) ? 0 : 1, ',')}%`
    drawLabel(ctx, txt, x, y0 + capL + gapA, { family: valueFont, size: valueSize, color: valueColor(k), align, baseline: 'top', maxWidth: maxW })
  })
  // One thick segmented bar with accurate proportions.
  const by = y0 + capL + gapA + cap + gapB
  const gap = Math.max(4, barH * 0.3)
  const parts = keys.map((k) => ({ k, share: sh[k] }))
  const total = parts.reduce((a, p) => a + p.share, 0)
  const usable = w - gap * (parts.length - 1)
  if (total <= 0) {
    roundRect(ctx, 0, by, w, barH, Math.min(4, barH / 2))
    ctx.fillStyle = '#242424'
    ctx.fill()
    return
  }
  let x = 0
  const scale = el.normalize ? 1 : Math.min(1, 1 / total)
  for (const p of parts) {
    const len = usable * p.share * scale
    if (len > 0.5) {
      roundRect(ctx, x, by, len, barH, Math.min(4, barH / 2))
      ctx.fillStyle = barColor(p.k)
      ctx.fill()
    }
    x += len + gap
  }
}
