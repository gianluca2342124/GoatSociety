import type { BrandKit, ColorValue, Intensity, MatchData, MatchOverrides, Prediction, Project, Slide, SlideElement } from './types'

export interface TokenContext {
  match: MatchData
  brand: BrandKit
  page: number
  pages: number
  /** Project switch «Numeración de páginas»: false empties every page-number token. */
  pageNumbers?: boolean
}

// ── Colors ──────────────────────────────────────────────────────────────────

export interface ColorContext {
  match: MatchData
  brand: BrandKit
  /** Slide accent (token or hex). Falls back to the brand accent. */
  accent?: ColorValue
}

const FIXED: Record<string, string> = {
  $green: '#2BE477',
  $yellow: '#FFD43B',
  $red: '#FF4055',
  $blue: '#3B8BFF',
  $white: '#FFFFFF',
  $dim: '#6E6E6E',
  $neutral: '#3A3A3A',
  $onAccent: '#050505',
}

const colorCache = new Map<string, boolean>()
let colorProbe: CanvasRenderingContext2D | null | undefined

/**
 * True for a colour the canvas accepts. A half-typed hex such as «#2B» would
 * otherwise reach CanvasGradient.addColorStop, which throws and breaks the
 * drawing of the whole page.
 */
export function isCssColor(v: string): boolean {
  if (/^#(?:[0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(v)) return true
  if (v.startsWith('#')) return false
  if (/^(?:rgb|hsl)a?\(\s*[-\d.%\s,/]+\)$/i.test(v)) return true
  const known = colorCache.get(v)
  if (known !== undefined) return known
  if (colorProbe === undefined) {
    try {
      colorProbe = typeof document !== 'undefined' && typeof navigator !== 'undefined' && !/jsdom/i.test(navigator.userAgent) ? document.createElement('canvas').getContext('2d') : null
    } catch {
      colorProbe = null
    }
  }
  let ok = true
  if (colorProbe) {
    colorProbe.fillStyle = '#010203'
    colorProbe.fillStyle = v
    ok = colorProbe.fillStyle !== '#010203'
  }
  colorCache.set(v, ok)
  return ok
}

/** Shown while a colour value is not valid yet (e.g. «#2B» halfway through typing). */
const INVALID_COLOR = '#8A8A8A'

export function resolveColor(value: ColorValue | undefined, ctx: ColorContext): string {
  if (!value) return 'rgba(0,0,0,0)'
  if (value[0] !== '$') return isCssColor(value) ? value : INVALID_COLOR
  const p = ctx.brand.palette
  const fixed = FIXED[value]
  if (fixed) return fixed
  switch (value) {
    case '$accent': {
      const a = ctx.accent
      if (a && a !== '$accent') return resolveColor(a, { ...ctx, accent: undefined })
      return p.accent || '#2BE477'
    }
    case '$line':
      return p.line || '#242424'
    case '$gold':
      return p.primary
    case '$bg':
      return p.bg
    case '$surface':
      return p.surface
    case '$primary':
      return p.primary
    case '$secondary':
      return p.secondary
    case '$tertiary':
      return p.tertiary
    case '$text':
      return p.text
    case '$muted':
      return p.muted
    case '$positive':
      return p.positive
    case '$negative':
      return p.negative
    case '$home':
      return ctx.match.home.primary
    case '$homeAlt':
      return ctx.match.home.secondary
    case '$away':
      return ctx.match.away.primary
    case '$awayAlt':
      return ctx.match.away.secondary
    case '$homeLight':
      return visibleOnDark(ctx.match.home.primary, 0.12)
    case '$awayLight':
      return visibleOnDark(ctx.match.away.primary, 0.12)
    default:
      return p.text
  }
}

export function resolveFont(value: string, brand: BrandKit): string {
  if (!value || value[0] !== '$') return value
  const f = brand.fonts
  switch (value) {
    case '$headline':
      return f.headline
    case '$display':
      return f.display
    case '$label':
      return f.label
    case '$body':
      return f.body
    case '$numbers':
      return f.numbers
    case '$serif':
      return f.serif
    default:
      return f.body
  }
}

/** Parse "#rgb", "#rrggbb", "#rrggbbaa" or rgb()/rgba() into components. */
export function parseColor(input: string): { r: number; g: number; b: number; a: number } {
  const s = input.trim()
  if (s.startsWith('#')) {
    let h = s.slice(1)
    if (h.length === 3 || h.length === 4) h = [...h].map((c) => c + c).join('')
    const n = parseInt(h.slice(0, 6), 16)
    const a = h.length === 8 ? parseInt(h.slice(6, 8), 16) / 255 : 1
    if (Number.isNaN(n)) return { r: 0, g: 0, b: 0, a: 1 }
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255, a }
  }
  const m = s.match(/rgba?\(([^)]+)\)/)
  if (m) {
    const parts = m[1].split(',').map((x) => parseFloat(x))
    return { r: parts[0] || 0, g: parts[1] || 0, b: parts[2] || 0, a: parts[3] ?? 1 }
  }
  return { r: 0, g: 0, b: 0, a: 1 }
}

