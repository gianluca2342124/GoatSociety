/** Deterministic PRNG (mulberry32) so effects render identically in editor and export. */
export function seeded(seed: number): () => number {
  let a = seed >>> 0 || 1
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const grainCache = new Map<string, HTMLCanvasElement>()

/** Tileable monochrome grain texture. */
export function grainTexture(size = 256, seed = 1, contrast = 1): HTMLCanvasElement {
  const key = `${size}:${seed}:${contrast}`
  const hit = grainCache.get(key)
  if (hit) return hit
  const c = document.createElement('canvas')
  c.width = size
  c.height = size
  const ctx = c.getContext('2d')!
  const img = ctx.createImageData(size, size)
  const rnd = seeded(seed)
  for (let i = 0; i < img.data.length; i += 4) {
    const n = 128 + (rnd() - 0.5) * 255 * contrast
    const v = Math.max(0, Math.min(255, n))
    img.data[i] = v
    img.data[i + 1] = v
    img.data[i + 2] = v
    img.data[i + 3] = 255
  }
  ctx.putImageData(img, 0, 0)
  grainCache.set(key, c)
  return c
}

/** Soft value-noise cloud texture (for fog / smoke), not tileable. */
export function cloudTexture(w: number, h: number, seed = 3, scale = 6): HTMLCanvasElement {
  const c = document.createElement('canvas')
  c.width = Math.max(8, Math.round(w))
  c.height = Math.max(8, Math.round(h))
  const ctx = c.getContext('2d')!
  const rnd = seeded(seed)
  // Layered octaves of upscaled random grids give a smooth cloud look.
  const octaves = [scale, scale * 2, scale * 4]
  octaves.forEach((cells, oi) => {
    const gw = Math.max(2, Math.round(cells * (c.width / c.height)))
    const gh = Math.max(2, Math.round(cells))
    const small = document.createElement('canvas')
    small.width = gw
    small.height = gh
    const sctx = small.getContext('2d')!
    const img = sctx.createImageData(gw, gh)
    for (let i = 0; i < img.data.length; i += 4) {
      const v = rnd() * 255
      img.data[i] = 255
      img.data[i + 1] = 255
      img.data[i + 2] = 255
      img.data[i + 3] = v
    }
    sctx.putImageData(img, 0, 0)
    ctx.globalAlpha = 0.6 / (oi + 1)
    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = 'high'
    ctx.drawImage(small, 0, 0, c.width, c.height)
  })
  return c
}
