import * as E from '../model/elements'
import type { TemplateDef } from './types'
import type { TCtx } from './kit'
import { BG, atmosphere, body, cinematic, crestPair, cta, disclaimer, footer, glow, header, headline, hl, ink, kicker, pill, px, signature, text, zone } from './kit'

export const premiumPrediction: TemplateDef = {
  id: 'premium-prediction',
  number: 13,
  name: 'Premium Prediction',
  category: 'predictions',
  description: 'Tarjeta de pronóstico sofisticada con mercado, cuota y confianza.',
  build: (t) => {
    const cz = zone(t, 0.12, 0.9)
    return {
      background: BG.noir(),
      elements: [
        ...atmosphere(t, 'gold'),
        glow(t, t.cx, cz.y + cz.h * 0.4, t.cw * 0.8, '$primary', 0.14, 0.9),
        ...header(t),
        kicker(t, 'Pronóstico del partido', zone(t, 0, 0.04).y),
        headline(t, 'Nuestra [[apuesta]]', zone(t, 0.04, 0.11), 110 * t.s),
        E.prediction({ name: 'Pronóstico', mode: 'plain', x: t.left, y: cz.y, width: t.cw, height: cz.h }),
        body(t, '{disclaimer}', { y: zone(t, 0.93, 1).y, h: zone(t, 0.93, 1).h }, 22 * t.s, { align: 'center', name: 'Aviso' }),
        ...footer(t),
      ],
    }
  },
}

function lockedLayout(t: TCtx, mode: 'locked' | 'revealed') {
  const cs = Math.min(120 * t.s, t.ch * 0.09)
  const mz = zone(t, 0.07, 0.18)
  const cz = zone(t, 0.22, 0.8)
  const ctaY = zone(t, 0.84, 0.84).y
  return [
    ...atmosphere(t, mode === 'locked' ? 'emerald' : 'gold'),
    glow(t, t.cx, cz.y + cz.h * 0.45, t.cw * 0.75, mode === 'locked' ? '$positive' : '$primary', 0.12, 1),
    E.mascot({ name: 'Mascota marca de agua', variant: 'outline', x: t.cx - t.cw * 0.45, y: cz.y - t.ch * 0.05, width: t.cw * 0.9, height: cz.h * 1.1, opacity: 0.06, baseColor: '$text', eyeGlow: 0, locked: true }),
    ...header(t, { page: true }),
    kicker(t, '{brand}  |  Private', zone(t, 0, 0.04).y, { fontSize: 32, fill: { kind: 'solid', color: mode === 'locked' ? '$positive' : '$primary' } }),
    ...crestPair(t, mz.y, cs, t.cw * 0.42),
    headline(t, '{home.short} [[vs]] {away.short}', { x: t.cx - t.cw * 0.2, y: mz.y + cs * 0.15, w: t.cw * 0.4, h: cs * 0.7 }, 80 * t.s, { accentColor: '$muted', minFontSize: 24 }),
    E.prediction({
      name: mode === 'locked' ? 'Pronóstico bloqueado' : 'Pronóstico revelado',
      mode,
      x: t.left,
      y: cz.y,
      width: t.cw,
      height: cz.h,
      showMatch: false,
      accentColor: mode === 'locked' ? '$positive' : '$primary',
      showNote: mode === 'revealed',
    }),
    pill(t, mode === 'locked' ? 'Desbloquéalo en {brand}' : 'Análisis completo en {brand}', ctaY, 32, {
      name: 'Botón CTA',
      fill: { kind: 'solid', color: '#08090B' },
      background: { color: mode === 'locked' ? '$positive' : '$primary', opacity: 1, paddingX: 44, paddingY: 22, radius: 60 },
      fontWeight: 800,
    }),
    text(t, '{telegram}', { y: ctaY + 110 * t.s, h: 50 * t.s }, { name: 'Enlace Telegram', fontFamily: '$label', fontSize: 30 * t.s, fontWeight: 600, letterSpacing: 3, uppercase: false, fill: { kind: 'solid', color: '$text' }, autoFit: true }),
    ...footer(t, '{disclaimer}'),
  ]
}

export const lockedPrediction: TemplateDef = {
  id: 'locked-prediction',
  number: 14,
  name: 'Locked Prediction',
  category: 'predictions',
  description: 'Pronóstico bloqueado: desenfoque real, candado y llamada al perfil.',
  build: (t) => {
    const my = t.contentTop
    const mh = px(t, 96)
    const py = my + mh + px(t, 60)
    const ph = px(t, 620)
    const hy = py + ph + px(t, 50)
    const hh = px(t, 270)
    const cy = hy + hh + px(t, 40)
    return {
      background: ink(),
      elements: [
        ...cinematic(t),
        signature(t),
        hl(t, '{home.short} vs {away.short}', { y: my, h: mh }, 96, { name: 'Partido', align: 'center' }),
        E.prediction({ name: 'Pronóstico bloqueado', mode: 'locked', x: t.left, y: py, width: t.cw, height: ph, chrome: 'none', showMatch: false, showNote: false, showConfidence: false, hiddenPosition: 'pickAndOdds', blurIntensity: 18, overlayOpacity: 0.3, teaser: '' }),
        hl(t, 'Pronóstico [[bloqueado]]', { y: hy, h: hh }, 140, { align: 'center' }),
        cta(t, 'Desbloquéalo en mi perfil  ↗', { y: cy, h: px(t, 70) }, 54, { align: 'center', fill: { kind: 'solid', color: '$accent' } }),
        disclaimer(t, t.contentBottom - px(t, 10), { align: 'center' }),
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
  build: (t) => ({ background: BG.noir(), elements: lockedLayout(t, 'revealed') }),
}

export const verifiedResults: TemplateDef = {
  id: 'verified-results',
  number: 16,
  name: 'Verified Results',
  category: 'predictions',
  description: 'Historial manual de pronósticos con indicadores de acierto y fallo.',
  build: (t) => {
    const rz = zone(t, 0.15, 0.93)
    return {
      background: BG.graphite(),
      elements: [
        ...atmosphere(t, 'noir'),
        glow(t, t.cx, rz.y, t.cw * 0.6, '$positive', 0.1, 0.6),
        ...header(t),
        kicker(t, 'Historial verificado', zone(t, 0, 0.04).y, { fill: { kind: 'solid', color: '$positive' } }),
        headline(t, 'Resultados [[recientes]]', zone(t, 0.04, 0.12), 130 * t.s, { accentColor: '$positive' }),
        E.resultsList({ name: 'Resultados', x: t.left, y: rz.y, width: t.cw, height: rz.h, maxItems: 5 }),
        body(t, 'Resultados introducidos manualmente. Los resultados pasados no garantizan resultados futuros.', { y: zone(t, 0.94, 1).y, h: zone(t, 0.94, 1).h }, 22 * t.s, { align: 'center', name: 'Aviso' }),
        ...footer(t),
      ],
    }
  },
}

export const PREDICTION_TEMPLATES = [premiumPrediction, lockedPrediction, predictionReveal, verifiedResults]
