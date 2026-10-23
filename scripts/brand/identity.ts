// GOAT SOCIETY identity proposals: the social avatar and the club crest.
//
// The head is the brand goat of src/brand/goat.ts — the same authored rings
// (copied here so the app's mascot stays untouched) — rendered as real 3D
// with Three.js in a front orthographic view. Two small changes keep its
// character down to 40 px: slightly thicker horns and a raised brow plate
// that shades the eyes. Eyes, pupils and nostrils are painted on top in 2D,
// exactly aligned because the camera is orthographic.
//
// Runs in the browser through the Vite dev server (see export.mjs).
import * as THREE from 'three'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import { GOAT_DETAILS, GOAT_VIEW } from '/src/brand/goat.ts'
import { preloadAllFonts } from '/src/fonts/fonts.ts'
import { withAlpha } from '/src/model/tokens.ts'

type V3 = [number, number, number]
type Tri = [V3, V3, V3]
type P = [number, number]

const W = GOAT_VIEW.width
const CX = W / 2
const v = (x: number, y: number, z: number): V3 => [x, y, z]

// ── Geometry (same rings as src/brand/goat.ts) ─────────────────────────────

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

const faceOuter: V3[] = [v(304, 150, 10), v(336, 172, 6), v(348, 204, 4), v(352, 240, 4), v(344, 280, 6), v(330, 326, 6), v(316, 372, 6), v(304, 414, 8), v(294, 450, 10), v(286, 478, 12), v(274, 498, 14), v(256, 506, 18)]
const faceCheek: V3[] = [v(292, 146, 28), v(320, 180, 30), v(334, 214, 28), v(338, 246, 26), v(330, 288, 30), v(316, 334, 32), v(302, 378, 34), v(292, 418, 36), v(284, 452, 36), v(276, 478, 32), v(266, 494, 30), v(256, 500, 32)]
const faceMid: V3[] = [v(278, 142, 44), v(300, 182, 50), v(314, 222, 48), v(312, 266, 40), v(302, 314, 52), v(290, 358, 56), v(281, 400, 60), v(276, 436, 62), v(272, 464, 56), v(265, 486, 46), v(256, 496, 44)]
const faceCenter: V3[] = [v(CX, 132, 54), v(CX, 178, 64), v(CX, 222, 68), v(CX, 266, 70), v(CX, 312, 82), v(CX, 356, 88), v(CX, 400, 92), v(CX, 436, 94), v(CX, 464, 86), v(CX, 488, 72)]
const hornInner: V3[] = [v(304, 150, 10), v(306, 124, 10), v(311, 98, 10), v(320, 74, 10), v(333, 52, 10), v(350, 33, 10), v(371, 18, 10), v(395, 8, 10), v(420, 3, 10), v(446, 4, 8)]
const hornOuterBase: V3[] = [v(336, 172, 6), v(352, 146, 6), v(366, 118, 6), v(380, 92, 6), v(396, 68, 6), v(413, 50, 6), v(432, 36, 6), v(450, 26, 6), v(466, 19, 6), v(476, 14, 6)]
const hornTip: V3 = v(486, 6, 4)
const earUpper: V3[] = [v(348, 204, 4), v(376, 198, 10), v(406, 204, 10), v(430, 220, 8), v(450, 242, 4)]
const earLower: V3[] = [v(352, 240, 4), v(380, 254, 8), v(408, 260, 8), v(432, 256, 6), v(450, 242, 4)]
const beardEdge: V3[] = [v(282, 490, 10), v(294, 520, 10), v(285, 527, 10), v(293, 556, 10), v(282, 565, 10), v(285, 592, 10), v(274, 600, 9), v(271, 624, 8), v(263, 630, 7), v(256, 656, 6)]
const beardMid: V3[] = [v(268, 498, 30), v(274, 538, 32), v(272, 578, 30), v(265, 612, 24), v(256, 656, 6)]
const beardCenter: V3[] = [v(CX, 502, 40), v(CX, 544, 44), v(CX, 584, 40), v(CX, 618, 30), v(CX, 656, 6)]

function mirrorTri(t: Tri): Tri {
  return [t[0], t[2], t[1]].map((p) => [W - p[0], p[1], p[2]] as V3) as Tri
}
const both = (tris: Tri[]) => [...tris, ...tris.map(mirrorTri)]

