import * as E from '../model/elements'
import type { TemplateDef } from './types'
import type { TCtx } from './kit'
import { cinematic, cta, goatMark, hl, ink, label, px, signature, support } from './kit'

// GOAT EDITORIAL · Comunidad
// Black background, big white type, one accent ($accent), one message.
// Brand slides replace the top-left signature with the small goat mark
// (the brand name is already the message).

/** Vertical type factor: 1 on story/portrait, ≈0.85 on square/landscape. */
const vk = (t: TCtx) => Math.min(1, t.v + 0.18)

/** Anton headline leading used by kit.hl(). */
const LH = 1.04

/** Height of `lines` headline lines at story size `size` (scaled by t.s). */
const hlH = (t: TCtx, size: number, lines: number) => size * t.s * (LH * lines + 0.06)

/** Mascot artwork aspect ratio (GOAT_VIEW 512×660). */
const GOAT_RATIO = 512 / 660

const accentFill = { kind: 'solid' as const, color: '$accent' }

// ── 17 · Únete a GOAT SOCIETY (tipografía) ───────────────────────────────────

/** Anton advance per 100 px of the default copy (measured in the app). */
const W_UNETE = 291 // 'ÚNETE A'
const W_BRAND = 498 // 'GOAT SOCIETY'
const W_SOCIETY = 290 // 'SOCIETY'

/** Story-px size at which a line `w100` wide (per 100 px) fills the column. */
const fillW = (t: TCtx, w100: number) => (t.cw * 0.97) / (w100 / 100) / t.s

export const community: TemplateDef = {
  id: 'community',
  number: 17,
  name: 'GOAT SOCIETY Community',
  category: 'brand',
  description: 'Cierre de comunidad tipográfico: «Únete a GOAT SOCIETY» a tamaño cartel y llamada al enlace de la bio.',
  build: (t) => {
    const k = vk(t)
    const ss = 64 * k
    const cs = 58 * k
    const sh = ss * t.s * 1.25
    const ch = cs * t.s * 1.3
    const g1 = px(t, 44)
    const g2 = px(t, 80)
    const rest = g1 + sh + g2 + ch
    // Largest headline (story px) whose `n` lines fit above the CTA block.
    const byH = (n: number) => (t.ch - rest) / (LH * n + 0.06) / t.s
    // Tall formats: poster stack ÚNETE A / GOAT / SOCIETY, each long line
    // filling the column. Short or wide formats: two lines, the brand
    // filling the width. The brand wraps by itself (no hard-coded break), so
    // another brand name still sets and autoFit covers longer ones.
    const s3 = Math.min(fillW(t, Math.max(W_UNETE, W_SOCIETY)), byH(3))
    const s2 = Math.min(fillW(t, Math.max(W_UNETE, W_BRAND)), byH(2))
    const three = s3 > s2 * 1.15 && s3 * t.s * (W_BRAND / 100) > t.cw * 1.02
    const hs = three ? s3 : s2
    const hh = hlH(t, hs, three ? 3 : 2)
    // Any spare height goes above: the block sits low, the goat mark alone on top.
    const y = t.contentTop + Math.max(0, t.ch - hh - rest) * 0.7
    // Room above lets a longer brand name take one more line; the headline is
    // bottom-aligned so the stack below never moves.
    const extra = Math.min(hlH(t, hs, 1), y - t.contentTop)
    return {
      background: ink(),
      elements: [
        ...cinematic(t),
        goatMark(t, t.left, t.top, 60),
        hl(t, 'Únete a\n[[{brand}]]', { y: y - extra, h: hh + extra }, hs, { verticalAlign: 'bottom' }),
        label(t, 'Análisis y pronósticos', { y: y + hh + g1, h: sh }, ss, { name: 'Descripción', fontWeight: 600 }),
        cta(t, 'Link en la bio  ↗', { y: y + hh + g1 + sh + g2, h: ch }, cs, { fill: accentFill }),
      ],
    }
  },
}

