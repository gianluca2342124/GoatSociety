import * as E from '../model/elements'
import type { MatchData } from '../model/types'
import type { TemplateDef } from './types'
import type { TCtx } from './kit'
import { cinematic, crestOf, hl, ink, label, px, rule, signature, support } from './kit'

// ════════════════════════════════════════════════════════════════════════════
// GOAT EDITORIAL · Estadísticas
// Fondo negro, cifras enormes, un solo acento, un mensaje por diapositiva.
// ════════════════════════════════════════════════════════════════════════════

/** Dim source line at the foot of the content zone ("de dónde sale el dato"). */
function source(t: TCtx, content: string, y: number) {
  return label(t, content, { y, h: px(t, 50, 30) }, 34, { name: 'Fuente', fill: { kind: 'solid', color: '$dim' } })
}

/** Row id of the xG metric when the match has one, else the first metric. */
function xgStatId(match: MatchData): string[] {
  const row = match.stats.find((s) => /\bxg\b|esperad/i.test(s.label)) ?? match.stats[0]
  return row ? [row.id] : []
}

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

/** Place a block of estimated height inside [a, b]: centered (bias 0.5) or biased. Returns y and the full room below it. */
function place(a: number, b: number, est: number, bias = 0.5) {
  const y = a + Math.max(0, (b - a - est) * bias)
  return { y, h: Math.max(10, b - y) }
}

