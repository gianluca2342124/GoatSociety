import * as E from '../model/elements'
import type { MatchData, StatRow, TextElement } from '../model/types'
import { rowLeader } from '../model/stats'
import type { TemplateDef } from './types'
import type { TCtx } from './kit'
import { cinematic, crestOf, hl, ink, label, px, rule, signature, support } from './kit'

// ════════════════════════════════════════════════════════════════════════════
// GOAT EDITORIAL · Estadísticas
// Fondo negro, cifras enormes, un solo acento, un mensaje por diapositiva.
// Story / 4:5 / 1:1 apilan titular + gráfico; 16:9 abre en dos columnas
// (titular a la izquierda, el dato a la derecha).
// ════════════════════════════════════════════════════════════════════════════

type Side = 'home' | 'away'

/** Headline leading: accented capitals (Á/Ú) clear the line above. */
const LH = 1.12

/**
 * Leading for a headline that starts with a team name. Anton's cedilla/comma
 * hangs ~0.2em: with a name like "Barça" on the first line it would land on the
 * next line's capitals and read as an accent ("PELÍGRO"), so those get more air.
 */
function lhFor(match: MatchData, ...sides: Side[]): number {
  return sides.some((s) => /[Çç,;]/.test(match[s].shortName || match[s].name)) ? 1.24 : LH
}

/** Type factor for short formats (1 on story and 4:5). */
const vk = (t: TCtx) => Math.min(1, t.v + 0.18)

const other = (s: Side): Side => (s === 'home' ? 'away' : 'home')

/** Editorial headline with the leading used across the stats slides. */
function head(t: TCtx, content: string, box: { x?: number; y: number; w?: number; h: number }, size: number, p: Partial<TextElement> = {}): TextElement {
  return hl(t, content, box, size, { lineHeight: LH, ...p })
}

/** Box height for an n-line headline (size in story px, already scaled for the format). */
function headH(t: TCtx, size: number, lines = 2, lh = LH): number {
  return size * t.s * lh * lines + 8
}

/** Right edge for key data. On stories the TikTok/Reels buttons cover x > 940 between y 900 and 1550. */
function dataRight(t: TCtx): number {
  return t.story ? Math.min(t.right, t.W - 140) : t.right
}

/** 16:9 split: headline column on the left, data column on the right. */
function cols(t: TCtx, share = 0.42) {
  const lw = Math.round(t.cw * share)
  const gap = px(t, 80)
  return { lx: t.left, lw, rx: t.left + lw + gap, rw: t.cw - lw - gap }
}

/** Dim source line at the foot of the content zone ("de dónde sale el dato"). */
function source(t: TCtx, content: string, y: number, w = t.cw, x = t.left) {
  return label(t, content, { x, y, w, h: px(t, 50, 30) }, 34, { name: 'Fuente', fill: { kind: 'solid', color: '$dim' } })
}

/** Row id of the xG metric when the match has one, else the first metric. */
function xgStatId(match: MatchData): string[] {
  const row = match.stats.find((s) => /\bxg\b|esperad/i.test(s.label)) ?? match.stats[0]
  return row ? [row.id] : []
}

/** Team that leads most of the given rows (a tie goes to the visitor, the "statement" side). */
function leaderOf(rows: StatRow[]): Side {
  let h = 0
  let a = 0
  for (const r of rows) {
    const l = rowLeader(r)
    if (l === 'home') h++
    else if (l === 'away') a++
  }
  return h > a ? 'home' : 'away'
}

const NUM: Record<number, string> = { 3: 'tres', 4: 'cuatro', 5: 'cinco', 6: 'seis', 7: 'siete', 8: 'ocho', 9: 'nueve', 10: 'diez' }

/**
 * Vertical sizer: story px → format px, shrunk uniformly when the stacked
 * composition (total story px) would not fit the content zone.
 */
function sizer(t: TCtx, total: number) {
  const k = Math.min(1, t.ch / Math.max(1, px(t, total)))
  return (v: number, floor = 0) => Math.max(floor, px(t, v) * k)
}

