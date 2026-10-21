// GOAT EDITORIAL charts: rankings list and three-way probability bar.
// Flat, thick, proportional — one accent, everything else neutral.
import type { BadgeElement, ProbabilityElement, RankingElement, RankingRow, ScoreboardElement } from '../../model/types'
import { formatNumber } from '../../model/stats'
import { luminance, withAlpha } from '../../model/tokens'
import type { RenderCtx } from '../context'
import { clearShadow, roundRect, setShadow, type Ctx } from '../paint/canvas'
import { paintIconGlyph } from './basic'
import { paintCrestBox } from './crest'
import { drawLabel, labelWidth } from '../text/draw'
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
    const subSize = Math.max(30, nameSize * 0.6)
    const barH = el.showBars ? Math.max(8, Math.min(rowH * 0.22, el.barHeight ?? Math.min(36, rowH * 0.14))) : 0
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
  const gapB = Math.max(18, Math.min(h * 0.12, el.valueSize * 0.2))
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
    const num = v == null || !Number.isFinite(v) ? '—' : formatNumber(v, Number.isInteger(v) ? 0 : 1, ',')
    const hasPct = num !== '—'
    // The % sign is set smaller so three big figures fit side by side.
    let vs = valueSize
    let ps = vs * 0.55
    const widthAt = (a: number, b: number) => labelWidth(num, { family: valueFont, size: a }) + (hasPct ? a * 0.04 + labelWidth('%', { family: valueFont, size: b }) : 0)
    let tw = widthAt(vs, ps)
    if (tw > maxW) {
      const f = maxW / tw
      vs *= f
      ps *= f
      tw = widthAt(vs, ps)
    }
    const left = align === 'left' ? x : align === 'right' ? x - tw : x - tw / 2
    const vy = y0 + capL + gapA + (cap - vs * capK)
    const nw = drawLabel(ctx, num, left, vy, { family: valueFont, size: vs, color: valueColor(k), baseline: 'top' })
    if (hasPct) drawLabel(ctx, '%', left + nw + vs * 0.04, vy, { family: valueFont, size: ps, color: valueColor(k), baseline: 'top' })
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

// ── Badge: a short label as a solid tag, an outline, an illuminated mini-card or plain text.
const BADGE_ICON: Record<BadgeElement['icon'], string | null> = { none: null, check: 'check', lock: 'lock', star: 'star', bolt: 'zap', trophy: 'trophy', arrow: 'arrowUpRight' }

export function paintBadge(ctx: Ctx, el: BadgeElement, rc: RenderCtx) {
  const { width: w, height: h } = el
  const color = rc.color(el.color)
  const label = rc.text(el.text)
  const fam = rc.font(el.font)
  const boxed = el.style !== 'text'
  let fs = Math.min(el.fontSize, h * (boxed ? 0.46 : 0.8))
  const icon = BADGE_ICON[el.icon]
  const measure = (size: number) => {
    const tw = labelWidth(label, { family: fam, size, weight: 700, uppercase: true, letterSpacing: size * 0.04 })
    const iconS = icon ? size * 1.05 : 0
    const gap = icon && label ? size * 0.42 : 0
    const padX = boxed ? size * 0.85 : 0
    return { tw, iconS, gap, padX, total: tw + iconS + gap + padX * 2 }
  }
  let m = measure(fs)
  if (m.total > w) {
    fs *= w / m.total
    m = measure(fs)
  }
  const bw = m.total
  const bh = boxed ? Math.min(h, fs * 2.15) : h
  const bx = el.align === 'left' ? 0 : el.align === 'right' ? w - bw : (w - bw) / 2
  const by = (h - bh) / 2
  const r = Math.min(el.radius, bh / 2)
  // Text on a solid tag picks a readable color automatically.
  let textC = rc.color(el.textColor)
  if (el.style === 'solid' && el.textColor === '$text' && luminance(color) > 0.4) textC = '#050505'
  if (el.style === 'outline' || el.style === 'text') textC = el.textColor === '$text' ? color : textC
  if (el.style === 'solid') {
    roundRect(ctx, bx, by, bw, bh, r)
    ctx.fillStyle = color
    ctx.fill()
  } else if (el.style === 'outline') {
    roundRect(ctx, bx + 1.5, by + 1.5, bw - 3, bh - 3, r)
    ctx.strokeStyle = color
    ctx.lineWidth = Math.max(2, fs * 0.08)
    ctx.stroke()
  } else if (el.style === 'glow') {
    ctx.save()
    setShadow(ctx, withAlpha(color, 0.55), fs * 0.9)
    roundRect(ctx, bx, by, bw, bh, r)
    ctx.fillStyle = withAlpha(color, 0.14)
    ctx.fill()
    clearShadow(ctx)
    ctx.restore()
    roundRect(ctx, bx + 1, by + 1, bw - 2, bh - 2, r)
    ctx.strokeStyle = withAlpha(color, 0.9)
    ctx.lineWidth = Math.max(1.5, fs * 0.06)
    ctx.stroke()
  }
  let x = bx + m.padX
  const cy = h / 2
  if (icon) {
    const iconColor = el.style === 'solid' ? textC : color
    paintIconGlyph(ctx, icon, x, cy - m.iconS / 2, m.iconS, iconColor, 2.6)
    x += m.iconS + m.gap
  }
  if (label) drawLabel(ctx, label, x, cy, { family: fam, size: fs, weight: 700, color: textC, uppercase: true, letterSpacing: fs * 0.04 })
}

