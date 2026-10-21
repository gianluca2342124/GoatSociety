// Building blocks shared by all templates. Templates are parameterized
// compositions of editable elements laid out relative to the canvas format.
import * as E from '../model/elements'
import type { BrandMarkElement, CanvasFormat, CrestElement, EffectElement, Fill, ShapeElement, SlideBackground, SlideElement, TextElement } from '../model/types'
import { defaultBackground } from '../model/defaults'

export interface TCtx {
  W: number
  H: number
  /** Content column width and left edge. */
  cw: number
  left: number
  /** Right edge of the content column. */
  right: number
  cx: number
  /** Typographic scale relative to a 1080px story (936px column). */
  s: number
  /** Signature row (top of the slide). */
  top: number
  /** First and last y for primary content (mobile safe area: TikTok/IG UI). */
  contentTop: number
  contentBottom: number
  /** Legacy footer row. */
  footer: number
  ch: number
  landscape: boolean
  story: boolean
  /** Canvas preset ('vertical' = 3:4 default). */
  preset: CanvasFormat['preset']
  /** Vertical density: <1 on short formats. */
  v: number
}

/**
 * GOAT EDITORIAL type scale (px on a 1080×1920 story, multiplied by t.s).
 * hero 100–170 · main stat 130–250+ · secondary 55–85 · support 38–55 · labels 32–45.
 */
export const TYPE = {
  mega: 320,
  stat: 230,
  hero: 150,
  h2: 96,
  secondary: 64,
  support: 46,
  label: 38,
  micro: 30,
} as const

export function makeCtx(format: CanvasFormat): TCtx {
  const { width: W, height: H, preset } = format
  const landscape = preset === 'landscape'
  const story = preset === 'story'
  const margin = landscape ? 110 : 72
  const cw = landscape ? Math.min(W - margin * 2, 1240) : W - margin * 2
  const left = (W - cw) / 2
  let top: number
  let contentTop: number
  let contentBottom: number
  let footer: number
  switch (preset) {
    case 'story':
      // Keep the message clear of the platform UI (status bar/tabs on top,
      // caption and buttons at the bottom).
      top = 150
      contentTop = 270
      contentBottom = H - 320
      footer = H - 250
      break
    case 'vertical':
      top = 64
      contentTop = 156
      contentBottom = H - 96
      footer = H - 80
      break
    case 'portrait':
      top = 64
      contentTop = 150
      contentBottom = H - 100
      footer = H - 84
      break
    default:
      top = 52
      contentTop = 132
      contentBottom = H - 84
      footer = H - 72
  }
  const ch = contentBottom - contentTop
  return { W, H, cw, left, right: left + cw, cx: W / 2, s: Math.min(1, cw / 936), top, contentTop, contentBottom, footer, ch, landscape, story, preset, v: Math.min(1, ch / 1290) }
}

/** y/h for a fraction range of the content zone. */
export function zone(t: TCtx, from: number, to: number): { y: number; h: number } {
  return { y: t.contentTop + t.ch * from, h: t.ch * (to - from) }
}

// ════════════════════════════════════════════════════════════════════════════
// GOAT EDITORIAL building blocks
// Black background · big white type · ONE accent ($accent) · one message.
// ════════════════════════════════════════════════════════════════════════════

/** Solid editorial background. */
/**
 * Editorial background: near-black with a restrained radial lift at the top
 * (premium depth without textures). Fully opaque — exports never go transparent.
 */
export function ink(): SlideBackground {
  return bg({ kind: 'radial', cx: 0.5, cy: 0, radius: 1.15, stops: [{ offset: 0, color: '#1C1C1C' }, { offset: 0.45, color: '#0D0D0D' }, { offset: 1, color: '$bg' }] })
}

/** Flat black (photo templates, where the picture provides the depth). */
export function inkFlat(): SlideBackground {
  return bg({ kind: 'solid', color: '$bg' })
}

/** Size helper: scales a story px value to the format (keeps a sane floor). */
export function px(t: TCtx, v: number, floor = 0): number {
  return Math.max(floor, v * Math.min(t.s, t.v + 0.18))
}

/** Discreet brand signature (top-left by default). */
export function signature(t: TCtx, p: Partial<BrandMarkElement> = {}): BrandMarkElement {
  const h = px(t, 44, 28)
  return E.brandMark({ name: 'Firma', variant: 'editorial', align: 'left', x: t.left, y: t.top, width: 460 * t.s, height: h, color: '$text', accentColor: '$text', ...p })
}

