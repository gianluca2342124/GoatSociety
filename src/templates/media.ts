// ════════════════════════════════════════════════════════════════════════════
// GOAT EDITORIAL · Noticias (26–34)
// Photo-led football media posts. A full-bleed (or framed) photo in «Foto»,
// a strong black reading shadow so white type reads over bright, busy
// pictures, the message centered over the lower area, one accent.
//
// 3:4, 9:16, 4:5 and 1:1: full-bleed photo, text stack anchored at the foot
// of the content zone. 16:9: the photo owns the right side and fades into
// black; the same stack sits centered in the left column.
//
// Every template also works WITHOUT a photo (an empty image exports as
// nothing): a fallback layer — dimmed crest, ghost shirt number, team tint —
// sits UNDER the photo and is completely covered once a picture is uploaded.
// A cut-out PNG keeps that layer as its backdrop.
// ════════════════════════════════════════════════════════════════════════════
import * as E from '../model/elements'
import type { BadgeElement, Fill, ImageElement, MatchData, ShapeElement, SlideElement, TextElement } from '../model/types'
import type { TemplateDef } from './types'
import type { TCtx } from './kit'
import { chrome, cinematic, crestOf, hl, inkFlat, label, px, support, text } from './kit'

type Side = 'home' | 'away'
type Box = { x: number; y: number; w: number; h: number }

/** Vertical type factor: 1 on story / 3:4 / 4:5, ≈0.85 on square and landscape. */
const vk = (t: TCtx) => Math.min(1, t.v + 0.18)

/** Headline leading: accented capitals (Á, Í, Ú) clear the line above. */
const LH = 1.1

/** Box height for `n` headline lines at story size `size`. */
const hlH = (t: TCtx, size: number, n: number, lh = LH) => size * t.s * lh * n + 6

const clamp01 = (v: number) => Math.min(1, Math.max(0, v))

const full = (t: TCtx): Box => ({ x: 0, y: 0, w: t.W, h: t.H })

// ── Frame: where the text column and the photo live ─────────────────────────

interface Frame {
  /** Text column. */
  x: number
  w: number
  cx: number
  /** 16:9 split (photo right, text left) instead of full bleed. */
  split: boolean
  photo: Box
}

/** Full content column with a full-bleed photo. */
const fullFrame = (t: TCtx): Frame => ({ x: t.left, w: t.cw, cx: t.cx, split: false, photo: full(t) })

function frame(t: TCtx): Frame {
  if (!t.landscape) return fullFrame(t)
  // The kit's 16:9 column is centered (1240 wide); the split uses the real
  // 110 px side margin so the text column gets half the frame.
  const m = 110
  const x0 = Math.round(t.W * 0.44)
  const w = Math.round(t.W * 0.5) - m
  return { x: m, w, cx: m + w / 2, split: true, photo: { x: x0, y: 0, w: t.W - x0, h: t.H } }
}

/** Top of a text stack of height `h`: anchored at the foot of the content zone, centered in the 16:9 column. */
function stackTop(t: TCtx, f: Frame, h: number): number {
  return f.split ? t.contentTop + Math.max(0, (t.ch - h) / 2) : t.contentBottom - h
}

// ── Line estimate (Anton advance widths, em) ────────────────────────────────
// Lets the headline box hold exactly the lines the default copy needs in each
// format, so the tag above it never floats over an empty line.
const ANTON: Record<string, number> = { ' ': 0.23, I: 0.23, Í: 0.23, '.': 0.23, ',': 0.24, '!': 0.23, '¡': 0.23, ':': 0.24, "'": 0.21, E: 0.41, É: 0.41, F: 0.4, L: 0.4, T: 0.4, Z: 0.41, Y: 0.45, M: 0.75, W: 0.71, '1': 0.33, '-': 0.31, '%': 1.06 }
const antonW = (s: string) => [...s.toLocaleUpperCase('es-ES')].reduce((a, c) => a + (ANTON[c] ?? 0.48), 0)

function resolve(s: string, m: MatchData): string {
  return s
    .replace(/\{headline\}/g, m.headline)
    .replace(/\{subheadline\}/g, m.subheadline)
    .replace(/\{competition\}/g, m.competition)
    .replace(/\{(home|away)(\.short)?\}/g, (_, side: Side, short?: string) => (short ? m[side].shortName || m[side].name : m[side].name))
    .replace(/\[\[|\]\]/g, '')
}

/** Lines Anton needs for `content` at `fs` px in `width` (greedy wrap, like the renderer), clamped. */
function lines(content: string, m: MatchData, fs: number, width: number, min: number, max: number): number {
  let n = 0
  for (const para of resolve(content, m).split('\n')) {
    n++
    let cur = 0
    for (const word of para.split(/\s+/).filter(Boolean)) {
      const w = antonW(word) * fs
      if (cur === 0) cur = w
      else if (cur + 0.23 * fs + w <= width * 0.98) cur += 0.23 * fs + w
      else {
        n++
        cur = w
      }
    }
  }
  return Math.min(max, Math.max(min, n))
}