/** Barycentric height of the face surface at (x, y). */
function zOn(tris: Tri[], x: number, y: number): number | null {
  let best: number | null = null
  for (const [a, b, c] of tris) {
    const d = (b[1] - c[1]) * (a[0] - c[0]) + (c[0] - b[0]) * (a[1] - c[1])
    if (Math.abs(d) < 1e-9) continue
    const l1 = ((b[1] - c[1]) * (x - c[0]) + (c[0] - b[0]) * (y - c[1])) / d
    const l2 = ((c[1] - a[1]) * (x - c[0]) + (a[0] - c[0]) * (y - c[1])) / d
    const l3 = 1 - l1 - l2
    if (l1 < -1e-6 || l2 < -1e-6 || l3 < -1e-6) continue
    const z = l1 * a[2] + l2 * b[2] + l3 * c[2]
    if (best === null || z > best) best = z
  }
  return best
}

export interface HeadShape {
  /** Horn width relative to the template goat (1 = same). */
  horn: number
  /** How far the brow plate stands out of the face (0 = none). */
  brow: number
}

export const BRAND_SHAPE: HeadShape = { horn: 1.4, brow: 0 }

function headTris(shape: HeadShape): { horns: Tri[]; head: Tri[] } {
  const hornOuter = hornOuterBase.map((q, i) => {
    const p = hornInner[i]
    return v(p[0] + (q[0] - p[0]) * shape.horn, p[1] + (q[1] - p[1]) * shape.horn, q[2])
  })
  const tip = v(hornInner[hornInner.length - 1][0] + (hornTip[0] - hornInner[hornInner.length - 1][0]) * (0.6 + 0.4 * shape.horn), hornTip[1] + (1 - shape.horn) * 4, hornTip[2])
  const hornSpine = hornInner.map((p, i) => {
    const q = hornOuter[i]
    const ridge = i % 2 === 0 ? 40 : 24
    return v(p[0] * 0.45 + q[0] * 0.55, p[1] * 0.45 + q[1] * 0.55, ridge - i * 2)
  })
  const horns = [
    ...strip(hornInner, hornSpine),
    ...strip(hornSpine, hornOuter),
    [hornInner[hornInner.length - 1], hornSpine[hornSpine.length - 1], tip] as Tri,
    [hornSpine[hornSpine.length - 1], hornOuter[hornOuter.length - 1], tip] as Tri,
  ]
  const earFold = earUpper.map((p, i) => {
    const q = earLower[i]
    return v((p[0] + q[0]) / 2 + 2, (p[1] + q[1]) / 2 + 1, i === earUpper.length - 1 ? 4 : 22 - i * 3)
  })
  const face = [...strip(faceOuter, faceCheek), ...strip(faceCheek, faceMid), ...strip(faceMid, faceCenter)]
  const all = [...strip(earUpper, earFold), ...strip(earFold, earLower), ...face, ...strip(beardEdge, beardMid), ...strip(beardMid, beardCenter)]
  // Brow plate: a raised wedge above each eye, thicker toward the nose, so the
  // eyes sit in shadow — the serious, focused look of the mascot.
  if (shape.brow > 0) {
    const faceAll = both(face)
    const b = GOAT_DETAILS.brow
    const lift = (i: number) => shape.brow * (i === 0 ? 1 : i === 1 ? 0.85 : i === 2 ? 0.45 : i === 3 ? 0.55 : 0.9)
    const pts = b.map(([x, y], i) => v(x, y, (zOn(faceAll, x, y) ?? 40) + lift(i)))
    const cx = pts.reduce((s, p) => s + p[0], 0) / pts.length
    const cy = pts.reduce((s, p) => s + p[1], 0) / pts.length
    const c = v(cx, cy, (zOn(faceAll, cx, cy) ?? 40) + shape.brow * 0.95)
    for (let i = 0; i < pts.length; i++) all.push([c, pts[i], pts[(i + 1) % pts.length]])
  }
  return { horns: both(horns), head: both(all) }
}

// ── Looks ───────────────────────────────────────────────────────────────────

