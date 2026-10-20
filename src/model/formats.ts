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
      return { top: 230, bottom: 420, left: 60, right: 150 }
    case 'portrait':
      return { top: 70, bottom: 140, left: 60, right: 60 }
    case 'square':
      return { top: 60, bottom: 100, left: 60, right: 60 }
    case 'landscape':
      return { top: 60, bottom: 120, left: 100, right: 100 }
  }
}