/** Approximate height of a statNumber 'hero' block (mirrors the painter). */
function heroHeight(valueSize: number, withLabel: boolean, descLines: number): number {
  const cap = valueSize * 0.86
  const ls = Math.max(40, Math.min(85, valueSize * 0.3))
  const ds = Math.max(36, Math.min(52, valueSize * 0.2))
  return cap + Math.max(18, valueSize * 0.12) + (withLabel ? ls * 0.72 + Math.max(16, ls * 0.42) : 0) + descLines * ds * 1.22
}

/** Value size the hero painter will reach in a box of height `room` (mirrors its reserve). */
function heroFit(room: number, valueSize: number, withDesc: boolean): number {
  const reserve = Math.max(40, Math.min(85, valueSize * 0.3)) * 1.45 + (withDesc ? Math.max(36, Math.min(52, valueSize * 0.2)) * 2.9 : 0)
  return Math.min(valueSize, (room - reserve) / 0.86)
}

/** Place a block of estimated height inside [a, b]: centered (bias 0.5) or biased. Returns y and the full room below it. */
function place(a: number, b: number, est: number, bias = 0.5) {
  const y = a + Math.max(0, (b - a - est) * bias)
  return { y, h: Math.max(10, b - y) }
}

// ── 05 · Comparativa audaz ──────────────────────────────────────────────────
export const statisticalDominance: TemplateDef = {
  id: 'statistical-dominance',
  number: 5,
  name: 'Statistical Dominance',
  category: 'stats',
  description: 'Comparativa audaz: cifras enormes y barras proporcionales automáticas.',
  build: (t, match) => {
    // The team name closes the claim, so nothing hangs over an accented capital.
    const claim = (n: number) => `En los números [[manda {${leaderOf(match.stats.slice(0, n))}.short}]]`
    const src = 'Promedio por partido  ·  temporada actual'
    if (t.landscape) {
      const c = cols(t, 0.36)
      const sy = t.contentBottom - px(t, 50)
      return {
        background: ink(),
        elements: [
          ...cinematic(t),
          signature(t),
          head(t, claim(3), { x: c.lx, y: t.contentTop, w: c.lw, h: sy - t.contentTop - px(t, 40) }, 130),
          E.statBars({ name: 'Comparativa', x: c.rx, y: t.contentTop, width: c.rw, height: t.ch, showCrests: true, maxRows: 3, statIds: [], valueSize: 112, labelSize: 36, barHeight: 24, rowGap: 44 }),
          source(t, src, sy, c.lw),
        ],
      }
    }
    const k = vk(t)
    const hy = t.contentTop
    const hh = headH(t, 140 * k)
    const by = hy + hh + px(t, 70)
    const sy = t.contentBottom - px(t, 50)
    const bh = sy - by - px(t, 50)
    // Three rows only when each keeps ≥150px (labels ≥32px); 4:5 and 1:1 show two.
    const gap = 64 * t.v
    const inner = bh - Math.min(120, bh * 0.16) - Math.max(36, gap)
    const n = (inner - 2 * gap) / 3 >= 150 ? 3 : 2
    return {
      background: ink(),
      elements: [
        ...cinematic(t),
        signature(t),
        head(t, claim(n), { y: hy, h: hh }, 140 * k),
        E.statBars({ name: 'Comparativa', x: t.left, y: by, width: dataRight(t) - t.left, height: bh, showCrests: true, maxRows: n, statIds: [], valueSize: 130 * t.s, labelSize: 40 * t.s, barHeight: 26 * t.s, rowGap: gap }),
        source(t, src, sy),
      ],
    }
  },
}