export interface HeadLook {
  name: string
  color: string
  /** Horns, a shade apart from the head so they read on their own. */
  horn: string
  metalness: number
  roughness: number
  envIntensity: number
  key: number
  ambient: number
  rim: string
  rimIntensity: number
  /** Depth exaggeration (1 = authored relief). */
  depth: number
  /** Key light direction (x right, y up, z toward the viewer). */
  keyDir: [number, number, number]
  /** Thin light line along the silhouette (2D), 0 = none. */
  edge: number
  edgeColor: string
  /** Socket/brow shading painted around the eyes (0..1). */
  socket: number
  /** Soft backlight behind the head on the avatar (alpha 0 = none). */
  halo?: { color: string; alpha: number }
  eye: { core: string; mid: string; edge: string; glow: number }
}

export const GREEN = '#2BE477'

const eyeGreen = { core: '#D4FFE4', mid: '#2BE477', edge: '#0B8A44', glow: 0.6 }

export const LOOKS: Record<string, HeadLook> = {
  marfil: { name: 'Marfil', color: '#E9E4D9', horn: '#C9C1B1', metalness: 0, roughness: 0.55, envIntensity: 0.3, key: 2.1, keyDir: [-360, 600, 320], ambient: 0.04, rim: '#ffffff', rimIntensity: 2.2, depth: 2.8, edge: 0, edgeColor: '#ffffff', socket: 1, eye: eyeGreen },
  obsidiana: { name: 'Obsidiana', color: '#2B2F36', horn: '#4A4F58', metalness: 0.2, roughness: 0.4, envIntensity: 0.4, key: 2.6, keyDir: [-420, 140, 600], ambient: 0.06, rim: '#F3F0E8', rimIntensity: 5, depth: 1.8, edge: 2.4, edgeColor: '#F3F0E8', socket: 0.8, eye: { ...eyeGreen, glow: 0.75 } },
  halo: { name: 'Halo verde', color: '#E9E4D9', horn: '#C9C1B1', metalness: 0, roughness: 0.55, envIntensity: 0.3, key: 2.0, keyDir: [-360, 600, 320], ambient: 0.04, rim: GREEN, rimIntensity: 1.5, depth: 2.8, edge: 1.4, edgeColor: '#7DF0AE', socket: 1, eye: eyeGreen, halo: { color: GREEN, alpha: 0.36 } },
}

// ── Head render ─────────────────────────────────────────────────────────────

const HEAD_H = GOAT_VIEW.height
const OY = 330

function tracePoly(ctx: CanvasRenderingContext2D, pts: P[], k: number, mirror = false) {
  ctx.beginPath()
  pts.forEach(([x, y], i) => {
    const px = (mirror ? W - x : x) * k
    if (i === 0) ctx.moveTo(px, y * k)
    else ctx.lineTo(px, y * k)
  })
  ctx.closePath()
}

/** Silhouette of the (thicker-horned) head, for edge lines and masks. */
function silhouette(shape: HeadShape): P[] {
  const hornOuter = hornOuterBase.map((q, i) => {
    const p = hornInner[i]
    return [p[0] + (q[0] - p[0]) * shape.horn, p[1] + (q[1] - p[1]) * shape.horn] as P
  })
  const tipX = hornInner[hornInner.length - 1][0] + (hornTip[0] - hornInner[hornInner.length - 1][0]) * (0.6 + 0.4 * shape.horn)
  const right: P[] = [
    [CX, 136],
    ...hornInner.map((p) => [p[0], p[1]] as P),
    [tipX, hornTip[1]],
    ...[...hornOuter].reverse(),
    ...earUpper.map((p) => [p[0], p[1]] as P),
    ...[...earLower].reverse().slice(1).map((p) => [p[0], p[1]] as P),
    ...faceOuter.slice(4, 10).map((p) => [p[0], p[1]] as P),
    ...beardEdge.map((p) => [p[0], p[1]] as P),
  ]
  const left = [...right].reverse().map(([x, y]) => [W - x, y] as P)
  return [...right, ...left.slice(1)]
}

let renderer: THREE.WebGLRenderer | null = null
let envTex: THREE.Texture | null = null

/**
 * The head on a transparent canvas covering the whole view box
 * (512 × 660 view units) at `k` pixels per unit.
 */
