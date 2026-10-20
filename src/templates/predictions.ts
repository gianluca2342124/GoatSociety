import * as E from '../model/elements'
import type { MatchData, SlideElement, TextElement } from '../model/types'
import type { TemplateDef } from './types'
import type { TCtx } from './kit'
import { cinematic, crestOf, cta, disclaimer, hl, ink, label, px, signature, support } from './kit'

// ════════════════════════════════════════════════════════════════════════════
// GOAT EDITORIAL · Pronósticos
// Fondo negro, el pronóstico como titular, la cuota como única cifra en acento.
// Nunca se promete un acierto: siempre aviso legal y lenguaje de opinión.
// ════════════════════════════════════════════════════════════════════════════

/** Cap height / font size of the bundled fonts (Anton, Barlow Condensed, Inter Tight). */
const CAP_ANTON = 0.86
const CAP_LABEL = 0.7
const CAP_BODY = 0.73

/**
 * Uniform sizer: story px → format px, shrunk when the stacked story
 * composition (`total` story px) would not fit the available height.
 */
function sizer(t: TCtx, total: number, room = t.ch) {
  const k = Math.min(1, room / Math.max(1, px(t, total)))
  return (v: number) => px(t, v) * k
}

/** Font size for kit helpers (they multiply by t.s) from a format px value. */
const fs = (t: TCtx, v: number) => v / t.s

/** Box of the prediction element: a touch wider than the column so the pick reaches 170 px. */
function predBox(t: TCtx): { x: number; w: number } {
  const w = t.landscape ? t.cw : Math.min(t.W - 80, 1000)
  return { x: t.cx - w / 2, w }
}

/** Lines the pick will take in the editorial painter (Anton ≈ 0.46 em per uppercase glyph). */
function pickLines(match: MatchData, w: number): number {
  const pick = match.predictions[0]?.pick ?? ''
  return pick.length * Math.min(170, w * 0.17) * 0.46 > w ? 2 : 1
}

/** Height of paintPredictionEditorial's stacked block at full size (mirrors the painter). */
function predHeight(w: number, o: { lines: number; stamp?: boolean; conf?: boolean; noteLines?: number }): number {
  const pickS = Math.min(170, w * 0.17)
  const oddsS = Math.min(210, w * 0.2)
  const parts: [number, number][] = []
  if (o.stamp) parts.push([46 * CAP_LABEL, 30])
  parts.push([44 * CAP_LABEL, 34])
  parts.push([pickS * 0.95 * o.lines, 60])
  parts.push([oddsS * CAP_ANTON + 16 + 38 * CAP_LABEL, 46])
  if (o.conf) parts.push([50 * CAP_BODY, 40])
  if (o.noteLines) parts.push([44 * 1.25 * o.noteLines, 0])
  return parts.reduce((a, [h, g], i) => a + h + (i < parts.length - 1 ? g : 0), 0)
}

/**
 * Match header shared by 13/14/15: crest · match name · crest on one row,
 * symmetric so it sits on the same axis as the centered prediction.
 * With `tag`, a muted label sits above the name between the crests.
 */
function matchRow(t: TCtx, y: number, cs: number, nameSize: number, tag?: string): SlideElement[] {
  const span = Math.min(t.cw, 936)
  const x0 = t.cx - span / 2
  const gap = cs * 0.2
  const nx = x0 + cs + gap
  const nw = span - (cs + gap) * 2
  const nh = nameSize * 1.12
  const tagS = tag ? Math.max(28, nameSize * 0.48) : 0
  const tagH = tagS * 1.1
  const tagGap = tagS * 0.45
  const block = nh + (tag ? tagH + tagGap : 0)
  const by = y + (cs - block) / 2
  const out: SlideElement[] = [
    crestOf('home', x0, y, cs),
    crestOf('away', x0 + span - cs, y, cs),
  ]
  if (tag) out.push(label(t, tag, { x: nx, y: by, w: nw, h: tagH }, fs(t, tagS), { name: 'Etiqueta', align: 'center', verticalAlign: 'middle' }))
  out.push(
    hl(t, '{home.short} [[vs]] {away.short}', { x: nx, y: by + (tag ? tagH + tagGap : 0), w: nw, h: nh }, fs(t, nameSize), {
      name: 'Partido',
      align: 'center',
      verticalAlign: 'middle',
      lineHeight: 1,
      accentColor: '$muted',
      minFontSize: Math.min(nameSize, 28),
    }),
  )
  return out
}

/** Disclaimer centered at the foot of the content zone. */
function legal(t: TCtx, y: number, content = '{disclaimer}', lines = 1, p: Partial<TextElement> = {}) {
  const s = px(t, 28, 18)
  return disclaimer(t, y, { text: content, height: s * 1.25 * lines + 4, align: 'center', ...p })
}