// ── Photo, reading shadows and the no-photo fallback ────────────────────────

/** The photo slot. Always named «Foto» (the editor and the upload flow look for it). */
function foto(t: TCtx, box: Box = full(t), p: Partial<ImageElement> = {}): ImageElement {
  return E.image({ name: 'Foto', x: box.x, y: box.y, width: box.w, height: box.h, fit: 'cover', focusX: 0.5, focusY: 0.3, fadeBottom: 0, ...p })
}

function layer(name: string, box: Box, fill: Fill): ShapeElement {
  return E.shape({ name, shape: 'rect', x: box.x, y: box.y, width: box.w, height: box.h, cornerRadius: 0, locked: true, fill })
}

/**
 * Bottom reading shadow: clear at the top, easing to ≈88 % black where the
 * text starts (`textTop`) and solid black under the text, so white type reads
 * even over a white shirt or a sunny sky. `reach` = length of the ramp.
 */
function shade(t: TCtx, textTop: number, area: Box = full(t), reach = 440): ShapeElement {
  // A few px past the photo edge, so its anti-aliased last row never shows.
  const y1 = Math.min(t.H + 2, area.y + area.h + 4)
  const s0 = Math.max(area.y + area.h * 0.06, textTop - px(t, reach))
  const h = y1 - s0
  const at = (y: number) => clamp01((y - s0) / h)
  const ramp = (f: number) => at(s0 + (textTop - s0) * f)
  return layer('Sombra de lectura', { x: area.x, y: s0, w: area.w, h }, {
    kind: 'linear',
    angle: 180,
    stops: [
      { offset: 0, color: '$bg', opacity: 0 },
      { offset: ramp(0.3), color: '$bg', opacity: 0.16 },
      { offset: ramp(0.62), color: '$bg', opacity: 0.46 },
      { offset: ramp(0.85), color: '$bg', opacity: 0.72 },
      { offset: at(textTop), color: '$bg', opacity: 0.88 },
      { offset: at(textTop + px(t, 200)), color: '$bg', opacity: 0.97 },
      { offset: 1, color: '$bg', opacity: 1 },
    ],
  })
}

/** 16:9: the photo's left side dissolves into the black text column. */
function shadeSide(t: TCtx, f: Frame, share = 0.55): ShapeElement {
  const w = f.photo.w * share
  return layer('Sombra de lectura', { x: f.photo.x - 2, y: 0, w: w + 2, h: t.H }, {
    kind: 'linear',
    angle: 90,
    stops: [
      { offset: 0, color: '$bg', opacity: 1 },
      { offset: 0.3, color: '$bg', opacity: 0.86 },
      { offset: 0.62, color: '$bg', opacity: 0.42 },
      { offset: 1, color: '$bg', opacity: 0 },
    ],
  })
}

/** Top shadow: keeps the white signature and the page number readable over a bright sky. */
function shadeTop(t: TCtx, x = 0, w = t.W): ShapeElement {
  const h = t.top + px(t, 320)
  const sig = clamp01((t.top + px(t, 50)) / h)
  return layer('Sombra superior', { x, y: 0, w, h }, {
    kind: 'linear',
    angle: 180,
    stops: [
      { offset: 0, color: '$bg', opacity: 0.72 },
      { offset: sig, color: '$bg', opacity: 0.58 },
      { offset: Math.min(1, sig + (1 - sig) * 0.5), color: '$bg', opacity: 0.22 },
      { offset: 1, color: '$bg', opacity: 0 },
    ],
  })
}

/** No-photo backdrop: a soft radial lift (team color or white), hidden by any photo. */
function tint(box: Box, color: string, opacity: number, cx = 0.5, cy = 0.3, radius = 0.72): ShapeElement {
  return layer('Fondo sin foto', box, { kind: 'radial', cx, cy, radius, stops: [{ offset: 0, color, opacity }, { offset: 0.55, color, opacity: opacity * 0.35 }, { offset: 1, color, opacity: 0 }] })
}

/** Oversized, dimmed crest (no-photo fallback). Kept inside the canvas tolerance. */
function ghostCrest(t: TCtx, side: Side, cx: number, cy: number, size: number, opacity = 0.2, name = 'Escudo de fondo'): SlideElement {
  const s = Math.min(size, t.W * 1.16, (t.H + 2 - cy) * 2)
  const x = Math.min(Math.max(cx - s / 2, -t.W * 0.08), t.W * 1.08 - s)
  return crestOf(side, x, cy - s / 2, s, { name, opacity })
}

