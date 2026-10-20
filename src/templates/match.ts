import * as E from '../model/elements'
import type { SlideElement } from '../model/types'
import type { TemplateDef } from './types'
import type { TCtx } from './kit'
import { cinematic, crestOf, hl, ink, label, px, signature, support } from './kit'

// GOAT EDITORIAL · Previas
// Black background, big white type, one accent ($accent), one message.

/** Vertical type factor: 1 on story/portrait, ≈0.85 on square/landscape. */
const vk = (t: TCtx) => Math.min(1, t.v + 0.18)

/** Approximate Anton cap height / font size (used to stack labels under numbers). */
const CAP = 0.74

export const matchdayElite: TemplateDef = {
  id: 'matchday-elite',
  number: 1,
  name: 'Matchday Elite',
  category: 'match',
  description: 'Portada de partido: dos escudos grandes, un titular y la fecha.',
  build: (t) => {
    if (t.landscape) {
      // Text column on the left, the two crests share the right half.
      const colW = t.cw * 0.54
      const sy = t.contentBottom - px(t, 90)
      const hb = sy - px(t, 28)
      const gap = px(t, 40)
      const cs = Math.min((t.cw - colW - px(t, 70) - gap) / 2, t.ch * 0.42)
      const rx = t.right - cs * 2 - gap
      const cy = t.contentTop + (t.ch - cs) / 2
      return {
        background: ink(),
        elements: [
          ...cinematic(t, 'stadium'),
          signature(t),
          crestOf('home', rx, cy, cs),
          crestOf('away', rx + cs + gap, cy, cs),
          hl(t, '{headline}', { y: t.contentTop, w: colW, h: hb - t.contentTop }, 150 * vk(t), { verticalAlign: 'bottom' }),
          support(t, '{competition}  ·  {weekday} {time}', { y: sy, w: colW, h: px(t, 90) }, 44, { name: 'Fecha y competición' }),
        ],
      }
    }
    const k = vk(t)
    const sy = t.contentBottom - px(t, 100)
    const hb = sy - px(t, 30)
    const hh = px(t, 400)
    const hy = hb - hh
    const cs = Math.min(400 * t.s, (hy - t.contentTop) * 0.86, t.cw * 0.43)
    const cy = t.contentTop + (hy - t.contentTop - cs) / 2
    return {
      background: ink(),
      elements: [
        ...cinematic(t, 'stadium'),
        signature(t),
        crestOf('home', t.left, cy, cs),
        crestOf('away', t.right - cs, cy, cs),
        hl(t, '{headline}', { y: hy, h: hh }, 170 * k, { verticalAlign: 'bottom' }),
        support(t, '{competition}  ·  {weekday} {time}', { y: sy, h: px(t, 100) }, 46, { name: 'Fecha y competición' }),
      ],
    }
  },
}

/** Small crest pair + match line used as context on typographic slides. */
function matchTag(t: TCtx, y: number, size = 76, w = t.cw): SlideElement[] {
  const cs = px(t, size, 40)
  const gap = cs * 0.22
  const tx = t.left + cs * 2 + gap + px(t, 28)
  return [
    crestOf('home', t.left, y, cs, { name: 'Escudo local (pequeño)' }),
    crestOf('away', t.left + cs + gap, y, cs, { name: 'Escudo visitante (pequeño)' }),
    label(t, '{home.short} vs {away.short}  ·  {weekday} {time}', { x: tx, y: y + cs * 0.22, w: t.left + w - tx, h: cs * 0.62 }, 40 * vk(t), { name: 'Partido', verticalAlign: 'middle', fill: { kind: 'solid', color: '$muted' } }),
  ]
}

export const bigStatement: TemplateDef = {
  id: 'big-statement',
  number: 2,
  name: 'The Big Statement',
  category: 'match',
  description: 'Titular gigante a toda la pantalla, una palabra en acento y una frase de apoyo.',
  build: (t) => {
    const k = vk(t)
    const tagY = t.contentTop
    const subH = px(t, 140)
    const subY = t.contentBottom - px(t, 30) - subH
    const hb = subY - px(t, 34)
    const hy = tagY + px(t, 150)
    const size = t.landscape ? 190 * k : 220 * k
    return {
      background: ink(),
      elements: [
        ...cinematic(t, 'spot'),
        signature(t),
        ...matchTag(t, tagY),
        hl(t, '{headline}', { y: hy, h: hb - hy }, size, { name: 'Titular gigante', verticalAlign: 'bottom', lineHeight: 1.0 }),
        support(t, '{subheadline}', { y: subY, w: Math.min(t.cw, 860 * t.s), h: subH }, 56 * Math.max(0.85, k), { name: 'Subtítulo' }),
      ],
    }
  },
}

