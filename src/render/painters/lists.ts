import type { MatchListElement, Player, PlayerListElement, ResultsListElement } from '../../model/types'
import { summarizeResults } from '../../model/stats'
import { withAlpha, formatDate } from '../../model/tokens'
import type { RenderCtx } from '../context'
import { ellipsePath, roundRect, type Ctx } from '../paint/canvas'
import { drawLabel, labelWidth } from '../text/draw'
import { paintCrestBox } from './crest'
import { paintIconGlyph } from './basic'

export const STATUS_LABEL: Record<Player['status'], string> = {
  available: 'Disponible',
  injured: 'Lesionado',
  doubt: 'Duda',
  suspended: 'Sancionado',
  out: 'Baja',
}

export function playersFor(el: PlayerListElement, rc: RenderCtx): Player[] {
  const team = el.side === 'home' ? rc.match.home : rc.match.away
  let list = team.players
  if (el.filter === 'key') list = list.filter((p) => p.key)
  else if (el.filter === 'absences') list = list.filter((p) => p.status !== 'available')
  return list.slice(0, Math.max(1, el.maxItems))
}

export function paintPlayerList(ctx: Ctx, el: PlayerListElement, rc: RenderCtx) {
  const players = playersFor(el, rc)
  const { width: w, height: h } = el
  const right = el.align === 'right'
  const textC = rc.color(el.textColor)
  const mutedC = rc.color(el.mutedColor)
  const accent = rc.color(el.accentColor)
  const team = el.side === 'home' ? rc.match.home : rc.match.away
  let top = 0
  if (el.title) {
    const ts = Math.min(30, h * 0.08)
    drawLabel(ctx, rc.text(el.title), right ? w : 0, ts * 0.6, { family: rc.font('$label'), size: ts, weight: 700, color: accent, uppercase: true, letterSpacing: ts * 0.16, align: right ? 'right' : 'left', maxWidth: w })
    top = ts * 1.9
  }
  if (!players.length) {
    drawLabel(ctx, el.filter === 'absences' ? 'Sin bajas confirmadas' : 'Sin jugadores', right ? w : 0, top + 30, { family: rc.font('$body'), size: 26, weight: 500, color: mutedC, align: right ? 'right' : 'left' })
    return
  }
  const n = players.length
  const rowH = Math.min((h - top - el.rowGap * (n - 1)) / n, el.nameSize * 4.2)
  players.forEach((p, i) => {
    const y = top + i * (rowH + el.rowGap)
    const cy = y + rowH / 2
    // Card
    roundRect(ctx, 0, y, w, rowH, Math.min(18, rowH * 0.2))
    const g = ctx.createLinearGradient(right ? w : 0, 0, right ? 0 : w, 0)
    g.addColorStop(0, 'rgba(255,255,255,0.075)')
    g.addColorStop(1, 'rgba(255,255,255,0.015)')
    ctx.fillStyle = g
    ctx.fill()
    const stripe = p.status === 'available' ? rc.color(team.primary) : p.status === 'doubt' ? '#F2B33D' : rc.color('$negative')
    ctx.fillStyle = stripe
    ctx.fillRect(right ? w - 5 : 0, y + rowH * 0.18, 5, rowH * 0.64)
    const pad = rowH * 0.32
    let x = right ? w - pad : pad
    const dir = right ? -1 : 1
    if (el.showNumber) {
      const ns = rowH * 0.56
      drawLabel(ctx, String(p.number), x + (dir * ns) / 2, cy, { family: rc.font('$display'), size: ns * 0.8, weight: 800, color: withAlpha(textC, 0.35), align: 'center' })
      x += dir * (ns + pad * 0.5)
    }
    const nameSize = Math.min(el.nameSize, rowH * 0.38)
    const statW = el.showStat && p.stat ? w * 0.26 : el.showStatus && p.status !== 'available' ? w * 0.34 : 0
    const nameMax = w - Math.abs(x - (right ? w : 0)) - statW - pad
    drawLabel(ctx, p.name, x, cy - nameSize * 0.42, { family: rc.font('$label'), size: nameSize, weight: 700, color: textC, uppercase: true, letterSpacing: 1, align: right ? 'right' : 'left', maxWidth: nameMax })
    const sub = p.note || p.position
    if (sub) drawLabel(ctx, sub, x, cy + nameSize * 0.62, { family: rc.font('$body'), size: nameSize * 0.56, weight: 500, color: mutedC, align: right ? 'right' : 'left', maxWidth: nameMax })
    const ex = right ? pad : w - pad
    if (el.showStatus && p.status !== 'available') {
      const bs = nameSize * 0.62
      const label = STATUS_LABEL[p.status].toUpperCase()
      const col = p.status === 'doubt' ? '#F2B33D' : rc.color('$negative')
      const tw = labelWidth(label, { family: rc.font('$label'), size: bs, weight: 700, letterSpacing: 1 })
      const bw = tw + bs * 2.6
      const bh = bs * 1.9
      const bx = right ? ex : ex - bw
      roundRect(ctx, bx, cy - bh / 2, bw, bh, bh / 2)
      ctx.fillStyle = withAlpha(col, 0.16)
      ctx.fill()
      ctx.strokeStyle = withAlpha(col, 0.6)
      ctx.lineWidth = 1.5
      ctx.stroke()
      paintIconGlyph(ctx, p.status === 'suspended' ? 'ban' : p.status === 'doubt' ? 'alert' : 'cross', bx + bs * 0.55, cy - bs * 0.5, bs, col, 2.4)
      drawLabel(ctx, label, bx + bs * 1.9, cy, { family: rc.font('$label'), size: bs, weight: 700, color: col, letterSpacing: 1 })
    } else if (el.showStat && p.stat) {
      const ss = Math.min(rowH * 0.5, nameSize * 1.5)
      drawLabel(ctx, p.stat, ex, cy - ss * 0.18, { family: rc.font('$numbers'), size: ss, weight: 800, color: accent, align: right ? 'left' : 'right', maxWidth: statW })
      if (p.statLabel) drawLabel(ctx, p.statLabel, ex, cy + ss * 0.55, { family: rc.font('$label'), size: ss * 0.32, weight: 600, color: mutedC, align: right ? 'left' : 'right', uppercase: true, letterSpacing: 2 })
    }
  })
}