/** Fallback tint where the photo would be. */
function heroTint(t: TCtx, f: Frame, color: string, opacity: number): ShapeElement {
  return f.split ? tint(f.photo, color, opacity, 0.56, 0.5, 0.7) : tint(full(t), color, opacity, 0.5, 0.2)
}

/** Fallback crest: above the text on tall formats (bleeding off the top), centered in the photo area on 16:9. */
function heroCrest(t: TCtx, f: Frame, side: Side, textTop: number, opacity = 0.2, name?: string): SlideElement {
  if (f.split) return ghostCrest(t, side, f.photo.x + f.photo.w * 0.56, t.H / 2, Math.min(f.photo.w * 0.78, t.H * 0.84), opacity, name)
  return ghostCrest(t, side, t.cx, textTop * 0.46, Math.min(t.W * 0.96, textTop * 1.3), opacity, name)
}

/** Standard stack: fallback → photo → shadows → signature (+ page number). */
function photoBase(t: TCtx, f: Frame, fallback: SlideElement[], textTop: number): SlideElement[] {
  const shadows = f.split ? [shadeSide(t, f), shadeTop(t, f.photo.x, f.photo.w)] : [shadeTop(t), shade(t, textTop)]
  return [...cinematic(t, 'grain'), ...fallback, foto(t, f.photo), ...shadows, ...chrome(t)]
}

// ── Type ────────────────────────────────────────────────────────────────────

type TBox = { x?: number; y: number; w?: number; h: number }

/** Main headline: centered, metallic, bottom-anchored on the text stack. */
function head(t: TCtx, content: string, box: TBox, size: number, p: Partial<TextElement> = {}): TextElement {
  return hl(t, content, box, size, { lineHeight: LH, verticalAlign: 'bottom', ...p })
}

/** Centered support line. */
function line(t: TCtx, content: string, box: TBox, size: number, p: Partial<TextElement> = {}): TextElement {
  return support(t, content, box, size, { align: 'center', ...p })
}

/** Centered Barlow line (names, labels, the time-out line). */
function lbl(t: TCtx, content: string, box: TBox, size: number, p: Partial<TextElement> = {}): TextElement {
  return label(t, content, box, size, { align: 'center', ...p })
}

/** Centered tag (ÚLTIMA HORA, FINAL, BAJA). Height = the painted tag. */
function tag(t: TCtx, f: Frame, content: string, y: number, size: number, p: Partial<BadgeElement> = {}): BadgeElement {
  const fs = size * t.s
  return E.badge({ name: 'Etiqueta', text: content, style: 'solid', icon: 'none', color: '$accent', textColor: '$text', font: '$label', fontSize: fs, radius: 6, x: f.x, y, width: f.w, height: fs * 2.15, align: 'center', ...p })
}
const tagH = (t: TCtx, size: number) => size * t.s * 2.15

/** Anton line in the accent (¡ES OFICIAL!, giant numbers). */
function accentLine(t: TCtx, content: string, box: TBox, fs: number, p: Partial<TextElement> = {}): TextElement {
  return text(t, content, box, {
    name: 'Anuncio',
    fontFamily: '$headline',
    fontSize: fs,
    fontWeight: 400,
    lineHeight: 1,
    letterSpacing: 0,
    uppercase: true,
    align: 'center',
    verticalAlign: 'bottom',
    fill: { kind: 'solid', color: '$accent' },
    accentColor: '$text',
    effect: 'none',
    autoFit: true,
    minFontSize: Math.min(fs, Math.max(32, fs * 0.5)),
    ...p,
  })
}

const white = { kind: 'solid' as const, color: '$text' }

// ── 26 · Última hora ────────────────────────────────────────────────────────
export const breakingNews: TemplateDef = {
  id: 'breaking-news',
  number: 26,
  name: 'Última hora',
  category: 'media',
  description:
    'Última hora a pantalla completa: sube una foto en el elemento «Foto». Sombra negra fuerte abajo, etiqueta «ÚLTIMA HORA» en rojo, titular enorme y una línea de apoyo. Sin foto, el escudo atenuado sostiene la portada.',
  build: (t, m) => {
    const f = frame(t)
    const k = vk(t)
    const hs = 160 * k
    const copy = 'Laurent renueva hasta [[2030]]'
    const hh = hlH(t, hs, lines(copy, m, hs * t.s, f.w, 2, 3))
    const ss = 46 * Math.max(0.88, k)
    const sh = ss * t.s * 1.22 * 2
    const bs = 40 * k
    const bh = tagH(t, bs)
    const g1 = px(t, 30)
    const g2 = px(t, 24)
    const by = stackTop(t, f, bh + g1 + hh + g2 + sh)
    const hy = by + bh + g1
    const sy = hy + hh + g2
    const col = { x: f.x, w: f.w }
    return {
      background: inkFlat(),
      accent: '$red',
      elements: [
        ...photoBase(t, f, [heroTint(t, f, '#FFFFFF', 0.07), heroCrest(t, f, 'home', by, 0.2)], hy),
        tag(t, f, 'Última hora', by, bs, { name: 'Etiqueta última hora', icon: 'bolt' }),
        head(t, copy, { ...col, y: hy, h: hh }, hs),
        line(t, 'El {home.short} lo ha confirmado hace unos minutos.', { ...col, y: sy, h: sh }, ss),
      ],
    }
  },
}