export function renderHead(look: HeadLook, k: number, shape: HeadShape = BRAND_SHAPE): HTMLCanvasElement {
  const ss = 2 // supersampling
  const pw = Math.round(W * k * ss)
  const ph = Math.round(HEAD_H * k * ss)
  renderer ??= new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true })
  renderer.setPixelRatio(1)
  renderer.setSize(pw, ph, false)
  renderer.setClearColor(0x000000, 0)
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFSoftShadowMap
  if (!envTex) envTex = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture

  const scene = new THREE.Scene()
  scene.environment = envTex
  scene.environmentIntensity = look.envIntensity
  const tris = headTris(shape)
  const disposables: { dispose: () => void }[] = []
  for (const [list, color] of [[tris.head, look.color], [tris.horns, look.horn]] as const) {
    const pos: number[] = []
    for (const t of list) {
      const q = t.map((p) => [p[0] - CX, -(p[1] - OY), p[2] * look.depth])
      // Every facet faces the camera (the authored strips mix windings); a
      // facet wound the other way would turn its back and catch the rim lights.
      const nz = (q[1][0] - q[0][0]) * (q[2][1] - q[0][1]) - (q[1][1] - q[0][1]) * (q[2][0] - q[0][0])
      const ordered = nz >= 0 ? q : [q[0], q[2], q[1]]
      for (const p of ordered) pos.push(p[0], p[1], p[2])
    }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
    g.computeVertexNormals()
    const mat = new THREE.MeshStandardMaterial({ color, metalness: look.metalness, roughness: look.roughness, flatShading: true })
    const mesh = new THREE.Mesh(g, mat)
    mesh.castShadow = true
    mesh.receiveShadow = true
    scene.add(mesh)
    disposables.push(g, mat)
  }

  // Key light from above, a little to the left: brow shadow over the eyes.
  const key = new THREE.DirectionalLight('#ffffff', look.key)
  key.position.set(...look.keyDir)
  key.castShadow = true
  key.shadow.mapSize.set(2048, 2048)
  const sc = key.shadow.camera as THREE.OrthographicCamera
  sc.left = -360
  sc.right = 360
  sc.top = 420
  sc.bottom = -420
  sc.near = 1
  sc.far = 2000
  key.shadow.bias = -0.0006
  key.shadow.radius = 3
  scene.add(key)
  // Rim lights from behind on both sides: they catch the side planes and
  // separate the head from the black background.
  for (const sx of [-1, 1]) {
    const rim = new THREE.DirectionalLight(look.rim, look.rimIntensity)
    rim.position.set(sx * 600, 200, -720)
    scene.add(rim)
  }
  scene.add(new THREE.AmbientLight('#ffffff', look.ambient))
  // Sky above, darkness below: the muzzle and beard fall off into shadow.
  scene.add(new THREE.HemisphereLight('#ffffff', '#000000', 0.6))

  const cam = new THREE.OrthographicCamera(-W / 2, W / 2, OY, OY - HEAD_H, 1, 3000)
  cam.position.set(0, 0, 1000)
  cam.lookAt(0, 0, 0)
  renderer.render(scene, cam)
  for (const d of disposables) d.dispose()

  const out = document.createElement('canvas')
  out.width = Math.round(W * k)
  out.height = Math.round(HEAD_H * k)
  const ctx = out.getContext('2d')!
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(renderer.domElement, 0, 0, out.width, out.height)
  paintDetails(ctx, look, k, shape)
  return out
}

