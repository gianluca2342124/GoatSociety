// ─────────────────────────────────────────────────────────────────────────────
// GOAT SOCIETY mascot — an original faceted (low-poly) goat head.
// The geometry is authored as contour rings with depth (z) for the right half
// and mirrored. Each facet gets real Lambert + rim lighting from its normal,
// which produces the cinematic look without any external 3D asset.
// All variants (icon, cinematic, background, outline) derive from this mesh.
// ─────────────────────────────────────────────────────────────────────────────
import { parseColor } from '../model/tokens'

export const GOAT_VIEW = { width: 512, height: 660 }
const CX = 256

type V3 = [number, number, number]
type Tri = [V3, V3, V3]

export interface GoatPart {
  name: string
  tris: Tri[]
}

/** Triangulate the strip between two polylines (zipper by shortest diagonal). */
function strip(a: V3[], b: V3[]): Tri[] {
  const out: Tri[] = []
  let i = 0
  let j = 0
  while (i < a.length - 1 || j < b.length - 1) {
    if (i === a.length - 1) {
      out.push([a[i], b[j], b[j + 1]])
      j++
    } else if (j === b.length - 1) {
      out.push([a[i], b[j], a[i + 1]])
      i++
    } else {
      const d1 = Math.hypot(a[i + 1][0] - b[j][0], a[i + 1][1] - b[j][1])
      const d2 = Math.hypot(a[i][0] - b[j + 1][0], a[i][1] - b[j + 1][1])
      if (d1 < d2) {
        out.push([a[i], b[j], a[i + 1]])
        i++
      } else {
        out.push([a[i], b[j], b[j + 1]])
        j++
      }
    }
  }
  return out
}

const v = (x: number, y: number, z: number): V3 => [x, y, z]

// ── Right-half authoring ───────────────────────────────────────────────────
// Face: outer silhouette ring → cheek ring → center ridge.
const faceOuter: V3[] = [
  v(304, 150, 10),
  v(336, 172, 6),
  v(348, 204, 4),
  v(352, 240, 4),
  v(344, 280, 6),
  v(330, 326, 6),
  v(316, 372, 6),
  v(304, 414, 8),
  v(294, 450, 10),
  v(286, 478, 12),
  v(274, 498, 14),
  v(256, 506, 18),
]
const faceCheek: V3[] = [
  v(292, 146, 28),
  v(320, 180, 30),
  v(334, 214, 28),
  v(338, 246, 26),
  v(330, 288, 30),
  v(316, 334, 32),
  v(302, 378, 34),
  v(292, 418, 36),
  v(284, 452, 36),
  v(276, 478, 32),
  v(266, 494, 30),
  v(256, 500, 32),
]
const faceMid: V3[] = [
  v(278, 142, 44),
  v(300, 182, 50),
  v(314, 222, 48),
  v(312, 266, 40),
  v(302, 314, 52),
  v(290, 358, 56),
  v(281, 400, 60),
  v(276, 436, 62),
  v(272, 464, 56),
  v(265, 486, 46),
  v(256, 496, 44),
]
const faceCenter: V3[] = [
  v(CX, 132, 54),
  v(CX, 178, 64),
  v(CX, 222, 68),
  v(CX, 266, 70),
  v(CX, 312, 82),
  v(CX, 356, 88),
  v(CX, 400, 92),
  v(CX, 436, 94),
  v(CX, 464, 86),
  v(CX, 488, 72),
]

// Horn: inner edge, spine and outer edge, base → tip, with alternating ridge depth (rings).
const hornInner: V3[] = [
  v(304, 150, 10),
  v(306, 124, 10),
  v(311, 98, 10),
  v(320, 74, 10),
  v(333, 52, 10),
  v(350, 33, 10),
  v(371, 18, 10),
  v(395, 8, 10),
  v(420, 3, 10),
  v(446, 4, 8),
]
const hornOuter: V3[] = [
  v(336, 172, 6),
  v(352, 146, 6),
  v(366, 118, 6),
  v(380, 92, 6),
  v(396, 68, 6),
  v(413, 50, 6),
  v(432, 36, 6),
  v(450, 26, 6),
  v(466, 19, 6),
  v(476, 14, 6),
]
const hornTip: V3 = v(486, 6, 4)
const hornSpine: V3[] = hornInner.map((p, i) => {
  const q = hornOuter[i]
  const ridge = i % 2 === 0 ? 40 : 24
  return v(p[0] * 0.45 + q[0] * 0.55, p[1] * 0.45 + q[1] * 0.55, ridge - i * 2)
})

