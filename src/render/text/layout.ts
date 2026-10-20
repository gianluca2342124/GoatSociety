// Rich text layout engine: wrapping, letter spacing, [[accent]] spans and
// auto-fit. Used identically by the editor and the exporter.
import { cssFont } from '../../fonts/fonts'

export interface TextStyle {
  family: string
  size: number
  weight: number
  italic: boolean
  letterSpacing: number
  lineHeight: number
  uppercase: boolean
}

export interface Run {
  text: string
  accent: boolean
  x: number
  w: number
}

export interface Line {
  runs: Run[]
  width: number
}

export interface TextLayout {
  lines: Line[]
  fontSize: number
  letterSpacing: number
  lineHeightPx: number
  height: number
  maxLineWidth: number
  overflow: boolean
  capHeight: number
}

let measureCtx: CanvasRenderingContext2D | null = null
function mctx(): CanvasRenderingContext2D {
  if (!measureCtx) {
    const c = document.createElement('canvas')
    c.width = 4
    c.height = 4
    measureCtx = c.getContext('2d')!
  }
  return measureCtx
}

export const supportsLetterSpacing = (() => {
  try {
    if (typeof document === 'undefined') return false
    return 'letterSpacing' in (document.createElement('canvas').getContext('2d') as object)
  } catch {
    return false
  }
})()

export function setFont(ctx: CanvasRenderingContext2D, family: string, size: number, weight: number, italic: boolean, letterSpacing: number) {
  ctx.font = cssFont(family, size, weight, italic)
  if (supportsLetterSpacing) (ctx as unknown as { letterSpacing: string }).letterSpacing = `${letterSpacing}px`
}

export function measure(text: string, family: string, size: number, weight: number, italic: boolean, letterSpacing: number): number {
  if (!text) return 0
  const ctx = mctx()
  setFont(ctx, family, size, weight, italic, letterSpacing)
  const w = ctx.measureText(text).width
  if (supportsLetterSpacing) return w - letterSpacing
  return w + letterSpacing * Math.max(0, text.length - 1)
}

const capCache = new Map<string, number>()
export function capHeightOf(family: string, size: number, weight: number, italic: boolean): number {
  const key = `${family}|${weight}|${italic}`
  let ratio = capCache.get(key)
  if (ratio == null) {
    const ctx = mctx()
    setFont(ctx, family, 100, weight, italic, 0)
    const m = ctx.measureText('H')
    ratio = m.actualBoundingBoxAscent ? m.actualBoundingBoxAscent / 100 : 0.72
    // Font may not be loaded yet: don't cache a fallback measurement forever.
    if (typeof document !== 'undefined' && document.fonts && document.fonts.check(cssFont(family, 100, weight, italic))) capCache.set(key, ratio)
  }
  return ratio * size
}

interface Token {
  text: string
  accent: boolean
  space: boolean
}

/** Parse [[accent]] markup into word/space tokens. */
export function tokenize(paragraph: string): Token[] {
  const out: Token[] = []
  let accent = false
  let buf = ''
  const flush = () => {
    if (buf) out.push({ text: buf, accent, space: false })
    buf = ''
  }
  for (let i = 0; i < paragraph.length; i++) {
    const ch = paragraph[i]
    if (ch === '[' && paragraph[i + 1] === '[') {
      flush()
      accent = true
      i++
      continue
    }
    if (ch === ']' && paragraph[i + 1] === ']') {
      flush()
      accent = false
      i++
      continue
    }
    if (ch === ' ' || ch === '\t') {
      flush()
      out.push({ text: ' ', accent, space: true })
      continue
    }
    buf += ch
  }
  flush()
  return out
}

export function stripMarkup(text: string): string {
  return text.replace(/\[\[|\]\]/g, '')
}

const layoutCache = new Map<string, TextLayout>()

export function layoutText(raw: string, style: TextStyle, maxWidth: number): TextLayout {
  const key = `${raw}|${style.family}|${style.size}|${style.weight}|${style.italic}|${style.letterSpacing}|${style.lineHeight}|${style.uppercase}|${Math.round(maxWidth)}`
  const hit = layoutCache.get(key)
  if (hit) return hit
  const text = style.uppercase ? raw.toLocaleUpperCase('es-ES') : raw
  const { family, size, weight, italic, letterSpacing } = style
  const m = (s: string) => measure(s, family, size, weight, italic, letterSpacing)
  const spaceW = m(' ') + letterSpacing
  const lines: Line[] = []
  let overflow = false

  for (const paragraph of text.split('\n')) {
    // Group consecutive non-space tokens into words (a word can mix accent/non-accent runs).
    const tokens = tokenize(paragraph)
    const words: Token[][] = []
    let cur: Token[] = []
    for (const t of tokens) {
      if (t.space) {
        if (cur.length) words.push(cur)
        cur = []
      } else cur.push(t)
    }
    if (cur.length) words.push(cur)
    if (words.length === 0) {
      lines.push({ runs: [], width: 0 })
      continue
    }
    let line: Run[] = []
    let x = 0
    const pushLine = () => {
      lines.push({ runs: line, width: x })
      line = []
      x = 0
    }
    for (const word of words) {
      const parts = word.map((t) => ({ ...t, w: m(t.text) }))
      const ww = parts.reduce((a, p) => a + p.w, 0) + letterSpacing * Math.max(0, parts.length - 1)
      const needed = line.length ? x + spaceW + ww : ww
      if (line.length && needed > maxWidth + 0.5) pushLine()
      if (ww > maxWidth + 0.5) overflow = true
      let px = line.length ? x + spaceW : x
      for (const p of parts) {
        line.push({ text: p.text, accent: p.accent, x: px, w: p.w })
        px += p.w + letterSpacing
      }
      x = px - letterSpacing
    }
    pushLine()
  }

  const lineHeightPx = size * style.lineHeight
  const maxLineWidth = lines.reduce((a, l) => Math.max(a, l.width), 0)
  const layout: TextLayout = {
    lines,
    fontSize: size,
    letterSpacing,
    lineHeightPx,
    height: lines.length * lineHeightPx,
    maxLineWidth,
    overflow,
    capHeight: capHeightOf(family, size, weight, italic),
  }
  if (layoutCache.size > 600) layoutCache.clear()
  layoutCache.set(key, layout)
  return layout
}

/**
 * Largest font size ≤ style.size where the text fits in the box without
 * overflowing horizontally or vertically (binary search).
 */
export function fitText(raw: string, style: TextStyle, maxWidth: number, maxHeight: number, minSize: number): TextLayout {
  const at = (size: number) => layoutText(raw, { ...style, size, letterSpacing: style.letterSpacing * (size / style.size) }, maxWidth)
  const full = at(style.size)
  if (!full.overflow && full.height <= maxHeight + 0.5) return full
  let lo = Math.max(4, Math.min(minSize, style.size))
  let hi = style.size
  let best = at(lo)
  for (let i = 0; i < 10; i++) {
    const mid = (lo + hi) / 2
    const l = at(mid)
    if (!l.overflow && l.height <= maxHeight + 0.5) {
      best = l
      lo = mid
    } else hi = mid
    if (hi - lo < 0.5) break
  }
  return best
}

export function clearLayoutCache() {
  layoutCache.clear()
  capCache.clear()
}
