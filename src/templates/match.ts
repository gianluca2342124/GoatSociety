import * as E from '../model/elements'
import type { SlideElement, TextElement } from '../model/types'
import type { TemplateDef } from './types'
import type { TCtx } from './kit'
import { chrome, cinematic, crestOf, hl, ink, inkFlat, label, px, signature, support } from './kit'

// GOAT EDITORIAL · Previas
// Black background, big white type, one accent ($accent), one message.

// ════════════════════════════════════════════════════════════════════════════
// FAMILY RHYTHM (v2) — shared by match.ts, stats.ts and brand.ts
// chrome (signature + page) → headline zone (top, centered) → main visual
// (centre) → support / source / CTA (foot line on t.contentBottom).
// Every standard page puts its headline at the same y with the same size, so
// swiping a carousel reads as one brand. 16:9 keeps the same order with a
// one-line headline.
// ════════════════════════════════════════════════════════════════════════════

/** Vertical type factor: 1 on vertical/story/portrait, ≈0.85 on square/landscape. */
export const vk = (t: TCtx) => Math.min(1, t.v + 0.18)

/** Main headline size (story px), the same on every standard page. */
export const HEAD = 150

/**
 * Headline leading for the big Anton claims: at the kit default (1.04) an
 * accented capital (PARÍS, ÚLTIMOS) touches the letter above it.
 */
export const LH = 1.12

/** Approximate Anton cap height / font size (used to stack labels under numbers). */
const CAP = 0.74

/** Lines the main headline gets: two on vertical formats, one on 16:9. */
export const headLines = (t: TCtx) => (t.landscape ? 1 : 2)

/** The shared headline zone: always at t.contentTop, full column, centered. */
export function headZone(t: TCtx, lines = headLines(t), size = HEAD * vk(t), lh = LH) {
  const h = size * t.s * lh * lines + px(t, 8)
  return { y: t.contentTop, h, size, lh, end: t.contentTop + h }
}

/** Main headline in the shared zone. */
export function mainHead(t: TCtx, content: string, p: Partial<TextElement> = {}, lines = headLines(t), size = HEAD * vk(t), lh = LH): TextElement {
  const z = headZone(t, lines, size, lh)
  return hl(t, content, { y: z.y, h: z.h }, z.size, { lineHeight: lh, ...p })
}

/** Space between the headline zone and the main visual (and visual → foot). */
export const gapV = (t: TCtx) => px(t, 72)

/** Height of the foot line (one dim source label). */
export const footH = (t: TCtx) => px(t, 50, 30)

/** Dim source / context label centered on the foot line. */
export function footLabel(t: TCtx, content: string, p: Partial<TextElement> = {}): TextElement {
  const h = footH(t)
  return label(t, content, { y: t.contentBottom - h, h }, 34, { name: 'Fuente', align: 'center', fill: { kind: 'solid', color: '$dim' }, ...p })
}

/** Support sentence centered on the foot (bottom-anchored on t.contentBottom). */
export function footSupport(t: TCtx, content: string, lines = 1, size = 46, p: Partial<TextElement> = {}): TextElement {
  const h = size * t.s * 1.22 * lines + px(t, 6)
  return support(t, content, { y: t.contentBottom - h, h }, size, { align: 'center', verticalAlign: 'bottom', ...p })
}

/** Top of the foot zone for a support block of `lines` lines. */
export const footTop = (t: TCtx, lines = 1, size = 46) => t.contentBottom - (size * t.s * 1.22 * lines + px(t, 6))

/** Team name centered under a crest (keeps the cover linked to the match data). */
function crestName(t: TCtx, side: 'home' | 'away', x: number, y: number, w: number, size: number) {
  return label(t, side === 'home' ? '{home.short}' : '{away.short}', { x: x - w * 0.15, y, w: w * 1.3, h: size * t.s * 1.25 }, size, {
    name: side === 'home' ? 'Nombre local' : 'Nombre visitante',
    align: 'center',
    fontWeight: 700,
    fill: { kind: 'solid', color: '$text' },
  })
}