/** Page number "1/7" at the top-right (hidden on single posts and when page numbers are off). */
export function pageNo(t: TCtx, p: Partial<TextElement> = {}): TextElement {
  const h = px(t, 44, 28)
  const fs = px(t, 34, 22)
  return text(t, '{pageof}', { x: t.right - 240 * t.s, y: t.top + (h - fs * 1.2) / 2, w: 240 * t.s, h: fs * 1.2 }, {
    name: 'Nº de página',
    fontFamily: '$label',
    fontSize: fs,
    fontWeight: 600,
    letterSpacing: fs * 0.04,
    lineHeight: 1,
    uppercase: true,
    align: 'right',
    verticalAlign: 'middle',
    fill: { kind: 'solid', color: '$muted' },
    autoFit: false,
    ...p,
  })
}

/** Standard brand chrome for editorial pages: signature top-left + page number top-right. */
export function chrome(t: TCtx): SlideElement[] {
  return [signature(t), pageNo(t)]
}

/** Small goat mark (everyday slides) — never a hero. */
export function goatMark(t: TCtx, x: number, y: number, size = 64, p: Partial<BrandMarkElement> = {}): BrandMarkElement {
  const s = px(t, size, 32)
  return E.brandMark({ name: 'Marca', variant: 'icon', x, y, width: s, height: s, color: '$text', accentColor: '$text', ...p })
}

/** Headline: Anton, left aligned, tight leading, accent markup [[word]]. */
export function hl(t: TCtx, content: string, box: { x?: number; y: number; w?: number; h: number }, size: number = TYPE.hero, p: Partial<TextElement> = {}): TextElement {
  const fs = size * t.s
  return text(t, content, box, {
    name: 'Titular',
    fontFamily: '$headline',
    fontSize: fs,
    fontWeight: 400,
    // Room for Spanish accents (Á, Ú) and Ç between uppercase lines.
    lineHeight: 1.04,
    letterSpacing: 0,
    uppercase: true,
    // House rule: main headlines are centered, with a subtle metallic finish.
    align: 'center',
    verticalAlign: 'top',
    fill: { kind: 'solid', color: '$text' },
    accentColor: '$accent',
    effect: 'metallic',
    autoFit: true,
    minFontSize: Math.min(fs, Math.max(44, fs * 0.45)),
    ...p,
  })
}

/** Support line: Inter Tight, secondary gray, sentence case. */
export function support(t: TCtx, content: string, box: { x?: number; y: number; w?: number; h: number }, size: number = TYPE.support, p: Partial<TextElement> = {}): TextElement {
  const fs = size * t.s
  return text(t, content, box, {
    name: 'Apoyo',
    fontFamily: '$body',
    fontSize: fs,
    fontWeight: 500,
    lineHeight: 1.22,
    letterSpacing: 0,
    uppercase: false,
    align: 'left',
    verticalAlign: 'top',
    fill: { kind: 'solid', color: '$muted' },
    accentColor: '$text',
    autoFit: true,
    minFontSize: Math.max(26, fs * 0.7),
    ...p,
  })
}

/** Label: Barlow Condensed, uppercase, minimal tracking. */
export function label(t: TCtx, content: string, box: { x?: number; y: number; w?: number; h: number }, size: number = TYPE.label, p: Partial<TextElement> = {}): TextElement {
  const fs = size * t.s
  return text(t, content, box, {
    name: 'Etiqueta',
    fontFamily: '$label',
    fontSize: fs,
    fontWeight: 600,
    lineHeight: 1.05,
    letterSpacing: fs * 0.02,
    uppercase: true,
    align: 'left',
    verticalAlign: 'top',
    fill: { kind: 'solid', color: '$muted' },
    accentColor: '$accent',
    autoFit: true,
    minFontSize: Math.max(24, fs * 0.7),
    ...p,
  })
}

/** Text-only call to action (no pill, no fake button). */
export function cta(t: TCtx, content: string, box: { x?: number; y: number; w?: number; h?: number }, size = 52, p: Partial<TextElement> = {}): TextElement {
  const fs = size * t.s
  return text(t, content, { ...box, h: box.h ?? fs * 1.3 }, {
    name: 'Llamada a la acción',
    fontFamily: '$label',
    fontSize: fs,
    fontWeight: 700,
    lineHeight: 1.05,
    letterSpacing: fs * 0.01,
    uppercase: true,
    align: 'left',
    verticalAlign: 'top',
    fill: { kind: 'solid', color: '$text' },
    accentColor: '$accent',
    autoFit: true,
    minFontSize: Math.max(26, fs * 0.6),
    ...p,
  })
}

