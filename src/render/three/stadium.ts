import * as THREE from 'three'
import type { Stadium3DElement } from '../../model/types'
import type { Resolved3D } from './render3dCache'
import { disposeScene, getRenderer, glowSprite, snapshot, textSprite } from './renderer'
import { pitchMarkings, quadCurve } from '../../tactics/pitch'
import { PITCH_LENGTH as L, PITCH_WIDTH as W } from '../../tactics/formations'

const toV = (p: { x: number; y: number }, h = 0) => new THREE.Vector3(p.x - L / 2, h, p.y - W / 2)

function pitchTexture(colors: Record<string, string>, stripes: boolean, lineOpacity: number): THREE.CanvasTexture {
  const margin = 6
  const pxPerM = 22
  const cw = Math.round((L + margin * 2) * pxPerM)
  const ch = Math.round((W + margin * 2) * pxPerM)
  const c = document.createElement('canvas')
  c.width = cw
  c.height = ch
  const ctx = c.getContext('2d')!
  ctx.fillStyle = colors.pitch2
  ctx.fillRect(0, 0, cw, ch)
  ctx.translate(margin * pxPerM, margin * pxPerM)
  ctx.scale(pxPerM, pxPerM)
  ctx.fillStyle = colors.pitch
  ctx.fillRect(0, 0, L, W)
  if (stripes) {
    ctx.fillStyle = 'rgba(255,255,255,0.05)'
    const n = 18
    for (let i = 0; i < n; i += 2) ctx.fillRect((i * L) / n, 0, L / n, W)
  }
  const { lines, spots } = pitchMarkings()
  ctx.strokeStyle = colors.line
  ctx.globalAlpha = Math.min(1, lineOpacity + 0.2)
  ctx.lineWidth = 0.14
  for (const line of lines) {
    ctx.beginPath()
    line.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)))
    ctx.stroke()
  }
  ctx.fillStyle = colors.line
  for (const s of spots) {
    ctx.beginPath()
    ctx.arc(s.x, s.y, 0.3, 0, Math.PI * 2)
    ctx.fill()
  }
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 8
  return tex
}

// Tactical lines are flat graphics: unlit and outside tone mapping so the
// slide accent keeps its exact, saturated color.
function tube(points: THREE.Vector3[], radius: number, color: string): THREE.Mesh {
  const curve = new THREE.CatmullRomCurve3(points)
  const geo = new THREE.TubeGeometry(curve, Math.max(8, points.length * 2), radius, 10, false)
  const mat = new THREE.MeshBasicMaterial({ color, toneMapped: false })
  return new THREE.Mesh(geo, mat)
}

function cone(at: THREE.Vector3, dir: THREE.Vector3, size: number, color: string): THREE.Mesh {
  const geo = new THREE.ConeGeometry(size * 0.55, size * 1.4, 18)
  const mat = new THREE.MeshBasicMaterial({ color, toneMapped: false })
  const m = new THREE.Mesh(geo, mat)
  m.position.copy(at)
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize())
  return m
}