/** Quiet Anton "VS" holding the centre axis between two crests. */
function versus(t: TCtx, cx: number, cy: number, size: number) {
  return label(t, 'VS', { x: cx - size * 1.2, y: cy - size * 0.6, w: size * 2.4, h: size * 1.2 }, size / t.s, {
    name: 'VS',
    fontFamily: '$headline',
    fontWeight: 400,
    align: 'center',
    verticalAlign: 'middle',
    lineHeight: 1,
    letterSpacing: 0,
    autoFit: false,
    fill: { kind: 'solid', color: '$dim' },
  })
}

export const matchdayElite: TemplateDef = {
  id: 'matchday-elite',
  number: 1,
  name: 'Matchday Elite',
  category: 'match',
  description: 'Portada de partido: titular arriba, dos escudos grandes con sus nombres y la fecha al pie.',
  build: (t) => {
    const k = vk(t)
    const ns = 46 * k
    const nh = ns * t.s * 1.25
    const ng = px(t, 22)
    const z = headZone(t)
    const fy = footTop(t)
    const a = z.end + gapV(t)
    const b = fy - gapV(t)
    // The two crests own the centre: as big as the room allows, symmetric
    // around the axis with a quiet VS between them.
    const cs = Math.min(400 * t.s, b - a - ng - nh, t.cw * 0.42)
    const gap = Math.max(px(t, 150), Math.min(t.cw - cs * 2, cs * 0.75))
    const by = a + Math.max(0, (b - a - cs - ng - nh) / 2)
    const hx = t.cx - gap / 2 - cs
    const ax = t.cx + gap / 2
    return {
      background: ink(),
      elements: [
        ...cinematic(t, 'stadium'),
        ...chrome(t),
        mainHead(t, '{headline}'),
        crestOf('home', hx, by, cs),
        crestOf('away', ax, by, cs),
        crestName(t, 'home', hx, by + cs + ng, cs, ns),
        crestName(t, 'away', ax, by + cs + ng, cs, ns),
        versus(t, t.cx, by + cs / 2, Math.min(px(t, 96), gap * 0.42)),
        footSupport(t, '{competition}  ·  {weekday} {time}', 1, 46, { name: 'Fecha y competición' }),
      ],
    }
  },
}

/** Small centered crest pair + match line: the context of a typographic slide (foot). */
function matchTag(t: TCtx, bottom: number, size = 72): { els: SlideElement[]; top: number } {
  const cs = px(t, size, 40)
  const gap = cs * 0.3
  const lh = px(t, 54, 32)
  const ly = bottom - lh
  const cy = ly - px(t, 16) - cs
  return {
    top: cy,
    els: [
      crestOf('home', t.cx - gap / 2 - cs, cy, cs, { name: 'Escudo local (pequeño)' }),
      crestOf('away', t.cx + gap / 2, cy, cs, { name: 'Escudo visitante (pequeño)' }),
      label(t, '{home.short} vs {away.short}  ·  {weekday} {time}', { y: ly, h: lh }, 40 * vk(t), { name: 'Partido', align: 'center', verticalAlign: 'middle', fill: { kind: 'solid', color: '$muted' } }),
    ],
  }
}