// ── 27 · Resultado ──────────────────────────────────────────────────────────
export const resultPost: TemplateDef = {
  id: 'result-post',
  number: 27,
  name: 'Resultado',
  category: 'media',
  description:
    'Resultado final sobre foto: sube una foto del partido en el elemento «Foto». Marcador enorme enlazado al resultado del partido, etiqueta «FINAL» y un titular corto. Sin foto, los dos escudos atenuados enmarcan el marcador.',
  build: (t, m) => {
    const f = frame(t)
    const k = vk(t)
    const hs = 124 * k
    const copy = 'El {home.short} gana\nel [[duelo]]'
    const hh = hlH(t, hs, lines(copy, m, hs * t.s, f.w, 1, 3))
    const sbW = Math.min(f.w, 920 * t.s)
    const sbH = px(t, 330)
    const bs = 38 * k
    const bh = tagH(t, bs)
    const g1 = px(t, 28)
    const g2 = px(t, 40)
    const by = stackTop(t, f, bh + g1 + sbH + g2 + hh)
    const sby = by + bh + g1
    const hy = sby + sbH + g2
    const fallback: SlideElement[] = [heroTint(t, f, '#FFFFFF', 0.06)]
    if (f.split) {
      const cs = Math.min(f.photo.w * 0.46, t.H * 0.6)
      fallback.push(
        ghostCrest(t, 'home', f.photo.x + f.photo.w * 0.42, t.H * 0.5, cs, 0.17, 'Escudo local de fondo'),
        ghostCrest(t, 'away', f.photo.x + f.photo.w * 0.86, t.H * 0.5, cs, 0.17, 'Escudo visitante de fondo'),
      )
    } else {
      const cs = Math.min(t.W * 0.62, by * 1.05)
      fallback.push(ghostCrest(t, 'home', 0, by * 0.48, cs, 0.17, 'Escudo local de fondo'), ghostCrest(t, 'away', t.W, by * 0.48, cs, 0.17, 'Escudo visitante de fondo'))
    }
    return {
      background: inkFlat(),
      elements: [
        ...photoBase(t, f, fallback, sby),
        tag(t, f, 'Final', by, bs, { name: 'Etiqueta final' }),
        E.scoreboard({ name: 'Marcador', x: f.cx - sbW / 2, y: sby, width: sbW, height: sbH, layout: 'row', showCrests: true, showNames: true, showNote: false, highlightWinner: true, scoreSize: 270 * k }),
        head(t, copy, { x: f.x, w: f.w, y: hy, h: hh }, hs),
      ],
    }
  },
}

// ── 28 · Cita ───────────────────────────────────────────────────────────────
export const quoteCard: TemplateDef = {
  id: 'quote-card',
  number: 28,
  name: 'Cita',
  category: 'media',
  description:
    'Una frase con autor: sube la foto de quien habla en el elemento «Foto». Comillas grandes en el acento, la cita centrada a gran tamaño y nombre y cargo debajo. Sin foto, el escudo atenuado del equipo hace de fondo.',
  build: (t, m) => {
    const f = frame(t)
    const k = vk(t)
    const qs = (f.split ? 112 : 128) * k
    const copy = 'Venimos a [[ganar]].\nEn París no vale\notra cosa'
    const qh = hlH(t, qs, lines(copy, m, qs * t.s, f.w, 2, 4))
    const ns = 50 * k
    const rs = 38 * k
    const nh = ns * t.s * 1.2
    const rh = rs * t.s * 1.3
    // Heavy quote mark (Archivo Black): the glyph fills ≈0.155–0.515 em of a 1 em line.
    const ms = 400 * k * t.s
    const mv = ms * 0.36
    const g1 = px(t, 18)
    const g2 = px(t, 44)
    const g3 = px(t, 6)
    const markTop = stackTop(t, f, mv + g1 + qh + g2 + nh + g3 + rh)
    const qy = markTop + mv + g1
    const ny = qy + qh + g2
    const ry = ny + nh + g3
    const col = { x: f.x, w: f.w }
    return {
      background: inkFlat(),
      elements: [
        ...photoBase(t, f, [heroTint(t, f, '$home', 0.5), heroCrest(t, f, 'home', markTop, 0.16)], markTop),
        text(t, '“', { ...col, y: markTop - ms * 0.155, h: ms * 0.6 }, {
          name: 'Comillas',
          fontFamily: '$display',
          fontSize: ms,
          fontWeight: 400,
          lineHeight: 1,
          letterSpacing: 0,
          uppercase: false,
          align: 'center',
          verticalAlign: 'top',
          fill: { kind: 'solid', color: '$accent' },
          autoFit: false,
        }),
        head(t, copy, { ...col, y: qy, h: qh }, qs, { name: 'Cita' }),
        lbl(t, 'M. Laurent', { ...col, y: ny, h: nh }, ns, { name: 'Autor', fontWeight: 700, fill: white }),
        lbl(t, 'Capitán del {home.short}', { ...col, y: ry, h: rh }, rs, { name: 'Cargo' }),
      ],
    }
  },
}

