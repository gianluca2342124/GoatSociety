// "Aplicar GOAT EDITORIAL": converts an existing slide to the editorial look
// without deleting anything. Atmosphere is hidden (shown again in the
// Cinematic intensity), gold accents move to the slide accent, cards become
// open editorial layouts. Everything stays editable and undoable.
import type { Fill, Slide, SlideElement } from './types'

const GOLDISH = new Set(['$primary', '$gold', '#CBAA62', '#cbaa62'])
const VIVID = new Set(['$primary', '$gold', '$positive', '$negative', '#CBAA62', '#cbaa62'])

function toAccent(c: string | undefined, set = GOLDISH): string | undefined {
  return c && set.has(c) ? '$accent' : c
}

function fillToAccent(f: Fill): Fill {
  if (f.kind === 'solid') return GOLDISH.has(f.color) ? { ...f, color: '$accent' } : f
  return f
}

export function editorialElement(el: SlideElement): SlideElement {
  const e = structuredClone(el)
  // Pure atmosphere only appears in the Cinematic intensity.
  if (e.type === 'effect' || e.type === 'glass') {
    e.minIntensity = 'cinematic'
    return e
  }
  if (e.fx?.glow?.enabled) e.fx = { ...e.fx, glow: { ...e.fx.glow, enabled: false } }
  switch (e.type) {
    case 'mascot':
      // Ghost/background mascots become cinematic-only; a hero mascot stays.
      if (e.variant === 'background' || e.variant === 'outline' || e.opacity < 0.4) e.minIntensity = 'cinematic'
      e.rimColor = toAccent(e.rimColor, VIVID) ?? e.rimColor
      e.eyeColor = toAccent(e.eyeColor) ?? e.eyeColor
      break
    case 'text':
      e.accentColor = toAccent(e.accentColor) ?? e.accentColor
      e.fill = fillToAccent(e.fill)
      if (e.letterSpacing > e.fontSize * 0.08) e.letterSpacing = Math.round(e.fontSize * 0.02 * 10) / 10
      if (e.background && e.background.opacity > 0) e.background = { ...e.background, opacity: 0 }
      break
    case 'shape':
      e.fill = fillToAccent(e.fill)
      if (e.stroke) e.stroke = { ...e.stroke, color: GOLDISH.has(e.stroke.color) ? '$line' : e.stroke.color }
      break
    case 'crest':
      e.aura = 0
      e.ring = { ...e.ring, glow: 0, color: GOLDISH.has(e.ring.color) ? '$text' : e.ring.color }
      break
    case 'statBars':
      e.style = 'editorial'
      e.colorMode = 'leader'
      e.accentColor = '$accent'
      e.barHeight = Math.max(e.barHeight, 20)
      e.valueSize = Math.max(e.valueSize, 96)
      e.labelSize = Math.max(e.labelSize, 34)
      break
    case 'statNumber':
      e.valueColor = toAccent(e.valueColor) ?? e.valueColor
      e.accentColor = '$accent'
      if (GOLDISH.has(e.labelColor)) e.labelColor = '$text'
      if (e.layout === 'card' || e.layout === 'stacked') e.layout = 'hero'
      break
    case 'progressRing':
      e.color = toAccent(e.color, VIVID) ?? e.color
      break
    case 'formRow':
      e.shape = 'letter'
      e.winColor = '$accent'
      e.drawColor = '$muted'
      e.lossColor = '$muted'
      break
    case 'table':
      e.headerColor = toAccent(e.headerColor) === '$accent' ? '$muted' : e.headerColor
      e.zebra = false
      break
    case 'playerList':
    case 'matchList':
      e.variant = 'editorial'
      e.accentColor = toAccent(e.accentColor) ?? e.accentColor
      break
    case 'resultsList':
      e.variant = 'editorial'
      e.winColor = '$accent'
      e.lossColor = '$muted'
      e.pendingColor = '$muted'
      break
    case 'prediction':
      e.chrome = 'none'
      e.accentColor = '$accent'
      e.showConfidence = false
      e.showMatch = false
      break
    case 'brandMark':
      if (e.variant === 'header' || e.variant === 'signature') e.variant = 'editorial'
      e.accentColor = GOLDISH.has(e.accentColor) ? '$text' : e.accentColor
      break
    case 'icon':
      e.color = toAccent(e.color, VIVID) ?? e.color
      if (e.background) e.background = { ...e.background, opacity: 0 }
      break
    case 'ranking':
    case 'probability':
      e.accentColor = '$accent'
      break
    case 'tactics':
    case 'stadium3d': {
      const t = e.tactics
      t.playerStyle = e.type === 'tactics' ? 'flat' : t.playerStyle
      t.glow = 0
      t.labelStyle = 'text'
      t.highlightColor = '$accent'
      t.annotations = t.annotations.map((a) => ({ ...a, color: VIVID.has(a.color) ? '$accent' : a.color }))
      if (e.type === 'stadium3d') e.lighting = { ...e.lighting, accent: '$accent' }
      break
    }
  }
  return e
}

/** Apply the GOAT EDITORIAL preset to a slide (returns a new slide). */
export function applyEditorial(slide: Slide): Slide {
  return {
    ...slide,
    intensity: 'editorial',
    background: { ...slide.background, fill: { kind: 'solid', color: '$bg' } },
    elements: slide.elements.map(editorialElement),
  }
}