export const bigStatement: TemplateDef = {
  id: 'big-statement',
  number: 2,
  name: 'The Big Statement',
  category: 'match',
  description: 'Titular gigante a toda la pantalla, una palabra en acento, una frase de apoyo y el partido al pie.',
  build: (t) => {
    const k = vk(t)
    const tag = matchTag(t, t.contentBottom)
    // Support line just above the match tag, the giant claim from the shared
    // headline line down to it.
    const ss = 56 * Math.max(0.85, k)
    const subH = ss * t.s * 1.22 * (t.landscape ? 1 : 2) + px(t, 6)
    const subY = tag.top - px(t, 40) - subH
    const hy = t.contentTop
    const hb = subY - px(t, 48)
    const size = t.landscape ? 210 * k : 220 * k
    return {
      background: ink(),
      elements: [
        ...cinematic(t, 'spot'),
        ...chrome(t),
        hl(t, '{headline}', { y: hy, h: hb - hy }, size, { name: 'Titular gigante', lineHeight: LH }),
        support(t, '{subheadline}', { x: t.cx - Math.min(t.cw, 860 * t.s) / 2, y: subY, w: Math.min(t.cw, 860 * t.s), h: subH }, ss, { name: 'Subtítulo', align: 'center', verticalAlign: 'bottom' }),
        ...tag.els,
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
    const z = headZone(t)
    // 16:9: the three columns stay at a readable measure in the centre.
    const nw = t.landscape ? Math.min(t.cw, 1100) : t.cw
    const nx = t.cx - nw / 2
    const colW = nw / 3
    const zTop = z.end + gapV(t)
    const zBot = t.contentBottom - footH(t) - gapV(t)
    const g1 = px(t, 44)
    const g2 = px(t, 36)
    const ls = 46 * k
    const lh = ls * t.s * 1.3
    // Size crests and numbers to the room available (giant on stories).
    const room = zBot - zTop - (g1 + g2 + lh)
    const vs = Math.min(340 * k, colW * 1.15, (room * 0.56) / CAP)
    const cs = Math.min(230 * k, colW * 0.7, room * 0.4)
    const numH = vs * CAP
    const block = cs + g1 + numH + g2 + lh
    const by = zTop + Math.max(0, (zBot - zTop - block) / 2)
    const ny = by + cs + g1
    const ly = ny + numH + g2
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
        label(t, col.l, { x, y: ly, w: colW, h: lh }, ls, { name: `Etiqueta ${col.n}`, align: 'center', fill: { kind: 'solid', color: i === 0 ? '$text' : '$muted' } }),
      )
    })
    return {
      background: ink(),
      elements: [
        ...cinematic(t),
        ...chrome(t),
        mainHead(t, '{home.short} gana [[4]] de los últimos 9'),
        ...els,
        footLabel(t, 'Últimos 9 enfrentamientos oficiales'),
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
    // Break before the accent so the claim reads «HOY SE JUEGA / LA CHAMPIONS».
    const title = t.landscape ? 'Hoy se juega [[la Champions]]' : 'Hoy se juega\n[[la Champions]]'
    const z = headZone(t)
    // The date sits right under the claim (it belongs to it); the open list
    // fills the centre down to the safe line.
    const dh = px(t, 60)
    const dy = z.end + px(t, 8)
    const ly = dy + dh + px(t, 48)
    const room = t.contentBottom - ly
    // Rows stay ≥140px tall (names ≥40px): five on tall formats, fewer on short ones.
    const n = Math.max(3, Math.min(5, Math.floor(room / 140 + 0.2)))
    const rowH = Math.min(210 * t.s, room / (n - 0.2))
    // 16:9 keeps a comfortable measure; stories stay clear of the TikTok buttons.
    const lw = t.landscape ? Math.min(t.cw, 1100) : t.story ? t.cw - 72 : t.cw
    const lx = t.landscape ? t.cx - lw / 2 : t.left
    return {
      background: ink(),
      elements: [
        ...cinematic(t),
        ...chrome(t),
        mainHead(t, title),
        support(t, '{weekday}  ·  {date}', { y: dy, h: dh }, 46, { name: 'Fecha', align: 'center' }),
        E.matchList({ name: 'Agenda', x: lx, y: ly + Math.max(0, (room - rowH * (n - 0.2)) / 2), width: lw, height: rowH * n, rowHeight: rowH, maxItems: n, variant: 'editorial' }),
      ],
    }
  },
}

export const photoCover: TemplateDef = {
  id: 'photo-cover',
  number: 20,
  name: 'Photo Cover',
  category: 'match',
  description: 'Portada editorial con foto: sube la foto de un jugador o del estadio en el elemento «Foto» (también vale un PNG recortado). Sin foto, el escudo local entero se funde en negro bajo el titular y la portada sigue funcionando.',
  build: (t) => {
    const k = vk(t)
    const fs = 160 * k
    // Type at the foot of the content zone (a photo cover keeps its claim low,
    // over the picture; centered like every other headline).
    const ss = 50 * Math.max(0.85, k)
    const subH = ss * t.s * 1.22 * 2 + px(t, 6)
    const subY = t.contentBottom - subH
    const hb = subY - px(t, 28)
    // Landscape: a type column on the left (three lines), the visual owns the
    // right half.
    const hw = t.landscape ? t.cw * 0.5 : t.cw
    const hy = t.landscape ? t.contentTop : hb - px(t, 420)
    // Photo: full bleed from the top, fading into black behind the type.
    // Landscape splits the frame: type on black at the left, photo on the right.
    const ih = t.landscape ? t.H : t.H * 0.76
    const ix = t.landscape ? t.W * 0.36 : 0
    const fade = t.landscape ? 0.2 : 0.35
    const fadeTop = ih * (1 - fade)
    // Where the photo is already fading, the crest below it must be black
    // (no ghosting through a faded or cut-out photo).
    const clearBy = fadeTop + (ih - fadeTop) * 0.25
    const textTop = hb - fs * t.s * LH * 2
    // Fallback visual (also the backdrop of a cut-out PNG): the whole home
    // crest as the cover image, crisp, slightly darkened and dissolving into
    // black just above the headline, like the photo would. An opaque photo
    // covers it completely.
    let cs: number
    let cx: number
    let cy: number
    let fadeFrom: number
    let fadeTo: number
    if (t.landscape) {
      const ax = t.left + hw + px(t, 60)
      const ar = t.right + px(t, 60)
      cs = Math.min(t.ch * 0.86, ar - ax)
      cx = (ax + ar - cs) / 2
      cy = t.contentTop + (t.ch - cs) / 2
      fadeTo = clearBy
      fadeFrom = Math.min(fadeTo - px(t, 40), Math.max(cy + cs * 0.6, fadeTop - px(t, 40)))
    } else {
      cy = t.contentTop + px(t, 16)
      // Fully black just before the headline.
      fadeTo = Math.min(textTop - px(t, 24), clearBy)
      cs = Math.min(t.cw * 0.9, (fadeTo - cy) / 0.9)
      cx = t.cx - cs / 2
      fadeFrom = cy + cs * 0.6
    }
    // Reading scrim above photo and crest: clear at the top, ≈85 % black where
    // a two-line headline starts, solid below it, so white type always reads.
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
          fill: { kind: 'linear', angle: 90, stops: [{ offset: 0, color: '$bg', opacity: 1 }, { offset: 0.36, color: '$bg', opacity: 1 }, { offset: 0.47, color: '$bg', opacity: 0.7 }, { offset: 0.56, color: '$bg', opacity: 0 }] },
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
    const dimTop = 0.18
    return {
      // Full-bleed photo: flat black underneath (the picture gives the depth).
      background: inkFlat(),
      elements: [
        ...cinematic(t, 'grain'),
        crestOf('home', cx, cy, cs, { name: 'Escudo de fondo' }),
        // Tones the crest down a touch and dissolves its lower part into black.
        E.shape({
          name: 'Atenuado escudo',
          shape: 'rect',
          x: 0,
          y: 0,
          width: t.W,
          height: t.H,
          cornerRadius: 0,
          locked: true,
          fill: { kind: 'linear', angle: 180, stops: [{ offset: 0, color: '$bg', opacity: dimTop }, { offset: fadeFrom / t.H, color: '$bg', opacity: dimTop }, { offset: fadeTo / t.H, color: '$bg', opacity: 1 }, { offset: 1, color: '$bg', opacity: 1 }] },
        }),
        E.image({ name: 'Foto', x: ix, y: 0, width: t.W - ix, height: ih, fit: 'cover', focusX: 0.5, focusY: 0.3, fadeBottom: fade }),
        scrim,
        // Soft shade at the top so the signature reads on a bright photo.
        ...(t.landscape
          ? []
          : [
              E.shape({
                name: 'Sombra superior',
                shape: 'rect',
                x: 0,
                y: 0,
                width: t.W,
                height: t.top + px(t, 220),
                cornerRadius: 0,
                locked: true,
                fill: { kind: 'linear', angle: 180, stops: [{ offset: 0, color: '$bg', opacity: 0.55 }, { offset: 0.55, color: '$bg', opacity: 0.25 }, { offset: 1, color: '$bg', opacity: 0 }] },
              }),
            ]),
        // Photo cover: the signature stays, the page number is dropped.
        signature(t),
        hl(t, '{headline}', { y: hy, w: hw, h: hb - hy }, fs, { verticalAlign: 'bottom', lineHeight: LH }),
        support(t, '{subheadline}', { y: subY, w: hw, h: subH }, ss, { name: 'Apoyo', align: 'center' }),
      ],
    }
  },
}

export const MATCH_TEMPLATES = [matchdayElite, bigStatement, headToHead, matchdayAgenda, photoCover]