// ── 06 · Una cifra dominante que demuestra el titular ──────────────────────
export const theNumbers: TemplateDef = {
  id: 'the-numbers',
  number: 6,
  name: 'The Numbers',
  category: 'stats',
  description: 'Una sola cifra dominante que demuestra el titular.',
  build: (t, match) => {
    const claim = '{home.short} [[sufre]] en casa'
    const lh = lhFor(match, 'home')
    const src = '{competition}  ·  temporada actual'
    // The support line is dropped when keeping it would shrink the number (1:1).
    const stat = (x: number, y: number, w: number, h: number, vs: number) =>
      E.statNumber({
        name: 'Cifra principal',
        x,
        y,
        width: w,
        height: h,
        value: '3/3',
        label: 'Partidos en casa encajando',
        description: heroFit(h, vs, true) >= vs * 0.85 ? '{home} aún no ha dejado la portería a cero como local.' : '',
        valueSize: vs,
        layout: 'hero',
        align: 'left',
        valueColor: '$accent',
        labelColor: '$text',
        textColor: '$muted',
      })
    if (t.landscape) {
      const c = cols(t, 0.4)
      const sy = t.contentBottom - px(t, 50)
      const vs = 330
      const z = place(t.contentTop, t.contentBottom, heroHeight(vs, true, 2), 0.5)
      return {
        background: ink(),
        // Negative stat: the slide suggests red as its single accent.
        accent: '$red',
        elements: [
          ...cinematic(t),
          signature(t),
          head(t, claim, { x: c.lx, y: t.contentTop, w: c.lw, h: sy - t.contentTop - px(t, 40) }, 150, { lineHeight: lh }),
          stat(c.rx, z.y, c.rw, z.h, vs),
          source(t, src, sy, c.lw),
        ],
      }
    }
    const k = vk(t)
    const hy = t.contentTop
    const hh = headH(t, 150 * k, 2, lh)
    const sy = t.contentBottom - px(t, 50)
    const vs = 340 * t.s * k
    const a = hy + hh + px(t, 60)
    const b = sy - px(t, 40)
    const z = place(a, b, heroHeight(vs, true, heroFit(b - a, vs, true) >= vs * 0.85 ? 2 : 0), 0.42)
    return {
      background: ink(),
      // Negative stat: the slide suggests red as its single accent.
      accent: '$red',
      elements: [
        ...cinematic(t),
        signature(t),
        head(t, claim, { y: hy, h: hh }, 150 * k, { lineHeight: lh }),
        stat(t.left, z.y, t.cw, z.h, vs),
        source(t, src, sy),
      ],
    }
  },
}

// ── 07 · El duelo de los dos jugadores clave ────────────────────────────────
export const keyPlayers: TemplateDef = {
  id: 'key-players',
  number: 7,
  name: 'Key Players',
  category: 'stats',
  description: 'El duelo de los dos jugadores clave: nombres grandes y su cifra.',
  build: (t) => {
    const claim = 'El duelo [[que decide]]'
    /** One player row: crest + the team's key player (name, note, stat). */
    const player = (side: Side, x: number, y: number, right: number, rowH: number, cs: number, gapC: number, nameSize: number) => [
      crestOf(side, x, y + (rowH - cs) / 2, cs),
      E.playerList({ name: side === 'home' ? 'Clave local' : 'Clave visitante', side, filter: 'key', variant: 'editorial', x: x + cs + gapC, y, width: right - x - cs - gapC, height: rowH, maxItems: 1, nameSize, showStatus: false, showStat: true, showNumber: false, align: 'left', accentColor: '$accent' }),
    ]
    /** "VS" in the crest column + a rule across the text column, between the two rows. */
    const versus = (x: number, cy: number, right: number, cs: number, gapC: number, size: number) => [
      label(t, 'VS', { x, y: cy - size * 0.55, w: cs, h: size * 1.1 }, size / t.s, { name: 'VS', align: 'center', fontWeight: 700, fill: { kind: 'solid', color: '$dim' }, autoFit: false }),
      rule(t, cy - 1, right - x - cs - gapC, x + cs + gapC),
    ]
    if (t.landscape) {
      const c = cols(t, 0.4)
      const cs = px(t, 124)
      const gapC = px(t, 34)
      const rowH = px(t, 330)
      const vsH = px(t, 140)
      const r1 = t.contentTop + Math.max(0, (t.ch - rowH * 2 - vsH) / 2)
      const r2 = r1 + rowH + vsH
      const right = c.rx + c.rw
      return {
        background: ink(),
        elements: [
          ...cinematic(t),
          signature(t),
          head(t, claim, { x: c.lx, y: t.contentTop, w: c.lw, h: t.ch }, 150),
          ...player('home', c.rx, r1, right, rowH, cs, gapC, px(t, 100)),
          ...versus(c.rx, r1 + rowH + vsH / 2, right, cs, gapC, px(t, 60)),
          ...player('away', c.rx, r2, right, rowH, cs, gapC, px(t, 100)),
        ],
      }
    }
    const S = sizer(t, headH(t, 150) / t.s + 90 + 340 + 160 + 340)
    const f = S(1000) / 1000 / t.s
    const hy = t.contentTop
    const hh = S(headH(t, 150) / t.s)
    const cs = S(128, 56)
    const gapC = S(36, 16)
    const rowH = S(340, 150)
    const vsH = S(160, 70)
    const r1 = hy + hh + S(90)
    const r2 = r1 + rowH + vsH
    const right = dataRight(t)
    return {
      background: ink(),
      elements: [
        ...cinematic(t),
        signature(t),
        head(t, claim, { y: hy, h: hh }, 150 * f),
        ...player('home', t.left, r1, right, rowH, cs, gapC, S(100, 44)),
        ...versus(t.left, r1 + rowH + vsH / 2, right, cs, gapC, S(64, 34)),
        ...player('away', t.left, r2, right, rowH, cs, gapC, S(100, 44)),
      ],
    }
  },
}

