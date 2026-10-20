import type { TacticalAnnotation, TacticalPlayer, TacticsData, TacticsElement } from '../../model/types'
import { mix, withAlpha } from '../../model/tokens'
import type { RenderCtx } from '../context'
import { clearShadow, ellipsePath, polygonPath, roundRect, setShadow, type Ctx } from '../paint/canvas'
import { cachedPaint, hashKey } from '../paint/bitmapCache'
import { drawLabel, labelWidth } from '../text/draw'
import { densify, pitchMarkings, pitchStripes, quadCurve } from '../../tactics/pitch'
import { buildProjection, type Projection, type Pt } from '../../tactics/projection'
import { PITCH_LENGTH, PITCH_WIDTH } from '../../tactics/formations'
import { teamColors } from './stats'

export function tacticsProjection(t: TacticsData, w: number, h: number): Projection {
  return buildProjection({ width: w, height: h, view: t.view, camera: t.camera, vertical: t.vertical, tilt: t.tilt, padding: 0 })
}

export function playerRadius(t: TacticsData, proj: Projection, p: Pt): number {
  const k = t.camera === 'top' ? 1 : Math.max(0.55, Math.min(1.45, proj.scaleAt(p) / proj.refScale))
  return t.playerSize * k
}

function projPath(ctx: Ctx, proj: Projection, pts: Pt[], close = false) {
  ctx.beginPath()
  pts.forEach((p, i) => {
    const s = proj.toScreen(p)
    if (i === 0) ctx.moveTo(s.x, s.y)
    else ctx.lineTo(s.x, s.y)
  })
  if (close) ctx.closePath()
}

function circlePts(c: Pt, r: number, steps = 48): Pt[] {
  const out: Pt[] = []
  for (let i = 0; i <= steps; i++) {
    const a = (i / steps) * Math.PI * 2
    out.push({ x: c.x + Math.cos(a) * r, y: c.y + Math.sin(a) * r })
  }
  return out
}

/** Sample the annotation path in pitch coordinates. */
export function annotationPath(a: TacticalAnnotation): Pt[] {
  if (a.points.length >= 3 && a.kind !== 'zone') return quadCurve(a.points[0], a.points[1], a.points[2], 40)
  return densify(a.points.slice(0, 2), 1.5)
}

function arrowHead(ctx: Ctx, tip: Pt, from: Pt, size: number, color: string) {
  const ang = Math.atan2(tip.y - from.y, tip.x - from.x)
  ctx.beginPath()
  ctx.moveTo(tip.x + Math.cos(ang) * size * 0.25, tip.y + Math.sin(ang) * size * 0.25)
  ctx.lineTo(tip.x + Math.cos(ang + 2.55) * size, tip.y + Math.sin(ang + 2.55) * size)
  ctx.lineTo(tip.x + Math.cos(ang) * -size * 0.45, tip.y + Math.sin(ang) * -size * 0.45)
  ctx.lineTo(tip.x + Math.cos(ang - 2.55) * size, tip.y + Math.sin(ang - 2.55) * size)
  ctx.closePath()
  ctx.fillStyle = color
  ctx.fill()
}

function pill(ctx: Ctx, text: string, cx: number, cy: number, size: number, color: string, rc: RenderCtx, bg = 'rgba(8,9,11,0.82)') {
  const fam = rc.font('$label')
  const tw = labelWidth(text, { family: fam, size, weight: 700, letterSpacing: size * 0.08, uppercase: true })
  const pw = tw + size * 1.2
  const ph = size * 1.65
  roundRect(ctx, cx - pw / 2, cy - ph / 2, pw, ph, ph / 2)
  ctx.fillStyle = bg
  ctx.fill()
  ctx.strokeStyle = withAlpha(color, 0.7)
  ctx.lineWidth = 1.2
  ctx.stroke()
  drawLabel(ctx, text, cx, cy, { family: fam, size, weight: 700, color, align: 'center', uppercase: true, letterSpacing: size * 0.08 })
}