/** Eyes, sockets, nostrils and inner ears, painted over the render. */
function paintDetails(ctx: CanvasRenderingContext2D, look: HeadLook, k: number, shape: HeadShape) {
  const d = GOAT_DETAILS
  const sides = [false, true]
  // Inner ear: a soft dark recess.
  for (const m of sides) {
    tracePoly(ctx, d.earInner, k, m)
    ctx.fillStyle = 'rgba(0,0,0,0.38)'
    ctx.fill()
  }
  // Nostrils: two small rounded dark slits.
  for (const m of sides) {
    const nc = centroid(d.nostril)
    ctx.save()
    ctx.translate((m ? W - nc[0] : nc[0]) * k, nc[1] * k)
    ctx.rotate(m ? 0.55 : -0.55)
    ctx.beginPath()
    ctx.ellipse(0, 0, 8.5 * k, 5 * k, 0, 0, Math.PI * 2)
    ctx.fillStyle = 'rgba(8,8,8,0.9)'
    ctx.filter = `blur(${0.8 * k}px)`
    ctx.fill()
    ctx.restore()
  }
  const eyeC = centroid(d.eye)
  const eyePts = scaleAbout(d.eye, eyeC, 1.22)
  // Socket: a dark, soft almond just above and around the eye, under the brow.
  for (const m of sides) {
    ctx.save()
    tracePoly(ctx, scaleAbout(eyePts.map(([x, y]) => [x, y - 3] as P), eyeC, 1.45), k, m)
    ctx.filter = `blur(${5 * k}px)`
    ctx.fillStyle = `rgba(0,0,0,${0.75 * look.socket})`
    ctx.fill()
    ctx.restore()
  }
  for (const m of sides) {
    const ex = (m ? W - eyeC[0] : eyeC[0]) * k
    const ey = eyeC[1] * k
    // Controlled glow: one soft pass around the eye.
    ctx.save()
    tracePoly(ctx, eyePts, k, m)
    ctx.shadowColor = look.eye.mid
    ctx.shadowBlur = 18 * k * look.eye.glow
    ctx.fillStyle = look.eye.mid
    ctx.fill()
    ctx.restore()
    ctx.save()
    tracePoly(ctx, eyePts, k, m)
    ctx.clip()
    const gr = ctx.createRadialGradient(ex, ey + 2 * k, 0, ex, ey + 2 * k, 28 * k)
    gr.addColorStop(0, look.eye.core)
    gr.addColorStop(0.4, look.eye.mid)
    gr.addColorStop(1, look.eye.edge)
    ctx.fillStyle = gr
    ctx.fillRect(ex - 40 * k, ey - 30 * k, 80 * k, 60 * k)
    // Upper lid in shadow: a heavy, focused stare.
    const lid = ctx.createLinearGradient(0, ey - 15 * k, 0, ey + 3 * k)
    lid.addColorStop(0, 'rgba(0,0,0,0.75)')
    lid.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = lid
    ctx.fillRect(ex - 40 * k, ey - 30 * k, 80 * k, 33 * k)
    // Horizontal goat pupil.
    const p = d.pupil
    ctx.translate((m ? W - p.cx : p.cx) * k, p.cy * k)
    ctx.rotate(m ? -p.rot : p.rot)
    ctx.beginPath()
    ctx.ellipse(0, 0, p.rx * 1.25 * k, p.ry * 1.35 * k, 0, 0, Math.PI * 2)
    ctx.fillStyle = '#020202'
    ctx.fill()
    ctx.restore()
    // A crisp dark lid line along the top edge.
    ctx.save()
    const top = eyePts.slice(0, 3)
    ctx.beginPath()
    top.forEach(([x, y], i) => {
      const px = (m ? W - x : x) * k
      if (i === 0) ctx.moveTo(px, y * k)
      else ctx.lineTo(px, y * k)
    })
    ctx.strokeStyle = 'rgba(0,0,0,0.9)'
    ctx.lineWidth = 3.2 * k
    ctx.lineJoin = 'round'
    ctx.lineCap = 'round'
    ctx.stroke()
    ctx.restore()
  }
  // Silhouette edge light.
  if (look.edge > 0) {
    ctx.save()
    tracePoly(ctx, silhouette(shape), k)
    ctx.lineJoin = 'round'
    ctx.strokeStyle = look.edgeColor
    ctx.globalAlpha = 0.85
    ctx.lineWidth = look.edge * k
    ctx.stroke()
    ctx.restore()
  }
}

function centroid(pts: P[]): P {
  return [pts.reduce((s, p) => s + p[0], 0) / pts.length, pts.reduce((s, p) => s + p[1], 0) / pts.length]
}
function scaleAbout(pts: P[], c: P, s: number): P[] {
  return pts.map(([x, y]) => [c[0] + (x - c[0]) * s, c[1] + (y - c[1]) * s])
}

// ── Avatar ──────────────────────────────────────────────────────────────────

/** Framing in view units: the circle the avatar's round crop shows. */
export interface Frame {
  cx: number
  cy: number
  r: number
}