export function paintMatchList(ctx: Ctx, el: MatchListElement, rc: RenderCtx) {
  const items = rc.project.agenda.slice(0, Math.max(1, el.maxItems))
  const { width: w, height: h } = el
  if (!items.length) return
  const gap = Math.min(18, h * 0.02)
  const rowH = Math.min(el.rowHeight, (h - gap * (items.length - 1)) / items.length)
  const textC = rc.color(el.textColor)
  const accent = rc.color(el.accentColor)
  items.forEach((m, i) => {
    const y = i * (rowH + gap)
    const cy = y + rowH / 2
    roundRect(ctx, 0, y, w, rowH, Math.min(22, rowH * 0.22))
    ctx.fillStyle = withAlpha(rc.color(el.cardColor), m.highlight ? Math.min(1, el.cardOpacity + 0.25) : el.cardOpacity)
    ctx.fill()
    if (m.highlight) {
      ctx.strokeStyle = withAlpha(accent, 0.85)
      ctx.lineWidth = 2
      ctx.stroke()
    } else {
      ctx.strokeStyle = 'rgba(255,255,255,0.07)'
      ctx.lineWidth = 1
      ctx.stroke()
    }
    // Time block
    const tw = w * 0.2
    drawLabel(ctx, m.time, tw / 2, cy - (el.showCompetition ? rowH * 0.1 : 0), { family: rc.font(el.timeFont), size: rowH * 0.36, weight: 800, color: m.highlight ? accent : textC, align: 'center', maxWidth: tw - 20 })
    if (el.showCompetition && m.competition) drawLabel(ctx, m.competition, tw / 2, cy + rowH * 0.24, { family: rc.font('$label'), size: rowH * 0.12, weight: 600, color: withAlpha(textC, 0.55), align: 'center', uppercase: true, letterSpacing: 1.5, maxWidth: tw - 16 })
    ctx.fillStyle = 'rgba(255,255,255,0.1)'
    ctx.fillRect(tw, y + rowH * 0.2, 1.5, rowH * 0.6)
    // Teams
    const cs = rowH * 0.56
    const area = w - tw
    const mid = tw + area / 2
    const homeTeam = { name: m.home, abbr: m.home.slice(0, 3), primary: m.homeColor, secondary: '#F3F0E8', crestAssetId: m.homeCrestAssetId, crestStyle: { shape: 'shield' as const, pattern: 'solid' as const } }
    const awayTeam = { name: m.away, abbr: m.away.slice(0, 3), primary: m.awayColor, secondary: '#F3F0E8', crestAssetId: m.awayCrestAssetId, crestStyle: { shape: 'shield' as const, pattern: 'solid' as const } }
    ctx.save()
    ctx.translate(mid - area * 0.08 - cs, cy - cs / 2)
    paintCrestBox(ctx, homeTeam, cs, cs, rc)
    ctx.restore()
    ctx.save()
    ctx.translate(mid + area * 0.08, cy - cs / 2)
    paintCrestBox(ctx, awayTeam, cs, cs, rc)
    ctx.restore()
    drawLabel(ctx, 'VS', mid, cy, { family: rc.font('$label'), size: rowH * 0.16, weight: 700, color: withAlpha(textC, 0.45), align: 'center', letterSpacing: 2 })
    const ns = rowH * 0.24
    drawLabel(ctx, m.home, mid - area * 0.08 - cs - 18, cy, { family: rc.font(el.nameFont), size: ns, weight: 700, color: textC, align: 'right', uppercase: true, letterSpacing: 1, maxWidth: area * 0.42 - cs - 30 })
    drawLabel(ctx, m.away, mid + area * 0.08 + cs + 18, cy, { family: rc.font(el.nameFont), size: ns, weight: 700, color: textC, align: 'left', uppercase: true, letterSpacing: 1, maxWidth: area * 0.42 - cs - 30 })
  })
}