// ── Scoreboard: crests, names and a big score from the shared match data.
export function scoreOf(rc: RenderCtx): { home: string; away: string; note: string } {
  const s = rc.match.score
  return { home: s?.home || '0', away: s?.away || '0', note: s?.note ?? '' }
}

export function paintScoreboard(ctx: Ctx, el: ScoreboardElement, rc: RenderCtx) {
  const { width: w, height: h } = el
  const sc = scoreOf(rc)
  const textC = rc.color(el.textColor)
  const mutedC = rc.color(el.mutedColor)
  const accent = rc.color(el.accentColor)
  const hn = parseFloat(sc.home)
  const an = parseFloat(sc.away)
  const winner = Number.isFinite(hn) && Number.isFinite(an) && hn !== an ? (hn > an ? 'home' : 'away') : null
  const colorOf = (side: 'home' | 'away') => (el.highlightWinner && winner === side ? accent : textC)
  const scoreFont = rc.font(el.scoreFont)
  const nameFont = rc.font(el.nameFont)
  const capK = capHeightOf(scoreFont, 100, 400, false) / 100 || 0.72
  const home = rc.match.home
  const away = rc.match.away
  if (el.layout === 'compact') {
    // Pill: HOME 2 - 1 AWAY
    const fs = Math.min(h * 0.5, el.scoreSize * 0.4)
    const txt = `${sc.home} - ${sc.away}`
    roundRect(ctx, 0, 0, w, h, h / 2)
    ctx.fillStyle = withAlpha(textC, 0.08)
    ctx.fill()
    ctx.strokeStyle = withAlpha(textC, 0.25)
    ctx.lineWidth = 2
    ctx.stroke()
    const cs = h * 0.62
    if (el.showCrests) {
      ctx.save()
      ctx.translate(h * 0.3, (h - cs) / 2)
      paintCrestBox(ctx, home, cs, cs, rc)
      ctx.restore()
      ctx.save()
      ctx.translate(w - h * 0.3 - cs, (h - cs) / 2)
      paintCrestBox(ctx, away, cs, cs, rc)
      ctx.restore()
    }
    drawLabel(ctx, txt, w / 2, h / 2, { family: scoreFont, size: fs * 1.25, color: textC, align: 'center', maxWidth: w - (el.showCrests ? cs * 2 + h : h) })
    return
  }
  if (el.layout === 'stacked') {
    const nameS = Math.min(56, h * 0.13)
    const noteS = el.showNote && sc.note ? Math.min(40, h * 0.1) : 0
    const avail = h - (el.showNames ? nameS * 1.8 : 0) - (noteS ? noteS * 1.8 : 0)
    const ss = Math.max(20, Math.min(el.scoreSize, avail / capK))
    let y = 0
    if (el.showNames) {
      drawLabel(ctx, home.shortName || home.name, w * 0.25, y, { family: nameFont, size: nameS, weight: 700, color: textC, align: 'center', baseline: 'top', uppercase: true, maxWidth: w * 0.46 })
      drawLabel(ctx, away.shortName || away.name, w * 0.75, y, { family: nameFont, size: nameS, weight: 700, color: textC, align: 'center', baseline: 'top', uppercase: true, maxWidth: w * 0.46 })
      y += nameS * 1.8
    }
    drawLabel(ctx, sc.home, w * 0.25, y, { family: scoreFont, size: ss, color: colorOf('home'), align: 'center', baseline: 'top', maxWidth: w * 0.42 })
    drawLabel(ctx, '-', w * 0.5, y + (ss * capK) / 2, { family: scoreFont, size: ss * 0.5, color: mutedC, align: 'center' })
    drawLabel(ctx, sc.away, w * 0.75, y, { family: scoreFont, size: ss, color: colorOf('away'), align: 'center', baseline: 'top', maxWidth: w * 0.42 })
    if (noteS) drawLabel(ctx, sc.note, w / 2, y + ss * capK + noteS * 0.9, { family: nameFont, size: noteS, weight: 600, color: mutedC, align: 'center', baseline: 'top', uppercase: true, letterSpacing: noteS * 0.04, maxWidth: w })
    return
  }
  // Row: crest  2 - 1  crest (names under crests, note under the score)
  const noteS = el.showNote && sc.note ? Math.min(40, h * 0.12) : 0
  const nameS = el.showNames ? Math.min(46, h * 0.13) : 0
  const cs = el.showCrests ? Math.min(h - (nameS ? nameS * 1.9 : 0), w * 0.24) : 0
  const ss = Math.max(20, Math.min(el.scoreSize, (h - (noteS ? noteS * 1.9 : 0)) / capK, (w - cs * 2) / 2.6 / 0.62))
  const cap = ss * capK
  const top = (h - cap - (noteS ? noteS * 1.9 : 0)) / 2
  if (el.showCrests) {
    const cy = nameS ? (h - nameS * 1.9 - cs) / 2 : (h - cs) / 2
    ctx.save()
    ctx.translate(0, cy)
    paintCrestBox(ctx, home, cs, cs, rc)
    ctx.restore()
    ctx.save()
    ctx.translate(w - cs, cy)
    paintCrestBox(ctx, away, cs, cs, rc)
    ctx.restore()
    if (nameS) {
      drawLabel(ctx, home.shortName || home.name, cs / 2, cy + cs + nameS * 0.6, { family: nameFont, size: nameS, weight: 700, color: textC, align: 'center', baseline: 'top', uppercase: true, maxWidth: cs * 1.4 })
      drawLabel(ctx, away.shortName || away.name, w - cs / 2, cy + cs + nameS * 0.6, { family: nameFont, size: nameS, weight: 700, color: textC, align: 'center', baseline: 'top', uppercase: true, maxWidth: cs * 1.4 })
    }
  }
  const mid = w / 2
  const sideW = (w - cs * 2) / 2
  drawLabel(ctx, sc.home, mid - ss * 0.32, top, { family: scoreFont, size: ss, color: colorOf('home'), align: 'right', baseline: 'top', maxWidth: sideW * 0.8 })
  drawLabel(ctx, '-', mid, top + cap / 2, { family: scoreFont, size: ss * 0.45, color: mutedC, align: 'center' })
  drawLabel(ctx, sc.away, mid + ss * 0.32, top, { family: scoreFont, size: ss, color: colorOf('away'), align: 'left', baseline: 'top', maxWidth: sideW * 0.8 })
  if (noteS) drawLabel(ctx, sc.note, mid, top + cap + noteS * 0.9, { family: nameFont, size: noteS, weight: 600, color: mutedC, align: 'center', baseline: 'top', uppercase: true, letterSpacing: noteS * 0.04, maxWidth: w - cs * 2 })
}
