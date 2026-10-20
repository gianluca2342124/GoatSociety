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

/** Type factor for typography-only slides: 1 unless `need` (story px) overflows `share` of the safe zone. */
const fit = (t: TCtx, share: number, need: number) => Math.min(1, (t.ch * share) / need)

/** Mascot artwork aspect ratio (GOAT_VIEW 512×660). */
const GOAT_RATIO = 512 / 660

const accentFill = { kind: 'solid' as const, color: '$accent' }

// ── 17 · Únete a GOAT SOCIETY (tipografía) ───────────────────────────────────
export const community: TemplateDef = {
  id: 'community',
  number: 17,
  name: 'GOAT SOCIETY Community',
  category: 'brand',
  description: 'Cierre de comunidad tipográfico: «Únete a GOAT SOCIETY» enorme y llamada al enlace de la bio.',
  build: (t) => {
    // Typography is the only visual: keep full size while the stack fits in
    // ~80% of the safe zone (story, portrait, square), shrink only below that.
    const k = fit(t, 0.8, hlH(t, 170, 2) + px(t, 132) + (64 * 1.25 + 56 * 1.3) * t.s)
    const hs = 170 * k
    const ss = 64 * k
    const cs = 56 * k
    const hh = hlH(t, hs, 2)
    const sh = ss * t.s * 1.25
    const ch = cs * t.s * 1.3
    const g1 = px(t, 40)
    const g2 = px(t, 92)
    const total = hh + g1 + sh + g2 + ch
    // Centred in the safe zone.
    const y = t.contentTop + Math.max(0, (t.ch - total) * 0.5)
    // Extra room above lets a longer brand name wrap to a third line; the
    // headline stays bottom-aligned so the stack below never moves.
    const extra = Math.min(hh * 0.5, y - t.contentTop)
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
    const mTop = Math.max(t.top + px(t, 44, 28) + px(t, 40), t.contentTop - px(t, 36))
    const room = t.contentBottom - textH - gap - mTop
    const mh = Math.min(room, (t.W * 0.6) / GOAT_RATIO)
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
 * handle line). Only neutral profile/bio calls to action.
 */
export const FINAL_VARIANTS = [
  { id: 'perfil', headline: 'El análisis completo está en [[mi perfil]]', sub: '{handle}' },
  { id: 'pronostico', headline: 'Pronóstico completo en [[mi perfil]]', sub: '{handle}' },
  { id: 'unete', headline: 'Únete a [[{brand}]]', sub: '{handle}' },
  { id: 'comunidad', headline: 'La comunidad está en [[mi bio]]', sub: '{handle}' },
]

export const finalSlide: TemplateDef = {
  id: 'final-slide',
  number: 18,
  name: 'Final Carousel Slide',
  category: 'brand',
  description: 'Cierre del carrusel: una frase enorme que termina en el acento y el usuario debajo (4 variantes).',
  build: (t) => {
    const v = FINAL_VARIANTS[0]
    // The default message sets on three lines (two on the wide 16:9 column).
    const lines = t.landscape ? 2 : 3
    const k = fit(t, 0.85, hlH(t, 160, lines) + px(t, 56) + 68 * 1.3 * t.s)
    const hs = 160 * k
    const us = 68 * k
    const uh = us * t.s * 1.3
    const gap = px(t, 56)
    // Bottom-anchored: the handle sits at a fixed line and the headline grows
    // upwards, so every variant (2–4 lines) keeps the same rhythm. The block
    // is centred for the default message.
    const hb = hlH(t, hs, lines)
    const total = hb + gap + uh
    const y = t.contentTop + Math.max(0, (t.ch - total) * 0.5)
    const top = Math.max(t.contentTop, y - hlH(t, hs, 2))
    const hh = y + hb - top
    const uy = y + hb + gap
    return {
      background: ink(),
      elements: [
        ...cinematic(t),
        goatMark(t, t.left, t.top, 60),
        hl(t, v.headline, { y: top, h: hh }, hs, { name: 'Mensaje final', verticalAlign: 'bottom' }),
        label(t, v.sub, { y: uy, h: uh }, us, { name: 'Submensaje', fontWeight: 600, uppercase: false, fill: { kind: 'solid', color: '$text' } }),
      ],
    }
  },
}

export const BRAND_TEMPLATES = [community, finalSlide, communityMascot]