// ── 08 · Una métrica, cara a cara ───────────────────────────────────────────
export const performanceComparison: TemplateDef = {
  id: 'performance-comparison',
  number: 8,
  name: 'Performance Comparison',
  category: 'stats',
  description: 'Una sola métrica cara a cara: escudos, dos cifras enormes y una barra.',
  build: (t, match) => {
    const ids = xgStatId(match)
    const row = match.stats.find((s) => s.id === ids[0])
    const lead: Side = row && rowLeader(row) === 'home' ? 'home' : 'away'
    const claim = `{${lead}.short} genera [[más peligro]]`
    const reading = `{${lead}} llega con más ocasiones claras por partido que {${other(lead)}}.`
    /** Crest + short name on each side, then the single-row comparison. */
    const duel = (x: number, w: number, cy: number, cs: number, ns: number, by: number, bh: number, vs: number) => {
      const nw = w / 2 - cs - ns * 0.6
      const ny = cy + cs / 2 - ns * 0.6
      return [
        crestOf('home', x, cy, cs),
        label(t, '{home.short}', { x: x + cs + ns * 0.55, y: ny, w: nw, h: ns * 1.2 }, ns / t.s, { name: 'Nombre local', fill: { kind: 'solid', color: '$text' }, fontWeight: 700 }),
        crestOf('away', x + w - cs, cy, cs),
        label(t, '{away.short}', { x: x + w - cs - ns * 0.55 - nw, y: ny, w: nw, h: ns * 1.2 }, ns / t.s, { name: 'Nombre visitante', align: 'right', fill: { kind: 'solid', color: '$text' }, fontWeight: 700 }),
        E.statBars({ name: 'Métrica', x, y: by, width: w, height: bh, statIds: ids, maxRows: 1, style: 'editorial', colorMode: 'leader', showCrests: false, valueSize: vs, labelSize: 55 * t.s, barHeight: 30 * t.s, rowGap: 0 }),
      ]
    }
    // 16:9 keeps the vertical duel (two columns would push the two values together)
    // with a one-line headline; the reading line stays at a comfortable measure.
    const lh = lhFor(match, lead)
    const hs = (headH(t, 140, t.landscape ? 1 : 2, lh) - 8) / t.s + 8
    const S = sizer(t, hs + 100 + 150 + 50 + 440 + 60 + 130)
    const f = S(1000) / 1000 / t.s
    const hy = t.contentTop
    const hh = S(hs)
    const cs = S(150, 64)
    const cy = hy + hh + S(t.landscape ? 70 : 100)
    const by = cy + cs + S(50)
    const bh = S(440, 190)
    const sy = by + bh + S(60)
    const w = dataRight(t) - t.left
    return {
      background: ink(),
      elements: [
        ...cinematic(t),
        signature(t),
        head(t, claim, { y: hy, h: hh }, 140 * f, { lineHeight: lh }),
        ...duel(t.left, w, cy, cs, S(46, 28), by, bh, 236 * t.s),
        support(t, reading, { y: sy, w: t.landscape ? Math.min(w, 1000) : w, h: Math.max(S(130, 60), t.contentBottom - sy) }, 48, { name: 'Lectura' }),
      ],
    }
  },
}