export function withAlpha(color: string, alpha: number): string {
  const { r, g, b, a } = parseColor(color)
  return `rgba(${r},${g},${b},${+(a * alpha).toFixed(4)})`
}

export function mix(c1: string, c2: string, t: number): string {
  const a = parseColor(c1)
  const b = parseColor(c2)
  const l = (x: number, y: number) => Math.round(x + (y - x) * t)
  return `rgb(${l(a.r, b.r)},${l(a.g, b.g)},${l(a.b, b.b)})`
}

export function luminance(color: string): number {
  const { r, g, b } = parseColor(color)
  const f = (c: number) => {
    const v = c / 255
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)
  }
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b)
}

/** Pick a readable foreground for a given background. */
export function contrastText(bg: string, light = '#F3F0E8', dark = '#08090B'): string {
  return luminance(bg) > 0.45 ? dark : light
}

/** Make sure a team color stays visible on a near-black background. */
export function visibleOnDark(color: string, minLum = 0.06): string {
  if (luminance(color) >= minLum) return color
  return mix(color, '#ffffff', 0.35)
}

// ── Match overrides ─────────────────────────────────────────────────────────

/** Three-letter crest abbreviation derived from a team name. */
export function abbrOf(name: string): string {
  return name.replace(/[^A-Za-zÀ-ÿ]/g, '').slice(0, 3).toUpperCase()
}

export function applyOverrides(match: MatchData, o: MatchOverrides | undefined): MatchData {
  if (!o || Object.keys(o).length === 0) return match
  return {
    ...match,
    // Overriding a team's name on one page also renames it in the short forms (and the crest letters).
    home: { ...match.home, name: o.homeName ?? match.home.name, shortName: o.homeShort ?? o.homeName ?? match.home.shortName, abbr: o.homeName ? abbrOf(o.homeName) : match.home.abbr },
    away: { ...match.away, name: o.awayName ?? match.away.name, shortName: o.awayShort ?? o.awayName ?? match.away.shortName, abbr: o.awayName ? abbrOf(o.awayName) : match.away.abbr },
    competition: o.competition ?? match.competition,
    stage: o.stage ?? match.stage,
    date: o.date ?? match.date,
    time: o.time ?? match.time,
    venue: o.venue ?? match.venue,
    headline: o.headline ?? match.headline,
    subheadline: o.subheadline ?? match.subheadline,
  }
}

// ── Dates ───────────────────────────────────────────────────────────────────

function parseISODate(iso: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || '')
  if (!m) return null
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12)
  return Number.isNaN(d.getTime()) ? null : d
}

export function formatDate(iso: string, style: 'default' | 'long' | 'short' | 'weekday' | 'day' | 'month', locale = 'es-ES'): string {
  const d = parseISODate(iso)
  if (!d) return iso || ''
  try {
    switch (style) {
      case 'long':
        return d.toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
      case 'short':
        return d.toLocaleDateString(locale, { day: '2-digit', month: '2-digit' })
      case 'weekday':
        return d.toLocaleDateString(locale, { weekday: 'long' })
      case 'day':
        return String(d.getDate())
      case 'month':
        return d.toLocaleDateString(locale, { month: 'short' }).replace('.', '')
      default: {
        const day = d.getDate()
        const month = d.toLocaleDateString(locale, { month: 'short' }).replace('.', '')
        return `${day} ${month} ${d.getFullYear()}`
      }
    }
  } catch {
    return iso
  }
}

// ── Text tokens ─────────────────────────────────────────────────────────────

export const TEXT_TOKENS: { token: string; label: string }[] = [
  { token: '{home}', label: 'Equipo local' },
  { token: '{away}', label: 'Equipo visitante' },
  { token: '{home.short}', label: 'Local (corto)' },
  { token: '{away.short}', label: 'Visitante (corto)' },
  { token: '{home.abbr}', label: 'Local (siglas)' },
  { token: '{away.abbr}', label: 'Visitante (siglas)' },
  { token: '{competition}', label: 'Competición' },
  { token: '{stage}', label: 'Jornada / fase' },
  { token: '{date}', label: 'Fecha' },
  { token: '{date.long}', label: 'Fecha larga' },
  { token: '{weekday}', label: 'Día de la semana' },
  { token: '{time}', label: 'Hora' },
  { token: '{venue}', label: 'Estadio' },
  { token: '{headline}', label: 'Titular' },
  { token: '{subheadline}', label: 'Subtítulo' },
  { token: '{pick}', label: 'Pronóstico principal' },
  { token: '{market}', label: 'Mercado' },
  { token: '{odds}', label: 'Cuota' },
  { token: '{handle}', label: 'Usuario' },
  { token: '{brand}', label: 'Marca' },
  { token: '{community}', label: 'Destino de la comunidad (opcional)' },
  { token: '{pageof}', label: 'Página (1/7)' },
  { token: '{score}', label: 'Resultado (2 - 1)' },
  { token: '{score.home}', label: 'Goles local' },
  { token: '{score.away}', label: 'Goles visitante' },
  { token: '{score.note}', label: 'Estado del partido' },
  { token: '{page}', label: 'Nº de página' },
  { token: '{pages}', label: 'Total páginas' },
  { token: '{disclaimer}', label: 'Aviso legal' },
]