// ── 29 · Fichaje ────────────────────────────────────────────────────────────
export const transferNews: TemplateDef = {
  id: 'transfer-news',
  number: 29,
  name: 'Fichaje',
  category: 'media',
  description:
    'Anuncio de fichaje: sube la foto del jugador en el elemento «Foto». «¡ES OFICIAL!» en el acento (o «ACUERDO CERRADO»), el nombre enorme, de qué club a qué club con sus escudos y una línea con el contrato. Sin foto, el escudo del club de destino atenuado llena el hueco de la foto.',
  build: (t) => {
    const f = frame(t)
    const k = vk(t)
    const os = 100 * k * t.s
    const oh = os * 1.02
    const ns = 184 * k
    const nh = hlH(t, ns, 1)
    // From → to: two crests with their names, an arrow between them.
    const cs = px(t, 136, 64)
    const ls = 40 * k
    const lh = ls * t.s * 1.2
    const lg = px(t, 14)
    const rowH = cs + lg + lh
    const ss = 44 * Math.max(0.88, k)
    const sh = ss * t.s * 1.3
    const g0 = px(t, 4)
    const g1 = px(t, 36)
    const g2 = px(t, 40)
    const oy = stackTop(t, f, oh + g0 + nh + g1 + rowH + g2 + sh)
    const nyy = oy + oh + g0
    const ry = nyy + nh + g1
    const sy = ry + rowH + g2
    const d = Math.min(f.w * 0.25, px(t, 200))
    const as = px(t, 56, 30)
    const nameBox = (cx: number) => ({ x: cx - d * 0.95, y: ry + cs + lg, w: d * 1.9, h: lh })
    const col = { x: f.x, w: f.w }
    return {
      background: inkFlat(),
      elements: [
        ...photoBase(t, f, [heroTint(t, f, '$home', 0.55), heroCrest(t, f, 'home', oy, 0.2, 'Escudo de destino (fondo)')], oy),
        accentLine(t, '¡Es oficial!', { ...col, y: oy, h: oh }, os, { name: 'Anuncio' }),
        head(t, 'L. Ferrer', { ...col, y: nyy, h: nh }, ns, { name: 'Jugador' }),
        crestOf('away', f.cx - d - cs / 2, ry, cs, { name: 'Escudo de origen' }),
        E.icon({ name: 'Flecha', icon: 'arrowRight', x: f.cx - as / 2, y: ry + (cs - as) / 2, width: as, height: as, color: '$accent', strokeWidth: 2.6 }),
        crestOf('home', f.cx + d - cs / 2, ry, cs, { name: 'Escudo de destino' }),
        lbl(t, '{away.short}', nameBox(f.cx - d), ls, { name: 'Club de origen' }),
        lbl(t, '{home.short}', nameBox(f.cx + d), ls, { name: 'Club de destino', fontWeight: 700, fill: white }),
        line(t, 'Contrato hasta 2030  ·  Traspaso de 60 M€', { ...col, y: sy, h: sh }, ss, { name: 'Contrato' }),
      ],
    }
  },
}

