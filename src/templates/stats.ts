import * as E from '../model/elements'
import type { MatchData, StatRow, TextElement } from '../model/types'
import { rowLeader } from '../model/stats'
import type { TemplateDef } from './types'
import type { TCtx } from './kit'
import { chrome, cinematic, crestOf, ink, label, px } from './kit'
import { LH, footH, footLabel, footSupport, footTop, gapV, headZone, mainHead, vk } from './match'

// ════════════════════════════════════════════════════════════════════════════
// GOAT EDITORIAL · Estadísticas
// Fondo negro, cifras enormes, un solo acento, un mensaje por diapositiva.
// Ritmo de familia (v2, ver match.ts): cromo → titular centrado arriba →
// el dato en el centro → fuente al pie. 16:9 mantiene el orden con un titular
// de una línea y el dato a una medida cómoda en el centro.
// ════════════════════════════════════════════════════════════════════════════

type Side = 'home' | 'away'

/**
 * Leading for a headline that starts with a team name. Anton's cedilla/comma
 * hangs ~0.2em: with a name like "Barça" on the first line it would land on the
 * next line's capitals and read as an accent ("PELÍGRO"), so those get more air.
 */
function lhFor(match: MatchData, ...sides: Side[]): number {
  return sides.some((s) => /[Çç,;]/.test(match[s].shortName || match[s].name)) ? 1.24 : LH
}

const other = (s: Side): Side => (s === 'home' ? 'away' : 'home')

/** Right edge for key data. On stories the TikTok/Reels buttons cover x > 940 between y 900 and 1550. */
function dataRight(t: TCtx): number {
  return t.story ? Math.min(t.right, t.W - 140) : t.right
}

/** The data column: full width on vertical formats, a centered measure on 16:9. */
function dataCol(t: TCtx, max = 1100) {
  if (t.landscape) {
    const w = Math.min(t.cw, max)
    return { x: t.cx - w / 2, w }
  }
  return { x: t.left, w: dataRight(t) - t.left }
}

