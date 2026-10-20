import { capHeightOf, measure, setFont, supportsLetterSpacing, type TextLayout, type TextStyle } from './layout'
import type { Ctx } from '../paint/canvas'

function fillTextSpaced(ctx: Ctx, text: string, x: number, y: number, ls: number, stroke = false) {
  if (supportsLetterSpacing || ls === 0) {
    if (stroke) ctx.strokeText(text, x, y)
    else ctx.fillText(text, x, y)
    return
  }
  let cx = x
  const prevAlign = ctx.textAlign
  ctx.textAlign = 'left'
  for (const ch of text) {
    if (stroke) ctx.strokeText(ch, cx, y)
    else ctx.fillText(ch, cx, y)
    cx += ctx.measureText(ch).width + ls
  }
  ctx.textAlign = prevAlign
}

export interface DrawLayoutOptions {
  width: number
  height: number
  align: 'left' | 'center' | 'right'
  verticalAlign: 'top' | 'middle' | 'bottom'
  fill: string | CanvasGradient | null
  accent: string
  stroke?: { color: string; width: number }
}

/** Draw a laid-out paragraph inside a box. Caps are centered in each line box. */
export function drawLayout(ctx: Ctx, layout: TextLayout, style: TextStyle, o: DrawLayoutOptions) {
  const { lines, lineHeightPx, letterSpacing } = layout
  const size = layout.fontSize
  const cap = capHeightOf(style.family, size, style.weight, style.italic)
  let top = 0
  if (o.verticalAlign === 'middle') top = (o.height - layout.height) / 2
  else if (o.verticalAlign === 'bottom') top = o.height - layout.height
  setFont(ctx, style.family, size, style.weight, style.italic, letterSpacing)
  ctx.textBaseline = 'alphabetic'
  ctx.textAlign = 'left'
  lines.forEach((line, i) => {
    let ox = 0
    if (o.align === 'center') ox = (o.width - line.width) / 2
    else if (o.align === 'right') ox = o.width - line.width
    const baseline = top + i * lineHeightPx + lineHeightPx / 2 + cap / 2
    for (const run of line.runs) {
      if (o.stroke && o.stroke.width > 0) {
        ctx.save()
        ctx.lineJoin = 'round'
        ctx.miterLimit = 2
        ctx.strokeStyle = o.stroke.color
        ctx.lineWidth = o.stroke.width * 2
        fillTextSpaced(ctx, run.text, ox + run.x, baseline, letterSpacing, true)
        ctx.restore()
      }
      const style = run.accent ? o.accent : o.fill
      if (!style) continue
      ctx.fillStyle = style
      fillTextSpaced(ctx, run.text, ox + run.x, baseline, letterSpacing)
    }
  })
}

export interface LabelOptions {
  family: string
  size: number
  weight?: number
  italic?: boolean
  color: string | CanvasGradient
  align?: 'left' | 'center' | 'right'
  /** 'middle' centers cap height on y; 'top' puts cap top at y; 'baseline' uses y as baseline. */
  baseline?: 'middle' | 'top' | 'baseline' | 'bottom'
  letterSpacing?: number
  maxWidth?: number
  uppercase?: boolean
}

/** Single-line label with optional shrink-to-fit. Returns the drawn width. */
export function drawLabel(ctx: Ctx, raw: string, x: number, y: number, o: LabelOptions): number {
  if (!raw) return 0
  const text = o.uppercase ? raw.toLocaleUpperCase('es-ES') : raw
  const weight = o.weight ?? 400
  const italic = o.italic ?? false
  let size = o.size
  let ls = o.letterSpacing ?? 0
  let w = measure(text, o.family, size, weight, italic, ls)
  if (o.maxWidth && w > o.maxWidth && w > 0) {
    const k = o.maxWidth / w
    size *= k
    ls *= k
    w = measure(text, o.family, size, weight, italic, ls)
  }
  const cap = capHeightOf(o.family, size, weight, italic)
  let by = y
  switch (o.baseline ?? 'middle') {
    case 'middle':
      by = y + cap / 2
      break
    case 'top':
      by = y + cap
      break
    case 'bottom':
      by = y
      break
    default:
      by = y
  }
  let bx = x
  if (o.align === 'center') bx = x - w / 2
  else if (o.align === 'right') bx = x - w
  setFont(ctx, o.family, size, weight, italic, ls)
  ctx.textAlign = 'left'
  ctx.textBaseline = 'alphabetic'
  ctx.fillStyle = o.color
  fillTextSpaced(ctx, text, bx, by, ls)
  return w
}

export function labelWidth(raw: string, o: Omit<LabelOptions, 'color'>): number {
  const text = o.uppercase ? raw.toLocaleUpperCase('es-ES') : raw
  return measure(text, o.family, o.size, o.weight ?? 400, o.italic ?? false, o.letterSpacing ?? 0)
}
