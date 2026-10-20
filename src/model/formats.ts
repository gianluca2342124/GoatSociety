import type { CanvasFormat, FormatPreset } from './types'

export const FORMATS: Record<FormatPreset, CanvasFormat & { label: string; hint: string }> = {
  story: { preset: 'story', width: 1080, height: 1920, label: 'Story / TikTok', hint: '1080 × 1920' },
  portrait: { preset: 'portrait', width: 1080, height: 1350, label: 'Instagram vertical', hint: '1080 × 1350' },
  square: { preset: 'square', width: 1080, height: 1080, label: 'Cuadrado', hint: '1080 × 1080' },
  landscape: { preset: 'landscape', width: 1920, height: 1080, label: 'Horizontal', hint: '1920 × 1080' },
}

export function formatOf(preset: FormatPreset): CanvasFormat {
  const f = FORMATS[preset]
  return { preset: f.preset, width: f.width, height: f.height }
}

/**
 * Areas typically covered by platform UI (captions, buttons, profile).
 * Values are in canvas pixels for each preset. Shown as guides only.
 */
export function safeArea(format: CanvasFormat): { top: number; bottom: number; left: number; right: number } {
  switch (format.preset) {
    case 'story':
      return { top: 200, bottom: 340, left: 48, right: 150 }
    case 'portrait':
      return { top: 70, bottom: 140, left: 60, right: 60 }
    case 'square':
      return { top: 60, bottom: 100, left: 60, right: 60 }
    case 'landscape':
      return { top: 60, bottom: 120, left: 100, right: 100 }
  }
}

export interface PlatformZone {
  x: number
  y: number
  w: number
  h: number
  label: string
}

/**
 * Areas covered by the platform interface (TikTok photo mode / Reels / Stories
 * for 9:16, Instagram feed chrome for the other formats). Editor guide only —
 * never exported.
 */
export function platformZones(format: CanvasFormat): PlatformZone[] {
  const { width: W, height: H } = format
  const s = safeArea(format)
  if (format.preset === 'story') {
    const buttonsTop = Math.round(H * 0.45)
    return [
      { x: 0, y: 0, w: W, h: s.top, label: 'Estado y pestañas' },
      { x: W - s.right, y: buttonsTop, w: s.right, h: H - s.bottom - buttonsTop, label: 'Botones' },
      { x: 0, y: H - s.bottom, w: W, h: s.bottom, label: 'Descripción y música' },
    ]
  }
  return [
    { x: 0, y: 0, w: W, h: s.top, label: 'Interfaz' },
    { x: 0, y: H - s.bottom, w: W, h: s.bottom, label: 'Interfaz' },
  ]
}