/** Centre zone between the headline and the foot (or the safe line when the page has no foot). */
function middle(t: TCtx, withFoot = true, lh = LH) {
  const a = headZone(t, undefined, undefined, lh).end + gapV(t)
  const b = withFoot ? t.contentBottom - footH(t) - gapV(t) : t.contentBottom
  return { a, b, h: b - a }
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

/** Quiet Anton "VS" on the centre axis (same treatment as the match cover). */
function versus(t: TCtx, cx: number, cy: number, size: number): TextElement {
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

// ── 05 · Comparativa audaz ──────────────────────────────────────────────────
export const statisticalDominance: TemplateDef = {
  id: 'statistical-dominance',
  number: 5,
  name: 'Statistical Dominance',
  category: 'stats',
  description: 'Comparativa audaz: cifras enormes y barras proporcionales automáticas.',
  build: (t, match) => {
    const m = middle(t)
    const col = dataCol(t)
    // Three rows only when each keeps ≥150px (labels ≥32px); short formats show two.
    const gap = 64 * t.v
    const inner = m.h - Math.min(120, m.h * 0.16) - Math.max(36, gap)
    const n = (inner - 2 * gap) / 3 >= 150 ? 3 : 2
    // The team name closes the claim, so nothing hangs over an accented capital.
    const claim = t.landscape ? `En los números manda [[{${leaderOf(match.stats.slice(0, n))}.short}]]` : `En los números\n[[manda {${leaderOf(match.stats.slice(0, n))}.short}]]`
    return {
      background: ink(),
      elements: [
        ...cinematic(t),
        ...chrome(t),
        mainHead(t, claim),
        E.statBars({ name: 'Comparativa', x: col.x, y: m.a, width: col.w, height: m.h, showCrests: true, maxRows: n, statIds: [], valueSize: 130 * t.s * vk(t), labelSize: 40 * t.s, barHeight: 26 * t.s, rowGap: gap }),
        footLabel(t, 'Promedio por partido  ·  temporada actual'),
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
  description: 'Una sola cifra dominante, centrada, que demuestra el titular.',
  build: (t, match) => {
    // "EN CASA" stays together: the claim breaks after the verb, never before a lone word.
    const claim = '{home.short} [[sufre]] en casa'
    const lh = t.landscape ? LH : lhFor(match, 'home')
    const m = middle(t, true, lh)
    const col = dataCol(t)
    // The proof number is the focal point: ~400px on tall formats, centred in the room left by the claim.
    const vs = 400 * t.s * vk(t)
    // The support line is dropped when keeping it would shrink the number.
    const withDesc = heroFit(m.h, vs, true) >= vs * 0.85
    const z = place(m.a, m.b, heroHeight(vs, true, withDesc ? 2 : 0), 0.5)
    return {
      background: ink(),
      // Negative stat: the slide suggests red as its single accent.
      accent: '$red',
      elements: [
        ...cinematic(t),
        ...chrome(t),
        mainHead(t, claim, {}, undefined, undefined, lh),
        E.statNumber({
          name: 'Cifra principal',
          x: col.x,
          y: z.y,
          width: col.w,
          height: z.h,
          value: '3/3',
          label: 'Partidos en casa encajando',
          description: withDesc ? '{home} aún no ha dejado la portería a cero como local.' : '',
          valueSize: vs,
          layout: 'hero',
          align: 'center',
          valueColor: '$accent',
          labelColor: '$text',
          textColor: '$muted',
        }),
        footLabel(t, '{competition}  ·  temporada actual'),
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
  description: 'El duelo de los dos jugadores clave: nombres grandes y su cifra, con el VS en el eje.',
  build: (t) => {
    // Forced break: "EL DUELO / QUE DECIDE" (never a lone "DECIDE"); 16:9 fits one line.
    const claim = t.landscape ? 'El duelo [[que decide]]' : 'El duelo\n[[que decide]]'
    // The source line is dropped on short formats so the two rows stay big.
    const withFoot = middle(t).h >= 520
    const m = middle(t, withFoot)
    const col = dataCol(t)
    const f = Math.min(1, m.h / 870)
    const cs = Math.max(60, 136 * t.s * Math.min(1, f * 1.1))
    const gapC = px(t, 36, 16)
    const vsH = Math.max(70, 150 * t.s * f)
    const rowH = Math.min(360 * t.s, (m.h - vsH) / 2)
    const nameSize = Math.max(46, Math.min(108 * t.s, rowH * 0.36))
    const r1 = m.a + Math.max(0, (m.h - rowH * 2 - vsH) / 2)
    const r2 = r1 + rowH + vsH
    /** One player row: crest + the team's key player (name, note, stat). */
    const player = (side: Side, y: number) => [
      crestOf(side, col.x, y + (rowH - cs) / 2, cs),
      E.playerList({ name: side === 'home' ? 'Clave local' : 'Clave visitante', side, filter: 'key', variant: 'editorial', x: col.x + cs + gapC, y, width: col.w - cs - gapC, height: rowH, maxItems: 1, nameSize, showStatus: false, showStat: true, statSize: Math.min(rowH * 0.78, nameSize * 2.2), showNumber: false, align: 'left', accentColor: '$accent' }),
    ]
    return {
      background: ink(),
      elements: [
        ...cinematic(t),
        ...chrome(t),
        mainHead(t, claim),
        ...player('home', r1),
        versus(t, col.x + col.w / 2, r1 + rowH + vsH / 2, Math.min(px(t, 96), vsH * 0.62)),
        ...player('away', r2),
        ...(withFoot ? [footLabel(t, '{competition}  ·  temporada actual')] : []),
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
  description: 'Una sola métrica cara a cara: escudos, dos cifras enormes, una barra y la lectura al pie.',
  build: (t, match) => {
    const ids = xgStatId(match)
    const row = match.stats.find((s) => s.id === ids[0])
    const lead: Side = row && rowLeader(row) === 'home' ? 'home' : 'away'
    // The team closes the claim: a hanging Ç (Barça) never lands on the next line.
    const claim = t.landscape ? `El peligro lo pone [[{${lead}.short}]]` : `El peligro\nlo pone [[{${lead}.short}]]`
    const reading = `{${lead}} llega con más ocasiones claras por partido que {${other(lead)}}.`
    const k = vk(t)
    const col = dataCol(t)
    // Reading line on the foot (two centered lines).
    const rl = 2
    const fy = footTop(t, rl, 48)
    const a = headZone(t).end + gapV(t)
    const b = fy - gapV(t)
    const cs = Math.max(64, Math.min(150 * t.s * k, (b - a) * 0.24))
    const ns = Math.max(28, 46 * t.s * k)
    const g = px(t, 44)
    const bh = Math.min(440 * t.s, b - a - cs - g)
    const cy = a + Math.max(0, (b - a - cs - g - bh) / 2)
    const by = cy + cs + g
    const nw = col.w / 2 - cs - ns * 0.6
    const ny = cy + cs / 2 - ns * 0.6
    return {
      background: ink(),
      elements: [
        ...cinematic(t),
        ...chrome(t),
        mainHead(t, claim),
        crestOf('home', col.x, cy, cs),
        label(t, '{home.short}', { x: col.x + cs + ns * 0.55, y: ny, w: nw, h: ns * 1.2 }, ns / t.s, { name: 'Nombre local', fill: { kind: 'solid', color: '$text' }, fontWeight: 700 }),
        crestOf('away', col.x + col.w - cs, cy, cs),
        label(t, '{away.short}', { x: col.x + col.w - cs - ns * 0.55 - nw, y: ny, w: nw, h: ns * 1.2 }, ns / t.s, { name: 'Nombre visitante', align: 'right', fill: { kind: 'solid', color: '$text' }, fontWeight: 700 }),
        E.statBars({ name: 'Métrica', x: col.x, y: by, width: col.w, height: bh, statIds: ids, maxRows: 1, style: 'editorial', colorMode: 'leader', showCrests: false, valueSize: 236 * t.s * k, labelSize: 55 * t.s, barHeight: 30 * t.s, rowGap: 0 }),
        footSupport(t, reading, rl, 48, { name: 'Lectura', x: t.cx - Math.min(t.cw, 900 * t.s) / 2, width: Math.min(t.cw, 900 * t.s) }),
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
    // Number first, team last (a hanging Ç never lands on the next line).
    const claim = `[[${n ? w : 4} ${n && w === 1 ? 'victoria' : 'victorias'}]] en ${n || 5}${t.landscape ? ' ' : '\n'}para {${lead}.short}`
    const nWord = NUM[n || 5] ?? String(n)
    const m = middle(t)
    const k = vk(t)
    const tight = !t.story
    const cs = px(t, 104, 52)
    const fh = px(t, 112, 56)
    const fg = px(t, 34, 16)
    const gapC = px(t, 48, 22)
    const rowH = Math.max(cs, fh)
    const rowGap = px(t, tight ? 48 : 64, 28)
    // Crest + letters as one centered group; both rows share the same letter columns.
    const count = Math.max(1, match.home.form.length, match.away.form.length)
    const lettersW = count * fh + (count - 1) * fg
    const groupW = Math.min(dataCol(t).w, cs + gapC + lettersW)
    const gx = t.cx - groupW / 2
    const fx = gx + cs + gapC
    const fw = gx + groupW - fx
    // The optional trend number sits under the rows when it can stay big (≥140px).
    const tvs = 230 * t.s * k
    const gapT = px(t, tight ? 56 : 80, 24)
    const rowsH = rowH * 2 + rowGap
    const trendRoom = m.h - rowsH - gapT
    const fitV = (trendRoom - Math.min(85, tvs * 0.3) * 1.45) / 0.86
    const showTrend = fitV >= 140 * t.s
    const est = showTrend ? rowsH + gapT + Math.min(heroHeight(tvs, true, 0), trendRoom) : rowsH
    const r1 = m.a + Math.max(0, (m.h - est) / 2)
    const r2 = r1 + rowH + rowGap
    const row = (side: Side, y: number) => [
      crestOf(side, gx, y + (rowH - cs) / 2, cs),
      E.formRow({ name: side === 'home' ? 'Racha local' : 'Racha visitante', source: side, shape: 'letter', align: 'left', x: fx, y: y + (rowH - fh) / 2, width: fw, height: fh, gap: fg, winColor: '$accent', drawColor: '$muted', lossColor: '$muted', newestFirst: true }),
    ]
    const ty = r2 + rowH + gapT
    return {
      background: ink(),
      elements: [
        ...cinematic(t),
        ...chrome(t),
        mainHead(t, claim),
        ...row(lead, r1),
        ...row(other(lead), r2),
        ...(showTrend
          ? [E.statNumber({ name: 'Tendencia', x: t.left, y: ty, width: t.cw, height: Math.max(10, m.b - ty), value: '13', label: `Goles en esos ${nWord} partidos`, description: '', valueSize: tvs, layout: 'hero', align: 'center', valueColor: '$text', labelColor: '$muted', minIntensity: 'editorial' })]
          : []),
        footLabel(t, `Últimos ${nWord} partidos  ·  el más reciente, a la izquierda`),
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
  description: 'Un solo número gigante, centrado, que llena la diapositiva, con escudo pequeño arriba.',
  build: (t) => {
    // Headline zone: the small crest and the team, centered on the axis.
    const cs = px(t, 110, 56)
    const nh = px(t, 60, 36)
    const ny = t.contentTop + cs + px(t, 16)
    const a = ny + nh + gapV(t)
    const b = t.contentBottom - footH(t) - gapV(t)
    const vs = 560 * t.s * Math.min(1, t.landscape ? 0.85 : 1)
    const withDesc = heroFit(b - a, vs, true) >= vs * 0.7
    const z = place(a, b, heroHeight(vs, true, withDesc ? 2 : 0), 0.45)
    const col = dataCol(t, 1240)
    return {
      background: ink(),
      elements: [
        ...cinematic(t),
        ...chrome(t),
        crestOf('away', t.cx - cs / 2, t.contentTop, cs),
        label(t, '{away}', { y: ny, h: nh }, 48, { name: 'Equipo', align: 'center', fill: { kind: 'solid', color: '$text' }, fontWeight: 700 }),
        E.statNumber({
          name: 'Cifra gigante',
          x: col.x,
          y: z.y,
          width: col.w,
          height: z.h,
          value: '72%',
          label: 'De sus goles, tras el descanso',
          description: withDesc ? 'Ningún equipo marca más que {away} desde el minuto 46.' : '',
          valueSize: vs,
          layout: 'hero',
          align: 'center',
          valueColor: '$accent',
          labelColor: '$text',
          textColor: '$muted',
        }),
        footLabel(t, 'Todas las competiciones  ·  temporada actual'),
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
    // Forced break: "LOS GOLEADORES / DEL PARTIDO" (never an orphan "PARTIDO"); 16:9 fits one line.
    const claim = t.landscape ? 'Los goleadores [[del partido]]' : 'Los goleadores\n[[del partido]]'
    const m = middle(t)
    const col = dataCol(t)
    // ≥190px per row keeps names ~60px and a thick bar (painter: name ≤ 30 % of the row):
    // four on tall formats, three on short ones. The other rows stay in the data.
    const n = Math.max(3, Math.min(5, Math.floor(m.h / 190)))
    // Rows are a list: they stay left-aligned under the centered headline.
    return {
      background: ink(),
      elements: [
        ...cinematic(t),
        ...chrome(t),
        mainHead(t, claim),
        E.ranking({ name: 'Ranking', x: col.x, y: m.a, width: col.w, height: m.h, maxRows: n, nameSize: 80 * t.s, valueSize: 140 * t.s, highlightIndex: 0 }),
        footLabel(t, 'Goles  ·  todas las competiciones'),
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
  build: (t, match) => {
    // Forced break: "LAS BAJAS / QUE PESAN" (never a lone "PESAN"); 16:9 fits one line.
    const claim = t.landscape ? 'Las bajas [[que pesan]]' : 'Las bajas\n[[que pesan]]'
    /** Crest + team name, then that team's absences as open rows (a list: left-aligned). */
    const block = (side: Side, x: number, y: number, w: number, h: number, cs: number, nameSize: number) => {
      const ly = y + cs + px(t, 26, 12)
      return [
        crestOf(side, x, y, cs),
        label(t, side === 'home' ? '{home}' : '{away}', { x: x + cs + px(t, 26, 14), y: y + cs / 2 - px(t, 28, 16), w: w - cs - px(t, 26, 14), h: px(t, 56, 32) }, 46, { name: side === 'home' ? 'Nombre local' : 'Nombre visitante', fill: { kind: 'solid', color: '$text' }, fontWeight: 700 }),
        E.playerList({ name: side === 'home' ? 'Bajas local' : 'Bajas visitante', side, filter: 'absences', variant: 'editorial', x, y: ly, width: w, height: Math.max(10, y + h - ly), maxItems: 3, nameSize, showStatus: true, showStat: false, showNumber: false, align: 'left' }),
      ]
    }
    const m = middle(t, false)
    const top = m.a - px(t, 12)
    if (t.H / t.W > 1.2) {
      // Tall formats: the two teams stacked at full column width, so each status
      // sits far from the name.
      const gap = px(t, t.story ? 64 : 44, 28)
      const cs = px(t, t.story ? 84 : 72, 44)
      const ns = px(t, 64, 36)
      // Each team gets room for its own number of absences (1–3 rows), so a team
      // without absences does not leave half the slide empty.
      const count = (s: Side) => Math.max(1, Math.min(3, match[s].players.filter((p) => p.status !== 'available').length))
      const head0 = cs + px(t, 26, 12)
      const unit = Math.min(ns * 3.6, (t.contentBottom - top - gap - head0 * 2) / (count('home') + count('away')))
      const hHome = head0 + unit * count('home')
      const total = hHome + gap + head0 + unit * count('away')
      const y0 = top + Math.max(0, (t.contentBottom - top - total) / 2)
      const w = dataRight(t) - t.left
      return {
        background: ink(),
        accent: '$red',
        elements: [
          ...cinematic(t),
          ...chrome(t),
          mainHead(t, claim),
          ...block('home', t.left, y0, w, hHome, cs, ns),
          ...block('away', t.left, y0 + hHome + gap, w, head0 + unit * count('away'), cs, ns),
        ],
      }
    }
    // 1:1 and 16:9: the two teams side by side under the headline.
    // A wide gutter keeps each status attached to its own column.
    const cs = px(t, 84, 44)
    const gap = px(t, t.landscape ? 170 : 120, 44)
    const cw = t.landscape ? Math.min(t.cw, 1240) : t.cw
    const x0 = t.cx - cw / 2
    const w = (cw - gap) / 2
    const h = t.contentBottom - top
    // 16:9 columns are wide enough for bigger names (rows stop at 3.6× the name size).
    const ns = px(t, t.landscape ? 76 : 64, 34)
    return {
      background: ink(),
      accent: '$red',
      elements: [
        ...cinematic(t),
        ...chrome(t),
        mainHead(t, claim),
        ...block('home', x0, top, w, h, cs, ns),
        ...block('away', x0 + w + gap, top, w, h, cs, ns),
      ],
    }
  },
}

export const STATS_TEMPLATES = [statisticalDominance, theNumbers, keyPlayers, performanceComparison, formTrends, giantStat, rankingSlide, absences]