// ── 13 · El pronóstico como titular, la cuota como cifra en acento ─────────
export const premiumPrediction: TemplateDef = {
  id: 'premium-prediction',
  number: 13,
  name: 'Premium Prediction',
  category: 'predictions',
  description: 'El pronóstico como titular y la cuota en acento, sin tarjeta.',
  build: (t, match) => {
    const { x: bx, w: bw } = predBox(t)
    const pe = predHeight(bw, { lines: t.landscape ? pickLines(match, bw) : 2, conf: true })
    const CS = 140
    const G1 = 110
    const G2 = 90
    const DH = 40
    const z = sizer(t, CS + G1 + pe + G2 + DH)
    const cs = z(CS)
    const dy = t.contentBottom - z(DH)
    const top = t.contentTop + cs + z(G1)
    const ph = z(pe)
    const py = top + Math.max(0, (dy - z(G2) - top - ph) * 0.35)
    return {
      background: ink(),
      elements: [
        ...cinematic(t),
        signature(t),
        ...matchRow(t, t.contentTop, cs, z(84), 'Pronóstico'),
        E.prediction({ name: 'Pronóstico', mode: 'plain', x: bx, y: py, width: bw, height: ph, chrome: 'none', showMatch: false, showNote: false, showConfidence: true, showOdds: true }),
        legal(t, dy),
      ],
    }
  },
}

// ── 14 · Bloqueado: señuelo desenfocado + candado sólido ───────────────────
export const lockedPrediction: TemplateDef = {
  id: 'locked-prediction',
  number: 14,
  name: 'Locked Prediction',
  category: 'predictions',
  description: 'Pronóstico bloqueado: desenfoque real, candado y llamada al perfil.',
  build: (t, match) => {
    const { x: bx, w: bw } = predBox(t)
    // The decoy only needs to read as "hidden": 90 % of its natural size.
    const pe = predHeight(bw, { lines: t.landscape ? pickLines(match, bw) : 2 }) * 0.9
    const HS = 140
    const hLines = t.landscape ? 1 : 2
    const HH = HS * 1.04 * hLines + 8
    const CS = 130
    const G1 = 70
    const G2 = 40
    const G3 = 34
    const CH = 70
    const G4 = 60
    const DH = 40
    const z = sizer(t, CS + G1 + pe + G2 + HH + G3 + CH + G4 + DH)
    const cs = z(CS)
    const py = t.contentTop + cs + z(G1)
    const ph = z(pe)
    const hy = py + ph + z(G2)
    const cy = hy + z(HH) + z(G3)
    return {
      background: ink(),
      elements: [
        ...cinematic(t),
        signature(t),
        ...matchRow(t, t.contentTop, cs, z(84)),
        E.prediction({ name: 'Pronóstico bloqueado', mode: 'locked', x: bx, y: py, width: bw, height: ph, chrome: 'none', showMatch: false, showNote: false, showConfidence: false, hiddenPosition: 'pickAndOdds', blurIntensity: 18, overlayOpacity: 0.3, teaser: '' }),
        hl(t, 'Pronóstico [[bloqueado]]', { y: hy, h: z(HH) }, fs(t, z(HS)), { align: 'center' }),
        cta(t, 'Desbloquéalo en mi perfil  ↗', { y: cy, h: z(CH) }, fs(t, z(54)), { align: 'center', fill: { kind: 'solid', color: '$accent' } }),
        legal(t, t.contentBottom - z(DH)),
      ],
    }
  },
}

// ── 15 · Revelado: la misma composición con el pronóstico visible ──────────
export const predictionReveal: TemplateDef = {
  id: 'prediction-reveal',
  number: 15,
  name: 'Prediction Reveal',
  category: 'predictions',
  description: 'La misma composición que el bloqueado, con el pronóstico revelado.',
  build: (t, match) => {
    const { x: bx, w: bw } = predBox(t)
    const pe = predHeight(bw, { lines: t.landscape ? pickLines(match, bw) : 2, stamp: true })
    const CS = 130
    const G1 = 90
    const G2 = 90
    const CH = 70
    const G3 = 70
    const DH = 40
    const z = sizer(t, CS + G1 + pe + G2 + CH + G3 + DH)
    const cs = z(CS)
    const py = t.contentTop + cs + z(G1)
    const ph = z(pe)
    const cy = py + ph + z(G2)
    return {
      background: ink(),
      elements: [
        ...cinematic(t),
        signature(t),
        ...matchRow(t, t.contentTop, cs, z(84)),
        E.prediction({ name: 'Pronóstico revelado', mode: 'revealed', revealStamp: 'Revelado', x: bx, y: py, width: bw, height: ph, chrome: 'none', showMatch: false, showNote: false, showConfidence: false, showOdds: true }),
        cta(t, 'El análisis completo está en mi perfil  [[↗]]', { y: cy, h: z(CH) }, fs(t, z(52)), { align: 'center' }),
        legal(t, t.contentBottom - z(DH)),
      ],
    }
  },
}