export const headToHead: TemplateDef = {
  id: 'head-to-head',
  number: 3,
  name: 'Head to Head',
  category: 'match',
  description: 'Cara a cara histórico en tres cifras enormes: victorias de cada equipo y empates.',
  build: (t) => {
    const k = vk(t)
    // Headline + numbers stacked; side by side in landscape.
    const split = t.landscape
    const hw = split ? t.cw * 0.4 : t.cw
    const hh = split ? t.ch * 0.7 : px(t, 330)
    const hy = split ? t.contentTop + (t.ch - hh) / 2 : t.contentTop
    const nx = split ? t.left + t.cw * 0.46 : t.left
    const nw = split ? t.cw * 0.54 : t.cw
    const zTop = split ? t.contentTop : hy + hh + px(t, 40)
    const zBot = t.contentBottom
    const colW = nw / 3
    const g1 = px(t, 50)
    const g2 = px(t, 40)
    const g3 = px(t, 70)
    const ls = 46 * k
    const ss = 34 * k
    // Size crests and numbers to the room available (giant on stories).
    const room = zBot - zTop - (g1 + g2 + ls * 1.2 + g3 + ss * 1.3)
    const vs = Math.min(340 * k, colW * 1.15, (room * 0.52) / CAP)
    const cs = Math.min(250 * k, colW * 0.78, room * 0.46)
    const numH = vs * CAP
    const block = cs + g1 + numH + g2 + ls * 1.2 + g3 + ss * 1.3
    const by = zTop + Math.max(0, (zBot - zTop - block) / 2)
    const ny = by + cs + g1
    const ly = ny + numH + g2
    const sy = ly + ls * 1.2 + g3
    const cols = [
      { v: '4', l: 'Victorias', c: '$accent', side: 'home' as const, n: 'local' },
      { v: '3', l: 'Empates', c: '$muted', side: null, n: 'empates' },
      { v: '2', l: 'Victorias', c: '$text', side: 'away' as const, n: 'visitante' },
    ]
    const els: SlideElement[] = []
    cols.forEach((col, i) => {
      const x = nx + colW * i
      if (col.side) els.push(crestOf(col.side, x + (colW - cs) / 2, by, cs))
      els.push(
        E.statNumber({ name: `Cifra ${col.n}`, x, y: ny, width: colW, height: numH * 1.06, value: col.v, label: '', description: '', layout: 'hero', align: 'center', valueSize: vs, valueColor: col.c }),
        label(t, col.l, { x, y: ly, w: colW, h: ls * 1.3 }, ls, { name: `Etiqueta ${col.n}`, align: 'center', fill: { kind: 'solid', color: i === 0 ? '$text' : '$muted' } }),
      )
    })
    return {
      background: ink(),
      elements: [
        ...cinematic(t),
        signature(t),
        hl(t, '{home.short} gana [[4]] de los últimos 9', { y: hy, w: hw, h: hh }, 150 * k, { name: 'Titular', verticalAlign: split ? 'middle' : 'top' }),
        ...els,
        label(t, 'Últimos 9 enfrentamientos oficiales', { x: nx, y: sy, w: nw, h: ss * 1.3 }, ss, { name: 'Fuente', align: 'center', fill: { kind: 'solid', color: '$dim' } }),
      ],
    }
  },
}