function paintAnnotation(ctx: Ctx, a: TacticalAnnotation, t: TacticsData, proj: Projection, rc: RenderCtx) {
  const color = rc.color(a.color)
  const unit = proj.refScale
  ctx.save()
  ctx.globalAlpha *= a.opacity
  switch (a.kind) {
    case 'zone': {
      const pts = a.points.length >= 3 ? a.points : []
      if (!pts.length) break
      const dense = densify([...pts, pts[0]], 2)
      projPath(ctx, proj, dense, true)
      const sc = pts.map((p) => proj.toScreen(p))
      const minY = Math.min(...sc.map((p) => p.y))
      const maxY = Math.max(...sc.map((p) => p.y))
      const g = ctx.createLinearGradient(0, minY, 0, maxY)
      g.addColorStop(0, withAlpha(color, 0.3))
      g.addColorStop(1, withAlpha(color, 0.12))
      ctx.fillStyle = g
      ctx.fill()
      ctx.setLineDash([unit * 1.2, unit * 0.8])
      ctx.strokeStyle = withAlpha(color, 0.9)
      ctx.lineWidth = Math.max(1.5, unit * 0.22)
      ctx.stroke()
      ctx.setLineDash([])
      if (a.label) {
        const c = proj.toScreen({ x: pts.reduce((s, p) => s + p.x, 0) / pts.length, y: pts.reduce((s, p) => s + p.y, 0) / pts.length })
        drawLabel(ctx, a.label, c.x, c.y, { family: rc.font('$label'), size: Math.max(14, unit * 2.2), weight: 800, color: withAlpha(color, 0.95), align: 'center', uppercase: true, letterSpacing: unit * 0.3 })
      }
      break
    }
    case 'spotlight': {
      const c = a.points[0]
      const edge = a.points[1] ?? { x: c.x + 5, y: c.y }
      const r = Math.max(1, Math.hypot(edge.x - c.x, edge.y - c.y))
      const sc = proj.toScreen(c)
      const ring = circlePts(c, r).map((p) => proj.toScreen(p))
      const rs = Math.max(...ring.map((p) => Math.hypot(p.x - sc.x, p.y - sc.y)))
      ctx.save()
      ctx.beginPath()
      ring.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)))
      ctx.closePath()
      const g = ctx.createRadialGradient(sc.x, sc.y, 0, sc.x, sc.y, rs)
      g.addColorStop(0, withAlpha(color, 0.55))
      g.addColorStop(0.6, withAlpha(color, 0.2))
      g.addColorStop(1, withAlpha(color, 0))
      ctx.fillStyle = g
      ctx.fill()
      ctx.restore()
      // Light beam from above
      const beamTop = { x: sc.x, y: sc.y - rs * 4.5 }
      const lg = ctx.createLinearGradient(beamTop.x, beamTop.y, sc.x, sc.y)
      lg.addColorStop(0, withAlpha(color, 0))
      lg.addColorStop(1, withAlpha(color, 0.22))
      ctx.beginPath()
      ctx.moveTo(beamTop.x - rs * 0.15, beamTop.y)
      ctx.lineTo(beamTop.x + rs * 0.15, beamTop.y)
      ctx.lineTo(sc.x + rs, sc.y)
      ctx.lineTo(sc.x - rs, sc.y)
      ctx.closePath()
      ctx.fillStyle = lg
      ctx.fill()
      break
    }
    case 'circle': {
      const c = a.points[0]
      const edge = a.points[1] ?? { x: c.x + 4, y: c.y }
      const r = Math.max(0.5, Math.hypot(edge.x - c.x, edge.y - c.y))
      projPath(ctx, proj, circlePts(c, r), true)
      ctx.fillStyle = withAlpha(color, 0.12)
      ctx.fill()
      setShadow(ctx, withAlpha(color, 0.8), unit * 1.2 * t.glow)
      ctx.strokeStyle = color
      ctx.lineWidth = Math.max(2, unit * 0.32)
      ctx.stroke()
      clearShadow(ctx)
      if (a.label) {
        const top = proj.toScreen({ x: c.x, y: c.y - r })
        const bottom = proj.toScreen({ x: c.x, y: c.y + r })
        const lp = t.vertical ? { x: Math.max(top.x, bottom.x) + unit * 3, y: (top.y + bottom.y) / 2 } : { x: top.x, y: Math.min(top.y, bottom.y) - unit * 2 }
        pill(ctx, a.label, lp.x, lp.y, Math.max(12, unit * 1.5), color, rc)
      }
      break
    }
    case 'ball': {
      const s = proj.toScreen(a.points[0])
      const r = Math.max(5, unit * 0.9)
      setShadow(ctx, 'rgba(0,0,0,0.6)', r, 0, r * 0.4)
      ellipsePath(ctx, s.x, s.y, r, r)
      ctx.fillStyle = '#F3F0E8'
      ctx.fill()
      clearShadow(ctx)
      ellipsePath(ctx, s.x, s.y, r * 0.38, r * 0.38)
      ctx.fillStyle = '#111'
      ctx.fill()
      break
    }
    default: {
      // Movement lines: arrow / curve / pass / run / press
      const path = annotationPath(a).map((p) => proj.toScreen(p))
      if (path.length < 2) break
      const width = Math.max(2, a.width * unit * (a.kind === 'press' ? 1.6 : 1))
      const headSize = width * 3.2
      // Shorten the line under the arrow head.
      const tip = path[path.length - 1]
      let k = path.length - 1
      while (k > 0 && Math.hypot(path[k].x - tip.x, path[k].y - tip.y) < headSize * 0.6) k--
      const body = path.slice(0, k + 1)
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      if (a.kind === 'run' || a.kind === 'press') setShadow(ctx, withAlpha(color, 0.75), width * 3 * t.glow)
      ctx.beginPath()
      body.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)))
      ctx.lineTo(tip.x, tip.y)
      if (a.kind === 'pass') ctx.setLineDash([width * 2.2, width * 1.8])
      ctx.strokeStyle = color
      ctx.lineWidth = width
      ctx.stroke()
      ctx.setLineDash([])
      clearShadow(ctx)
      arrowHead(ctx, tip, path[Math.max(0, path.length - 4)], headSize, color)
      if (a.kind === 'press') {
        // Pressure chevrons at the start
        for (let i = 1; i <= 2; i++) {
          const p = path[Math.min(path.length - 1, i * 5)]
          const q = path[Math.min(path.length - 1, i * 5 + 1)]
          const ang = Math.atan2(q.y - p.y, q.x - p.x)
          ctx.beginPath()
          ctx.moveTo(p.x + Math.cos(ang + 2.3) * width * 2, p.y + Math.sin(ang + 2.3) * width * 2)
          ctx.lineTo(p.x, p.y)
          ctx.lineTo(p.x + Math.cos(ang - 2.3) * width * 2, p.y + Math.sin(ang - 2.3) * width * 2)
          ctx.strokeStyle = color
          ctx.lineWidth = width * 0.6
          ctx.stroke()
        }
      }
      if (a.label) {
        const mid = path[Math.floor(path.length / 2)]
        pill(ctx, a.label, mid.x, mid.y - unit * 2.2, Math.max(12, unit * 1.4), color, rc)
      }
    }
  }
  ctx.restore()
}