// ── 30 · Parte médico ───────────────────────────────────────────────────────
export const injuryUpdate: TemplateDef = {
  id: 'injury-update',
  number: 30,
  name: 'Parte médico',
  category: 'media',
  description:
    'Baja por lesión: sube la foto del jugador en el elemento «Foto». Etiqueta «BAJA» en rojo, el nombre enorme, el tiempo de baja y el tipo de lesión. Sin foto, el escudo atenuado del equipo mantiene la composición.',
  build: (t) => {
    const f = frame(t)
    const k = vk(t)
    const bs = 40 * k
    const bh = tagH(t, bs)
    const ns = 184 * k
    const nh = hlH(t, ns, 1)
    const ts = 66 * k
    const th = ts * t.s * 1.15
    const ss = 44 * Math.max(0.88, k)
    const sh = ss * t.s * 1.3
    const g1 = px(t, 30)
    const g2 = px(t, 20)
    const g3 = px(t, 18)
    const by = stackTop(t, f, bh + g1 + nh + g2 + th + g3 + sh)
    const nyy = by + bh + g1
    const ty = nyy + nh + g2
    const sy = ty + th + g3
    const col = { x: f.x, w: f.w }
    return {
      background: inkFlat(),
      accent: '$red',
      elements: [
        ...photoBase(t, f, [heroTint(t, f, '#FFFFFF', 0.06), heroCrest(t, f, 'home', by, 0.16)], nyy),
        tag(t, f, 'Baja', by, bs, { name: 'Etiqueta baja' }),
        head(t, 'T. Moreau', { ...col, y: nyy, h: nh }, ns, { name: 'Jugador' }),
        lbl(t, '[[Tres semanas]] fuera', { ...col, y: ty, h: th }, ts, { name: 'Tiempo de baja', fontWeight: 700, fill: white }),
        line(t, 'Lesión muscular  ·  {home.short}', { ...col, y: sy, h: sh }, ss, { name: 'Lesión' }),
      ],
    }
  },
}

// ── 31 · Dato viral ─────────────────────────────────────────────────────────
export const viralStat: TemplateDef = {
  id: 'viral-stat',
  number: 31,
  name: 'Dato viral',
  category: 'media',
  description:
    'Un dato que se comparte solo: sube una foto en el elemento «Foto». Un número gigante en el acento y una sola línea que lo explica. Sin foto, el escudo atenuado queda detrás de la cifra.',
  build: (t) => {
    const f = frame(t)
    const k = vk(t)
    // Giant number: Anton digits fill ≈0.08–0.82 em of a 0.9 em box.
    const vs = (f.split ? 400 : 430) * k * t.s
    const vh = vs * 0.9
    const ls = 66 * k
    const lh = ls * t.s * 1.15
    const fs = 34 * Math.max(0.88, k)
    const fh = fs * t.s * 1.3
    const g1 = px(t, 8)
    const g2 = px(t, 26)
    const vy = stackTop(t, f, vh + g1 + lh + g2 + fh)
    const ly = vy + vh + g1
    const fy = ly + lh + g2
    const textTop = vy + vs * 0.08
    const col = { x: f.x, w: f.w }
    return {
      background: inkFlat(),
      elements: [
        ...photoBase(t, f, [heroTint(t, f, '#FFFFFF', 0.07), heroCrest(t, f, 'home', textTop, 0.18)], textTop),
        accentLine(t, '41', { ...col, y: vy, h: vh }, vs, { name: 'Cifra', lineHeight: 0.9, verticalAlign: 'top', effect: 'metallic' }),
        lbl(t, 'Goles de [[Laurent]] en 2026', { ...col, y: ly, h: lh }, ls, { name: 'Dato', fontWeight: 700, fill: white, accentColor: '$accent' }),
        lbl(t, 'Más que nadie en las cinco grandes ligas', { ...col, y: fy, h: fh }, fs, { name: 'Fuente', fill: { kind: 'solid', color: '$muted' } }),
      ],
    }
  },
}