export async function renderStadium(r: Resolved3D): Promise<HTMLCanvasElement> {
  const el = r.el as Stadium3DElement
  const t = el.tactics
  const colors = r.colors
  const width = Math.max(2, r.width * r.scale)
  const height = Math.max(2, r.height * r.scale)
  const renderer = getRenderer(width, height)
  renderer.toneMappingExposure = el.lighting.exposure

  const scene = new THREE.Scene()
  if (el.background === 'night') scene.background = new THREE.Color(colors.bg)
  if (el.lighting.fog > 0) scene.fog = new THREE.FogExp2(new THREE.Color(colors.bg), 0.004 + el.lighting.fog * 0.012)

  // Ground + pitch
  const tex = pitchTexture(colors, t.stripes, t.lineOpacity)
  const pitch = new THREE.Mesh(new THREE.PlaneGeometry(L + 12, W + 12), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.92, metalness: 0 }))
  pitch.rotation.x = -Math.PI / 2
  pitch.receiveShadow = true
  scene.add(pitch)
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(600, 600), new THREE.MeshStandardMaterial({ color: new THREE.Color(colors.bg).multiplyScalar(1.4), roughness: 1 }))
  ground.rotation.x = -Math.PI / 2
  ground.position.y = -0.05
  ground.receiveShadow = true
  scene.add(ground)

  // Goals
  const goalMat = new THREE.MeshStandardMaterial({ color: 0xf3f0e8, roughness: 0.3, metalness: 0.2 })
  for (const gx of [-L / 2, L / 2]) {
    const g = new THREE.Group()
    const post = new THREE.CylinderGeometry(0.07, 0.07, 2.44, 10)
    const p1 = new THREE.Mesh(post, goalMat)
    p1.position.set(0, 1.22, -3.66)
    const p2 = p1.clone()
    p2.position.z = 3.66
    const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 7.32, 10), goalMat)
    bar.rotation.x = Math.PI / 2
    bar.position.set(0, 2.44, 0)
    g.add(p1, p2, bar)
    g.position.x = gx
    g.traverse((o) => (o.castShadow = true))
    scene.add(g)
  }

  // Stands
  if (el.showStands) {
    const standMat = new THREE.MeshStandardMaterial({ color: 0x15181d, roughness: 0.95 })
    const seatMat = new THREE.MeshStandardMaterial({ color: 0x1c2027, roughness: 0.9 })
    const mk = (w: number, d: number, x: number, z: number, rot: number) => {
      const group = new THREE.Group()
      for (let i = 0; i < 4; i++) {
        const tier = new THREE.Mesh(new THREE.BoxGeometry(w, 2.2 + i * 2.6, d / 4), i % 2 ? seatMat : standMat)
        tier.position.set(0, (2.2 + i * 2.6) / 2, i * (d / 4))
        tier.receiveShadow = true
        group.add(tier)
      }
      group.position.set(x, 0, z)
      group.rotation.y = rot
      scene.add(group)
    }
    mk(L + 30, 26, 0, W / 2 + 10, 0)
    mk(L + 30, 26, 0, -W / 2 - 10, Math.PI)
    mk(W + 20, 26, L / 2 + 12, 0, -Math.PI / 2)
    mk(W + 20, 26, -L / 2 - 12, 0, Math.PI / 2)
  }

  // Lighting
  scene.add(new THREE.HemisphereLight(0xbfd2ff, 0x101010, 0.45))
  scene.add(new THREE.AmbientLight(0xffffff, 0.12))
  const floodPositions = [
    [-L / 2 - 14, 38, -W / 2 - 14],
    [L / 2 + 14, 38, -W / 2 - 14],
    [-L / 2 - 14, 38, W / 2 + 14],
    [L / 2 + 14, 38, W / 2 + 14],
  ]
  floodPositions.forEach(([x, y, z], i) => {
    const s = new THREE.SpotLight(0xfff4e0, 900 * el.lighting.floodlights, 220, Math.PI / 5, 0.55, 1.4)
    s.position.set(x, y, z)
    s.target.position.set(0, 0, 0)
    s.castShadow = i < 2
    s.shadow.mapSize.set(1024, 1024)
    s.shadow.bias = -0.0004
    scene.add(s, s.target)
    // Tower + glow
    const tower = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.6, y, 8), new THREE.MeshStandardMaterial({ color: 0x23272e }))
    tower.position.set(x, y / 2, z)
    scene.add(tower)
    const glow = glowSprite('rgba(255,236,200,0.9)')
    glow.position.set(x, y + 1, z)
    glow.scale.setScalar(18 * el.lighting.floodlights + 4)
    scene.add(glow)
  })
  if (el.lighting.rim > 0) {
    const rim = new THREE.DirectionalLight(new THREE.Color(colors.accent), 2.2 * el.lighting.rim)
    rim.position.set(60, 25, -40)
    scene.add(rim)
  }

  // Players
  const tokenGeo = new THREE.CylinderGeometry(0.95, 1.05, 0.3, 32)
  const bodyGeo = new THREE.CapsuleGeometry(0.42, 1.1, 6, 16)
  const headGeo = new THREE.SphereGeometry(0.34, 20, 16)
  for (const p of t.players) {
    if ((p.team === 'home' && !t.showHome) || (p.team === 'away' && !t.showAway)) continue
    const color = p.team === 'home' ? colors.home : colors.away
    const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.45, metalness: 0.15, emissive: color, emissiveIntensity: 0.12 })
    const g = new THREE.Group()
    const token = new THREE.Mesh(tokenGeo, new THREE.MeshStandardMaterial({ color: 0x0c0d10, roughness: 0.5, metalness: 0.4 }))
    token.position.y = 0.15
    const body = new THREE.Mesh(bodyGeo, mat)
    body.position.y = 1.2
    const head = new THREE.Mesh(headGeo, new THREE.MeshStandardMaterial({ color: 0xe9e2d4, roughness: 0.6 }))
    head.position.y = 2.25
    g.add(token, body, head)
    g.traverse((o) => (o.castShadow = true))
    const ringMat = new THREE.MeshBasicMaterial({ color: p.highlight ? colors.primary : color, transparent: true, opacity: p.highlight ? 0.95 : 0.7 })
    const ring = new THREE.Mesh(new THREE.RingGeometry(1.05, p.highlight ? 1.45 : 1.2, 40), ringMat)
    ring.rotation.x = -Math.PI / 2
    ring.position.y = 0.32
    g.add(ring)
    if (t.showNumbers) {
      const spr = textSprite(String(p.number), '#F7F5EF', color)
      spr.position.y = 3.3
      spr.scale.setScalar(1.6)
      g.add(spr)
    }
    if (p.highlight) {
      const spot = new THREE.SpotLight(new THREE.Color(colors.primary), 260, 40, Math.PI / 12, 0.4, 1.2)
      spot.position.set(0, 18, 0)
      spot.target.position.set(0, 0, 0)
      g.add(spot, spot.target)
      const beam = new THREE.Mesh(
        new THREE.ConeGeometry(2.2, 18, 32, 1, true),
        new THREE.MeshBasicMaterial({ color: colors.primary, transparent: true, opacity: 0.08, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }),
      )
      beam.position.y = 9
      g.add(beam)
    }
    g.position.copy(toV(p))
    scene.add(g)
  }

  // Annotations
  for (const [ai, a] of t.annotations.entries()) {
    const color = colors[`a${ai}`] ?? colors.primary
    if (a.kind === 'zone' && a.points.length >= 3) {
      const shape = new THREE.Shape(a.points.map((p) => new THREE.Vector2(p.x - L / 2, -(p.y - W / 2))))
      const m = new THREE.Mesh(new THREE.ShapeGeometry(shape), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.22, depthWrite: false }))
      m.rotation.x = -Math.PI / 2
      m.position.y = 0.04
      scene.add(m)
      const outline = new THREE.LineLoop(
        new THREE.BufferGeometry().setFromPoints(a.points.map((p) => toV(p, 0.06))),
        new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.9 }),
      )
      scene.add(outline)
    } else if (a.kind === 'circle' || a.kind === 'spotlight') {
      const c = a.points[0]
      const e = a.points[1] ?? { x: c.x + 4, y: c.y }
      const rad = Math.max(0.6, Math.hypot(e.x - c.x, e.y - c.y))
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(rad * (a.kind === 'spotlight' ? 0.1 : 0.9), rad, 48),
        new THREE.MeshBasicMaterial({ color, transparent: true, opacity: a.kind === 'spotlight' ? 0.28 : 0.85, depthWrite: false }),
      )
      ring.rotation.x = -Math.PI / 2
      ring.position.copy(toV(c, 0.05))
      scene.add(ring)
    } else if (a.kind === 'ball') {
      const ball = new THREE.Mesh(new THREE.SphereGeometry(0.35, 20, 16), new THREE.MeshStandardMaterial({ color: 0xf3f0e8, roughness: 0.4 }))
      ball.position.copy(toV(a.points[0], 0.35))
      ball.castShadow = true
      scene.add(ball)
    } else if (a.points.length >= 2) {
      const pts2 = a.points.length >= 3 ? quadCurve(a.points[0], a.points[1], a.points[2], 30) : [a.points[0], a.points[1]]
      const lift = a.kind === 'pass' ? 0.9 : 0.25
      const pts = pts2.map((p, i) => {
        const tt = i / Math.max(1, pts2.length - 1)
        const arc = a.kind === 'pass' ? Math.sin(tt * Math.PI) * 1.6 : 0
        return toV(p, lift + arc)
      })
      if (pts.length === 2) pts.splice(1, 0, pts[0].clone().lerp(pts[1], 0.5))
      const end = pts[pts.length - 1]
      const before = pts[pts.length - 2]
      const dir = end.clone().sub(before)
      // Thickness follows the annotation width (meters), like the 2D boards.
      const radius = Math.max(0.12, a.width * 0.4) * (a.kind === 'press' ? 1.5 : 1)
      if (a.kind === 'pass') {
        // Dashed: alternate segments
        const curve = new THREE.CatmullRomCurve3(pts)
        const n = 14
        for (let i = 0; i < n; i += 2) {
          const seg = [curve.getPoint(i / n), curve.getPoint((i + 0.5) / n), curve.getPoint((i + 1) / n)]
          scene.add(tube(seg, radius * 0.8, color))
        }
      } else scene.add(tube(pts, radius, color))
      scene.add(cone(end, dir, Math.max(1.1, radius * 5.2) * (a.kind === 'press' ? 1.25 : 1), color))
    }
  }

  // Camera
  const cam = el.camera
  const camera = new THREE.PerspectiveCamera(cam.fov, width / height, 0.5, 900)
  const target = toV({ x: cam.targetX, y: cam.targetY })
  const az = (cam.azimuth * Math.PI) / 180
  const elv = (Math.max(5, Math.min(89, cam.elevation)) * Math.PI) / 180
  camera.position.set(target.x + Math.cos(elv) * Math.cos(az) * cam.distance, Math.sin(elv) * cam.distance, target.z + Math.cos(elv) * Math.sin(az) * cam.distance)
  camera.lookAt(target)

  renderer.render(scene, camera)
  const out = snapshot(renderer, width, height)
  disposeScene(scene)
  return out
}