function paintPlayer(ctx: Ctx, p: TacticalPlayer, t: TacticsData, proj: Projection, rc: RenderCtx, colors: [string, string]) {
  const s = proj.toScreen(p)
  const r = playerRadius(t, proj, p)
  const base = p.team === 'home' ? colors[0] : colors[1]
  const persp = t.camera !== 'top'
  const lift = persp ? r * 0.55 : 0
  // Ground shadow / ring
  ctx.save()
  ctx.translate(s.x, s.y)
  ctx.scale(1, persp ? 0.42 : 1)
  ellipsePath(ctx, 0, persp ? 0 : r * 0.18, r * 1.05, r * 1.05)
  ctx.fillStyle = 'rgba(0,0,0,0.45)'
  ctx.fill()
  if (p.highlight) {
    setShadow(ctx, withAlpha(rc.color('$primary'), 0.9), r * 1.2 * t.glow)
    ellipsePath(ctx, 0, 0, r * 1.55, r * 1.55)
    ctx.strokeStyle = rc.color('$primary')
    ctx.lineWidth = Math.max(2, r * 0.16)
    ctx.stroke()
    clearShadow(ctx)
  }
  ctx.restore()
  const cy = s.y - lift
  if (t.playerStyle === 'ring') {
    ellipsePath(ctx, s.x, cy, r, r)
    ctx.fillStyle = 'rgba(8,9,11,0.75)'
    ctx.fill()
    ctx.strokeStyle = base
    ctx.lineWidth = Math.max(2, r * 0.22)
    ctx.stroke()
  } else if (t.playerStyle === 'shirt') {
    const w = r * 2.1
    const h = r * 2.1
    ctx.save()
    ctx.translate(s.x - w / 2, cy - h / 2)
    ctx.beginPath()
    ctx.moveTo(w * 0.3, 0)
    ctx.quadraticCurveTo(w * 0.5, h * 0.12, w * 0.7, 0)
    ctx.lineTo(w, h * 0.18)
    ctx.lineTo(w * 0.86, h * 0.42)
    ctx.lineTo(w * 0.76, h * 0.36)
    ctx.lineTo(w * 0.76, h)
    ctx.lineTo(w * 0.24, h)
    ctx.lineTo(w * 0.24, h * 0.36)
    ctx.lineTo(w * 0.14, h * 0.42)
    ctx.lineTo(0, h * 0.18)
    ctx.closePath()
    setShadow(ctx, 'rgba(0,0,0,0.5)', r * 0.5, 0, r * 0.2)
    const g = ctx.createLinearGradient(0, 0, 0, h)
    g.addColorStop(0, mix(base, '#ffffff', 0.18))
    g.addColorStop(1, mix(base, '#000000', 0.2))
    ctx.fillStyle = g
    ctx.fill()
    clearShadow(ctx)
    ctx.strokeStyle = 'rgba(255,255,255,0.65)'
    ctx.lineWidth = Math.max(1, r * 0.08)
    ctx.stroke()
    ctx.restore()
  } else {
    setShadow(ctx, 'rgba(0,0,0,0.5)', r * 0.6, 0, r * 0.25)
    ellipsePath(ctx, s.x, cy, r, r)
    const g = ctx.createLinearGradient(s.x - r, cy - r, s.x + r, cy + r)
    g.addColorStop(0, mix(base, '#ffffff', 0.22))
    g.addColorStop(1, mix(base, '#000000', 0.25))
    ctx.fillStyle = g
    ctx.fill()
    clearShadow(ctx)
    ctx.strokeStyle = p.highlight ? rc.color('$primary') : 'rgba(243,240,232,0.9)'
    ctx.lineWidth = Math.max(1.5, r * 0.13)
    ctx.stroke()
  }
  if (t.showNumbers) {
    const light = parseInt(base.replace('#', '').slice(0, 2) || '0', 16) > 200 && base.startsWith('#')
    drawLabel(ctx, String(p.number), s.x, cy + (t.playerStyle === 'shirt' ? r * 0.15 : 0), {
      family: rc.font('$label'),
      size: r * 1.05,
      weight: 800,
      color: t.playerStyle === 'ring' ? '#F3F0E8' : light ? '#0B0C0F' : '#F7F5EF',
      align: 'center',
    })
  }
  if (t.showLabels && p.label) {
    pill(ctx, p.label, s.x, cy + r + r * 0.95, Math.max(11, r * 0.62), p.highlight ? rc.color('$primary') : '#F3F0E8', rc)
  }
}