// ── 32 · Resumen ────────────────────────────────────────────────────────────
export const scoreRecap: TemplateDef = {
  id: 'score-recap',
  number: 32,
  name: 'Resumen',
  category: 'media',
  description:
    'Resumen del partido: marcador enlazado al resultado, goleadores con su minuto y una franja de foto arriba (sube la foto en el elemento «Foto»; es opcional). Sin foto, la franja muestra los colores de los dos equipos.',
  build: (t) => {
    const k = vk(t)
    const bs = 36 * k
    const bh = tagH(t, bs)
    const sbW = Math.min(t.cw, 920 * t.s)
    const sbH = px(t, 320)
    const gs = 46 * k
    const gl = gs * t.s * 1.3
    const gh = gl * 2
    const ss = 40 * Math.max(0.88, k)
    const sh = ss * t.s * 1.3
    const g1 = px(t, 24)
    const g2 = px(t, 36)
    const g3 = px(t, 40)
    const by = t.contentBottom - (bh + g1 + sbH + g2 + gh + g3 + sh)
    const sby = by + bh + g1
    const gy = sby + sbH + g2
    const sy = gy + gh + g3
    // Photo strip: from the top edge to just under the tag, fading to black.
    const stripH = Math.min(t.H * 0.66, by + px(t, 230))
    const strip: Box = { x: 0, y: 0, w: t.W, h: stripH }
    const crest = Math.min(t.W * 0.5, stripH * 1.05)
    // Scorers: home right-aligned, away left-aligned, around the centre axis.
    const gap = px(t, 36)
    const colW = Math.min(t.cw, sbW + px(t, 80)) / 2 - gap
    const scorer = (side: Side, content: string): TextElement =>
      lbl(t, content, { x: side === 'home' ? t.cx - gap - colW : t.cx + gap, y: gy, w: colW, h: gh }, gs, {
        name: side === 'home' ? 'Goleadores local' : 'Goleadores visitante',
        align: side === 'home' ? 'right' : 'left',
        lineHeight: 1.3,
        fontWeight: 600,
        fill: white,
      })
    const is = px(t, 34, 22)
    return {
      background: inkFlat(),
      elements: [
        ...cinematic(t, 'grain'),
        layer('Fondo sin foto', strip, { kind: 'linear', angle: 90, stops: [{ offset: 0, color: '$home', opacity: 0.55 }, { offset: 0.5, color: '$bg', opacity: 0 }, { offset: 1, color: '$away', opacity: 0.55 }] }),
        ghostCrest(t, 'home', t.W * 0.14, stripH * 0.46, crest, 0.14, 'Escudo local de fondo'),
        ghostCrest(t, 'away', t.W * 0.86, stripH * 0.46, crest, 0.14, 'Escudo visitante de fondo'),
        foto(t, strip, { focusY: 0.35 }),
        shadeTop(t),
        shade(t, by, strip, 420),
        ...chrome(t),
        tag(t, fullFrame(t), 'Final', by, bs, { name: 'Etiqueta final', style: 'outline' }),
        E.scoreboard({ name: 'Marcador', x: t.cx - sbW / 2, y: sby, width: sbW, height: sbH, layout: 'row', showCrests: true, showNames: true, showNote: false, highlightWinner: true, scoreSize: 260 * k }),
        E.icon({ name: 'Balón', icon: 'ball', x: t.cx - is / 2, y: gy + (gl - is) / 2, width: is, height: is, color: '$muted', strokeWidth: 2 }),
        scorer('home', "M. Laurent  23'\nA. Duval  67'"),
        scorer('away', "L. Ferrer  81'"),
        line(t, '{competition}  ·  {stage}  ·  {venue}', { y: sy, h: sh }, ss, { name: 'Partido' }),
      ],
    }
  },
}

// ── 33 · Titular ────────────────────────────────────────────────────────────
export const newsHeadline: TemplateDef = {
  id: 'news-headline',
  number: 33,
  name: 'Titular',
  category: 'media',
  description:
    'Noticia limpia: foto arriba (sube la foto en el elemento «Foto») y debajo, sobre negro, la competición, el titular del partido y una línea de apoyo. Sin foto, el escudo atenuado sobre el color del equipo ocupa el marco.',
  build: (t, m) => {
    const f = frame(t)
    const k = vk(t)
    const hs = 132 * k
    const copy = '{headline}'
    const hh = hlH(t, hs, lines(copy, m, hs * t.s, f.w, 1, 3))
    const ks = 40 * k
    const kh = ks * t.s * 1.25
    const ss = 46 * Math.max(0.88, k)
    const sh = ss * t.s * 1.22 * 2
    const g1 = px(t, 22)
    const g2 = px(t, 28)
    const ky = stackTop(t, f, kh + g1 + hh + g2 + sh)
    const hy = ky + kh + g1
    const sy = hy + hh + g2
    const col = { x: f.x, w: f.w }
    const type: SlideElement[] = [
      lbl(t, '{competition}', { ...col, y: ky, h: kh }, ks, { name: 'Antetítulo', fontWeight: 700, fill: { kind: 'solid', color: '$accent' } }),
      head(t, copy, { ...col, y: hy, h: hh }, hs),
      line(t, '{subheadline}', { ...col, y: sy, h: sh }, ss),
    ]
    if (f.split) {
      // The photo keeps a crisp frame: only a short fade toward the text column.
      return {
        background: inkFlat(),
        elements: [
          ...cinematic(t, 'grain'),
          tint(f.photo, '$home', 0.6, 0.5, 0.5, 0.8),
          ghostCrest(t, 'home', f.photo.x + f.photo.w * 0.55, t.H / 2, Math.min(f.photo.w * 0.7, t.H * 0.72), 0.22),
          foto(t, f.photo),
          shadeSide(t, f, 0.3),
          shadeTop(t, f.photo.x, f.photo.w),
          ...chrome(t),
          ...type,
        ],
      }
    }
    // Framed photo: full width from the top edge, ending above the kicker.
    const ph = ky - px(t, 40)
    const photo: Box = { x: 0, y: 0, w: t.W, h: ph }
    return {
      background: inkFlat(),
      elements: [
        ...cinematic(t, 'grain'),
        tint(photo, '$home', 0.6, 0.5, 0.42, 0.75),
        ghostCrest(t, 'home', t.cx, t.top + (ph - t.top) * 0.5, Math.min(t.cw * 0.86, ph * 0.78), 0.22),
        foto(t, photo),
        layer('Sombra de lectura', { x: 0, y: ph * 0.62, w: t.W, h: ph * 0.38 + 4 }, { kind: 'linear', angle: 180, stops: [{ offset: 0, color: '$bg', opacity: 0 }, { offset: 0.55, color: '$bg', opacity: 0.5 }, { offset: 1, color: '$bg', opacity: 1 }] }),
        shadeTop(t),
        ...chrome(t),
        ...type,
      ],
    }
  },
}

