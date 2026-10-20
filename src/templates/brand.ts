import * as E from '../model/elements'
import type { TemplateDef } from './types'
import { BG, bottomFade, footer, fx, glow, grain, hairline, header, headline, kicker, pill, text, vignette, zone } from './kit'

export const community: TemplateDef = {
  id: 'community',
  number: 17,
  name: 'GOAT SOCIETY Community',
  category: 'brand',
  description: 'Diapositiva cinematográfica con la mascota y llamada a Telegram.',
  build: (t) => {
    const mz = zone(t, -0.12, 0.58)
    const mw = Math.min(t.cw * 1.05, mz.h * 0.8)
    return {
      background: BG.noir(),
      elements: [
        fx(t, 'noiseGradient', { color: '$tertiary', color2: '#1C0A0F', intensity: 0.55, spread: 0.3, seed: 21 }),
        fx(t, 'lightRays', { color: '$negative', intensity: 0.22, spread: 0.6, seed: 9, height: t.H * 0.7 }),
        E.mascot({ name: 'Mascota cinemática', variant: 'cinematic', x: t.cx - mw / 2, y: mz.y, width: mw, height: mz.h, rimColor: '$negative', backlightColor: '$tertiary', backlight: 1, eyeColor: '$primary', eyeGlow: 1, fog: 0.6, fadeBottom: 0.25 }),
        bottomFade(t, 0.45, 0.95),
        vignette(t, 0.9, 0.3),
        grain(t, 0.08),
        ...header(t),
        kicker(t, 'La comunidad privada', zone(t, 0.6, 0.64).y, { fontSize: 30, fill: { kind: 'solid', color: '$negative' } }),
        headline(t, 'Únete a [[{brand}]]', zone(t, 0.645, 0.8), 170 * t.s, { accentColor: '$primary' }),
        text(t, 'Pronósticos, análisis y datos cada día. Sin ruido.', zone(t, 0.81, 0.87), { name: 'Descripción', fontFamily: '$body', fontSize: 36 * t.s, fontWeight: 500, uppercase: false, lineHeight: 1.3, fill: { kind: 'solid', color: '$text' } }),
        pill(t, '{telegram.label}  ·  {telegram}', zone(t, 0.9, 0.9).y, 32, {
          name: 'Botón Telegram',
          fill: { kind: 'solid', color: '#08090B' },
          background: { color: '$primary', opacity: 1, paddingX: 46, paddingY: 24, radius: 60 },
          fontWeight: 800,
          uppercase: true,
        }),
        ...footer(t, '{handle}'),
      ],
    }
  },
}

export const FINAL_VARIANTS = [
  { id: 'perfil', headline: 'El análisis completo está en [[mi perfil]]', sub: 'Pronósticos y análisis en la comunidad' },
  { id: 'unete', headline: 'Únete a [[{brand}]]', sub: 'El resto está dentro' },
  { id: 'comunidad', headline: 'Pronósticos y análisis en [[la comunidad]]', sub: 'Acceso desde el enlace del perfil' },
  { id: 'dentro', headline: 'El resto [[está dentro]]', sub: '{telegram}' },
]

export const finalSlide: TemplateDef = {
  id: 'final-slide',
  number: 18,
  name: 'Final Carousel Slide',
  category: 'brand',
  description: 'Cierre elegante del carrusel con mensaje y marca (4 variantes de texto).',
  build: (t) => {
    const v = FINAL_VARIANTS[0]
    const hz = zone(t, 0.36, 0.66)
    return {
      background: BG.ink(),
      elements: [
        fx(t, 'noiseGradient', { color: '#1E2A26', color2: '#121A17', intensity: 0.6, spread: 0.4, seed: 31 }),
        E.mascot({ name: 'Mascota contorno', variant: 'outline', x: t.cx - t.cw * 0.5, y: t.contentTop - t.ch * 0.05, width: t.cw, height: t.ch * 1.05, opacity: 0.09, baseColor: '$primary', eyeColor: '$primary', eyeGlow: 0.5, locked: true }),
        glow(t, t.cx, hz.y + hz.h / 2, t.cw * 0.6, '$primary', 0.1, 0.7),
        vignette(t, 0.9, 0.3),
        grain(t, 0.07),
        E.brandMark({ name: 'Logotipo', variant: 'wordmark', x: t.cx - 240 * t.s, y: zone(t, 0.04, 0.3).y, width: 480 * t.s, height: Math.min(380 * t.s, zone(t, 0.04, 0.3).h) }),
        hairline(t, hz.y - t.ch * 0.03, t.cw * 0.3),
        headline(t, v.headline, hz, 170 * t.s, { name: 'Mensaje final' }),
        hairline(t, hz.y + hz.h + t.ch * 0.03, t.cw * 0.3),
        text(t, v.sub, zone(t, 0.73, 0.79), { name: 'Submensaje', fontFamily: '$serif', fontSize: 58 * t.s, italic: true, uppercase: false, fill: { kind: 'solid', color: '$text' } }),
        pill(t, 'Sígueme  ·  {handle}', zone(t, 0.86, 0.86).y, 30, { name: 'Usuario', background: { color: '$text', opacity: 0.08, paddingX: 40, paddingY: 20, radius: 60 } }),
        ...footer(t, '{page} / {pages}'),
      ],
    }
  },
}

export const BRAND_TEMPLATES = [community, finalSlide]