// Ear: upper edge, center fold, lower edge (root → tip).
const earUpper: V3[] = [v(348, 204, 4), v(376, 198, 10), v(406, 204, 10), v(430, 220, 8), v(450, 242, 4)]
const earLower: V3[] = [v(352, 240, 4), v(380, 254, 8), v(408, 260, 8), v(432, 256, 6), v(450, 242, 4)]
const earFold: V3[] = earUpper.map((p, i) => {
  const q = earLower[i]
  return v((p[0] + q[0]) / 2 + 2, (p[1] + q[1]) / 2 + 1, i === earUpper.length - 1 ? 4 : 22 - i * 3)
})

// Beard: strands from the chin to a long sharp point (zig-zag edge reads as hair).
const beardEdge: V3[] = [
  v(282, 490, 10),
  v(294, 520, 10),
  v(285, 527, 10),
  v(293, 556, 10),
  v(282, 565, 10),
  v(285, 592, 10),
  v(274, 600, 9),
  v(271, 624, 8),
  v(263, 630, 7),
  v(256, 656, 6),
]
const beardMid: V3[] = [v(268, 498, 30), v(274, 538, 32), v(272, 578, 30), v(265, 612, 24), v(256, 656, 6)]
const beardCenter: V3[] = [v(CX, 502, 40), v(CX, 544, 44), v(CX, 584, 40), v(CX, 618, 30), v(CX, 656, 6)]

function mirror(t: Tri): Tri {
  return [t[0], t[2], t[1]].map((p) => [GOAT_VIEW.width - p[0], p[1], p[2]] as V3) as Tri
}

function both(tris: Tri[]): Tri[] {
  return [...tris, ...tris.map(mirror)]
}

let cachedParts: GoatPart[] | null = null

export function goatParts(): GoatPart[] {
  if (cachedParts) return cachedParts
  const hornTris = [
    ...strip(hornInner, hornSpine),
    ...strip(hornSpine, hornOuter),
    [hornInner[hornInner.length - 1], hornSpine[hornSpine.length - 1], hornTip] as Tri,
    [hornSpine[hornSpine.length - 1], hornOuter[hornOuter.length - 1], hornTip] as Tri,
  ]
  cachedParts = [
    { name: 'horns', tris: both(hornTris) },
    { name: 'ears', tris: both([...strip(earUpper, earFold), ...strip(earFold, earLower)]) },
    { name: 'face', tris: both([...strip(faceOuter, faceCheek), ...strip(faceCheek, faceMid), ...strip(faceMid, faceCenter)]) },
    { name: 'beard', tris: both([...strip(beardEdge, beardMid), ...strip(beardMid, beardCenter)]) },
  ]
  return cachedParts
}

/** Detail overlays (right half; mirrored when drawn). */
export const GOAT_DETAILS = {
  brow: [
    [266, 254],
    [302, 236],
    [340, 246],
    [324, 260],
    [284, 268],
  ] as [number, number][],
  eye: [
    [279, 280],
    [300, 264],
    [334, 254],
    [312, 284],
  ] as [number, number][],
  pupil: { cx: 307, cy: 271, rx: 11, ry: 3, rot: -0.3 },
  nosePad: [
    [CX, 440],
    [274, 444],
    [284, 462],
    [274, 480],
    [CX, 486],
  ] as [number, number][],
  nostril: [
    [262, 456],
    [276, 450],
    [282, 464],
    [270, 472],
  ] as [number, number][],
  earInner: [
    [360, 214],
    [384, 210],
    [410, 218],
    [434, 238],
    [408, 246],
    [382, 244],
    [362, 232],
  ] as [number, number][],
}

