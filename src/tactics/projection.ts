import type { PitchCamera, PitchView } from '../model/types'
import { PITCH_LENGTH, PITCH_WIDTH } from './formations'

export interface Pt {
  x: number
  y: number
}

export interface Region {
  x0: number
  x1: number
  y0: number
  y1: number
}

/** 3×3 homography stored row-major [a,b,c,d,e,f,g,h,1]. */
export type Mat3 = [number, number, number, number, number, number, number, number, number]

export function regionFor(view: PitchView, margin = 3): Region {
  const m = margin
  switch (view) {
    case 'half':
      return { x0: PITCH_LENGTH / 2 - 2, x1: PITCH_LENGTH + m, y0: -m, y1: PITCH_WIDTH + m }
    case 'attackingThird':
      return { x0: PITCH_LENGTH * (2 / 3) - 4, x1: PITCH_LENGTH + m, y0: -m, y1: PITCH_WIDTH + m }
    case 'defensiveThird':
      return { x0: -m, x1: PITCH_LENGTH / 3 + 4, y0: -m, y1: PITCH_WIDTH + m }
    default:
      return { x0: -m, x1: PITCH_LENGTH + m, y0: -m, y1: PITCH_WIDTH + m }
  }
}

/** Homography mapping the unit square to quad p0(0,0) p1(1,0) p2(1,1) p3(0,1). */
export function squareToQuad(p: [Pt, Pt, Pt, Pt]): Mat3 {
  const [p0, p1, p2, p3] = p
  const dx1 = p1.x - p2.x
  const dx2 = p3.x - p2.x
  const dx3 = p0.x - p1.x + p2.x - p3.x
  const dy1 = p1.y - p2.y
  const dy2 = p3.y - p2.y
  const dy3 = p0.y - p1.y + p2.y - p3.y
  let g = 0
  let h = 0
  if (Math.abs(dx3) > 1e-9 || Math.abs(dy3) > 1e-9) {
    const den = dx1 * dy2 - dx2 * dy1
    g = (dx3 * dy2 - dx2 * dy3) / den
    h = (dx1 * dy3 - dx3 * dy1) / den
  }
  const a = p1.x - p0.x + g * p1.x
  const b = p3.x - p0.x + h * p3.x
  const c = p0.x
  const d = p1.y - p0.y + g * p1.y
  const e = p3.y - p0.y + h * p3.y
  const f = p0.y
  return [a, b, c, d, e, f, g, h, 1]
}

export function applyMat(m: Mat3, u: number, v: number): Pt {
  const w = m[6] * u + m[7] * v + m[8]
  return { x: (m[0] * u + m[1] * v + m[2]) / w, y: (m[3] * u + m[4] * v + m[5]) / w }
}

export function invertMat(m: Mat3): Mat3 {
  const [a, b, c, d, e, f, g, h, i] = m
  const A = e * i - f * h
  const B = -(d * i - f * g)
  const C = d * h - e * g
  const det = a * A + b * B + c * C
  const inv = 1 / det
  return [
    A * inv,
    -(b * i - c * h) * inv,
    (b * f - c * e) * inv,
    B * inv,
    (a * i - c * g) * inv,
    -(a * f - c * d) * inv,
    C * inv,
    -(a * h - b * g) * inv,
    (a * e - b * d) * inv,
  ]
}

export interface Projection {
  region: Region
  quad: [Pt, Pt, Pt, Pt]
  toScreen: (p: Pt) => Pt
  toPitch: (s: Pt) => Pt
  /** Pixels per meter near a pitch point. */
  scaleAt: (p: Pt) => number
  /** Reference scale at the region center. */
  refScale: number
}

/**
 * Build the projection used by both the editor and the exporter.
 * camera 'top' is a uniform fit, 'perspective' maps the region to a trapezoid
 * (true projective foreshortening), 'isometric' is an oblique affine view.
 */
