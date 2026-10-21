import * as E from '../model/elements'
import type { TemplateDef } from './types'
import type { TCtx } from './kit'
import { cinematic, cta, goatMark, hl, ink, label, px, signature, support } from './kit'
import { gapV, headZone, mainHead, vk } from './match'

// GOAT EDITORIAL · Comunidad
// Black background, big white type, one accent ($accent), one message.
// Brand pages follow the family (centered type, same top row, CTA on the
// foot) but drop the page number. When the brand name is already the message
// the top-left signature becomes the small goat mark, at the same place and
// height as the signature of every other page.

/** Anton headline leading used by kit.hl(). */
const LH = 1.04

/** Height of `lines` headline lines at story size `size` (scaled by t.s). */
const hlH = (t: TCtx, size: number, lines: number) => size * t.s * (LH * lines + 0.06)

/** Anton's Á/Ú accents rise ≈0.1 em above the first line box: room kept above it (em). */
const ACC = 0.12

/** Mascot artwork aspect ratio (GOAT_VIEW 512×660). */
const GOAT_RATIO = 512 / 660

const accentFill = { kind: 'solid' as const, color: '$accent' }

/** Goat mark in the signature slot (same x, y and height as kit.signature()). */
const markTop = (t: TCtx) => goatMark(t, t.left, t.top, 44)

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
  description: 'Cierre de comunidad tipográfico: «Únete a GOAT SOCIETY» centrado a tamaño cartel y llamada al enlace de la bio.',
  build: (t) => {
    const k = vk(t)
    const ss = 64 * k
    const cs = 58 * k
    const sh = ss * t.s * 1.25
    const ch = cs * t.s * 1.3
    const g1 = px(t, 44)
    const g2 = px(t, 80)
    const rest = g1 + sh + g2 + ch
    // Largest headline (story px) whose `n` lines (and the Ú accent) fit above the CTA block.
    const byH = (n: number) => (t.ch - rest) / (LH * n + 0.06 + ACC) / t.s
    // Tall formats: poster stack ÚNETE A / GOAT / SOCIETY, each long line
    // filling the column. Short or wide formats: two lines, the brand
    // filling the width. The brand wraps by itself (no hard-coded break), so
    // another brand name still sets and autoFit covers longer ones.
    const s3 = Math.min(fillW(t, Math.max(W_UNETE, W_SOCIETY)), byH(3))
    const s2 = Math.min(fillW(t, Math.max(W_UNETE, W_BRAND)), byH(2))
    const three = s3 > s2 * 1.15 && s3 * t.s * (W_BRAND / 100) > t.cw * 1.02
    const hs = three ? s3 : s2
    const hh = hlH(t, hs, three ? 3 : 2)
    // The poster block is centered in the content zone (tall formats fill it).
    const acc = ACC * hs * t.s
    const y = t.contentTop + acc + Math.max(0, t.ch - acc - hh - rest) * 0.5
    // Room above lets a longer brand name take one more line; the headline is
    // bottom-aligned so the stack below never moves.
    const extra = Math.min(hlH(t, hs, 1), y - t.contentTop)
    return {
      background: ink(),
      elements: [
        ...cinematic(t),
        markTop(t),
        hl(t, 'Únete a\n[[{brand}]]', { y: y - extra, h: hh + extra }, hs, { verticalAlign: 'bottom' }),
        label(t, 'Análisis y pronósticos', { y: y + hh + g1, h: sh }, ss, { name: 'Descripción', align: 'center', fontWeight: 600 }),
        cta(t, 'Link en la bio  ↗', { y: y + hh + g1 + sh + g2, h: ch }, cs, { align: 'center', fill: accentFill }),
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
  description: 'Titular arriba, la mascota como imagen principal (monocroma con un filo del color de acento) y la llamada a la comunidad al pie.',
  build: (t) => {
    const k = vk(t)
    const ss = 52 * k
    const cs = 54 * k
    const sh = ss * t.s * 1.25
    const ch = cs * t.s * 1.3
    const g1 = px(t, 16)
    const g2 = px(t, 32)
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
      // Square and landscape: mascot on the left, a centered text column on the right.
      const hs = 144 * k
      const hh = hlH(t, hs, 2)
      const mw = Math.min(t.ch * GOAT_RATIO, t.cw * 0.48)
      const mh = mw / GOAT_RATIO
      const tx = t.left + mw + px(t, 60)
      const tw = t.right - tx
      // A narrow column wraps the support line (≈12.7 em at Inter Tight 500).
      const sh2 = ss * t.s * 1.22 * (tw >= ss * t.s * 12.9 ? 1 : 2)
      const g1b = px(t, 22)
      const g2b = px(t, 40)
      const ty = t.contentTop + (t.ch - (hh + g1b + sh2 + g2b + ch)) / 2
      return {
        background: ink(),
        elements: [
          ...cinematic(t),
          signature(t),
          mascot(t.left, t.contentTop + (t.ch - mh) / 2, mw, mh),
          // Narrow column: the claim wraps by itself («ÚNETE A LA / COMUNIDAD»).
          hl(t, 'Únete a la comunidad', { x: tx, y: ty, w: tw, h: hh }, hs, { verticalAlign: 'bottom' }),
          support(t, 'Análisis, datos y pronósticos.', { x: tx, y: ty + hh + g1b, w: tw, h: sh2 }, ss, { name: 'Descripción', align: 'center' }),
          cta(t, 'Accede desde mi perfil  ↗', { x: tx, y: ty + hh + g1b + sh2 + g2b, w: tw, h: ch }, cs, { align: 'center', fill: accentFill }),
        ],
      }
    }

    // Tall formats follow the family rhythm: the headline in the shared zone,
    // the mascot as the main visual in the centre, support + CTA on the foot.
    const z = headZone(t)
    const cy = t.contentBottom - ch
    const sy = cy - g2 - sh
    // The horn tips may rise into the gap under the headline; the beard fades
    // out (fadeBottom), so a small real gap above the support reads as air.
    const mTop = z.end + gapV(t) * 0.6
    const room = sy - g1 - px(t, 24) - mTop
    const mh = Math.min(room, (t.W * 0.64) / GOAT_RATIO)
    const mw = mh * GOAT_RATIO
    const y0 = mTop + Math.max(0, (room - mh) * 0.5)
    return {
      background: ink(),
      elements: [
        ...cinematic(t),
        signature(t),
        mainHead(t, 'Únete a\nla comunidad'),
        mascot(t.cx - mw / 2, y0, mw, mh),
        support(t, 'Análisis, datos y pronósticos.', { y: sy, h: sh }, ss, { name: 'Descripción', align: 'center' }),
        cta(t, 'Accede desde mi perfil  ↗', { y: cy, h: ch }, cs, { align: 'center', fill: accentFill }),
      ],
    }
  },
}

// ── 18 · Cierre del carrusel ─────────────────────────────────────────────────

/**
 * Closing-slide copy variants (editor: "Variantes de cierre"). The editor
 * writes `headline` into "Mensaje final" and `sub` into "Submensaje" (the
 * handle line). Only neutral profile/bio calls to action. Explicit breaks
 * keep a clean centered three-line stack at poster size (no «MI / PERFIL»
 * split, no orphans), no accented capital under a full line (Anton's Á/Ó
 * accents would touch the line above at the tight 1.04 leading) and no comma
 * at a line end (it drops onto the next line and reads like an accent).
 */
export const FINAL_VARIANTS = [
  { id: 'perfil', headline: 'El análisis\ncompleto\nen [[mi perfil]]', sub: '{handle}' },
  { id: 'pronostico', headline: 'Pronóstico\ncompleto\nen [[mi perfil]]', sub: '{handle}' },
  { id: 'unete', headline: 'Únete a\n[[{brand}]]', sub: '{handle}' },
  { id: 'bio', headline: 'Enlace en\n[[la bio]]', sub: '{handle}' },
]

/** Widest variant line, «EN MI PERFIL» (Anton advance per 100 px). */
const W_FINAL = 473.4

export const finalSlide: TemplateDef = {
  id: 'final-slide',
  number: 18,
  name: 'Final Carousel Slide',
  category: 'brand',
  description: 'Cierre del carrusel: una frase centrada a tamaño cartel que termina en el acento, con el usuario debajo (4 variantes).',
  build: (t) => {
    const v = FINAL_VARIANTS[0]
    const lines = 3
    const us = 68 * vk(t)
    const uh = us * t.s * 1.3
    const gap = px(t, 48)
    // The widest line of any variant fills the column (≈190 on a story).
    const hs = Math.min(fillW(t, W_FINAL), (t.ch - gap - uh) / (LH * lines + 0.06 + ACC) / t.s)
    const hb = hlH(t, hs, lines)
    const acc = ACC * hs * t.s
    // Statement + handle form one centered block, a touch above the middle
    // (optical centre); only the goat mark sits above it.
    const y = t.contentTop + acc + Math.max(0, t.ch - acc - hb - gap - uh) * 0.45
    // One spare line of headroom for longer custom messages (autoFit beyond);
    // bottom-aligned so a two-line variant still hugs the handle.
    const top = Math.max(t.contentTop, y - hlH(t, hs, 1))
    const uy = y + hb + gap
    return {
      background: ink(),
      elements: [
        ...cinematic(t),
        markTop(t),
        hl(t, v.headline, { y: top, h: y + hb - top }, hs, { name: 'Mensaje final', verticalAlign: 'bottom' }),
        label(t, v.sub, { y: uy, h: uh }, us, { name: 'Submensaje', align: 'center', fontWeight: 600, uppercase: false, fill: { kind: 'solid', color: '$text' } }),
      ],
    }
  },
}

export const BRAND_TEMPLATES = [community, finalSlide, communityMascot]