export const matchdayAgenda: TemplateDef = {
  id: 'matchday-agenda',
  number: 4,
  name: 'Matchday Agenda',
  category: 'match',
  description: 'Agenda del día en filas abiertas: hora grande, escudos y nombres.',
  build: (t) => {
    const k = vk(t)
    if (t.landscape) {
      const colW = t.cw * 0.36
      const lx = t.left + t.cw * 0.42
      const lw = t.right - lx
      const hh = t.ch * 0.5
      const hy = t.contentTop + (t.ch - hh) / 2 - px(t, 40)
      return {
        background: ink(),
        elements: [
          ...cinematic(t),
          signature(t),
          hl(t, 'Hoy se juega la [[Champions]]', { y: hy, w: colW, h: hh }, 130 * k, { verticalAlign: 'bottom' }),
          support(t, '{weekday}  ·  {date}', { y: hy + hh + px(t, 24), w: colW, h: px(t, 70) }, 44, { name: 'Fecha' }),
          E.matchList({ name: 'Agenda', x: lx, y: t.contentTop, width: lw, height: t.ch, rowHeight: t.ch / 5, maxItems: 5, variant: 'editorial' }),
        ],
      }
    }
    const hh = px(t, 330)
    const sy = t.contentTop + hh + px(t, 10)
    const sh = px(t, 70)
    const ly = sy + sh + px(t, 40)
    const lh = t.contentBottom - ly
    // Keep the right edge clear of the TikTok buttons on stories.
    const lw = t.story ? t.cw - 60 : t.cw
    return {
      background: ink(),
      elements: [
        ...cinematic(t),
        signature(t),
        hl(t, 'Hoy se juega la [[Champions]]', { y: t.contentTop, h: hh }, 150 * k),
        support(t, '{weekday}  ·  {date}', { y: sy, h: sh }, 46, { name: 'Fecha' }),
        E.matchList({ name: 'Agenda', x: t.left, y: ly, width: lw, height: lh, rowHeight: Math.min(210, lh / 5), maxItems: 5, variant: 'editorial' }),
      ],
    }
  },
}

export const photoCover: TemplateDef = {
  id: 'photo-cover',
  number: 20,
  name: 'Photo Cover',
  category: 'match',
  description: 'Portada editorial con foto: sube la foto de un jugador o del estadio en el elemento «Foto». Sin foto, un escudo gigante recortado sostiene la composición.',
  build: (t) => {
    const k = vk(t)
    const fade = 0.35
    // Photo area: top of the slide (full width), fading into black.
    const ih = t.landscape ? t.H * 0.86 : t.story ? t.H * 0.76 : t.H * 0.76
    const solid = ih * (1 - fade)
    // Fallback visual (covered by the photo once uploaded): a giant crest,
    // zoomed past the frame and dimmed, fading out before the type.
    const cs = t.landscape ? t.H * 1.15 : t.W * 1.2
    const cx = t.landscape ? t.W - cs * 0.85 : t.cx - cs / 2
    const cy = t.landscape ? -cs * 0.18 : solid * 0.46 - cs / 2
    const fadeTop = solid - (t.landscape ? t.H * 0.3 : solid * 0.32)
    const subH = px(t, 130)
    const subY = t.contentBottom - px(t, 40) - subH
    const hb = subY - px(t, 28)
    const hw = t.landscape ? t.cw * 0.62 : t.cw
    const hh = px(t, 420)
    return {
      background: ink(),
      elements: [
        ...cinematic(t, 'grain'),
        crestOf('home', cx, cy, cs, { name: 'Escudo de fondo' }),
        E.shape({
          name: 'Fundido escudo',
          shape: 'rect',
          x: 0,
          y: 0,
          width: t.W,
          height: t.H,
          cornerRadius: 0,
          locked: true,
          fill: { kind: 'linear', angle: 180, stops: [{ offset: 0, color: '$bg', opacity: 0.42 }, { offset: fadeTop / t.H, color: '$bg', opacity: 0.55 }, { offset: solid / t.H, color: '$bg', opacity: 1 }, { offset: 1, color: '$bg', opacity: 1 }] },
        }),
        E.image({ name: 'Foto', x: 0, y: 0, width: t.W, height: ih, fit: 'cover', focusX: 0.5, focusY: 0.35, fadeBottom: fade }),
        signature(t),
        hl(t, '{headline}', { y: hb - hh, w: hw, h: hh }, 160 * k, { verticalAlign: 'bottom' }),
        support(t, '{subheadline}', { y: subY, w: hw, h: subH }, 50 * Math.max(0.85, k), { name: 'Apoyo' }),
      ],
    }
  },
}

export const MATCH_TEMPLATES = [matchdayElite, bigStatement, headToHead, matchdayAgenda, photoCover]