// ── 25 · Comunidad con la mascota ────────────────────────────────────────────
export const communityMascot: TemplateDef = {
  id: 'community-mascot',
  number: 25,
  name: 'Community · Mascota',
  category: 'brand',
  description: 'La mascota como imagen principal, monocroma con un filo del color de acento, y llamada a la comunidad.',
  build: (t) => {
    const k = vk(t)
    const hs = 136 * k
    const ss = 52 * k
    const cs = 54 * k
    const hh = hlH(t, hs, 2)
    const sh = ss * t.s * 1.25
    const ch = cs * t.s * 1.3
    const g1 = px(t, 22)
    const g2 = px(t, 40)
    const textH = hh + g1 + sh + g2 + ch
    const mascot = (x: number, y: number, w: number, h: number) =>
      E.mascot({
        name: 'Mascota',
        variant: 'cinematic',
        x,
        y,
        width: w,
        height: h,
        baseColor: '#5B6067',
        shadowColor: '#050506',
        rimColor: '$accent',
        rimIntensity: 0.32,
        backlightColor: '$bg',
        backlight: 0,
        lightAngle: 75,
        eyeColor: '$accent',
        eyeGlow: 0.15,
        fog: 0.15,
        fadeBottom: 0.22,
        contrast: 0.68,
      })

    if (t.H / t.W < 1.05) {
      // Square and landscape: mascot on the left, text column on the right.
      const mw = Math.min(t.ch * GOAT_RATIO, t.cw * 0.48)
      const mh = mw / GOAT_RATIO
      const tx = t.left + mw + px(t, 60)
      const tw = t.right - tx
      // A narrow column wraps the support line (≈12.7 em at Inter Tight 500).
      const sh2 = ss * t.s * 1.22 * (tw >= ss * t.s * 12.9 ? 1 : 2)
      const ty = t.contentTop + (t.ch - (hh + g1 + sh2 + g2 + ch)) / 2
      return {
        background: ink(),
        elements: [
          ...cinematic(t),
          signature(t),
          mascot(t.left, t.contentTop + (t.ch - mh) / 2, mw, mh),
          hl(t, 'Únete a la comunidad', { x: tx, y: ty, w: tw, h: hh }, hs, { verticalAlign: 'bottom' }),
          support(t, 'Análisis, datos y pronósticos.', { x: tx, y: ty + hh + g1, w: tw, h: sh2 }, ss, { name: 'Descripción' }),
          cta(t, 'Accede desde mi perfil  ↗', { x: tx, y: ty + hh + g1 + sh2 + g2, w: tw, h: ch }, cs, { fill: accentFill }),
        ],
      }
    }

    // The beard fades out (fadeBottom), so a small real gap reads as air.
    const gap = px(t, 22)
    // The horn tips may rise a little above the safe zone, never into the signature.
    const mTop = Math.max(t.top + px(t, 44, 28) + px(t, 56), t.contentTop - px(t, 20))
    const room = t.contentBottom - textH - gap - mTop
    const mh = Math.min(room, (t.W * 0.64) / GOAT_RATIO)
    const mw = mh * GOAT_RATIO
    const y0 = mTop + Math.max(0, (room - mh) * 0.5)
    const ty = y0 + mh + gap
    return {
      background: ink(),
      elements: [
        ...cinematic(t),
        signature(t),
        mascot(t.cx - mw / 2, y0, mw, mh),
        hl(t, 'Únete a la comunidad', { y: ty, h: hh }, hs, { align: 'center' }),
        support(t, 'Análisis, datos y pronósticos.', { y: ty + hh + g1, h: sh }, ss, { name: 'Descripción', align: 'center' }),
        cta(t, 'Accede desde mi perfil  ↗', { y: ty + hh + g1 + sh + g2, h: ch }, cs, { align: 'center', fill: accentFill }),
      ],
    }
  },
}

// ── 18 · Cierre del carrusel ─────────────────────────────────────────────────

/**
 * Closing-slide copy variants (editor: "Variantes de cierre"). The editor
 * writes `headline` into "Mensaje final" and `sub` into "Submensaje" (the
 * handle line). Only neutral profile/bio calls to action. Explicit breaks
 * keep a clean rag at poster size (no "MI / PERFIL" split, no orphans).
 */
export const FINAL_VARIANTS = [
  { id: 'perfil', headline: 'El análisis\ncompleto\nestá en\n[[mi perfil]]', sub: '{handle}' },
  { id: 'pronostico', headline: 'Pronóstico\ncompleto\nen [[mi perfil]]', sub: '{handle}' },
  { id: 'unete', headline: 'Únete a\n[[{brand}]]', sub: '{handle}' },
  { id: 'bio', headline: 'Enlace en\n[[la bio]]', sub: '{handle}' },
]

export const finalSlide: TemplateDef = {
  id: 'final-slide',
  number: 18,
  name: 'Final Carousel Slide',
  category: 'brand',
  description: 'Cierre del carrusel: una frase a tamaño cartel que termina en el acento, anclada abajo con el usuario (4 variantes).',
  build: (t) => {
    // Vertical formats: four short lines (widest «EL ANÁLISIS»). 16:9: three
    // lines across the wide column (widest «COMPLETO ESTÁ»).
    const wide = t.landscape
    const copy = wide ? 'El análisis\ncompleto está\nen [[mi perfil]]' : FINAL_VARIANTS[0].headline
    const lines = wide ? 3 : 4
    const us = 68 * vk(t)
    const uh = us * t.s * 1.3
    const gap = px(t, 48)
    // ≤190 on vertical formats so every variant keeps its rag («EN MI PERFIL»
    // fits the column at 190).
    const hs = Math.min(wide ? 210 : 190, fillW(t, wide ? 584.5 : 428.6), (t.ch - gap - uh) / (LH * lines + 0.06) / t.s)
    const hb = hlH(t, hs, lines)
    // Anchored low: the handle sits on a fixed line near the bottom of the
    // safe zone, the statement grows upwards and the space above stays empty.
    const y = t.contentTop + Math.max(0, t.ch - hb - gap - uh) * 0.8
    // One spare line of headroom for longer custom messages (autoFit beyond).
    const top = Math.max(t.contentTop, y - hlH(t, hs, 1))
    const uy = y + hb + gap
    return {
      background: ink(),
      elements: [
        ...cinematic(t),
        goatMark(t, t.left, t.top, 60),
        hl(t, copy, { y: top, h: y + hb - top }, hs, { name: 'Mensaje final', verticalAlign: 'bottom' }),
        label(t, FINAL_VARIANTS[0].sub, { y: uy, h: uh }, us, { name: 'Submensaje', fontWeight: 600, uppercase: false, fill: { kind: 'solid', color: '$text' } }),
      ],
    }
  },
}

export const BRAND_TEMPLATES = [community, finalSlide, communityMascot]
