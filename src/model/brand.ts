import type { BrandKit } from './types'

export const DEFAULT_BRAND: BrandKit = {
  name: 'GOAT SOCIETY',
  handle: '@goatsociety',
  telegramUrl: 't.me/goatsociety',
  telegramLabel: 'TELEGRAM',
  logoAssetId: null,
  logoTreatment: 'original',
  palette: {
    bg: '#08090B',
    surface: '#14171B',
    primary: '#CBAA62',
    secondary: '#103E34',
    tertiary: '#641C2A',
    text: '#F3F0E8',
    muted: '#8D9096',
    positive: '#27D477',
    negative: '#EF4655',
  },
  fonts: {
    headline: 'Anton',
    display: 'Big Shoulders Display Variable',
    label: 'Barlow Condensed',
    body: 'Inter Variable',
    numbers: 'Barlow Condensed',
    serif: 'Instrument Serif',
  },
  disclaimer: 'Análisis y opinión. Ningún pronóstico está garantizado. +18',
  dateLocale: 'es-ES',
  watermark: { enabled: false, position: 'br', size: 90, opacity: 0.5 },
}

export const PALETTE_TOKENS: { token: string; label: string }[] = [
  { token: '$bg', label: 'Fondo' },
  { token: '$surface', label: 'Superficie' },
  { token: '$primary', label: 'Oro' },
  { token: '$secondary', label: 'Verde bosque' },
  { token: '$tertiary', label: 'Burdeos' },
  { token: '$text', label: 'Marfil' },
  { token: '$muted', label: 'Gris' },
  { token: '$positive', label: 'Acierto' },
  { token: '$negative', label: 'Fallo' },
  { token: '$home', label: 'Local' },
  { token: '$homeAlt', label: 'Local 2' },
  { token: '$away', label: 'Visitante' },
  { token: '$awayAlt', label: 'Visitante 2' },
]

export const FONT_TOKENS: { token: string; label: string }[] = [
  { token: '$headline', label: 'Titular (marca)' },
  { token: '$display', label: 'Display (marca)' },
  { token: '$label', label: 'Etiquetas (marca)' },
  { token: '$body', label: 'Texto (marca)' },
  { token: '$numbers', label: 'Números (marca)' },
  { token: '$serif', label: 'Serif (marca)' },
]
