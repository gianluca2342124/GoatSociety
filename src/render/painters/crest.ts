import type { CrestElement, CrestStyle } from '../../model/types'
import { mix, withAlpha } from '../../model/tokens'
import type { RenderCtx } from '../context'
import { ellipsePath, polygonPath, setShadow, clearShadow, type Ctx } from '../paint/canvas'
import { drawImageFit } from './basic'
import { drawLabel } from '../text/draw'

export interface CrestTeam {
  name: string
  abbr: string
  primary: string
  secondary: string
  crestAssetId: string | null
  crestStyle: CrestStyle
}

/** Badge outline path in a size×size box. Returns the inner content box. */
function badgePath(ctx: Ctx, shape: CrestStyle['shape'], s: number) {
  const w = s
  const h = s
  switch (shape) {
    case 'round':
      ellipsePath(ctx, w / 2, h / 2, w * 0.46, h * 0.46)
      break
    case 'hex': {
      const pts = []
      for (let i = 0; i < 6; i++) {
        const a = -Math.PI / 2 + (Math.PI / 3) * i
        pts.push({ x: w / 2 + Math.cos(a) * w * 0.46, y: h / 2 + Math.sin(a) * h * 0.47 })
      }
      polygonPath(ctx, pts)
      break
    }
    case 'diamond':
      polygonPath(ctx, [
        { x: w / 2, y: h * 0.03 },
        { x: w * 0.95, y: h / 2 },
        { x: w / 2, y: h * 0.97 },
        { x: w * 0.05, y: h / 2 },
      ])
      break
    case 'classic': {
      ctx.beginPath()
      ctx.moveTo(w * 0.12, h * 0.1)
      ctx.lineTo(w * 0.36, h * 0.06)
      ctx.lineTo(w * 0.5, h * 0.12)
      ctx.lineTo(w * 0.64, h * 0.06)
      ctx.lineTo(w * 0.88, h * 0.1)
      ctx.lineTo(w * 0.86, h * 0.52)
      ctx.bezierCurveTo(w * 0.84, h * 0.76, w * 0.66, h * 0.88, w * 0.5, h * 0.96)
      ctx.bezierCurveTo(w * 0.34, h * 0.88, w * 0.16, h * 0.76, w * 0.14, h * 0.52)
      ctx.closePath()
      break
    }
    default: {
      // Heater shield
      ctx.beginPath()
      ctx.moveTo(w * 0.12, h * 0.08)
      ctx.lineTo(w * 0.88, h * 0.08)
      ctx.lineTo(w * 0.88, h * 0.46)
      ctx.bezierCurveTo(w * 0.88, h * 0.74, w * 0.7, h * 0.88, w * 0.5, h * 0.96)
      ctx.bezierCurveTo(w * 0.3, h * 0.88, w * 0.12, h * 0.74, w * 0.12, h * 0.46)
      ctx.closePath()
    }
  }
}

/** Original placeholder badge generated from team colors and initials. */
export function paintPlaceholderCrest(ctx: Ctx, size: number, team: CrestTeam) {
  const s = size
  const primary = team.primary
  const secondary = team.secondary
  const gold = '#CBAA62'
  const dark = '#0B0C0F'
  ctx.save()
  // Outer rim
  badgePath(ctx, team.crestStyle.shape, s)
  const rimGrad = ctx.createLinearGradient(0, 0, s, s)
  rimGrad.addColorStop(0, mix(gold, '#ffffff', 0.25))
  rimGrad.addColorStop(0.5, gold)
  rimGrad.addColorStop(1, mix(gold, '#000000', 0.45))
  ctx.fillStyle = rimGrad
  ctx.fill()
  // Inner field (scaled)
  ctx.save()
  const inset = 0.075
  ctx.translate(s * inset, s * inset)
  ctx.scale(1 - inset * 2, 1 - inset * 2)
  badgePath(ctx, team.crestStyle.shape, s)
  ctx.fillStyle = dark
  ctx.fill()
  ctx.save()
  ctx.translate(s * 0.03, s * 0.03)
  ctx.scale(0.94, 0.94)
  badgePath(ctx, team.crestStyle.shape, s)
  ctx.clip()
  ctx.fillStyle = primary
  ctx.fillRect(0, 0, s, s)
  ctx.fillStyle = secondary
  switch (team.crestStyle.pattern) {
    case 'stripes': {
      const n = 5
      const sw = s / (n * 2 - 1)
      for (let i = 1; i < n * 2 - 1; i += 2) ctx.fillRect(i * sw, 0, sw, s)
      break
    }
    case 'halves':
      ctx.fillRect(s / 2, 0, s / 2, s)
      break
    case 'hoops': {
      const n = 5
      const hh = s / (n * 2 - 1)
      for (let i = 1; i < n * 2 - 1; i += 2) ctx.fillRect(0, i * hh, s, hh)
      break
    }
    case 'sash':
      ctx.beginPath()
      ctx.moveTo(0, s * 0.18)
      ctx.lineTo(s * 0.18, 0)
      ctx.lineTo(s, s * 0.82)
      ctx.lineTo(s * 0.82, s)
      ctx.closePath()
      ctx.fill()
      break
    case 'chevron':
      ctx.beginPath()
      ctx.moveTo(0, s * 0.35)
      ctx.lineTo(s / 2, s * 0.6)
      ctx.lineTo(s, s * 0.35)
      ctx.lineTo(s, s * 0.55)
      ctx.lineTo(s / 2, s * 0.8)
      ctx.lineTo(0, s * 0.55)
      ctx.closePath()
      ctx.fill()
      break
    default:
      break
  }
  // Monogram plate
  const plateH = s * 0.3
  const plateY = s * 0.36
  ctx.fillStyle = withAlpha(dark, 0.82)
  ctx.fillRect(0, plateY, s, plateH)
  ctx.fillStyle = withAlpha(gold, 0.9)
  ctx.fillRect(0, plateY, s, s * 0.012)
  ctx.fillRect(0, plateY + plateH - s * 0.012, s, s * 0.012)
  // Sheen
  const sheen = ctx.createLinearGradient(0, 0, s * 0.8, s)
  sheen.addColorStop(0, 'rgba(255,255,255,0.28)')
  sheen.addColorStop(0.4, 'rgba(255,255,255,0.04)')
  sheen.addColorStop(1, 'rgba(0,0,0,0.25)')
  ctx.fillStyle = sheen
  ctx.fillRect(0, 0, s, s)
  ctx.restore()
  ctx.restore()
  // Initials
  const abbr = (team.abbr || team.name.slice(0, 3)).toUpperCase().slice(0, 4)
  drawLabel(ctx, abbr, s / 2, plateY + plateH / 2 + s * 0.005, {
    family: 'Big Shoulders Display Variable',
    size: s * 0.2,
    weight: 800,
    color: '#F3F0E8',
    align: 'center',
    baseline: 'middle',
    letterSpacing: s * 0.01,
    maxWidth: s * 0.62,
  })
  // Small star on top
  const starY = s * 0.2
  ctx.beginPath()
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (Math.PI / 5) * i
    const r = (i % 2 === 0 ? 0.045 : 0.019) * s
    const x = s / 2 + Math.cos(a) * r
    const y = starY + Math.sin(a) * r
    if (i === 0) ctx.moveTo(x, y)
    else ctx.lineTo(x, y)
  }
  ctx.closePath()
  ctx.fillStyle = gold
  ctx.fill()
  ctx.restore()
}