export function buildProjection(opts: {
  width: number
  height: number
  view: PitchView
  camera: PitchCamera
  vertical: boolean
  tilt: number
  padding?: number
}): Projection {
  const { width, height, view, camera, vertical } = opts
  const tilt = Math.max(0, Math.min(1, opts.tilt))
  const pad = opts.padding ?? 0
  const region = regionFor(view)
  const rw = region.x1 - region.x0
  const rh = region.y1 - region.y0
  // Screen-space dimensions of the region in meters, after orientation.
  const sw = vertical ? rh : rw
  const sh = vertical ? rw : rh
  const W = Math.max(1, width - pad * 2)
  const H = Math.max(1, height - pad * 2)

  let quad: [Pt, Pt, Pt, Pt]
  if (camera === 'perspective') {
    const k = 1 - 0.58 * tilt // far edge width factor
    const c = 1 - 0.5 * tilt // depth compression
    let near = W
    let ph = (sh / sw) * near * c
    if (ph > H) {
      near = (H / ph) * near
      ph = H
    }
    const far = near * k
    const cx = width / 2
    const top = pad + (H - ph) / 2
    const bottom = top + ph
    quad = [
      { x: cx - far / 2, y: top },
      { x: cx + far / 2, y: top },
      { x: cx + near / 2, y: bottom },
      { x: cx - near / 2, y: bottom },
    ]
  } else if (camera === 'isometric') {
    // Oblique: rotate the rectangle and squash vertically.
    const ang = (-24 * Math.PI) / 180
    const squash = 0.62
    const corners = [
      { x: 0, y: 0 },
      { x: sw, y: 0 },
      { x: sw, y: sh },
      { x: 0, y: sh },
    ].map((p) => ({ x: p.x * Math.cos(ang) - p.y * Math.sin(ang), y: (p.x * Math.sin(ang) + p.y * Math.cos(ang)) * squash }))
    const minX = Math.min(...corners.map((p) => p.x))
    const maxX = Math.max(...corners.map((p) => p.x))
    const minY = Math.min(...corners.map((p) => p.y))
    const maxY = Math.max(...corners.map((p) => p.y))
    const s = Math.min(W / (maxX - minX), H / (maxY - minY))
    const ox = pad + (W - (maxX - minX) * s) / 2 - minX * s
    const oy = pad + (H - (maxY - minY) * s) / 2 - minY * s
    const q = corners.map((p) => ({ x: ox + p.x * s, y: oy + p.y * s }))
    quad = [q[0], q[1], q[2], q[3]]
  } else {
    const s = Math.min(W / sw, H / sh)
    const ox = pad + (W - sw * s) / 2
    const oy = pad + (H - sh * s) / 2
    quad = [
      { x: ox, y: oy },
      { x: ox + sw * s, y: oy },
      { x: ox + sw * s, y: oy + sh * s },
      { x: ox, y: oy + sh * s },
    ]
  }

  const M = squareToQuad(quad)
  const Mi = invertMat(M)

  const toUV = (p: Pt): Pt =>
    vertical
      ? { x: (p.y - region.y0) / rh, y: (region.x1 - p.x) / rw }
      : { x: (p.x - region.x0) / rw, y: (p.y - region.y0) / rh }
  const fromUV = (uv: Pt): Pt =>
    vertical ? { x: region.x1 - uv.y * rw, y: region.y0 + uv.x * rh } : { x: region.x0 + uv.x * rw, y: region.y0 + uv.y * rh }

  const toScreen = (p: Pt) => {
    const uv = toUV(p)
    return applyMat(M, uv.x, uv.y)
  }
  const toPitch = (s: Pt) => fromUV(applyMat(Mi, s.x, s.y))
  const scaleAt = (p: Pt) => {
    const a = toScreen({ x: p.x - 0.5, y: p.y })
    const b = toScreen({ x: p.x + 0.5, y: p.y })
    const c = toScreen({ x: p.x, y: p.y - 0.5 })
    const d = toScreen({ x: p.x, y: p.y + 0.5 })
    return Math.sqrt(Math.hypot(b.x - a.x, b.y - a.y) * Math.hypot(d.x - c.x, d.y - c.y))
  }
  const center = { x: (region.x0 + region.x1) / 2, y: (region.y0 + region.y1) / 2 }
  return { region, quad, toScreen, toPitch, scaleAt, refScale: scaleAt(center) }
}