// ── 09 · Racha ──────────────────────────────────────────────────────────────
export const formTrends: TemplateDef = {
  id: 'form-trends',
  number: 9,
  name: 'Form & Trends',
  category: 'stats',
  description: 'La racha de los últimos partidos de cada equipo, en letras grandes.',
  build: (t, match) => {
    // The claim follows the data: the team with more wins leads the slide.
    const wins = (s: Side) => match[s].form.filter((r) => r === 'W').length
    const lead: Side = wins('away') >= wins('home') ? 'away' : 'home'
    const n = match[lead].form.length
    const w = wins(lead)
    const claim = n ? `{${lead}.short}: [[${w} ${w === 1 ? 'victoria' : 'victorias'}]] en ${n}` : `{${lead}.short}: [[4 victorias]] en 5`
    const lh = lhFor(match, lead)
    const nWord = NUM[n || 5] ?? String(n)
    const src = `Últimos ${nWord} partidos  ·  el más reciente, a la izquierda`
    const row = (side: Side, x: number, y: number, rowH: number, cs: number, fx: number, fw: number, fh: number, fg: number) => [
      crestOf(side, x, y + (rowH - cs) / 2, cs),
      E.formRow({ name: side === 'home' ? 'Racha local' : 'Racha visitante', source: side, shape: 'letter', x: fx, y: y + (rowH - fh) / 2, width: fw, height: fh, gap: fg, winColor: '$accent', drawColor: '$muted', lossColor: '$muted', newestFirst: true }),
    ]
    const trend = (x: number, y: number, w: number, h: number, vs: number) =>
      E.statNumber({ name: 'Tendencia', x, y, width: w, height: h, value: '13', label: `Goles en esos ${nWord} partidos`, description: '', valueSize: vs, layout: 'hero', align: 'left', valueColor: '$text', labelColor: '$muted', minIntensity: 'editorial' })
    if (t.landscape) {
      const c = cols(t, 0.4)
      const sy = t.contentBottom - px(t, 50)
      const cs = px(t, 104)
      const fh = px(t, 112)
      const fg = px(t, 26)
      const rowH = Math.max(cs, fh)
      const rowGap = px(t, 56)
      const fx = c.rx + cs + px(t, 44)
      const fw = Math.min(c.rx + c.rw - fx, fh * 5 + fg * 4)
      const tvs = 230 * vk(t)
      const est = heroHeight(tvs, true, 0)
      const gapT = px(t, 80)
      const end = sy - px(t, 30)
      const y0 = t.contentTop + Math.max(0, (end - t.contentTop - rowH * 2 - rowGap - gapT - est) / 2)
      const r2 = y0 + rowH + rowGap
      return {
        background: ink(),
        elements: [
          ...cinematic(t),
          signature(t),
          head(t, claim, { x: c.lx, y: t.contentTop, w: c.lw, h: sy - t.contentTop - px(t, 40) }, 150, { lineHeight: lh }),
          ...row(lead, c.rx, y0, rowH, cs, fx, fw, fh, fg),
          ...row(other(lead), c.rx, r2, rowH, cs, fx, fw, fh, fg),
          trend(c.rx, r2 + rowH + gapT, c.rw, Math.max(10, end - (r2 + rowH + gapT)), tvs),
          source(t, src, sy),
        ],
      }
    }
    const k = vk(t)
    const hy = t.contentTop
    const hh = headH(t, 150 * k, 2, lh)
    const cs = px(t, 104, 52)
    const fh = px(t, 112, 56)
    const fg = px(t, 34, 16)
    const rowH = Math.max(cs, fh)
    const rowGap = px(t, 64, 28)
    const r1 = hy + hh + px(t, 90)
    const r2 = r1 + rowH + rowGap
    const fx = t.left + cs + px(t, 48, 22)
    const fw = Math.min(t.right - fx, fh * 5 + fg * 4)
    const sy = t.contentBottom - px(t, 50)
    const tvs = 230 * t.s * k
    const tz = place(r2 + rowH + px(t, 90, 24), sy - px(t, 40), heroHeight(tvs, true, 0), 0.5)
    // The optional trend number only appears when it can stay big (≥140px).
    const fitV = (tz.h - Math.min(85, tvs * 0.3) * 1.45) / 0.86
    return {
      background: ink(),
      elements: [
        ...cinematic(t),
        signature(t),
        head(t, claim, { y: hy, h: hh }, 150 * k, { lineHeight: lh }),
        ...row(lead, t.left, r1, rowH, cs, fx, fw, fh, fg),
        ...row(other(lead), t.left, r2, rowH, cs, fx, fw, fh, fg),
        ...(fitV >= 140 * t.s ? [trend(t.left, tz.y, t.cw, tz.h, tvs)] : []),
        source(t, src, sy),
      ],
    }
  },
}