/** Legal line (small, dim). */
export function disclaimer(t: TCtx, y: number, p: Partial<TextElement> = {}): TextElement {
  const fs = px(t, 28, 18)
  return text(t, '{disclaimer}', { y, h: fs * 1.4 }, {
    name: 'Aviso',
    fontFamily: '$body',
    fontSize: fs,
    fontWeight: 500,
    lineHeight: 1.2,
    letterSpacing: 0,
    uppercase: false,
    align: 'left',
    fill: { kind: 'solid', color: '$dim' },
    autoFit: true,
    minFontSize: 16,
    ...p,
  })
}

/** Flat hairline separator (#242424). */
export function rule(t: TCtx, y: number, w = t.cw, x = t.left): ShapeElement {
  return E.shape({ name: 'Separador', shape: 'rect', x, y, width: w, height: 2, cornerRadius: 0, fill: { kind: 'solid', color: '$line' } })
}

/** Plain team crest (no glow, no rim). */
export function crestOf(side: 'home' | 'away', x: number, y: number, size: number, p: Partial<CrestElement> = {}): CrestElement {
  return E.crest({ name: side === 'home' ? 'Escudo local' : 'Escudo visitante', side, x, y, width: size, height: size, aura: 0, ...p })
}

/**
 * Cinematic-only atmosphere: invisible on Minimal/Editorial slides, shown
 * when the user picks the Cinematic intensity. Never deleted.
 */
export function cinematic(t: TCtx, kind: 'spot' | 'stadium' | 'grain' = 'spot'): SlideElement[] {
  const only = { minIntensity: 'cinematic' as const }
  const out: SlideElement[] = []
  if (kind === 'stadium') out.push(fx(t, 'stadiumLights', { color: '#FFFFFF', intensity: 0.35, spread: 0.3, height: t.H * 0.6, ...only }))
  if (kind === 'spot' || kind === 'stadium') out.push(fx(t, 'spotlight', { color: '#FFFFFF', intensity: 0.1, spread: 0.6, height: t.H * 0.7, ...only }))
  out.push(vignette(t, 0.7, 0.35))
  out.push(grain(t, 0.05))
  for (const e of out) e.minIntensity = 'cinematic'
  return out
}

// ── Legacy helpers (kept for compatibility) ───────────────────────────────

// ── Backgrounds & atmosphere ───────────────────────────────────────────────

export function bg(fill: Fill): SlideBackground {
  return { ...defaultBackground(), fill }
}

export const BG = {
  noir: (): SlideBackground => bg({ kind: 'radial', cx: 0.5, cy: 0.18, radius: 0.95, stops: [{ offset: 0, color: '#1B1F26' }, { offset: 0.55, color: '#0D0F12' }, { offset: 1, color: '$bg' }] }),
  emerald: (): SlideBackground => bg({ kind: 'linear', angle: 180, stops: [{ offset: 0, color: '#0A1714' }, { offset: 0.6, color: '#090D0C' }, { offset: 1, color: '$bg' }] }),
  burgundy: (): SlideBackground => bg({ kind: 'linear', angle: 180, stops: [{ offset: 0, color: '#1A0D11' }, { offset: 0.6, color: '#0E0A0B' }, { offset: 1, color: '$bg' }] }),
  graphite: (): SlideBackground => bg({ kind: 'linear', angle: 160, stops: [{ offset: 0, color: '#16191E' }, { offset: 1, color: '$bg' }] }),
  ink: (): SlideBackground => bg({ kind: 'solid', color: '$bg' }),
}

type FxOpts = Partial<EffectElement>

export function fx(t: TCtx, effect: EffectElement['effect'], p: FxOpts = {}): EffectElement {
  return E.effect({ name: FX_NAMES[effect], effect, x: 0, y: 0, width: t.W, height: t.H, locked: true, ...p })
}

const FX_NAMES: Record<EffectElement['effect'], string> = {
  vignette: 'Viñeta',
  spotlight: 'Foco',
  fog: 'Niebla',
  grain: 'Grano',
  glow: 'Resplandor',
  gradient: 'Degradado',
  lightRays: 'Rayos de luz',
  scanlines: 'Líneas',
  grid: 'Retícula',
  pitchLines: 'Líneas de campo',
  bokeh: 'Bokeh',
  stadiumLights: 'Focos de estadio',
  noiseGradient: 'Aurora',
}

export function grain(t: TCtx, intensity = 0.07): EffectElement {
  return fx(t, 'grain', { intensity, spread: 0.3, fx: { blend: 'overlay' } })
}

export function vignette(t: TCtx, intensity = 0.85, spread = 0.35): EffectElement {
  return fx(t, 'vignette', { intensity, spread, color: '#000000' })
}