// ── 34 · Jugador ────────────────────────────────────────────────────────────
export const playerSpotlight: TemplateDef = {
  id: 'player-spotlight',
  number: 34,
  name: 'Jugador',
  category: 'media',
  description:
    'Foco en un jugador: sube su foto en el elemento «Foto». Nombre enorme y una fila con tres datos clave (el primero en el acento). Sin foto, su dorsal gigante en contorno hace de imagen.',
  build: (t) => {
    const f = frame(t)
    const k = vk(t)
    const ks = 42 * k
    const kh = ks * t.s * 1.25
    const ns = 196 * k
    const nh = hlH(t, ns, 1)
    // Stats row: value (Anton) over a label (Barlow).
    const vs = 124 * k * t.s
    const vh = vs * 0.9
    const ls = 34 * k
    const lh = ls * t.s * 1.25
    const lg = px(t, 10)
    const rowH = vh + lg + lh
    const g1 = px(t, 6)
    const g2 = px(t, 44)
    const ky = stackTop(t, f, kh + g1 + nh + g2 + rowH)
    const nyy = ky + kh + g1
    const ry = nyy + nh + g2
    const colW = Math.min(f.w / 3, 340 * t.s)
    const x0 = f.cx - colW * 1.5
    const stats: [string, string][] = [
      ['7', 'Goles'],
      ['5', 'Asistencias'],
      ['89%', 'Pases'],
    ]
    const row: SlideElement[] = []
    stats.forEach(([v, l], i) => {
      const x = x0 + colW * i
      row.push(
        accentLine(t, v, { x, y: ry, w: colW, h: vh }, vs, { name: `Dato ${i + 1}`, lineHeight: 0.9, verticalAlign: 'top', fill: { kind: 'solid', color: i === 0 ? '$accent' : '$text' } }),
        lbl(t, l, { x, y: ry + vh + lg, w: colW, h: lh }, ls, { name: `Etiqueta dato ${i + 1}` }),
      )
    })
    // Fallback: giant outlined shirt number where the photo would be
    // (Anton digits fill ≈0.08–0.82 em of a 0.9 em box).
    let gs: number
    let gx: number
    let gw: number
    let gy: number
    if (f.split) {
      gs = Math.min(t.H * 0.95, (f.photo.w * 0.9) / 0.82)
      gx = f.photo.x
      gw = f.photo.w
      gy = t.H / 2 - gs * 0.45
    } else {
      gs = Math.min(1000 * k * t.s, (ky - t.top) / 0.8)
      gx = t.cx - t.W * 0.55
      gw = t.W * 1.1
      gy = Math.max(t.top + px(t, 40), ky - px(t, 30) - gs * 0.86)
    }
    const col = { x: f.x, w: f.w }
    return {
      background: inkFlat(),
      elements: [
        ...photoBase(
          t,
          f,
          [
            heroTint(t, f, '$home', 0.6),
            text(t, '10', { x: gx, y: gy, w: gw, h: gs * 0.9 }, {
              name: 'Dorsal de fondo',
              fontFamily: '$numbers',
              fontSize: gs,
              fontWeight: 400,
              lineHeight: 0.9,
              letterSpacing: 0,
              uppercase: true,
              align: 'center',
              verticalAlign: 'top',
              fill: { kind: 'none' },
              stroke: { color: '$text', width: 1.6 },
              opacity: 0.22,
              autoFit: false,
            }),
          ],
          ky,
        ),
        lbl(t, 'Mediapunta  ·  {home.short}', { ...col, y: ky, h: kh }, ks, { name: 'Posición y equipo' }),
        head(t, 'M. Laurent', { ...col, y: nyy, h: nh }, ns, { name: 'Jugador' }),
        ...row,
      ],
    }
  },
}

export const MEDIA_TEMPLATES: TemplateDef[] = [breakingNews, resultPost, quoteCard, transferNews, injuryUpdate, viralStat, scoreRecap, newsHeadline, playerSpotlight]
