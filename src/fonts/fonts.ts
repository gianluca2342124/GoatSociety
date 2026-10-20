// All fonts are open-source (OFL) and bundled locally through @fontsource so
// the application works fully offline and exports never fall back to system fonts.
import '@fontsource/anton/400'
import '@fontsource/bebas-neue/400'
import '@fontsource-variable/oswald'
import '@fontsource-variable/inter'
import '@fontsource-variable/inter/wght-italic'
import '@fontsource/barlow-condensed/400'
import '@fontsource/barlow-condensed/500'
import '@fontsource/barlow-condensed/600'
import '@fontsource/barlow-condensed/700'
import '@fontsource/barlow-condensed/800'
import '@fontsource/barlow-condensed/900'
import '@fontsource/barlow-condensed/600-italic'
import '@fontsource/barlow-condensed/800-italic'
import '@fontsource/barlow-condensed/900-italic'
import '@fontsource-variable/big-shoulders-display'
import '@fontsource/instrument-serif/400'
import '@fontsource/instrument-serif/400-italic'
import '@fontsource-variable/archivo'
import '@fontsource/archivo-black/400'
import '@fontsource-variable/inter-tight'

export interface FontDef {
  /** CSS family name used for canvas drawing. */
  family: string
  label: string
  weights: number[]
  italic: boolean
  category: 'headline' | 'condensed' | 'body' | 'serif'
}

export const FONTS: FontDef[] = [
  { family: 'Anton', label: 'Anton', weights: [400], italic: false, category: 'headline' },
  { family: 'Archivo Black', label: 'Archivo Black', weights: [400], italic: false, category: 'headline' },
  { family: 'Bebas Neue', label: 'Bebas Neue', weights: [400], italic: false, category: 'headline' },
  { family: 'Big Shoulders Display Variable', label: 'Big Shoulders', weights: [300, 400, 500, 600, 700, 800, 900], italic: false, category: 'headline' },
  { family: 'Barlow Condensed', label: 'Barlow Condensed', weights: [400, 500, 600, 700, 800, 900], italic: true, category: 'condensed' },
  { family: 'Oswald Variable', label: 'Oswald', weights: [300, 400, 500, 600, 700], italic: false, category: 'condensed' },
  { family: 'Archivo Variable', label: 'Archivo', weights: [400, 500, 600, 700, 800, 900], italic: false, category: 'body' },
  { family: 'Inter Tight Variable', label: 'Inter Tight', weights: [300, 400, 500, 600, 700, 800, 900], italic: false, category: 'body' },
  { family: 'Inter Variable', label: 'Inter', weights: [300, 400, 500, 600, 700, 800, 900], italic: true, category: 'body' },
  { family: 'Instrument Serif', label: 'Instrument Serif', weights: [400], italic: true, category: 'serif' },
]

export function fontDef(family: string): FontDef | undefined {
  return FONTS.find((f) => f.family === family)
}

/** Nearest available weight for a family (canvas would otherwise synthesize). */
export function nearestWeight(family: string, weight: number): number {
  const def = fontDef(family)
  if (!def) return weight
  return def.weights.reduce((best, w) => (Math.abs(w - weight) < Math.abs(best - weight) ? w : best), def.weights[0])
}

export function cssFont(family: string, size: number, weight = 400, italic = false): string {
  const w = nearestWeight(family, weight)
  const style = italic && fontDef(family)?.italic ? 'italic ' : ''
  return `${style}${w} ${Math.max(1, size)}px "${family}"`
}

const loaded = new Set<string>()

/** Make sure the given font faces are loaded before drawing to canvas. */
export async function ensureFonts(specs: { family: string; weight?: number; italic?: boolean }[]): Promise<void> {
  if (typeof document === 'undefined' || !document.fonts) return
  const jobs: Promise<unknown>[] = []
  for (const s of specs) {
    const key = cssFont(s.family, 40, s.weight ?? 400, s.italic ?? false)
    if (loaded.has(key)) continue
    jobs.push(
      document.fonts
        .load(key, 'AÁÑ0123456789')
        .then(() => loaded.add(key))
        .catch(() => undefined),
    )
  }
  await Promise.all(jobs)
}

/** Preload every bundled face (used on startup so the editor never flashes fallback fonts). */
export async function preloadAllFonts(): Promise<void> {
  const specs: { family: string; weight: number; italic?: boolean }[] = []
  for (const f of FONTS) {
    for (const w of f.weights) {
      specs.push({ family: f.family, weight: w })
      if (f.italic) specs.push({ family: f.family, weight: w, italic: true })
    }
  }
  await ensureFonts(specs)
  if (document.fonts) await document.fonts.ready
}