/** Fills the round crop: the horn tips and the end of the beard run just past the edge. */
export const AVATAR_FRAME: Frame = { cx: 256, cy: 290, r: 288 }

export function renderAvatar(look: HeadLook, size = 1024, frame = AVATAR_FRAME, bg = '#000000'): HTMLCanvasElement {
  const c = document.createElement('canvas')
  c.width = size
  c.height = size
  const ctx = c.getContext('2d')!
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, size, size)
  const k = size / 2 / frame.r
  if (look.halo && look.halo.alpha > 0) {
    // Backlight: brightest just behind the face, gone well before the edge.
    const hx = size / 2
    const hy = size / 2 + (250 - frame.cy) * k
    const hr = size * 0.5
    const g = ctx.createRadialGradient(hx, hy, 0, hx, hy, hr)
    g.addColorStop(0, withAlpha(look.halo.color, look.halo.alpha))
    g.addColorStop(0.45, withAlpha(look.halo.color, look.halo.alpha * 0.35))
    g.addColorStop(1, withAlpha(look.halo.color, 0))
    ctx.fillStyle = g
    ctx.fillRect(0, 0, size, size)
  }
  const head = renderHead(look, k)
  ctx.drawImage(head, size / 2 - frame.cx * k, size / 2 - frame.cy * k)
  return c
}

// ── Crest ───────────────────────────────────────────────────────────────────

export type CrestDesign = 'anillo' | 'bicolor' | 'minimal'

interface ArcOpts {
  color: string
  font: string
  weight?: number
  /** Extra space between letters, in px. */
  tracking: number
  bottom?: boolean
}

function charWidths(ctx: CanvasRenderingContext2D, text: string, tracking: number): number[] {
  return [...text].map((ch) => ctx.measureText(ch).width + tracking)
}

/** Text along an arc centred on angle `center` (top reads clockwise, bottom reads left to right). */
function arcText(ctx: CanvasRenderingContext2D, text: string, cx: number, cy: number, r: number, size: number, center: number, opts: ArcOpts) {
  ctx.save()
  ctx.font = `${opts.weight ?? 400} ${size}px "${opts.font}"`
  ctx.fillStyle = opts.color
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  const chars = [...text]
  const widths = charWidths(ctx, text, opts.tracking)
  const total = widths.reduce((a, b) => a + b, 0) - opts.tracking
  const dir = opts.bottom ? -1 : 1
  let a = center - (dir * total) / r / 2
  chars.forEach((ch, i) => {
    const mid = a + (dir * (widths[i] - opts.tracking)) / 2 / r
    ctx.save()
    ctx.translate(cx + Math.cos(mid) * r, cy + Math.sin(mid) * r)
    ctx.rotate(mid + (opts.bottom ? -Math.PI / 2 : Math.PI / 2))
    ctx.fillText(ch, 0, 0)
    ctx.restore()
    a += (dir * widths[i]) / r
  })
  ctx.restore()
}

/** Font size that makes `text` span `angle` radians of a circle of radius r. */
function fitArc(ctx: CanvasRenderingContext2D, text: string, r: number, angle: number, opts: ArcOpts, trackingEm: number): { size: number; tracking: number } {
  ctx.save()
  ctx.font = `${opts.weight ?? 400} 100px "${opts.font}"`
  const w = charWidths(ctx, text, 100 * trackingEm).reduce((a, b) => a + b, 0) - 100 * trackingEm
  ctx.restore()
  const size = (100 * (angle * r)) / w
  return { size, tracking: size * trackingEm }
}

function disc(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number) {
  ctx.beginPath()
  ctx.arc(cx, cy, r, 0, Math.PI * 2)
}

