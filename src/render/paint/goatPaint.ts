import { GOAT_DETAILS, GOAT_VIEW, goatSilhouette, litFacets } from '../../brand/goat'
import { withAlpha } from '../../model/tokens'
import { seeded } from './noise'

export interface GoatPaintOptions {
  variant: 'icon' | 'cinematic' | 'background' | 'outline'
  base: string
  shadow: string
  rim: string
  rimIntensity: number
  backlight: string
  backlightAmount: number
  lightAngle: number
  eye: string
  eyeGlow: number
  fog: number
  fadeBottom: number
  facetGap: number
  contrast: number
}

type P = [number, number]

function poly(ctx: CanvasRenderingContext2D, pts: P[], mirrorX = false) {
  ctx.beginPath()
  pts.forEach(([x, y], i) => {
    const px = mirrorX ? GOAT_VIEW.width - x : x
    if (i === 0) ctx.moveTo(px, y)
    else ctx.lineTo(px, y)
  })
  ctx.closePath()
}

function bothSides(ctx: CanvasRenderingContext2D, pts: P[], paint: () => void) {
  poly(ctx, pts)
  paint()
  poly(ctx, pts, true)
  paint()
}

/** Draws the mascot into a w×h box (contain-fit). `ctx` is already scaled to CSS pixels. */
export function paintGoat(ctx: CanvasRenderingContext2D, w: number, h: number, o: GoatPaintOptions) {
  const s = Math.min(w / GOAT_VIEW.width, h / GOAT_VIEW.height)
  const ox = (w - GOAT_VIEW.width * s) / 2
  const oy = (h - GOAT_VIEW.height * s) / 2
  const cinematic = o.variant === 'cinematic' || o.variant === 'background'

  // Backlight halo behind the head (an ellipse that fades out before the box edges).
  if (cinematic && o.backlightAmount > 0) {
    const cx = w / 2
    const cy = Math.min(h / 2, oy + 250 * s)
    const r = Math.min(w / 2, cy, h - cy) * 0.98
    const stretch = Math.max(1, Math.min(1.7, h / Math.max(1, w)))
    const ry = Math.min(r * stretch, cy, h - cy)
    ctx.save()
    ctx.translate(cx, cy)
    ctx.scale(1, ry / r)
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, r)
    g.addColorStop(0, withAlpha(o.backlight, 0.55 * o.backlightAmount))
    g.addColorStop(0.4, withAlpha(o.backlight, 0.2 * o.backlightAmount))
    g.addColorStop(1, withAlpha(o.backlight, 0))
    ctx.fillStyle = g
    ctx.fillRect(-r, -r, r * 2, r * 2)
    ctx.restore()
  }

  ctx.save()
  ctx.translate(ox, oy)
  ctx.scale(s, s)
  const sil = goatSilhouette()

  // Rim glow along the silhouette (drawn behind the facets so only the edge glows).
  if (cinematic && o.rimIntensity > 0) {
    ctx.save()
    ctx.shadowColor = withAlpha(o.rim, Math.min(1, 0.9 * o.rimIntensity))
    ctx.shadowBlur = 38 * s * 2
    ctx.lineJoin = 'round'
    ctx.strokeStyle = withAlpha(o.rim, Math.min(1, 0.85 * o.rimIntensity))
    ctx.lineWidth = 5
    poly(ctx, sil)
    ctx.stroke()
    ctx.shadowBlur = 12 * s * 2
    ctx.stroke()
    ctx.restore()
  }

  const facets = litFacets({
    base: o.base,
    shadow: o.shadow,
    rim: o.rim,
    rimIntensity: o.variant === 'icon' || o.variant === 'outline' ? 0 : o.rimIntensity,
    lightAngle: o.lightAngle,
    contrast: o.contrast,
    flat: o.variant === 'icon' || o.variant === 'outline',
  })

  if (o.variant === 'outline') {
    ctx.lineJoin = 'round'
    ctx.strokeStyle = withAlpha(o.base, 0.5)
    ctx.lineWidth = 1.1
    for (const f of facets) {
      poly(ctx, f.pts)
      ctx.stroke()
    }
    ctx.strokeStyle = o.base
    ctx.lineWidth = 3
    poly(ctx, sil)
    ctx.stroke()
  } else {
    ctx.lineJoin = 'round'
    for (const f of facets) {
      poly(ctx, f.pts)
      ctx.fillStyle = f.color
      ctx.fill()
      ctx.strokeStyle = f.color
      ctx.lineWidth = 0.9
      ctx.stroke()
    }
    if (o.facetGap > 0) {
      ctx.save()
      ctx.globalCompositeOperation = 'destination-out'
      ctx.strokeStyle = '#000'
      ctx.lineWidth = o.facetGap
      for (const f of facets) {
        poly(ctx, f.pts)
        ctx.stroke()
      }
      ctx.restore()
    }
  }

  // Details: ear inner, brow, nose, nostrils, eyes.
  const d = GOAT_DETAILS
  const flat = o.variant === 'icon'
  const detailDark = flat ? null : withAlpha(o.shadow, 0.75)
  if (o.variant !== 'outline') {
    // Inner ear
    bothSides(ctx, d.earInner, () => {
      if (flat) {
        ctx.save()
        ctx.globalCompositeOperation = 'destination-out'
        ctx.fillStyle = 'rgba(0,0,0,0.55)'
        ctx.fill()
        ctx.restore()
      } else {
        ctx.fillStyle = withAlpha(o.shadow, 0.55)
        ctx.fill()
      }
    })
    // Brow ridge — gives the intimidating, focused expression.
    bothSides(ctx, d.brow, () => {
      if (flat) {
        ctx.save()
        ctx.globalCompositeOperation = 'destination-out'
        ctx.fillStyle = 'rgba(0,0,0,0.28)'
        ctx.fill()
        ctx.restore()
      } else {
        ctx.fillStyle = detailDark as string
        ctx.fill()
      }
    })
    // Nose pad
    bothSides(ctx, d.nosePad, () => {
      if (flat) {
        ctx.save()
        ctx.globalCompositeOperation = 'destination-out'
        ctx.fillStyle = 'rgba(0,0,0,0.22)'
        ctx.fill()
        ctx.restore()
      } else {
        ctx.fillStyle = withAlpha(o.shadow, 0.5)
        ctx.fill()
      }
    })
    bothSides(ctx, d.nostril, () => {
      if (flat) {
        ctx.save()
        ctx.globalCompositeOperation = 'destination-out'
        ctx.fillStyle = '#000'
        ctx.fill()
        ctx.restore()
      } else {
        ctx.fillStyle = withAlpha('#000000', 0.85)
        ctx.fill()
      }
    })
  }

  // Eyes: almond shape with horizontal goat pupil and optional glow.
  const drawEye = (mirrorX: boolean) => {
    poly(ctx, d.eye, mirrorX)
    if (flat && o.eyeGlow <= 0) {
      ctx.save()
      ctx.globalCompositeOperation = 'destination-out'
      ctx.fillStyle = '#000'
      ctx.fill()
      ctx.restore()
      return
    }
    ctx.save()
    if (o.eyeGlow > 0) {
      ctx.shadowColor = o.eye
      ctx.shadowBlur = 26 * o.eyeGlow * s * 2
    }
    ctx.fillStyle = o.variant === 'outline' ? o.eye : o.eye
    ctx.fill()
    if (o.eyeGlow > 0) {
      ctx.shadowBlur = 60 * o.eyeGlow * s * 2
      ctx.globalAlpha = 0.6
      ctx.fill()
    }
    ctx.restore()
    const p = d.pupil
    ctx.save()
    ctx.translate(mirrorX ? GOAT_VIEW.width - p.cx : p.cx, p.cy)
    ctx.rotate(mirrorX ? -p.rot : p.rot)
    ctx.beginPath()
    ctx.ellipse(0, 0, p.rx, p.ry, 0, 0, Math.PI * 2)
    ctx.fillStyle = '#050506'
    ctx.fill()
    ctx.restore()
  }
  drawEye(false)
  drawEye(true)
  ctx.restore()

  // Atmospheric fog drifting across the lower half.
  if (cinematic && o.fog > 0) {
    const rnd = seeded(7)
    ctx.save()
    for (let i = 0; i < 26; i++) {
      const fx = rnd() * w
      const fy = h * (0.45 + rnd() * 0.6)
      // Keep every fog puff inside the box so no hard edge appears.
      const fr = Math.min((0.18 + rnd() * 0.3) * w, fx, w - fx, h - fy + w * 0.05)
      if (fr <= 4) continue
      const g = ctx.createRadialGradient(fx, fy, 0, fx, fy, fr)
      const a = 0.09 * o.fog * (0.5 + rnd())
      g.addColorStop(0, `rgba(190,196,204,${a})`)
      g.addColorStop(1, 'rgba(190,196,204,0)')
      ctx.fillStyle = g
      ctx.fillRect(fx - fr, fy - fr, fr * 2, fr * 2)
    }
    ctx.restore()
  }

  // Fade to transparent at the bottom (destination-in gradient mask).
  if (o.fadeBottom > 0) {
    ctx.save()
    ctx.globalCompositeOperation = 'destination-in'
    const g = ctx.createLinearGradient(0, 0, 0, h)
    const start = Math.max(0, 1 - o.fadeBottom)
    g.addColorStop(0, 'rgba(0,0,0,1)')
    g.addColorStop(start * 0.98, 'rgba(0,0,0,1)')
    g.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, w, h)
    ctx.restore()
  }
}