export function teamForCrest(el: CrestElement, rc: RenderCtx): CrestTeam {
  if (el.side === 'custom') {
    return {
      name: el.customName || 'Equipo',
      abbr: (el.customName || 'EQ').slice(0, 3),
      primary: '#2A2F38',
      secondary: '#CBAA62',
      crestAssetId: el.customAssetId,
      crestStyle: { shape: 'shield', pattern: 'solid' },
    }
  }
  const t = el.side === 'home' ? rc.match.home : rc.match.away
  return { name: t.name, abbr: t.abbr, primary: t.primary, secondary: t.secondary, crestAssetId: t.crestAssetId, crestStyle: t.crestStyle }
}

/** Draws a crest (uploaded image or placeholder) centered in a w×h box. */
export function paintCrestBox(ctx: Ctx, team: CrestTeam, w: number, h: number, rc: RenderCtx, opts: { aura?: number; ring?: CrestElement['ring'] } = {}) {
  const size = Math.min(w, h)
  const ox = (w - size) / 2
  const oy = (h - size) / 2
  const aura = opts.aura ?? 0
  if (aura > 0) {
    const g = ctx.createRadialGradient(w / 2, h / 2, size * 0.1, w / 2, h / 2, size * 0.85)
    g.addColorStop(0, withAlpha(team.primary, 0.55 * aura))
    g.addColorStop(0.5, withAlpha(team.primary, 0.18 * aura))
    g.addColorStop(1, withAlpha(team.primary, 0))
    ctx.fillStyle = g
    ctx.fillRect(w / 2 - size, h / 2 - size, size * 2, size * 2)
  }
  const ring = opts.ring
  if (ring && ring.enabled) {
    ctx.save()
    if (ring.glow > 0) setShadow(ctx, rc.color(ring.color), ring.glow)
    ellipsePath(ctx, w / 2, h / 2, size / 2 - ring.width / 2, size / 2 - ring.width / 2)
    ctx.strokeStyle = rc.color(ring.color)
    ctx.lineWidth = ring.width
    ctx.stroke()
    clearShadow(ctx)
    ctx.restore()
  }
  const inner = ring && ring.enabled ? size * 0.72 : size
  const ix = ox + (size - inner) / 2
  const iy = oy + (size - inner) / 2
  const img = team.crestAssetId ? rc.image(team.crestAssetId) : null
  ctx.save()
  ctx.translate(ix, iy)
  if (img) {
    setShadow(ctx, 'rgba(0,0,0,0.55)', inner * 0.08, 0, inner * 0.04)
    drawImageFit(ctx, img, inner, inner, 'contain')
  } else {
    // One shadow for the whole badge silhouette, then the badge itself.
    ctx.save()
    setShadow(ctx, 'rgba(0,0,0,0.6)', inner * 0.08, 0, inner * 0.04)
    badgePath(ctx, team.crestStyle.shape, inner)
    ctx.fillStyle = '#0B0C0F'
    ctx.fill()
    ctx.restore()
    paintPlaceholderCrest(ctx, inner, team)
  }
  ctx.restore()
}

export function paintCrest(ctx: Ctx, el: CrestElement, rc: RenderCtx) {
  paintCrestBox(ctx, teamForCrest(el, rc), el.width, el.height, rc, { aura: el.aura, ring: el.ring })
}