// ── 16 · Historial: % de acierto enorme + filas abiertas ───────────────────
export const verifiedResults: TemplateDef = {
  id: 'verified-results',
  number: 16,
  name: 'Verified Results',
  category: 'predictions',
  description: 'Historial de pronósticos: porcentaje de acierto enorme y filas abiertas.',
  build: (t) => {
    const note = 'Resultados introducidos manualmente. Los resultados pasados no garantizan resultados futuros.'
    if (t.landscape) {
      const colW = t.cw * 0.4
      const lx = t.left + t.cw * 0.48
      const lw = t.right - lx
      const dh = px(t, 28, 18) * 1.25 * 3 + 4
      const dy = t.contentBottom - dh
      return {
        background: ink(),
        elements: [
          ...cinematic(t),
          signature(t),
          hl(t, 'Resultados [[recientes]]', { y: t.contentTop, w: colW, h: px(t, 300) }, fs(t, px(t, 140))),
          E.resultsList({ name: 'Resultados', x: lx, y: t.contentTop, width: lw, height: t.ch, maxItems: 5, variant: 'editorial', showSummary: true, showOdds: true }),
          legal(t, dy, note, 3, { width: colW, align: 'left' }),
        ],
      }
    }
    const HS = 140
    const HH = HS * 1.04 * 2 + 8
    const G1 = 70
    const G2 = 50
    const DH = 2 * 28 * 1.25 + 4
    const LIST = 1330 - HH - G1 - G2 - DH
    const z = sizer(t, HH + G1 + LIST + G2 + DH)
    const ly = t.contentTop + z(HH) + z(G1)
    const dy = t.contentBottom - z(DH)
    return {
      background: ink(),
      elements: [
        ...cinematic(t),
        signature(t),
        hl(t, 'Resultados [[recientes]]', { y: t.contentTop, h: z(HH) }, fs(t, z(HS))),
        E.resultsList({ name: 'Resultados', x: t.left, y: ly, width: t.cw, height: dy - z(G2) - ly, maxItems: 5, variant: 'editorial', showSummary: true, showOdds: true }),
        legal(t, dy, note, 2),
      ],
    }
  },
}

// ── 23 · Probabilidad 1X2 (estimación propia, nunca una garantía) ──────────
export const winProbability: TemplateDef = {
  id: 'win-probability',
  number: 23,
  name: 'Win Probability',
  category: 'predictions',
  description: 'Probabilidad estimada 1X2: tres cifras y una barra proporcional, favorito en acento.',
  build: (t) => {
    // Estimated shares; the headline names the favourite (highest value).
    const P = { home: 34, draw: 24, away: 42 }
    const fav = P.away > P.home ? '{away.short}' : '{home.short}'
    const HS = 150
    const HH = HS * 1.04 * 2 + 8
    const G1 = 120
    const CS = 230
    const G2 = 44
    const PH = 300
    const G3 = 56
    const NH = 2 * 40 * 1.22 + 4
    const G4 = 60
    const DH = 40
    const z = sizer(t, HH + G1 + CS + G2 + PH + G3 + NH + G4 + DH)
    const cs = z(CS)
    const span = Math.min(t.cw, 1000)
    const x0 = t.cx - span / 2
    const cy = t.contentTop + z(HH) + z(G1)
    const py = cy + cs + z(G2)
    const ny = py + z(PH) + z(G3)
    return {
      background: ink(),
      elements: [
        ...cinematic(t),
        signature(t),
        hl(t, `${fav} parte como [[favorito]]`, { y: t.contentTop, h: z(HH) }, fs(t, z(HS))),
        crestOf('home', x0, cy, cs),
        crestOf('away', x0 + span - cs, cy, cs),
        E.probability({
          name: 'Probabilidad 1X2',
          x: x0,
          y: py,
          width: span,
          height: z(PH),
          home: P.home,
          draw: P.draw,
          away: P.away,
          valueSize: z(200),
          labelSize: z(42),
          barHeight: z(30),
        }),
        support(t, 'Probabilidades estimadas por {brand}. Es una opinión, no una garantía.', { x: x0, y: ny, w: span, h: z(NH) }, fs(t, z(40)), { name: 'Nota' }),
        legal(t, t.contentBottom - z(DH)),
      ],
    }
  },
}

export const PREDICTION_TEMPLATES = [premiumPrediction, lockedPrediction, predictionReveal, verifiedResults, winProbability]