// ── 21 · Cifra gigante ──────────────────────────────────────────────────────
export const giantStat: TemplateDef = {
  id: 'giant-stat',
  number: 21,
  name: 'Giant Stat',
  category: 'stats',
  description: 'Un solo número gigante que llena la diapositiva, con escudo pequeño.',
  build: (t) => {
    const cs = px(t, 110, 56)
    const cy = t.contentTop
    const sy = t.contentBottom - px(t, 50)
    const vs = 560 * t.s
    const z = place(cy + cs + px(t, 80), sy - px(t, 40), heroHeight(vs, true, 2), 0.45)
    return {
      background: ink(),
      elements: [
        ...cinematic(t),
        signature(t),
        crestOf('away', t.left, cy, cs),
        label(t, '{away}', { x: t.left + cs + px(t, 30, 16), y: cy + cs / 2 - px(t, 30, 18), w: t.cw - cs - px(t, 30, 16), h: px(t, 60, 36) }, 48, { name: 'Equipo', fill: { kind: 'solid', color: '$text' }, fontWeight: 700 }),
        E.statNumber({
          name: 'Cifra gigante',
          x: t.left,
          y: z.y,
          width: t.cw,
          height: z.h,
          value: '72%',
          label: 'De sus goles, tras el descanso',
          description: 'Ningún equipo marca más que {away} desde el minuto 46.',
          valueSize: vs,
          layout: 'hero',
          align: 'left',
          valueColor: '$accent',
          labelColor: '$text',
          textColor: '$muted',
        }),
        source(t, 'Todas las competiciones  ·  temporada actual', sy),
      ],
    }
  },
}

