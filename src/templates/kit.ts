// Building blocks shared by all templates. Templates are parameterized
// compositions of editable elements laid out relative to the canvas format.
import * as E from '../model/elements'
import type { CanvasFormat, EffectElement, Fill, SlideBackground, SlideElement, TextElement } from '../model/types'
import { defaultBackground } from '../model/defaults'

export interface TCtx {
  W: number
  H: number
  /** Content column width and left edge. */
  cw: number
  left: number
  cx: number
  /** Typographic scale relative to a 1080px column. */
  s: number
  /** Vertical zones. */
  top: number
  contentTop: number
  contentBottom: number
  footer: number
  ch: number
  landscape: boolean
  story: boolean
  /** Vertical density: <1 on short formats. */
  v: number
}

export function makeCtx(format: CanvasFormat): TCtx {
  const { width: W, height: H, preset } = format
  const landscape = preset === 'landscape'
  const story = preset === 'story'
  const margin = landscape ? 110 : 80
  const cw = landscape ? Math.min(W - margin * 2, 1240) : W - margin * 2
  const left = (W - cw) / 2
  let top: number
  let contentTop: number
  let contentBottom: number
  let footer: number
  switch (preset) {
    case 'story':
      top = 150
      contentTop = 290
      contentBottom = H - 330
      footer = H - 250
      break
    case 'portrait':
      top = 68
      contentTop = 165
      contentBottom = H - 135
      footer = H - 84
      break
    default:
      top = 56
      contentTop = 150
      contentBottom = H - 120
      footer = H - 72
  }
  const ch = contentBottom - contentTop
  return { W, H, cw, left, cx: W / 2, s: Math.min(1, cw / 920), top, contentTop, contentBottom, footer, ch, landscape, story, v: Math.min(1, ch / 1220) }
}

/** y/h for a fraction range of the content zone. */
export function zone(t: TCtx, from: number, to: number): { y: number; h: number } {
  return { y: t.contentTop + t.ch * from, h: t.ch * (to - from) }
}

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
  const size = (p.fontSize ?? 30) * Math.max(0.8, t.s)
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