export function glow(_t: TCtx, x: number, y: number, r: number, color: string, intensity = 0.45, squash = 1): EffectElement {
  return E.effect({ name: 'Resplandor', effect: 'glow', x: x - r, y: y - r * squash, width: r * 2, height: r * 2 * squash, color, intensity, spread: 0, locked: true })
}

export function bottomFade(t: TCtx, from = 0.55, intensity = 1): EffectElement {
  return fx(t, 'gradient', { color: '$bg', color2: '$bg', angle: 180, spread: from, intensity })
}

// ── Typography helpers ─────────────────────────────────────────────────────

export function text(t: TCtx, content: string, box: { x?: number; y: number; w?: number; h: number }, p: Partial<TextElement> = {}): TextElement {
  return E.text({
    name: p.name ?? content.replace(/\{|\}|\[|\]/g, '').slice(0, 24),
    text: content,
    x: box.x ?? t.left,
    y: box.y,
    width: box.w ?? t.cw,
    height: box.h,
    ...p,
  })
}

/** Small spaced uppercase label (editorial kicker). */
export function kicker(t: TCtx, content: string, y: number, p: Partial<TextElement> = {}): TextElement {
  // Scale with vertical density too, so short formats never collide with the headline below.
  const size = (p.fontSize ?? 30) * Math.max(0.62, Math.min(t.s, t.v + 0.12))
  return text(t, content, { y, h: size * 1.5 }, {
    name: 'Etiqueta',
    fontFamily: '$label',
    fontSize: size,
    fontWeight: 700,
    letterSpacing: size * 0.32,
    lineHeight: 1.1,
    fill: { kind: 'solid', color: '$primary' },
    autoFit: true,
    minFontSize: 14,
    ...p,
  })
}

export function headline(t: TCtx, content: string, box: { x?: number; y: number; w?: number; h: number }, size: number, p: Partial<TextElement> = {}): TextElement {
  return text(t, content, box, { name: 'Titular', fontFamily: '$headline', fontSize: size, lineHeight: 0.92, minFontSize: 40, ...p })
}

export function body(t: TCtx, content: string, box: { x?: number; y: number; w?: number; h: number }, size = 34, p: Partial<TextElement> = {}): TextElement {
  return text(t, content, box, {
    name: 'Texto',
    fontFamily: '$body',
    fontSize: size,
    fontWeight: 500,
    uppercase: false,
    lineHeight: 1.32,
    fill: { kind: 'solid', color: '$muted' },
    minFontSize: 16,
    ...p,
  })
}

export function hairline(t: TCtx, y: number, w = t.cw, color = '$primary', opacity = 0.45, x?: number) {
  return E.shape({ name: 'Línea', shape: 'rect', x: x ?? t.cx - w / 2, y, width: w, height: 2, cornerRadius: 0, fill: { kind: 'linear', angle: 90, stops: [{ offset: 0, color, opacity: 0 }, { offset: 0.5, color, opacity }, { offset: 1, color, opacity: 0 }] } })
}

// ── Standard chrome (header / footer / page number) ────────────────────────

export function header(t: TCtx, opts: { label?: string; page?: boolean } = {}): SlideElement[] {
  const h = 46 * Math.max(0.85, t.s)
  const out: SlideElement[] = [
    E.brandMark({ name: 'Marca cabecera', variant: 'header', align: 'left', x: t.left, y: t.top, width: 440 * Math.max(0.85, t.s), height: h }),
  ]
  if (opts.page !== false) {
    out.push(
      text(t, '{page} / {pages}', { x: t.left + t.cw - 220, y: t.top, w: 220, h }, {
        name: 'Nº de página',
        fontFamily: '$label',
        fontSize: 30 * Math.max(0.85, t.s),
        fontWeight: 600,
        letterSpacing: 4,
        align: 'right',
        fill: { kind: 'solid', color: '$muted' },
        autoFit: false,
      }),
    )
  }
  if (opts.label) {
    out.push(kicker(t, opts.label, t.top + h + 26, { fontSize: 24, fill: { kind: 'solid', color: '$muted' }, name: 'Etiqueta superior' }))
  }
  return out
}

export function footer(t: TCtx, content = '{handle}', swipe = false): SlideElement[] {
  const size = 26 * Math.max(0.85, t.s)
  const out: SlideElement[] = [
    text(t, content, { y: t.footer, h: size * 1.6 }, { name: 'Pie', fontFamily: '$label', fontSize: size, fontWeight: 600, letterSpacing: size * 0.3, fill: { kind: 'solid', color: '$muted' }, autoFit: true, minFontSize: 12 }),
  ]
  if (swipe) {
    out.push(
      text(t, 'Desliza  →', { x: t.left + t.cw - 260, y: t.footer, w: 260, h: size * 1.6 }, { name: 'Desliza', fontFamily: '$label', fontSize: size, fontWeight: 700, letterSpacing: size * 0.25, align: 'right', fill: { kind: 'solid', color: '$primary' }, autoFit: false }),
    )
    ;(out[0] as TextElement).align = 'left'
  }
  return out
}