/** Circular football crest with the avatar's head. Transparent outside the circle. */
export function renderCrest(look: HeadLook, design: CrestDesign, size = 1024): HTMLCanvasElement {
  const c = document.createElement('canvas')
  c.width = size
  c.height = size
  const ctx = c.getContext('2d')!
  const cx = size / 2
  const cy = size / 2
  const u = size / 1024
  const R = 506 * u
  const white = '#F3F0E8'
  const black = '#050505'
  const heavy = 'Archivo Black'
  const cond = 'Barlow Condensed'
  const NAME = 'GOAT SOCIETY'

  if (design === 'anillo') {
    // The original badge, refined: black disc, a white outer line, the name
    // round the band twice with green dots between, a thin green inner ring.
    disc(ctx, cx, cy, R)
    ctx.fillStyle = black
    ctx.fill()
    ctx.lineWidth = 16 * u
    ctx.strokeStyle = white
    disc(ctx, cx, cy, R - 8 * u)
    ctx.stroke()
    const inner = R - 128 * u
    ctx.lineWidth = 6 * u
    ctx.strokeStyle = GREEN
    disc(ctx, cx, cy, inner)
    ctx.stroke()
    const tr = (R - 16 * u + inner) / 2
    const o = { color: white, font: heavy, tracking: 0 }
    const fit = fitArc(ctx, NAME, tr, Math.PI * 0.62, o, 0.1)
    arcText(ctx, NAME, cx, cy, tr, fit.size, -Math.PI / 2, { ...o, tracking: fit.tracking })
    arcText(ctx, NAME, cx, cy, tr, fit.size, Math.PI / 2, { ...o, tracking: fit.tracking, bottom: true })
    for (const sx of [-1, 1]) {
      disc(ctx, cx + sx * tr, cy, 12 * u)
      ctx.fillStyle = GREEN
      ctx.fill()
    }
    placeHead(ctx, look, cx, cy, inner - 14 * u)
  } else if (design === 'bicolor') {
    // Two-tone: a white band carrying the name in black, a black centre and a
    // fine green line between them. The boldest shape at small sizes.
    disc(ctx, cx, cy, R)
    ctx.fillStyle = white
    ctx.fill()
    const inner = R - 120 * u
    disc(ctx, cx, cy, inner)
    ctx.fillStyle = black
    ctx.fill()
    ctx.lineWidth = 10 * u
    ctx.strokeStyle = GREEN
    disc(ctx, cx, cy, inner + 1 * u)
    ctx.stroke()
    const tr = (R + inner) / 2 + 2 * u
    const o = { color: black, font: heavy, tracking: 0 }
    const fit = fitArc(ctx, NAME, tr, Math.PI * 0.6, o, 0.12)
    arcText(ctx, NAME, cx, cy, tr, fit.size, -Math.PI / 2, { ...o, tracking: fit.tracking })
    for (const a of [-0.16, 0, 0.16]) {
      disc(ctx, cx + Math.cos(Math.PI / 2 + a) * tr, cy + Math.sin(Math.PI / 2 + a) * tr, 11 * u)
      ctx.fillStyle = a === 0 ? GREEN : black
      ctx.fill()
    }
    placeHead(ctx, look, cx, cy, inner - 6 * u)
  } else {
    // Minimal: one fine white circle, the head as large as it gets, the name
    // in small, widely spaced capitals on top and a single green dot below.
    disc(ctx, cx, cy, R)
    ctx.fillStyle = black
    ctx.fill()
    ctx.lineWidth = 8 * u
    ctx.strokeStyle = white
    disc(ctx, cx, cy, R - 30 * u)
    ctx.stroke()
    const tr = R - 74 * u
    const o = { color: white, font: cond, weight: 700, tracking: 0 }
    const fit = fitArc(ctx, NAME, tr, Math.PI * 0.5, o, 0.32)
    arcText(ctx, NAME, cx, cy, tr, fit.size, -Math.PI / 2, { ...o, tracking: fit.tracking })
    disc(ctx, cx, cy + tr, 10 * u)
    ctx.fillStyle = GREEN
    ctx.fill()
    placeHead(ctx, look, cx, cy + 22 * u, R - 104 * u)
  }
  return c
}

/** The avatar's head, framed the same way, inside a circle of radius r. */
function placeHead(ctx: CanvasRenderingContext2D, look: HeadLook, cx: number, cy: number, r: number) {
  const f = AVATAR_FRAME
  const k = r / f.r
  const head = renderHead(look, k)
  ctx.save()
  disc(ctx, cx, cy, r)
  ctx.clip()
  ctx.drawImage(head, cx - f.cx * k, cy - f.cy * k)
  ctx.restore()
}

export async function ready() {
  await preloadAllFonts()
}
