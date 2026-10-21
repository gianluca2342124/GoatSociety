import * as THREE from 'three'

let renderer: THREE.WebGLRenderer | null = null

/** A single shared WebGL renderer (browsers limit the number of live contexts). */
export function getRenderer(width: number, height: number): THREE.WebGLRenderer {
  if (!renderer) {
    const canvas = document.createElement('canvas')
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: true, powerPreference: 'high-performance' })
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
  }
  const max = renderer.capabilities.maxTextureSize || 4096
  const k = Math.min(1, max / Math.max(width, height))
  renderer.setPixelRatio(1)
  renderer.setSize(Math.max(2, Math.round(width * k)), Math.max(2, Math.round(height * k)), false)
  renderer.setClearColor(0x000000, 0)
  return renderer
}

/** Copy the WebGL frame into a standalone 2D canvas. */
export function snapshot(r: THREE.WebGLRenderer, width: number, height: number): HTMLCanvasElement {
  const out = document.createElement('canvas')
  out.width = Math.max(2, Math.round(width))
  out.height = Math.max(2, Math.round(height))
  out.getContext('2d')!.drawImage(r.domElement, 0, 0, out.width, out.height)
  return out
}

export function disposeScene(scene: THREE.Object3D) {
  scene.traverse((o) => {
    const m = o as THREE.Mesh
    if (m.geometry) m.geometry.dispose()
    const mat = m.material as THREE.Material | THREE.Material[] | undefined
    const mats = Array.isArray(mat) ? mat : mat ? [mat] : []
    for (const mm of mats) {
      for (const v of Object.values(mm)) if (v instanceof THREE.Texture) v.dispose()
      mm.dispose()
    }
  })
}

function luminanceOf(c: string): number {
  const m = /^#?([0-9a-f]{6})/i.exec(c.trim())
  if (!m) return 0
  const n = parseInt(m[1], 16)
  const f = (v: number) => {
    const x = v / 255
    return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4)
  }
  return 0.2126 * f((n >> 16) & 255) + 0.7152 * f((n >> 8) & 255) + 0.0722 * f(n & 255)
}

/** Readable number color for a given disc color. */
export function badgeTextColor(bg: string): string {
  return luminanceOf(bg) > 0.4 ? '#0B0C0F' : '#F7F5EF'
}

export function textSprite(text: string, color: string, bg: string, size = 128): THREE.Sprite {
  const c = document.createElement('canvas')
  c.width = size
  c.height = size
  const ctx = c.getContext('2d')!
  ctx.beginPath()
  ctx.arc(size / 2, size / 2, size * 0.42, 0, Math.PI * 2)
  ctx.fillStyle = bg
  ctx.fill()
  ctx.lineWidth = size * 0.06
  // Light discs get a dark rim so the badge never melts into a white kit.
  ctx.strokeStyle = luminanceOf(bg) > 0.4 ? 'rgba(11,12,15,0.85)' : 'rgba(243,240,232,0.9)'
  ctx.stroke()
  ctx.fillStyle = color
  ctx.font = `800 ${size * 0.46}px "Barlow Condensed"`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(text, size / 2, size / 2 + size * 0.03)
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  const mat = new THREE.SpriteMaterial({ map: tex, depthTest: false, transparent: true })
  return new THREE.Sprite(mat)
}

export function glowSprite(color: string, size = 128): THREE.Sprite {
  const c = document.createElement('canvas')
  c.width = size
  c.height = size
  const ctx = c.getContext('2d')!
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
  g.addColorStop(0, 'rgba(255,255,255,1)')
  g.addColorStop(0.15, color)
  g.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, size, size)
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  return new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false }))
}
