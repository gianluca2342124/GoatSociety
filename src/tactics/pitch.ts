import { PITCH_LENGTH as L, PITCH_WIDTH as W } from './formations'
import type { Pt } from './projection'

function arc(cx: number, cy: number, r: number, a0: number, a1: number, steps = 48): Pt[] {
  const pts: Pt[] = []
  for (let i = 0; i <= steps; i++) {
    const a = a0 + ((a1 - a0) * i) / steps
    pts.push({ x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r })
  }
  return pts
}

function rect(x0: number, y0: number, x1: number, y1: number): Pt[] {
  return [
    { x: x0, y: y0 },
    { x: x1, y: y0 },
    { x: x1, y: y1 },
    { x: x0, y: y1 },
    { x: x0, y: y0 },
  ]
}

/** FIFA-standard pitch markings as polylines in meters. */
export function pitchMarkings(): { lines: Pt[][]; spots: Pt[] } {
  const lines: Pt[][] = []
  lines.push(rect(0, 0, L, W))
  lines.push([
    { x: L / 2, y: 0 },
    { x: L / 2, y: W },
  ])
  lines.push(arc(L / 2, W / 2, 9.15, 0, Math.PI * 2, 72))
  const boxW = 40.32
  const goalAreaW = 18.32
  lines.push(rect(0, (W - boxW) / 2, 16.5, (W + boxW) / 2))
  lines.push(rect(L - 16.5, (W - boxW) / 2, L, (W + boxW) / 2))
  lines.push(rect(0, (W - goalAreaW) / 2, 5.5, (W + goalAreaW) / 2))
  lines.push(rect(L - 5.5, (W - goalAreaW) / 2, L, (W + goalAreaW) / 2))
  const a = Math.acos(5.5 / 9.15)
  lines.push(arc(11, W / 2, 9.15, -a, a, 24))
  lines.push(arc(L - 11, W / 2, 9.15, Math.PI - a, Math.PI + a, 24))
  lines.push(arc(0, 0, 1, 0, Math.PI / 2, 8))
  lines.push(arc(L, 0, 1, Math.PI / 2, Math.PI, 8))
  lines.push(arc(L, W, 1, Math.PI, Math.PI * 1.5, 8))
  lines.push(arc(0, W, 1, Math.PI * 1.5, Math.PI * 2, 8))
  // Goals
  const gw = 7.32
  lines.push([
    { x: 0, y: (W - gw) / 2 },
    { x: -1.8, y: (W - gw) / 2 },
    { x: -1.8, y: (W + gw) / 2 },
    { x: 0, y: (W + gw) / 2 },
  ])
  lines.push([
    { x: L, y: (W - gw) / 2 },
    { x: L + 1.8, y: (W - gw) / 2 },
    { x: L + 1.8, y: (W + gw) / 2 },
    { x: L, y: (W + gw) / 2 },
  ])
  const spots = [
    { x: L / 2, y: W / 2 },
    { x: 11, y: W / 2 },
    { x: L - 11, y: W / 2 },
  ]
  return { lines, spots }
}

/** Mowing stripes as quads along the pitch length. */
export function pitchStripes(count = 18): Pt[][] {
  const out: Pt[][] = []
  const sw = L / count
  for (let i = 0; i < count; i += 2) {
    const x0 = i * sw
    const x1 = x0 + sw
    out.push([
      { x: x0, y: 0 },
      { x: x1, y: 0 },
      { x: x1, y: W },
      { x: x0, y: W },
    ])
  }
  return out
}

/** Subdivide a polyline so projective distortion stays smooth. */
export function densify(pts: Pt[], maxSeg = 3): Pt[] {
  const out: Pt[] = []
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i]
    const b = pts[i + 1]
    const d = Math.hypot(b.x - a.x, b.y - a.y)
    const n = Math.max(1, Math.ceil(d / maxSeg))
    for (let k = 0; k < n; k++) out.push({ x: a.x + ((b.x - a.x) * k) / n, y: a.y + ((b.y - a.y) * k) / n })
  }
  if (pts.length) out.push(pts[pts.length - 1])
  return out
}

/** Quadratic bezier sampled in pitch space. */
export function quadCurve(a: Pt, c: Pt, b: Pt, steps = 32): Pt[] {
  const out: Pt[] = []
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    const mt = 1 - t
    out.push({ x: mt * mt * a.x + 2 * mt * t * c.x + t * t * b.x, y: mt * mt * a.y + 2 * mt * t * c.y + t * t * b.y })
  }
  return out
}

/** Sine-wave path used for dribbles/carries ("run with ball"). */
export function wavyPath(a: Pt, b: Pt, amplitude = 0.8, waves = 6, steps = 80): Pt[] {
  const dx = b.x - a.x
  const dy = b.y - a.y
  const len = Math.hypot(dx, dy) || 1
  const nx = -dy / len
  const ny = dx / len
  const out: Pt[] = []
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    const fade = Math.min(1, t * 6, (1 - t) * 6)
    const off = Math.sin(t * Math.PI * 2 * waves) * amplitude * fade
    out.push({ x: a.x + dx * t + nx * off, y: a.y + dy * t + ny * off })
  }
  return out
}
