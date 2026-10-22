import * as E from '../model/elements'
import type { MatchData, PredictionElement, SlideElement, TextElement } from '../model/types'
import type { TemplateDef } from './types'
import type { TCtx } from './kit'
import { chrome, cinematic, crestOf, cta, disclaimer, hl, ink, label, px, support } from './kit'
import { LH, gapV, headZone, mainHead, vk } from './match'

// ════════════════════════════════════════════════════════════════════════════
// GOAT EDITORIAL · Pronósticos
// Fondo negro y el pronóstico como titular.
// Nunca se promete un acierto: siempre aviso legal y lenguaje de opinión.
//
// Ritmo de familia (v2, ver match.ts): cromo → titular centrado en
// t.contentTop → el pronóstico en el centro → CTA y aviso legal al pie.
// ════════════════════════════════════════════════════════════════════════════

/** Cap height / font size of the bundled fonts (Barlow Condensed, Inter Tight). */
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

/**
 * Box of the prediction element: the content column, so long picks never
 * cross the side margins.
 */
function predBox(t: TCtx): { x: number; w: number } {
  return { x: t.left, w: t.cw }
}

/** Natural pick size of paintPredictionEditorial for a box `w` wide (mirrors the painter). */
const pickSize = (w: number) => Math.min(170, w * 0.182)

/** Lines the pick will take in the editorial painter. */
function pickLines(match: MatchData, w: number): number {
  const pick = match.predictions[0]?.pick ?? ''
  // Upper bound of the glyph advance, so a borderline pick reserves two lines.
  return pick.length * 0.46 * pickSize(w) > w ? 2 : 1
}