// ── 22 · Ranking ────────────────────────────────────────────────────────────
export const rankingSlide: TemplateDef = {
  id: 'ranking',
  number: 22,
  name: 'Ranking',
  category: 'stats',
  description: 'Clasificación editable con barras gruesas y la fila destacada en el acento.',
  build: (t) => {
    const claim = 'Los goleadores [[del partido]]'
    // ~170px per row keeps names ≥50px: 5 rows on stories, fewer on short formats.
    const rowsFor = (h: number) => Math.max(3, Math.min(5, Math.floor(h / 170)))
    const list = (x: number, y: number, w: number, h: number) =>
      E.ranking({ name: 'Ranking', x, y, width: w, height: h, maxRows: rowsFor(h), nameSize: 64 * t.s, valueSize: 124 * t.s, highlightIndex: 0 })
    if (t.landscape) {
      const c = cols(t, 0.4)
      return {
        background: ink(),
        elements: [...cinematic(t), signature(t), head(t, claim, { x: c.lx, y: t.contentTop, w: c.lw, h: t.ch }, 150), list(c.rx, t.contentTop, c.rw, t.ch)],
      }
    }
    const k = vk(t)
    const hy = t.contentTop
    const hh = headH(t, 140 * k)
    const ry = hy + hh + px(t, 70)
    return {
      background: ink(),
      elements: [...cinematic(t), signature(t), head(t, claim, { y: hy, h: hh }, 140 * k), list(t.left, ry, dataRight(t) - t.left, t.contentBottom - ry)],
    }
  },
}

// ── 24 · Bajas y dudas ──────────────────────────────────────────────────────
export const absences: TemplateDef = {
  id: 'absences',
  number: 24,
  name: 'Bajas y dudas',
  category: 'stats',
  description: 'Bajas y dudas de los dos equipos en filas abiertas, estado en color.',
  build: (t) => {
    const claim = 'Las bajas [[que pesan]]'
    /** Crest + team name, then that team's absences as open rows. */
    const block = (side: Side, x: number, y: number, w: number, h: number, cs: number, nameSize: number) => {
      const ly = y + cs + px(t, 26, 12)
      return [
        crestOf(side, x, y, cs),
        label(t, side === 'home' ? '{home}' : '{away}', { x: x + cs + px(t, 26, 14), y: y + cs / 2 - px(t, 28, 16), w: w - cs - px(t, 26, 14), h: px(t, 56, 32) }, 46, { name: side === 'home' ? 'Nombre local' : 'Nombre visitante', fill: { kind: 'solid', color: '$text' }, fontWeight: 700 }),
        E.playerList({ name: side === 'home' ? 'Bajas local' : 'Bajas visitante', side, filter: 'absences', variant: 'editorial', x, y: ly, width: w, height: Math.max(10, y + h - ly), maxItems: 3, nameSize, showStatus: true, showStat: false, showNumber: false, align: 'left' }),
      ]
    }
    const k = vk(t)
    const hy = t.contentTop
    const cs = px(t, 84, 44)
    if (t.story) {
      // Stories: the two teams stacked, full column width (clear of the right-hand buttons).
      const hh = headH(t, 150)
      const top = hy + hh + px(t, 80)
      const gap = px(t, 70, 28)
      const each = (t.contentBottom - top - gap) / 2
      const w = dataRight(t) - t.left
      return {
        background: ink(),
        accent: '$red',
        elements: [
          ...cinematic(t),
          signature(t),
          head(t, claim, { y: hy, h: hh }, 150),
          ...block('home', t.left, top, w, each, cs, px(t, 64, 36)),
          ...block('away', t.left, top + each + gap, w, each, cs, px(t, 64, 36)),
        ],
      }
    }
    // 4:5, 1:1 and 16:9: the two teams side by side under the headline.
    // A wide gutter keeps each status attached to its own column.
    const hh = headH(t, 150 * k, t.landscape ? 1 : 2)
    const top = hy + hh + px(t, 70)
    const gap = px(t, 120, 44)
    const w = (t.cw - gap) / 2
    const h = t.contentBottom - top
    return {
      background: ink(),
      accent: '$red',
      elements: [
        ...cinematic(t),
        signature(t),
        head(t, claim, { y: hy, h: hh }, 150 * k),
        ...block('home', t.left, top, w, h, cs, px(t, 64, 34)),
        ...block('away', t.left + w + gap, top, w, h, cs, px(t, 64, 34)),
      ],
    }
  },
}

export const STATS_TEMPLATES = [statisticalDominance, theNumbers, keyPlayers, performanceComparison, formTrends, giantStat, rankingSlide, absences]
