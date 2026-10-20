import { useEffect, useRef } from 'react'
import { paintGoat, type GoatPaintOptions } from '../render/paint/goatPaint'
import { useLibrary } from '../store/library'
import { assetUrl, getImage, useAssetVersion } from '../render/assetCache'

/** The mascot drawn with the same painter used on slides (UI chrome). */
export function GoatCanvas({ width, height, options, className }: { width: number; height: number; options: Partial<GoatPaintOptions>; className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null)
  const key = JSON.stringify(options)
  useEffect(() => {
    const c = ref.current
    if (!c) return
    const dpr = Math.min(2, window.devicePixelRatio || 1)
    c.width = width * dpr
    c.height = height * dpr
    const ctx = c.getContext('2d')!
    ctx.scale(dpr, dpr)
    ctx.clearRect(0, 0, width, height)
    paintGoat(ctx, width, height, {
      variant: 'icon',
      base: '#CBAA62',
      shadow: '#050506',
      rim: '#EF4655',
      rimIntensity: 0.85,
      backlight: '#641C2A',
      backlightAmount: 0.9,
      lightAngle: 75,
      eye: '#08090B',
      eyeGlow: 0,
      fog: 0,
      fadeBottom: 0,
      facetGap: 0,
      contrast: 0.6,
      ...options,
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [width, height, key])
  return <canvas ref={ref} className={className} style={{ width, height }} aria-hidden />
}

/** Brand glyph: the user's uploaded logo when available, otherwise the goat icon. */
export function GoatGlyph({ size = 28 }: { size?: number }) {
  const logo = useLibrary((s) => s.brand.logoAssetId)
  useAssetVersion((s) => s.version)
  if (logo) getImage(logo)
  const url = logo ? assetUrl(logo) : null
  if (url) return <img src={url} alt="" style={{ width: size, height: size }} className="object-contain" />
  return <GoatCanvas width={size * 0.8} height={size} options={{ variant: 'icon' }} />
}
