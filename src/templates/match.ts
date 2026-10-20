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

/** Team name centered under a crest (keeps the cover linked to the match data). */
function crestName(t: TCtx, side: 'home' | 'away', x: number, y: number, w: number, size: number) {
  return label(t, side === 'home' ? '{home.short}' : '{away.short}', { x: x - w * 0.15, y, w: w * 1.3, h: size * t.s * 1.25 }, size, {
    name: side === 'home' ? 'Nombre local' : 'Nombre visitante',
    align: 'center',
    fontWeight: 700,
    fill: { kind: 'solid', color: '$text' },
  })
}

export const matchdayElite: TemplateDef = {
  id: 'matchday-elite',
  number: 1,
  name: 'Matchday Elite',
  category: 'match',
  description: 'Portada de partido: dos escudos grandes con sus nombres, un titular y la fecha.',
  build: (t) => {
    const k = vk(t)
    const ns = 46 * k
    const nh = ns * t.s * 1.25
    const ng = px(t, 22)
    if (t.landscape) {
      // Text column on the left, the two crests share the right half; both
      // blocks sit on the same horizontal axis.
      const colW = t.cw * 0.47
      const hs = 150 * k
      const sh = px(t, 60)
      const gapS = px(t, 28)
      const mid = t.contentTop + t.ch / 2
      // Room for a three-line headline + the date line, centered on the axis.
      const block = hs * t.s * 1.04 * 3 + gapS + sh
      const sy = Math.min(t.contentBottom - sh, mid + block / 2 - sh)
      const hb = sy - gapS
      const gap = px(t, 40)
      const cs = Math.min((t.cw - colW - px(t, 70) - gap) / 2, t.ch * 0.42)
      const rx = t.right - cs * 2 - gap
      const cy = mid - (cs + ng + nh) / 2
      return {
        background: ink(),
        elements: [
          ...cinematic(t, 'stadium'),
          signature(t),
          crestOf('home', rx, cy, cs),
          crestOf('away', rx + cs + gap, cy, cs),
          crestName(t, 'home', rx, cy + cs + ng, cs, ns),
          crestName(t, 'away', rx + cs + gap, cy + cs + ng, cs, ns),
          hl(t, '{headline}', { y: t.contentTop, w: colW, h: hb - t.contentTop }, hs, { verticalAlign: 'bottom' }),
          support(t, '{competition}  ·  {weekday} {time}', { y: sy, w: colW, h: px(t, 90) }, 44, { name: 'Fecha y competición' }),
        ],
      }
    }
    const sy = t.contentBottom - px(t, 100)
    const hb = sy - px(t, 30)
    const hh = px(t, 400)
    const hy = hb - hh
    const room = hy - t.contentTop - px(t, 20)
    const cs = Math.min(400 * t.s, (room - ng - nh) * 0.9, t.cw * 0.43)
    const cy = t.contentTop + (room - cs - ng - nh) / 2
    return {
      background: ink(),
      elements: [
        ...cinematic(t, 'stadium'),
        signature(t),
        crestOf('home', t.left, cy, cs),
        crestOf('away', t.right - cs, cy, cs),
        crestName(t, 'home', t.left, cy + cs + ng, cs, ns),
        crestName(t, 'away', t.right - cs, cy + cs + ng, cs, ns),
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
    const size = t.landscape ? 230 * k : 220 * k
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
    // Break before the accent so the claim reads «HOY SE JUEGA / LA CHAMPIONS».
    const title = 'Hoy se juega\n[[la Champions]]'
    if (t.landscape) {
      // Headline column on the left, open list on the right (wide enough
      // that long team names never touch).
      const colW = t.cw * 0.4
      const lx = t.left + t.cw * 0.44
      const lw = t.right - lx
      const n = 5
      const rowH = Math.min(px(t, 165), (t.ch * 0.96) / (n - 0.2))
      const ly = t.contentTop + (t.ch - rowH * (n - 0.2)) / 2
      // Two lines that fit the column (Anton ≈ 5.5 em for «LA CHAMPIONS»).
      const hs = Math.min(130 * k, colW / (5.6 * t.s))
      const hh = hs * t.s * 1.04 * 2 + px(t, 8)
      const dh = px(t, 64)
      const hy = t.contentTop + (t.ch - hh - dh - px(t, 20)) / 2
      return {
        background: ink(),
        elements: [
          ...cinematic(t),
          signature(t),
          hl(t, title, { y: hy, w: colW, h: hh }, hs, { verticalAlign: 'bottom' }),
          support(t, '{weekday}  ·  {date}', { y: hy + hh + px(t, 20), w: colW, h: dh }, 44, { name: 'Fecha' }),
          E.matchList({ name: 'Agenda', x: lx, y: ly, width: lw, height: rowH * n, rowHeight: rowH, maxItems: n, variant: 'editorial' }),
        ],
      }
    }
    // Two-line headline, the date, then the open list down to the safe line.
    const hs = (t.story ? 145 : 135) * k
    const hh = hs * 1.04 * 2 + px(t, 8)
    const sy = t.contentTop + hh + px(t, 6)
    const sh = px(t, 60)
    const ly = sy + sh + px(t, 36)
    // Square is short: four rows keep names above 40px.
    const n = t.H / t.W < 1.1 ? 4 : 5
    const rowH = Math.min(210 * t.s, (t.contentBottom - ly) / (n - 0.2))
    // Keep the right edge clear of the TikTok buttons on stories.
    const lw = t.story ? t.cw - 72 : t.cw
    return {
      background: ink(),
      elements: [
        ...cinematic(t),
        signature(t),
        hl(t, title, { y: t.contentTop, h: hh }, hs),
        support(t, '{weekday}  ·  {date}', { y: sy, h: sh }, 46, { name: 'Fecha' }),
        E.matchList({ name: 'Agenda', x: t.left, y: ly, width: lw, height: rowH * n, rowHeight: rowH, maxItems: n, variant: 'editorial' }),
      ],
    }
  },
}

export const photoCover: TemplateDef = {
  id: 'photo-cover',
  number: 20,
  name: 'Photo Cover',
  category: 'match',
  description: 'Portada editorial con foto: sube la foto de un jugador o del estadio en el elemento «Foto» (también vale un PNG recortado). Sin foto, un escudo gigante recortado sostiene la composición.',
  build: (t) => {
    const k = vk(t)
    const fs = 160 * k
    // Type at the foot of the content zone.
    const subH = px(t, 130)
    const subY = t.contentBottom - px(t, 40) - subH
    const hb = subY - px(t, 28)
    const hw = t.landscape ? t.cw * 0.62 : t.cw
    const hh = px(t, 420)
    // Photo: full bleed from the top, fading into black behind the type.
    // Landscape splits the frame: type on black at the left, photo on the right.
    const ih = t.landscape ? t.H : t.H * 0.76
    const ix = t.landscape ? t.W * 0.36 : 0
    const fade = 0.35
    const fadeTop = ih * (1 - fade)
    // Fallback visual (also the backdrop of a cut-out PNG): the home crest,
    // zoomed past the frame and dimmed. An opaque photo covers it.
    const cs = t.landscape ? t.H * 1.1 : t.W * 1.19
    const cx = t.landscape ? t.W * 1.1 - cs : t.cx - cs / 2
    const cy = t.landscape ? -cs * 0.3 : ih * 0.36 - cs / 2
    // Reading scrim above photo and crest: clear at the top, ≈85 % black where
    // a two-line headline starts, solid below it, so white type always reads.
    const textTop = hb - fs * t.s * 1.04 * 2
    const s0 = Math.max(t.H * 0.1, textTop - px(t, 400))
    const sh = t.H - s0
    const at = (y: number) => Math.min(1, Math.max(0, (y - s0) / sh))
    const scrim = t.landscape
      ? E.shape({
          name: 'Sombra de lectura',
          shape: 'rect',
          x: 0,
          y: 0,
          width: t.W,
          height: t.H,
          cornerRadius: 0,
          locked: true,
          fill: { kind: 'linear', angle: 90, stops: [{ offset: 0, color: '$bg', opacity: 1 }, { offset: 0.38, color: '$bg', opacity: 1 }, { offset: 0.56, color: '$bg', opacity: 0.62 }, { offset: 0.74, color: '$bg', opacity: 0 }] },
        })
      : E.shape({
          name: 'Sombra de lectura',
          shape: 'rect',
          x: 0,
          y: s0,
          width: t.W,
          height: sh,
          cornerRadius: 0,
          locked: true,
          fill: {
            kind: 'linear',
            angle: 180,
            stops: [
              { offset: 0, color: '$bg', opacity: 0 },
              { offset: at((s0 + textTop) / 2), color: '$bg', opacity: 0.42 },
              { offset: at(textTop), color: '$bg', opacity: 0.86 },
              { offset: at(textTop + px(t, 140)), color: '$bg', opacity: 1 },
              { offset: 1, color: '$bg', opacity: 1 },
            ],
          },
        })
    return {
      background: ink(),
      elements: [
        ...cinematic(t, 'grain'),
        crestOf('home', cx, cy, cs, { name: 'Escudo de fondo' }),
        // Dims the crest and hides it where the photo starts to fade, so it
        // never ghosts through an uploaded photo.
        E.shape({
          name: 'Atenuado escudo',
          shape: 'rect',
          x: 0,
          y: 0,
          width: t.W,
          height: t.H,
          cornerRadius: 0,
          locked: true,
          fill: { kind: 'linear', angle: 180, stops: [{ offset: 0, color: '$bg', opacity: 0.5 }, { offset: (fadeTop * 0.6) / t.H, color: '$bg', opacity: 0.5 }, { offset: fadeTop / t.H, color: '$bg', opacity: 1 }, { offset: 1, color: '$bg', opacity: 1 }] },
        }),
        E.image({ name: 'Foto', x: ix, y: 0, width: t.W - ix, height: ih, fit: 'cover', focusX: 0.5, focusY: 0.3, fadeBottom: fade }),
        scrim,
        signature(t),
        hl(t, '{headline}', { y: hb - hh, w: hw, h: hh }, fs, { verticalAlign: 'bottom' }),
        support(t, '{subheadline}', { y: subY, w: hw, h: subH }, 50 * Math.max(0.85, k), { name: 'Apoyo' }),
      ],
    }
  },
}

export const MATCH_TEMPLATES = [matchdayElite, bigStatement, headToHead, matchdayAgenda, photoCover]