/** Height of paintPredictionEditorial's stacked block at full size (mirrors the painter). */
function predHeight(w: number, o: { lines: number; stamp?: boolean; conf?: boolean; noteLines?: number }): number {
  const pickS = pickSize(w)
  const parts: [number, number][] = []
  if (o.stamp) parts.push([46 * CAP_LABEL, 30])
  parts.push([44 * CAP_LABEL, 34])
  parts.push([pickS * 1.04 * o.lines, 60])
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
  const span = Math.min(t.cw, 860)
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

// ── 13 · El pronóstico como titular, con la confianza y el argumento ───────
export const premiumPrediction: TemplateDef = {
  id: 'premium-prediction',
  number: 13,
  name: 'Premium Prediction',
  category: 'predictions',
  description: 'El pronóstico como titular, con la confianza y el argumento debajo, sin tarjeta.',
  build: (t, match) => {
    const { x: bx, w: bw } = predBox(t)
    const pe = predHeight(bw, { lines: t.landscape ? pickLines(match, bw) : 2, conf: true, noteLines: 2 })
    const CS = 140
    const G1 = 110
    const G2 = 90
    const DH = 40
    const z = sizer(t, CS + G1 + pe + G2 + DH)
    const cs = z(CS)
    const dy = t.contentBottom - z(DH)
    const top = t.contentTop + cs + z(G1)
    const ph = z(pe)
    const py = top + Math.max(0, (dy - z(G2) - top - ph) * 0.5)
    return {
      background: ink(),
      elements: [
        ...cinematic(t),
        ...chrome(t),
        ...matchRow(t, t.contentTop, cs, z(84), 'Pronóstico'),
        E.prediction({ name: 'Pronóstico', mode: 'plain', x: bx, y: py, width: bw, height: ph, chrome: 'none', showMatch: false, showNote: true, showConfidence: true }),
        legal(t, dy),
      ],
    }
  },
}

// ── 14 / 15 · Bloqueado → Revelado ─────────────────────────────────────────
// One composition for the pair, so swiping reads as one reveal: the headline
// in the family zone, the match under it, the prediction in the centre and
// the call to action on the foot. Only the word (BLOQUEADO → REVELADO) and the
// centre (blurred decoy → the pick) change.

/** Headline lines for the pair: two on 3:4 and 9:16; one on 4:5, square and 16:9, where the pick needs the room. */
const pairLines = (t: TCtx) => (t.H >= t.W * 1.3 ? 2 : 1)

/** Disclaimer height (one line). */
const legalH = (t: TCtx, lines = 1) => px(t, 28, 18) * 1.25 * lines + 4

function pairLayout(t: TCtx) {
  const z = headZone(t, pairLines(t))
  const cs = px(t, 96)
  const my = z.end + px(t, 36)
  const dy = t.contentBottom - legalH(t)
  const ctaH = px(t, 60)
  const cy = dy - px(t, 24) - ctaH
  const badgeH = px(t, 88)
  const by = cy - px(t, 24) - badgeH
  const top = my + cs + px(t, 48)
  return { z, cs, my, dy, ctaH, cy, badgeH, by, top }
}

export const lockedPrediction: TemplateDef = {
  id: 'locked-prediction',
  number: 14,
  name: 'Locked Prediction',
  category: 'predictions',
  description: 'Pronóstico bloqueado: señuelo muy desenfocado, velo esmerilado, candado iluminado y «Solo en mi comunidad».',
  build: (t) => {
    const L = pairLayout(t)
    const { x: bx, w: bw } = predBox(t)
    const ph = L.by - px(t, 48) - L.top
    return {
      background: ink(),
      elements: [
        ...cinematic(t),
        ...chrome(t),
        mainHead(t, 'Pronóstico [[bloqueado]]', {}, pairLines(t)),
        ...matchRow(t, L.my, L.cs, px(t, 60)),
        // Market and pick both hidden: smeared decoys under a heavy blur, so not even
        // the market or the length of the pick can be read from the blurred shape.
        E.prediction({
          name: 'Pronóstico bloqueado',
          mode: 'locked',
          x: bx,
          y: L.top,
          width: bw,
          height: ph,
          chrome: 'none',
          showMatch: false,
          showNote: false,
          showConfidence: false,
          hiddenPosition: 'all',
          blurIntensity: 48,
          overlayOpacity: 0.35,
          frost: true,
          lockGlow: 0.7,
          teaser: '',
        }),
        E.badge({ name: 'Solo en mi comunidad', text: 'Solo en mi comunidad', style: 'glow', icon: 'lock', color: '$accent', textColor: '$text', x: t.left, y: L.by, width: t.cw, height: L.badgeH, fontSize: px(t, 40), radius: px(t, 18) }),
        cta(t, 'Desbloquéalo en mi perfil  [[↗]]', { y: L.cy, h: L.ctaH }, fs(t, px(t, 46)), { align: 'center', verticalAlign: 'middle', fill: { kind: 'solid', color: '$muted' } }),
        legal(t, L.dy),
      ],
    }
  },
}

export const predictionReveal: TemplateDef = {
  id: 'prediction-reveal',
  number: 15,
  name: 'Prediction Reveal',
  category: 'predictions',
  description: 'La misma composición que el bloqueado, con el pronóstico revelado.',
  build: (t) => {
    const L = pairLayout(t)
    const { x: bx, w: bw } = predBox(t)
    // No badge on the reveal: the pick takes that room too.
    const ph = L.cy - px(t, 48) - L.top
    return {
      background: ink(),
      elements: [
        ...cinematic(t),
        ...chrome(t),
        mainHead(t, 'Pronóstico [[revelado]]', {}, pairLines(t)),
        ...matchRow(t, L.my, L.cs, px(t, 60)),
        E.prediction({ name: 'Pronóstico revelado', mode: 'revealed', revealStamp: '', x: bx, y: L.top, width: bw, height: ph, chrome: 'none', showMatch: false, showNote: false, showConfidence: false }),
        cta(t, 'El análisis completo está en mi perfil  [[↗]]', { y: L.cy, h: L.ctaH }, fs(t, px(t, 46)), { align: 'center', verticalAlign: 'middle' }),
        legal(t, L.dy),
      ],
    }
  },
}

// ── 16 · Historial: % de acierto enorme + filas abiertas ───────────────────
// The list draws the hero rate in the accent, so the headline stays white:
// one accent focus (the percentage). A list page: the rows keep their left
// edge, the headline stays centered in the family zone.
export const verifiedResults: TemplateDef = {
  id: 'verified-results',
  number: 16,
  name: 'Verified Results',
  category: 'predictions',
  description: 'Historial de pronósticos: porcentaje de acierto enorme y filas abiertas.',
  build: (t) => {
    // Break after the first sentence so the warning never ends on an orphan word.
    const note = 'Resultados introducidos manualmente.\nLos resultados pasados no garantizan resultados futuros.'
    const head = 'Mi historial'
    const z = headZone(t, 1)
    if (t.landscape) {
      // Headline + legal line on the left, the whole record on the right.
      const colW = t.cw * 0.4
      const lx = t.left + t.cw * 0.47
      const dh = legalH(t, 3)
      return {
        background: ink(),
        elements: [
          ...cinematic(t),
          ...chrome(t),
          hl(t, head, { y: z.y, w: colW, h: z.h }, z.size, { lineHeight: LH }),
          E.resultsList({ name: 'Resultados', x: lx, y: t.contentTop, width: t.right - lx, height: t.ch, maxItems: 4, variant: 'editorial', showSummary: true }),
          legal(t, t.contentBottom - dh, note, 3, { width: colW }),
        ],
      }
    }
    const dy = t.contentBottom - legalH(t, 2)
    const ly = z.end + gapV(t)
    return {
      background: ink(),
      elements: [
        ...cinematic(t),
        ...chrome(t),
        mainHead(t, head, {}, 1),
        // A square only has room for three legible rows under the hero rate.
        E.resultsList({ name: 'Resultados', x: t.left, y: ly, width: t.cw, height: dy - px(t, 48) - ly, maxItems: t.ch < 1000 ? 3 : 4, variant: 'editorial', summaryAlign: 'center', showSummary: true }),
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
    // Estimated shares (editable on the element); the headline names the favourite.
    const P = { home: 34, draw: 24, away: 42 }
    const awayFav = P.away > P.home
    const fav = awayFav ? '{away.short}' : '{home.short}'
    const lines = t.landscape ? 1 : 2
    const z = headZone(t, lines)
    // Crests, figures and bar share one measure; the block sits in the centre zone.
    const CS = 240
    const PH = 380
    const G = 24
    const NH = 40 * 1.22 + 4
    const dy = t.contentBottom - legalH(t)
    const a = z.end + gapV(t)
    const b = dy - px(t, 48)
    const k = Math.min(1, (b - a) / px(t, CS + G + PH + 10 + NH))
    const zz = (v: number) => px(t, v) * k
    const span = Math.min(t.cw, 1240)
    const x0 = t.cx - span / 2
    const cy = a + Math.max(0, (b - a - zz(CS + G + PH + 10 + NH)) / 2)
    const py = cy + zz(CS + G)
    const ny = py + zz(PH + 10)
    return {
      background: ink(),
      elements: [
        ...cinematic(t),
        ...chrome(t),
        // The team closes the headline, so a cedilla (BARÇA) never hangs over another line.
        mainHead(t, `El favorito es [[${fav}]]`, {}, lines),
        crestOf('home', x0, cy, zz(CS)),
        crestOf('away', x0 + span - zz(CS), cy, zz(CS)),
        E.probability({
          name: 'Probabilidad 1X2',
          x: x0,
          y: py,
          width: span,
          height: zz(PH),
          home: P.home,
          draw: P.draw,
          away: P.away,
          valueSize: zz(178),
          labelSize: Math.max(32, zz(42)),
          barHeight: zz(30),
        }),
        support(t, 'Probabilidades estimadas: opinión, no garantía.', { x: x0, y: ny, w: span, h: zz(NH) }, fs(t, zz(40)), { name: 'Nota', align: 'center' }),
        legal(t, dy),
      ],
    }
  },
}

// ── 35 · Te lo dije: confirmación de un pronóstico que ya acertó ───────────
// For picks that actually won: the user fills it AFTER the result. Clean ink,
// one huge centered claim, a solid ACERTADO stamp, the match with its final
// score and the winning pick, and the community mini-card.
export const toldYou: TemplateDef = {
  id: 'te-lo-dije',
  number: 35,
  name: 'Te lo dije',
  category: 'predictions',
  description:
    'Confirmación de un pronóstico que ya acertó: «Te lo dije», sello ACERTADO, el marcador final y el pronóstico acertado. Úsala solo con pronósticos ganados, después del resultado (elige el pronóstico acertado en el elemento). No garantiza resultados futuros.',
  build: (t) => {
    const dh = legalH(t)
    const dy = t.contentBottom - dh
    const badge = (p: Partial<Parameters<typeof E.badge>[0]>) => E.badge({ textColor: '$text', color: '$accent', ...p })
    // The pick that won (prediction 2 of the sample: «Más de 2.5 goles» with a 2-1 final).
    const pick = (x: number, y: number, w: number, h: number): PredictionElement =>
      E.prediction({ name: 'Pronóstico acertado', predictionIndex: 1, mode: 'revealed', revealStamp: '', x, y, width: w, height: h, chrome: 'none', showMatch: false, showNote: false, showConfidence: false })
    const tall = t.H >= t.W * 1.3
    const z = headZone(t, 1, (tall ? 180 : 170) * vk(t))
    if (!tall) {
      // 4:5, square and 16:9: both stamps share one row under the claim, so the pick keeps a legible size.
      const sh = px(t, 84)
      const sy = z.end + px(t, 24)
      const fsA = px(t, 40)
      const fsG = px(t, 36)
      // Estimated badge widths (Barlow Condensed ≈ 0.5 em per capital, icon, gap, padding);
      // each badge leans on the shared gap, so an estimate error only nudges the pair.
      const bw = (n: number, f: number) => n * 0.5 * f + f * (1.05 + 0.42 + 1.7)
      const gap = px(t, 24)
      const w1 = bw(8, fsA)
      const mid = t.cx - (w1 + gap + bw(20, fsG)) / 2 + w1
      const cs = px(t, 84)
      const my = sy + sh + px(t, 48)
      const ptop = my + cs + px(t, 40)
      return {
        background: ink(),
        accent: '$green',
        elements: [
          ...cinematic(t),
          ...chrome(t),
          mainHead(t, 'Te lo [[dije]]', {}, 1, z.size),
          badge({ name: 'Acertado', text: 'Acertado', style: 'solid', icon: 'check', x: t.left, y: sy, width: mid - t.left, height: sh, fontSize: fsA, radius: px(t, 14), align: 'right' }),
          badge({ name: 'Solo en mi comunidad', text: 'Solo en mi comunidad', style: 'glow', icon: 'lock', x: mid + gap, y: sy, width: t.right - mid - gap, height: sh, fontSize: fsG, radius: px(t, 18), align: 'left' }),
          ...scoreRow(t, t.left, t.cw, my, cs),
          pick(t.left, ptop, t.cw, dy - px(t, 36) - ptop),
          legal(t, dy),
        ],
      }
    }
    const sh = px(t, 100)
    const sy = z.end + px(t, 24)
    const gh = px(t, 84)
    const gy = dy - px(t, 24) - gh
    const cs = px(t, 104)
    const my = sy + sh + px(t, 56)
    const ptop = my + cs + px(t, 48)
    return {
      background: ink(),
      accent: '$green',
      elements: [
        ...cinematic(t),
        ...chrome(t),
        mainHead(t, 'Te lo [[dije]]', {}, 1, z.size),
        badge({ name: 'Acertado', text: 'Acertado', style: 'solid', icon: 'check', x: t.left, y: sy, width: t.cw, height: sh, fontSize: px(t, 46), radius: px(t, 16) }),
        ...scoreRow(t, t.left, t.cw, my, cs),
        pick(t.left, ptop, t.cw, gy - px(t, 40) - ptop),
        badge({ name: 'Solo en mi comunidad', text: 'Solo en mi comunidad', style: 'glow', icon: 'lock', x: t.left, y: gy, width: t.cw, height: gh, fontSize: px(t, 38), radius: px(t, 18) }),
        legal(t, dy),
      ],
    }
  },
}

/**
 * Final score between the crests: crest · HOME 2 - 1 AWAY · crest, with the
 * match state ({score.note}, e.g. FINAL) as a muted tag. All linked to match.score.
 */
function scoreRow(t: TCtx, x: number, w: number, y: number, cs: number): SlideElement[] {
  const span = Math.min(w, 860)
  const x0 = x + (w - span) / 2
  const gap = cs * 0.22
  const nx = x0 + cs + gap
  const nw = span - (cs + gap) * 2
  const nameSize = Math.min(cs * 0.62, px(t, 64))
  const tagS = Math.max(28, nameSize * 0.5)
  const block = nameSize * 1.05 + tagS * 1.1 + tagS * 0.4
  const by = y + (cs - block) / 2
  return [
    crestOf('home', x0, y, cs),
    crestOf('away', x0 + span - cs, y, cs),
    label(t, '{score.note}', { x: nx, y: by, w: nw, h: tagS * 1.1 }, fs(t, tagS), { name: 'Estado del partido', align: 'center' }),
    hl(t, '{home.short}  {score}  {away.short}', { x: nx, y: by + tagS * 1.5, w: nw, h: nameSize * 1.05 }, fs(t, nameSize), {
      name: 'Resultado final',
      verticalAlign: 'middle',
      lineHeight: 1,
      minFontSize: Math.min(nameSize, 28),
    }),
  ]
}

export const PREDICTION_TEMPLATES = [premiumPrediction, lockedPrediction, predictionReveal, verifiedResults, winProbability, toldYou]