export function paintTacticsBoard(ctx: Ctx, t: TacticsData, w: number, h: number, rc: RenderCtx, opts: { skipPlayers?: boolean } = {}) {
  const proj = tacticsProjection(t, w, h)
  const colors = teamColors(rc, t.homeColor, t.awayColor)
  const q = proj.quad
  // Surround
  ctx.save()
  polygonPath(ctx, q)
  ctx.fillStyle = rc.color(t.pitchColor2)
  ctx.fill()
  ctx.clip()
  // Pitch surface
  const surface = densify(
    [
      { x: 0, y: 0 },
      { x: PITCH_LENGTH, y: 0 },
      { x: PITCH_LENGTH, y: PITCH_WIDTH },
      { x: 0, y: PITCH_WIDTH },
      { x: 0, y: 0 },
    ],
    6,
  )
  projPath(ctx, proj, surface, true)
  ctx.fillStyle = rc.color(t.pitchColor)
  ctx.fill()
  if (t.stripes) {
    const stripeColor = mix(rc.color(t.pitchColor), '#ffffff', 0.045)
    for (const st of pitchStripes(18)) {
      projPath(ctx, proj, densify([...st, st[0]], 6), true)
      ctx.fillStyle = stripeColor
      ctx.fill()
    }
  }
  // Light falloff — brighter center, dark edges (stadium lighting)
  const xs = q.map((p) => p.x)
  const ys = q.map((p) => p.y)
  const minX = Math.min(...xs)
  const maxX = Math.max(...xs)
  const minY = Math.min(...ys)
  const maxY = Math.max(...ys)
  const cx = (minX + maxX) / 2
  const cy = (minY + maxY) / 2
  const R = Math.hypot(maxX - minX, maxY - minY) / 2
  const lg = ctx.createRadialGradient(cx, cy - (maxY - minY) * 0.1, R * 0.05, cx, cy, R)
  lg.addColorStop(0, 'rgba(255,255,255,0.07)')
  lg.addColorStop(0.6, 'rgba(0,0,0,0.05)')
  lg.addColorStop(1, 'rgba(0,0,0,0.55)')
  ctx.fillStyle = lg
  ctx.fillRect(minX, minY, maxX - minX, maxY - minY)
  // Markings
  const { lines, spots } = pitchMarkings()
  ctx.strokeStyle = withAlpha(rc.color(t.lineColor), t.lineOpacity)
  ctx.lineWidth = Math.max(1, proj.refScale * 0.16)
  ctx.lineJoin = 'round'
  for (const line of lines) {
    projPath(ctx, proj, densify(line, 2))
    ctx.stroke()
  }
  ctx.fillStyle = withAlpha(rc.color(t.lineColor), t.lineOpacity)
  for (const sp of spots) {
    const s = proj.toScreen(sp)
    ellipsePath(ctx, s.x, s.y, proj.refScale * 0.35, proj.refScale * 0.35 * (t.camera === 'top' ? 1 : 0.6))
    ctx.fill()
  }
  ctx.restore()

  // Annotations under players (zones, spotlights), then lines above.
  const under = t.annotations.filter((a) => a.kind === 'zone' || a.kind === 'spotlight' || a.kind === 'circle')
  const over = t.annotations.filter((a) => !(a.kind === 'zone' || a.kind === 'spotlight' || a.kind === 'circle'))
  ctx.save()
  polygonPath(ctx, q)
  ctx.clip()
  for (const a of under) paintAnnotation(ctx, a, t, proj, rc)
  ctx.restore()
  for (const a of over) paintAnnotation(ctx, a, t, proj, rc)
  if (opts.skipPlayers) return proj
  const reg = proj.region
  const players = t.players.filter((p) => (p.team === 'home' ? t.showHome : t.showAway) && p.x >= reg.x0 - 1 && p.x <= reg.x1 + 1 && p.y >= reg.y0 - 1 && p.y <= reg.y1 + 1)
  const sorted = [...players].sort((a, b) => proj.toScreen(a).y - proj.toScreen(b).y)
  for (const p of sorted) paintPlayer(ctx, p, t, proj, rc, colors)
  return proj
}

export function paintTactics(ctx: Ctx, el: TacticsElement, rc: RenderCtx) {
  const t = el.tactics
  const key = hashKey(['tac', t, el.width, el.height, rc.match.home.primary, rc.match.away.primary, rc.brand.palette, rc.brand.fonts])
  cachedPaint(ctx, key, el.width, el.height, (c) => paintTacticsBoard(c, t, el.width, el.height, rc), { direct: rc.mode === 'export', pad: 40 })
}