/** Atmosphere presets (always below content). */
export function atmosphere(t: TCtx, kind: 'stadium' | 'emerald' | 'burgundy' | 'gold' | 'noir' | 'pitch'): SlideElement[] {
  switch (kind) {
    case 'stadium':
      return [
        fx(t, 'stadiumLights', { color: '#FFF1D6', intensity: 0.55, spread: 0.3, height: t.H * 0.7 }),
        fx(t, 'fog', { color: '#9AA4B2', intensity: 0.22, spread: 0.4, seed: 4, y: t.H * 0.35, height: t.H * 0.65 }),
        vignette(t, 0.9, 0.3),
        grain(t),
      ]
    case 'emerald':
      return [fx(t, 'noiseGradient', { color: '$secondary', color2: '#0B2A23', intensity: 0.75, spread: 0.35, seed: 6 }), vignette(t, 0.85), grain(t)]
    case 'burgundy':
      return [fx(t, 'noiseGradient', { color: '$tertiary', color2: '#2A0E15', intensity: 0.7, spread: 0.35, seed: 8 }), vignette(t, 0.85), grain(t)]
    case 'gold':
      return [
        fx(t, 'lightRays', { color: '$primary', intensity: 0.35, spread: 0.5, seed: 5, height: t.H * 0.8 }),
        fx(t, 'noiseGradient', { color: '#3A2F17', color2: '#1A160C', intensity: 0.6, spread: 0.3, seed: 3 }),
        vignette(t, 0.9),
        grain(t),
      ]
    case 'pitch':
      return [
        fx(t, 'pitchLines', { color: '$text', intensity: 0.12, spread: 0.3, y: t.H * 0.45, height: t.H * 0.55 }),
        fx(t, 'noiseGradient', { color: '$secondary', color2: '#0A1F19', intensity: 0.55, spread: 0.3, seed: 12 }),
        vignette(t, 0.9),
        grain(t),
      ]
    default:
      return [fx(t, 'spotlight', { color: '#FFFFFF', intensity: 0.16, spread: 0.55, height: t.H * 0.75 }), vignette(t, 0.9), grain(t)]
  }
}

export function crestPair(t: TCtx, y: number, size: number, gap?: number): SlideElement[] {
  const g = gap ?? t.cw * 0.2
  const lx = t.cx - g / 2 - size
  const rx = t.cx + g / 2
  return [
    glow(t, lx + size / 2, y + size / 2, size * 0.95, '$home', 0.42),
    glow(t, rx + size / 2, y + size / 2, size * 0.95, '$away', 0.42),
    E.crest({ name: 'Escudo local', side: 'home', x: lx, y, width: size, height: size, aura: 0 }),
    E.crest({ name: 'Escudo visitante', side: 'away', x: rx, y, width: size, height: size, aura: 0 }),
  ]
}

export function teamNames(t: TCtx, y: number, size: number, crestSize: number, gap?: number): SlideElement[] {
  const g = gap ?? t.cw * 0.2
  const w = crestSize + g * 0.8
  const lx = t.cx - g / 2 - crestSize / 2 - w / 2
  const rx = t.cx + g / 2 + crestSize / 2 - w / 2
  const common: Partial<TextElement> = { fontFamily: '$label', fontSize: size, fontWeight: 700, letterSpacing: size * 0.08, lineHeight: 1, minFontSize: 16 }
  return [text(t, '{home.short}', { x: lx, y, w, h: size * 1.3 }, { ...common, name: 'Nombre local' }), text(t, '{away.short}', { x: rx, y, w, h: size * 1.3 }, { ...common, name: 'Nombre visitante' })]
}

export function pill(t: TCtx, content: string, y: number, size = 28, p: Partial<TextElement> = {}): TextElement {
  const s = size * Math.max(0.85, t.s)
  return text(t, content, { y, h: s * 2.4 }, {
    name: 'Píldora',
    fontFamily: '$label',
    fontSize: s,
    fontWeight: 700,
    letterSpacing: s * 0.18,
    fill: { kind: 'solid', color: '$text' },
    background: { color: '$surface', opacity: 0.85, paddingX: s * 1.2, paddingY: s * 0.6, radius: s * 1.2 },
    autoFit: false,
    ...p,
  })
}