export const statisticalDominance: TemplateDef = {
  id: 'statistical-dominance',
  number: 5,
  name: 'Statistical Dominance',
  category: 'stats',
  description: 'Comparativa audaz: cifras enormes y barras proporcionales automáticas.',
  build: (t) => {
    const hy = t.contentTop
    const hh = px(t, 300)
    const by = hy + hh + px(t, 80)
    const sy = t.contentBottom - px(t, 50)
    return {
      background: ink(),
      elements: [
        ...cinematic(t),
        signature(t),
        hl(t, '{away.short} [[manda]] en los números', { y: hy, h: hh }, 140),
        E.statBars({ name: 'Comparativa', x: t.left, y: by, width: t.cw, height: sy - by - px(t, 50), showCrests: true, maxRows: 3, statIds: [], valueSize: 130 * t.s, labelSize: 40 * t.s, barHeight: 26 * t.s, rowGap: 64 * t.v }),
        source(t, 'Promedio por partido  ·  temporada actual', sy),
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
  build: (t) => {
    const hy = t.contentTop
    const hh = px(t, 330)
    const sy = t.contentBottom - px(t, 50)
    const vs = 340 * t.s
    const z = place(hy + hh + px(t, 60), sy - px(t, 40), heroHeight(vs, true, 2), 0.5)
    return {
      background: ink(),
      // Negative stat: the slide suggests red as its single accent.
      accent: '$red',
      elements: [
        ...cinematic(t),
        signature(t),
        hl(t, '{home.short} [[sufre]] en casa', { y: hy, h: hh }, 150),
        E.statNumber({
          name: 'Cifra principal',
          x: t.left,
          y: z.y,
          width: t.cw,
          height: z.h,
          value: '3/3',
          label: 'Partidos en casa encajando',
          description: '{home} ha recibido al menos un gol en todos sus partidos como local.',
          valueSize: vs,
          layout: 'hero',
          align: 'left',
          valueColor: '$accent',
          labelColor: '$text',
          textColor: '$muted',
        }),
        source(t, '{competition}  ·  temporada actual', sy),
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
    const S = sizer(t, 320 + 90 + 340 + 170 + 340)
    const hy = t.contentTop
    const hh = S(320)
    const cs = S(128, 56)
    const gapC = S(36, 16)
    const rowH = S(340, 150)
    const vsH = S(170, 70)
    const r1 = hy + hh + S(90)
    const r2 = r1 + rowH + vsH
    const lx = t.left + cs + gapC
    const lw = t.right - lx
    const player = (side: 'home' | 'away', y: number) => [
      crestOf(side, t.left, y + (rowH - cs) / 2, cs),
      E.playerList({ name: side === 'home' ? 'Clave local' : 'Clave visitante', side, filter: 'key', variant: 'editorial', x: lx, y, width: lw, height: rowH, maxItems: 1, nameSize: S(100, 44), showStatus: false, showStat: true, showNumber: false, align: 'left', accentColor: '$accent' }),
    ]
    const vsSize = S(64, 34)
    const vsY = r1 + rowH + vsH / 2
    return {
      background: ink(),
      elements: [
        ...cinematic(t),
        signature(t),
        hl(t, 'El duelo [[que decide]]', { y: hy, h: hh }, 150),
        ...player('home', r1),
        label(t, 'VS', { x: t.left, y: vsY - vsSize * 0.55, w: cs, h: vsSize * 1.1 }, vsSize / t.s, { name: 'VS', align: 'center', fontWeight: 700, fill: { kind: 'solid', color: '$dim' }, autoFit: false }),
        rule(t, vsY - 1, t.right - lx, lx),
        ...player('away', r2),
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
    const S = sizer(t, 300 + 100 + 150 + 50 + 440 + 60 + 130)
    const hy = t.contentTop
    const hh = S(300)
    const cs = S(150, 64)
    const cy = hy + hh + S(100)
    const by = cy + cs + S(50)
    const bh = S(440, 190)
    const sy = by + bh + S(60)
    const ns = S(46, 28)
    const nw = t.cw / 2 - cs - S(30, 14)
    return {
      background: ink(),
      elements: [
        ...cinematic(t),
        signature(t),
        hl(t, '{away.short} genera [[más peligro]]', { y: hy, h: hh }, 140),
        crestOf('home', t.left, cy, cs),
        label(t, '{home.short}', { x: t.left + cs + S(26, 12), y: cy + cs / 2 - ns * 0.6, w: nw, h: ns * 1.2 }, ns / t.s, { name: 'Nombre local', fill: { kind: 'solid', color: '$text' }, fontWeight: 700 }),
        crestOf('away', t.right - cs, cy, cs),
        label(t, '{away.short}', { x: t.right - cs - S(26, 12) - nw, y: cy + cs / 2 - ns * 0.6, w: nw, h: ns * 1.2 }, ns / t.s, { name: 'Nombre visitante', align: 'right', fill: { kind: 'solid', color: '$text' }, fontWeight: 700 }),
        E.statBars({ name: 'Métrica', x: t.left, y: by, width: t.cw, height: bh, statIds: xgStatId(match), maxRows: 1, style: 'editorial', colorMode: 'leader', showCrests: false, valueSize: 236 * t.s, labelSize: 55 * t.s, barHeight: 30 * t.s, rowGap: 0 }),
        support(t, '{away} llega con más ocasiones claras por partido que {home}.', { y: sy, h: Math.max(S(130, 60), t.contentBottom - sy) }, 48, { name: 'Lectura' }),
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
  description: 'La racha de los últimos cinco partidos de cada equipo, en letras grandes.',
  build: (t) => {
    const hy = t.contentTop
    const hh = px(t, 320)
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
    const tvs = 230 * t.s
    const tz = place(r2 + rowH + px(t, 90, 24), sy - px(t, 40), heroHeight(tvs, true, 0), 0.5)
    const row = (side: 'home' | 'away', y: number) => [
      crestOf(side, t.left, y + (rowH - cs) / 2, cs),
      E.formRow({ name: side === 'home' ? 'Racha local' : 'Racha visitante', source: side, shape: 'letter', x: fx, y: y + (rowH - fh) / 2, width: fw, height: fh, gap: fg, winColor: '$accent', drawColor: '$muted', lossColor: '$muted', newestFirst: true }),
    ]
    return {
      background: ink(),
      elements: [
        ...cinematic(t),
        signature(t),
        hl(t, '{away.short}: [[4 victorias]] en 5', { y: hy, h: hh }, 150),
        ...row('away', r1),
        ...row('home', r2),
        E.statNumber({ name: 'Tendencia', x: t.left, y: tz.y, width: t.cw, height: tz.h, value: '13', label: 'Goles en esos cinco partidos', description: '', valueSize: tvs, layout: 'hero', align: 'left', valueColor: '$text', labelColor: '$muted', minIntensity: 'editorial' }),
        source(t, 'Últimos cinco partidos  ·  el más reciente, a la izquierda', sy),
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
          description: '{away} castiga en las segundas partes: ningún equipo marca más desde el minuto 46.',
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
    const hy = t.contentTop
    const hh = px(t, 300)
    const ry = hy + hh + px(t, 70)
    return {
      background: ink(),
      elements: [
        ...cinematic(t),
        signature(t),
        hl(t, 'Los goleadores [[del partido]]', { y: hy, h: hh }, 140),
        E.ranking({ name: 'Ranking', x: t.left, y: ry, width: t.cw, height: t.contentBottom - ry, nameSize: 64 * t.s, valueSize: 124 * t.s, highlightIndex: 0 }),
      ],
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
    const hy = t.contentTop
    const hh = px(t, 300)
    const cs = px(t, 84, 44)
    const top = hy + hh + px(t, 80)
    const gap = px(t, 70, 28)
    const each = (t.contentBottom - top - gap) / 2
    const block = (side: 'home' | 'away', y: number) => [
      crestOf(side, t.left, y, cs),
      label(t, side === 'home' ? '{home}' : '{away}', { x: t.left + cs + px(t, 26, 14), y: y + cs / 2 - px(t, 28, 16), w: t.cw - cs, h: px(t, 56, 32) }, 46, { name: side === 'home' ? 'Nombre local' : 'Nombre visitante', fill: { kind: 'solid', color: '$text' }, fontWeight: 700 }),
      E.playerList({ name: side === 'home' ? 'Bajas local' : 'Bajas visitante', side, filter: 'absences', variant: 'editorial', x: t.left, y: y + cs + px(t, 24, 12), width: t.cw, height: each - cs - px(t, 24, 12), maxItems: 3, nameSize: px(t, 64, 36), showStatus: true, showStat: false, showNumber: false, align: 'left' }),
    ]
    return {
      background: ink(),
      accent: '$red',
      elements: [
        ...cinematic(t),
        signature(t),
        hl(t, 'Las bajas [[que pesan]]', { y: hy, h: hh }, 150),
        ...block('home', top),
        ...block('away', top + each + gap),
      ],
    }
  },
}

export const STATS_TEMPLATES = [statisticalDominance, theNumbers, keyPlayers, performanceComparison, formTrends, giantStat, rankingSlide, absences]
