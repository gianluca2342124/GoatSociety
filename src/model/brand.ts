import type { BrandKit, Intensity } from './types'

/** Current design-system version of the brand kit defaults (GOAT EDITORIAL). */
export const BRAND_VERSION = 2

export const DEFAULT_BRAND: BrandKit = {
  name: 'GOAT SOCIETY',
  handle: '@goatsociety',
  // Optional external community destination. Empty by default and never
  // rendered by the built-in templates.
  telegramUrl: '',
  telegramLabel: '',
  brandVersion: BRAND_VERSION,
  logoAssetId: null,
  logoTreatment: 'original',
  palette: {
    bg: '#070707',
    surface: '#141414',
    primary: '#CBAA62',
    secondary: '#103E34',
    tertiary: '#641C2A',
    text: '#F5F5F5',
    muted: '#B9B9B9',
    positive: '#2BE477',
    negative: '#FF4055',
    accent: '#2BE477',
    line: '#242424',
  },
  fonts: {
    headline: 'Anton',
    display: 'Archivo Black',
    label: 'Barlow Condensed',
    body: 'Inter Tight Variable',
    numbers: 'Anton',
    serif: 'Instrument Serif',
  },
  disclaimer: 'Análisis y opinión. Ningún pronóstico está garantizado. +18',
  dateLocale: 'es-ES',
  watermark: { enabled: false, position: 'br', size: 90, opacity: 0.5 },
}

/** The four editorial accents. One per slide. */
export const ACCENTS = [
  { id: 'green', token: '$green', label: 'Verde', color: '#2BE477' },
  { id: 'yellow', token: '$yellow', label: 'Amarillo', color: '#FFD43B' },
  { id: 'red', token: '$red', label: 'Rojo', color: '#FF4055' },
  { id: 'blue', token: '$blue', label: 'Azul', color: '#3B8BFF' },
] as const

export const EDITORIAL = {
  bg: '#070707',
  text: '#F5F5F5',
  muted: '#B9B9B9',
  dim: '#6E6E6E',
  line: '#242424',
  neutral: '#3A3A3A',
  onAccent: '#050505',
} as const

export const INTENSITIES: { id: Intensity; label: string; hint: string }[] = [
  { id: 'minimal', label: 'Mínimo', hint: 'Solo el mensaje' },
  { id: 'editorial', label: 'Editorial', hint: 'Por defecto' },
  { id: 'cinematic', label: 'Cinemático', hint: 'Atmósfera y efectos' },
]

// Version-1 defaults. A saved kit still holding one of these values was never
// customised for that field, so it is safe to upgrade it to the new default.
const V1_PALETTE: Record<string, string> = {
  bg: '#08090B',
  surface: '#14171B',
  text: '#F3F0E8',
  muted: '#8D9096',
  positive: '#27D477',
  negative: '#EF4655',
}
const V1_FONTS: Record<string, string> = {
  display: 'Big Shoulders Display Variable',
  body: 'Inter Variable',
  numbers: 'Barlow Condensed',
}

/** Merge a saved (possibly older) brand kit with the current defaults, safely. */
export function migrateBrand(saved: Partial<BrandKit> | undefined | null): BrandKit {
  if (!saved) return structuredClone(DEFAULT_BRAND)
  const out: BrandKit = {
    ...DEFAULT_BRAND,
    ...saved,
    palette: { ...DEFAULT_BRAND.palette, ...(saved.palette ?? {}) },
    fonts: { ...DEFAULT_BRAND.fonts, ...(saved.fonts ?? {}) },
    watermark: { ...DEFAULT_BRAND.watermark, ...(saved.watermark ?? {}) },
  }
  if ((saved.brandVersion ?? 1) < 2) {
    const pal = out.palette as unknown as Record<string, string>
    for (const [k, v] of Object.entries(V1_PALETTE)) if (pal[k]?.toUpperCase() === v) pal[k] = (DEFAULT_BRAND.palette as unknown as Record<string, string>)[k]
    const fonts = out.fonts as unknown as Record<string, string>
    for (const [k, v] of Object.entries(V1_FONTS)) if (fonts[k] === v) fonts[k] = (DEFAULT_BRAND.fonts as unknown as Record<string, string>)[k]
    // Platform-specific defaults are no longer shipped.
    if (out.telegramUrl === 't.me/goatsociety') out.telegramUrl = ''
    if (out.telegramLabel === 'TELEGRAM') out.telegramLabel = ''
    out.brandVersion = BRAND_VERSION
  }
  return out
}

export const PALETTE_TOKENS: { token: string; label: string }[] = [
  { token: '$accent', label: 'Acento de la diapositiva' },
  { token: '$bg', label: 'Fondo' },
  { token: '$text', label: 'Texto' },
  { token: '$muted', label: 'Secundario' },
  { token: '$line', label: 'Separador' },
  { token: '$green', label: 'Verde' },
  { token: '$yellow', label: 'Amarillo' },
  { token: '$red', label: 'Rojo' },
  { token: '$blue', label: 'Azul' },
  { token: '$surface', label: 'Superficie' },
  { token: '$primary', label: 'Oro (marca)' },
  { token: '$secondary', label: 'Verde bosque' },
  { token: '$tertiary', label: 'Burdeos' },
  { token: '$positive', label: 'Acierto' },
  { token: '$negative', label: 'Fallo' },
  { token: '$home', label: 'Local' },
  { token: '$homeAlt', label: 'Local 2' },
  { token: '$away', label: 'Visitante' },
  { token: '$awayAlt', label: 'Visitante 2' },
  { token: '$homeLight', label: 'Local (legible)' },
  { token: '$awayLight', label: 'Visitante (legible)' },
]

export const FONT_TOKENS: { token: string; label: string }[] = [
  { token: '$headline', label: 'Titular (marca)' },
  { token: '$display', label: 'Display (marca)' },
  { token: '$label', label: 'Etiquetas (marca)' },
  { token: '$body', label: 'Texto (marca)' },
  { token: '$numbers', label: 'Números (marca)' },
  { token: '$serif', label: 'Serif (marca)' },
]