/** Outline of the full head (right half then mirrored left) for silhouettes / rim. */
export function goatSilhouette(): [number, number][] {
  const right: [number, number][] = [
    [CX, 136],
    ...hornInner.map((p) => [p[0], p[1]] as [number, number]),
    [hornTip[0], hornTip[1]],
    ...[...hornOuter].reverse().map((p) => [p[0], p[1]] as [number, number]),
    ...earUpper.map((p) => [p[0], p[1]] as [number, number]),
    ...[...earLower].reverse().slice(1).map((p) => [p[0], p[1]] as [number, number]),
    ...faceOuter.slice(4, 10).map((p) => [p[0], p[1]] as [number, number]),
    ...beardEdge.map((p) => [p[0], p[1]] as [number, number]),
  ]
  const left = [...right].reverse().map(([x, y]) => [GOAT_VIEW.width - x, y] as [number, number])
  return [...right, ...left.slice(1)]
}

// ── Lighting ───────────────────────────────────────────────────────────────

export interface GoatLighting {
  base: string
  shadow: string
  rim: string
  rimIntensity: number
  /** Key light azimuth in degrees (0 = from right, 90 = from top). */
  lightAngle: number
  contrast: number
  /** Flat = no lighting, single color (icon). */
  flat: boolean
}

function norm(a: V3): V3 {
  const l = Math.hypot(a[0], a[1], a[2]) || 1
  return [a[0] / l, a[1] / l, a[2] / l]
}

export interface LitFacet {
  pts: [number, number][]
  color: string
  part: string
  rim: number
}

export function litFacets(l: GoatLighting): LitFacet[] {
  const base = parseColor(l.base)
  const shadow = parseColor(l.shadow)
  const rim = parseColor(l.rim)
  const ang = (l.lightAngle * Math.PI) / 180
  // Screen y points down, so a light "from the top" has negative y.
  const light = norm([Math.cos(ang) * 0.75, -Math.sin(ang) * 0.75, 0.62])
  const zScale = 1.15
  const out: LitFacet[] = []
  for (const part of goatParts()) {
    for (const t of part.tris) {
      const [a, b, c] = t
      const ab: V3 = [b[0] - a[0], b[1] - a[1], (b[2] - a[2]) * zScale]
      const ac: V3 = [c[0] - a[0], c[1] - a[1], (c[2] - a[2]) * zScale]
      let n = norm([ab[1] * ac[2] - ab[2] * ac[1], ab[2] * ac[0] - ab[0] * ac[2], ab[0] * ac[1] - ab[1] * ac[0]])
      if (n[2] < 0) n = [-n[0], -n[1], -n[2]]
      const pts: [number, number][] = [
        [a[0], a[1]],
        [b[0], b[1]],
        [c[0], c[1]],
      ]
      if (l.flat) {
        out.push({ pts, color: l.base, part: part.name, rim: 0 })
        continue
      }
      const diffuse = Math.max(0, n[0] * light[0] + n[1] * light[1] + n[2] * light[2])
      let shade = Math.pow(diffuse, 1 + l.contrast * 1.6)
      shade = 0.12 + shade * 0.88
      // Rim: facets turned away from the camera, lit from behind on both sides.
      const side = Math.hypot(n[0], n[1])
      const rt = Math.max(0, Math.min(1, (side - 0.6) / 0.32))
      const rimAmt = rt * rt * (3 - 2 * rt) * l.rimIntensity * (n[1] < 0.3 ? 0.62 : 0.4)
      const mixc = (x: number, y: number) => x * shade + y * (1 - shade)
      let r = mixc(base.r, shadow.r)
      let g = mixc(base.g, shadow.g)
      let bb = mixc(base.b, shadow.b)
      r = Math.min(255, r + rim.r * rimAmt)
      g = Math.min(255, g + rim.g * rimAmt)
      bb = Math.min(255, bb + rim.b * rimAmt)
      out.push({ pts, color: `rgb(${r | 0},${g | 0},${bb | 0})`, part: part.name, rim: rimAmt })
    }
  }
  return out
}