function prediction(match: MatchData, i = 0): Prediction | undefined {
  return match.predictions[i]
}

export function tokenValue(key: string, ctx: TokenContext): string | undefined {
  const { match, brand } = ctx
  const loc = brand.dateLocale || 'es-ES'
  const pad = (n: number) => String(n).padStart(2, '0')
  switch (key) {
    case 'home':
      return match.home.name
    case 'away':
      return match.away.name
    case 'home.short':
      return match.home.shortName || match.home.name
    case 'away.short':
      return match.away.shortName || match.away.name
    case 'home.abbr':
      return match.home.abbr
    case 'away.abbr':
      return match.away.abbr
    case 'home.formation':
      return match.home.formation
    case 'away.formation':
      return match.away.formation
    case 'home.coach':
      return match.home.coach
    case 'away.coach':
      return match.away.coach
    case 'competition':
      return match.competition
    case 'stage':
      return match.stage
    case 'date':
      return formatDate(match.date, 'default', loc)
    case 'date.long':
      return formatDate(match.date, 'long', loc)
    case 'date.short':
      return formatDate(match.date, 'short', loc)
    case 'weekday':
      return formatDate(match.date, 'weekday', loc)
    case 'day':
      return formatDate(match.date, 'day', loc)
    case 'month':
      return formatDate(match.date, 'month', loc)
    case 'time':
      return match.time
    case 'venue':
      return match.venue
    case 'headline':
      return match.headline
    case 'subheadline':
      return match.subheadline
    case 'notes':
      return match.notes
    case 'pick':
      return prediction(match)?.pick ?? ''
    case 'market':
      return prediction(match)?.market ?? ''
    case 'odds':
      return prediction(match)?.odds ?? ''
    case 'handle':
      return brand.handle
    case 'brand':
      return brand.name
    // Optional external destination. '{telegram}' kept as a legacy alias.
    case 'community':
    case 'telegram':
      return brand.telegramUrl
    case 'community.label':
    case 'telegram.label':
      return brand.telegramLabel
    case 'disclaimer':
      return brand.disclaimer
    case 'page':
      return ctx.pageNumbers === false ? '' : pad(ctx.page)
    case 'pages':
      return ctx.pageNumbers === false ? '' : pad(ctx.pages)
    // "1/7" — empty on single posts so a lone page never reads "1/1".
    case 'pageof':
      return ctx.pageNumbers !== false && ctx.pages > 1 ? `${ctx.page}/${ctx.pages}` : ''
    case 'num':
      return ctx.pageNumbers === false ? '' : String(ctx.page)
    case 'total':
      return ctx.pageNumbers === false ? '' : String(ctx.pages)
    case 'score':
      return `${match.score?.home || '0'} - ${match.score?.away || '0'}`
    case 'score.home':
      return match.score?.home || '0'
    case 'score.away':
      return match.score?.away || '0'
    case 'score.note':
      return match.score?.note ?? ''
    default: {
      const pm = /^pick(\d)$/.exec(key)
      if (pm) return prediction(match, Number(pm[1]) - 1)?.pick ?? ''
      const mm = /^market(\d)$/.exec(key)
      if (mm) return prediction(match, Number(mm[1]) - 1)?.market ?? ''
      return undefined
    }
  }
}

export function resolveText(text: string, ctx: TokenContext, depth = 0): string {
  if (!text || text.indexOf('{') === -1) return text
  const out = text.replace(/\{([a-zA-Z0-9.]+)\}/g, (all, key: string) => {
    const v = tokenValue(key, ctx)
    return v === undefined ? all : v
  })
  // A data field can hold tokens too (a headline such as «{home.short} vs [[{away.short}]]»).
  return depth < 2 && out !== text && /\{[a-zA-Z0-9.]+\}/.test(out) ? resolveText(out, ctx, depth + 1) : out
}

/** True when the text references shared match data. */
export function isLinked(text: string): boolean {
  return /\{(home|away|competition|stage|date|weekday|time|venue|headline|subheadline|pick|market|odds)[a-zA-Z0-9.]*\}/.test(text)
}

// ── Editorial presets (accent + intensity) ──────────────────────────────────

const INTENSITY_RANK: Record<Intensity, number> = { minimal: 0, editorial: 1, cinematic: 2 }

export function slideIntensity(project: Pick<Project, 'style'> | null | undefined, slide: Pick<Slide, 'intensity'>): Intensity {
  return slide.intensity ?? project?.style?.intensity ?? 'editorial'
}

export function slideAccent(project: Pick<Project, 'style'> | null | undefined, slide: Pick<Slide, 'accent'>): ColorValue | undefined {
  return slide.accent ?? project?.style?.accent
}

/** True when the element should render at the given slide intensity. */
export function shownAtIntensity(el: Pick<SlideElement, 'minIntensity'>, intensity: Intensity): boolean {
  if (!el.minIntensity) return true
  return INTENSITY_RANK[intensity] >= INTENSITY_RANK[el.minIntensity]
}