export function paintResultsList(ctx: Ctx, el: ResultsListElement, rc: RenderCtx) {
  const entries = rc.project.results.slice(0, Math.max(1, el.maxItems))
  const { width: w, height: h } = el
  const textC = rc.color(el.textColor)
  const mutedC = rc.color(el.mutedColor)
  const win = rc.color(el.winColor)
  const loss = rc.color(el.lossColor)
  const pend = rc.color(el.pendingColor)
  let top = 0
  if (el.showSummary) {
    const sum = summarizeResults(rc.project.results)
    const sh = Math.min(130, h * 0.2)
    const cells: { v: string; l: string; c: string }[] = [
      { v: String(sum.won), l: 'Aciertos', c: win },
      { v: String(sum.lost), l: 'Fallos', c: loss },
      { v: sum.rate == null ? '—' : `${Math.round(sum.rate * 100)}%`, l: 'Acierto', c: textC },
    ]
    const cw = (w - 24) / 3
    cells.forEach((cell, i) => {
      const x = i * (cw + 12)
      roundRect(ctx, x, 0, cw, sh, 18)
      ctx.fillStyle = withAlpha(rc.color(el.cardColor), 0.75)
      ctx.fill()
      ctx.strokeStyle = withAlpha(cell.c, 0.35)
      ctx.lineWidth = 1.5
      ctx.stroke()
      drawLabel(ctx, cell.v, x + cw / 2, sh * 0.42, { family: rc.font('$numbers'), size: sh * 0.46, weight: 800, color: cell.c, align: 'center' })
      drawLabel(ctx, cell.l, x + cw / 2, sh * 0.8, { family: rc.font('$label'), size: sh * 0.15, weight: 600, color: mutedC, align: 'center', uppercase: true, letterSpacing: 2 })
    })
    top = sh + Math.max(20, el.rowGap * 1.5)
  }
  const n = Math.max(1, entries.length)
  const rowH = Math.min(140, (h - top - el.rowGap * (n - 1)) / n)
  entries.forEach((r, i) => {
    const y = top + i * (rowH + el.rowGap)
    const cy = y + rowH / 2
    const col = r.outcome === 'won' ? win : r.outcome === 'lost' ? loss : r.outcome === 'void' ? mutedC : pend
    roundRect(ctx, 0, y, w, rowH, Math.min(18, rowH * 0.22))
    const g = ctx.createLinearGradient(0, 0, w, 0)
    g.addColorStop(0, withAlpha(col, r.outcome === 'pending' ? 0.08 : 0.14))
    g.addColorStop(0.5, withAlpha(rc.color(el.cardColor), 0.6))
    g.addColorStop(1, withAlpha(rc.color(el.cardColor), 0.6))
    ctx.fillStyle = g
    ctx.fill()
    ctx.strokeStyle = withAlpha(col, 0.35)
    ctx.lineWidth = 1.5
    ctx.stroke()
    const bs = rowH * 0.5
    const bx = rowH * 0.25
    ellipsePath(ctx, bx + bs / 2, cy, bs / 2, bs / 2)
    ctx.fillStyle = withAlpha(col, r.outcome === 'pending' ? 0.18 : 0.95)
    ctx.fill()
    const icon = r.outcome === 'won' ? 'check' : r.outcome === 'lost' ? 'x' : r.outcome === 'void' ? 'ban' : 'clock'
    paintIconGlyph(ctx, icon, bx + bs * 0.22, cy - bs * 0.28, bs * 0.56, r.outcome === 'pending' ? col : '#08090B', 3)
    const tx = bx + bs + rowH * 0.3
    const fs = rowH * 0.24
    const right = el.showOdds && r.odds ? w * 0.18 : 0
    drawLabel(ctx, r.match, tx, cy - fs * 0.55, { family: rc.font(el.font), size: fs, weight: 700, color: textC, uppercase: true, letterSpacing: 0.5, maxWidth: w - tx - right - 20 })
    const sub = [r.pick, r.date ? formatDate(r.date, 'short', rc.brand.dateLocale) : ''].filter(Boolean).join('  ·  ')
    drawLabel(ctx, sub, tx, cy + fs * 0.75, { family: rc.font('$body'), size: fs * 0.66, weight: 500, color: mutedC, maxWidth: w - tx - right - 20 })
    if (right) {
      drawLabel(ctx, r.odds, w - rowH * 0.3, cy - fs * 0.15, { family: rc.font('$numbers'), size: fs * 1.25, weight: 800, color: r.outcome === 'won' ? win : textC, align: 'right' })
      drawLabel(ctx, 'CUOTA', w - rowH * 0.3, cy + fs * 0.85, { family: rc.font('$label'), size: fs * 0.45, weight: 600, color: mutedC, align: 'right', letterSpacing: 2 })
    }
  })
}
