import * as E from '../model/elements'
import { uid } from '../model/ids'
import type { PitchView, SlideElement, TacticalAnnotation, TacticalPlayer, TacticsData } from '../model/types'
import { annotation, defaultTactics } from '../tactics/presets'
import { regionFor } from '../tactics/projection'
import type { TemplateDef } from './types'
import type { TCtx } from './kit'
import { bottomFade, chrome, cinematic, hl, ink, px, support } from './kit'
import { LH, footSupport, footTop, gapV, headZone, mainHead, vk } from './match'

// GOAT EDITORIAL · Táctica
// Black background, a large realistic pitch seen from above, flat players,
// ONE action drawn as ONE thick arrow in the slide accent, everything else dimmed.
//
// Family rhythm (v2, shared with match.ts): chrome → centered headline at
// t.contentTop → the pitch in the centre → one support line on the foot
// (t.contentBottom). 16:9 keeps the order inside a text column on the left,
// with the pitch filling the right side.

/** Neutral kits: the painters keep neutral grays exact, so the light kit follows the brand text colour. */
const WHITE = '$text'
const DARK = '#3A3A3A'

type Team = 'home' | 'away'
type P = [number: number, x: number, y: number, extra?: Partial<TacticalPlayer>]

function team(side: Team, list: P[]): TacticalPlayer[] {
  return list.map(([number, x, y, extra]) => ({ id: uid('tp'), team: side, number, label: '', x, y, highlight: false, ...extra }))
}

/** Thick accent movement line (the one action of the slide). */
function action(kind: TacticalAnnotation['kind'], points: { x: number; y: number }[], width = 0.95): TacticalAnnotation {
  return annotation(kind, points, '$accent', '', width)
}

/** Pixel size of a pitch view fitted inside maxW × maxH (camera 'top'). */
function fitPitch(view: PitchView, vertical: boolean, maxW: number, maxH: number) {
  const r = regionFor(view)
  const rw = r.x1 - r.x0
  const rh = r.y1 - r.y0
  const sw = vertical ? rh : rw
  const sh = vertical ? rw : rh
  const scale = Math.min(maxW / sw, maxH / sh)
  return { w: sw * scale, h: sh * scale, scale }
}

/**
 * Vertical pitch for the centre zone: full bleed when it fills the width,
 * otherwise aligned with the content column (never a few px short of the edge).
 */
function centrePitch(t: TCtx, view: PitchView, room: number) {
  const full = fitPitch(view, true, t.W, room)
  return full.w >= t.W - 1 ? full : fitPitch(view, true, Math.min(full.w, t.cw), room)
}

/** Landscape: text column on the left, the pitch fills the right side of the canvas. */
function sidePitch(t: TCtx, view: PitchView, colW: number) {
  const x0 = t.left + colW + px(t, 70)
  const x1 = t.W - px(t, 40)
  const fit = fitPitch(view, true, x1 - x0, t.ch)
  return { ...fit, x: x0 + (x1 - x0 - fit.w) / 2, y: t.contentTop + (t.ch - fit.h) / 2 }
}

/** One shared Anton size for headings that must fit `w` (≈0.43 em per uppercase glyph). */
function sharedSize(t: TCtx, texts: string[], w: number, size: number): number {
  const n = Math.max(...texts.map((x) => x.length))
  return Math.min(size, w / (n * 0.43) / t.s)
}

/** Flat editorial board on the realistic pitch. */
function board(over: Partial<TacticsData>): TacticsData {
  return defaultTactics({
    camera: 'top',
    playerStyle: 'flat',
    labelStyle: 'text',
    showNumbers: true,
    showLabels: true,
    glow: 0,
    highlightColor: '$accent',
    ...over,
  })
}

// ── 10 · Pizarra: salida de balón con tres ─────────────────────────────────
// The home team builds out from the goal at the top of the board (x = 105) and
// plays downwards. Tall formats show the whole half (the build-up structure and
// the press), short ones crop to the last 40 m. No token sits on a crop edge.
function buildUpData(view: PitchView, scale: number, homeFormation: string, awayFormation: string): TacticsData {
  const home = team('home', [
    [1, 101, 34],
    [4, 93, 14, { highlight: true }],
    [5, 93, 54, { highlight: true }],
    [6, 81, 34, { highlight: true }],
    [2, 74, 4],
    [3, 74, 64],
    [10, 71, 23],
    [8, 71, 45],
    [7, 57, 9],
    [9, 55, 34],
    [11, 57, 59],
  ])
  const away = team('away', [
    [10, 86, 23],
    [9, 86, 45],
    [11, 63, 10],
    [6, 62, 28],
    [8, 62, 40],
    [7, 63, 58],
    [2, 44, 10],
    [4, 43, 27],
    [5, 43, 41],
    [3, 44, 58],
    [1, 4, 34],
  ])
  return board({
    view,
    vertical: true,
    homeFormation,
    awayFormation,
    homeColor: WHITE,
    awayColor: DARK,
    playerSize: Math.max(14, 2.6 * scale),
    dimOthers: 0.4,
    showLabels: false,
    players: [...home, ...away],
    annotations: [
      // The pivot drops between the centre-backs: line of three.
      action('run', [{ x: 83.8, y: 34 }, { x: 92.6, y: 34 }], 1.1),
      annotation('ball', [{ x: 98.2, y: 31.4 }], '$text'),
    ],
  })
}

/** 16:9 text column: the headline on t.contentTop, centered in the column. */
function colHead(t: TCtx, content: string, colW: number, lines = 2): SlideElement {
  const z = headZone(t, lines)
  return hl(t, content, { y: z.y, w: colW, h: z.h }, z.size, { lineHeight: LH })
}

/** 16:9 support block on the foot of the text column. */
function colFoot(t: TCtx, content: string, colW: number, lines = 2, size = 46): SlideElement {
  const h = size * t.s * 1.22 * lines + px(t, 6)
  return support(t, content, { y: t.contentBottom - h, w: colW, h }, size, { name: 'Explicación', align: 'center', verticalAlign: 'bottom' })
}

/** Headline lines on vertical formats: two, except the square, where the pitch needs the room. */
const tacticLines = (t: TCtx) => (t.preset === 'square' ? 1 : 2)

export const tacticalBoard: TemplateDef = {
  id: 'tactical-board',
  number: 10,
  name: 'Tactical Board',
  category: 'tactics',
  description: 'Pizarra táctica: titular arriba, el campo a todo el ancho y una sola acción en acento.',
  build: (t, match) => {
    const sub = 'El pivote baja entre los centrales.'
    const data = (view: PitchView, scale: number) => buildUpData(view, scale, match.home.formation, match.away.formation)
    if (t.landscape) {
      const colW = t.cw * 0.4
      const f = sidePitch(t, 'half', colW)
      return {
        background: ink(),
        elements: [
          ...cinematic(t),
          ...chrome(t),
          colHead(t, '{home.short} sale\n[[con tres]]', colW),
          colFoot(t, 'El pivote baja entre los centrales y forma la línea de tres.', colW, 3),
          E.tactics({ name: 'Pizarra', x: f.x, y: f.y, width: f.w, height: f.h, tactics: data('half', f.scale) }),
        ],
      }
    }
    const lines = tacticLines(t)
    const head = lines === 2 ? '{home.short} sale\n[[con tres]]' : '{home.short} sale [[con tres]]'
    const a = headZone(t, lines).end + gapV(t)
    const b = footTop(t) - gapV(t)
    // The whole half when it still fills the column (story); the last 40 m otherwise.
    const view: PitchView = fitPitch('half', true, t.W, b - a).w >= t.cw ? 'half' : 'attackingThird'
    const fit = centrePitch(t, view, b - a)
    const py = a + (b - a - fit.h) / 2
    return {
      background: ink(),
      elements: [
        ...cinematic(t),
        ...chrome(t),
        mainHead(t, head, {}, lines),
        E.tactics({ name: 'Pizarra', x: (t.W - fit.w) / 2, y: py, width: fit.w, height: fit.h, tactics: data(view, fit.scale) }),
        footSupport(t, sub, 1, 46, { name: 'Explicación' }),
      ],
    }
  },
}

// ── 11 · Duelo de sistemas ──────────────────────────────────────────────────
function systemsData(vertical: boolean, scale: number, homeFormation: string, awayFormation: string): TacticsData {
  return board({
    view: 'full',
    vertical,
    homeFormation,
    awayFormation,
    homeColor: '$accent',
    awayColor: WHITE,
    playerSize: Math.max(12, Math.min(40, 3.95 * scale)),
    showLabels: false,
  })
}

export const formationBattle: TemplateDef = {
  id: 'formation-battle',
  number: 11,
  name: 'Formation Battle',
  category: 'tactics',
  description: 'Las dos alineaciones sobre un campo cenital: un equipo en acento, el otro en blanco.',
  build: (t, match) => {
    const homeHead = '{home.short} [[{home.formation}]]'
    const awayHead = '{away.short} {away.formation}'
    const homeTxt = `${match.home.shortName || match.home.name} ${match.home.formation}`
    const awayTxt = `${match.away.shortName || match.away.name} ${match.away.formation}`
    const els: SlideElement[] = [...cinematic(t), ...chrome(t)]
    const z = headZone(t, 1)
    const data = (scale: number) => systemsData(false, scale, match.home.formation, match.away.formation)
    if (!t.landscape && t.H > t.W * 1.1) {
      // Tall formats: the home system on top (headline zone), the away one on the foot,
      // the pitch full width between them (home plays left → right).
      const size = sharedSize(t, [homeTxt, awayTxt], t.cw, z.size)
      const room = t.ch - z.h * 2
      const full = fitPitch('full', false, t.W, room)
      const gap = Math.max(px(t, 36), Math.min(gapV(t), (room - full.h) / 2))
      const fit = fitPitch('full', false, t.W, room - gap * 2)
      const py = t.contentTop + z.h + (room - fit.h) / 2
      els.push(
        hl(t, homeHead, { y: z.y, h: z.h }, size, { name: 'Sistema local', lineHeight: LH }),
        E.tactics({ name: 'Duelo de sistemas', x: (t.W - fit.w) / 2, y: py, width: fit.w, height: fit.h, tactics: data(fit.scale) }),
        hl(t, awayHead, { y: t.contentBottom - z.h, h: z.h }, size, { name: 'Sistema visitante', lineHeight: LH, verticalAlign: 'bottom' }),
      )
      return { background: ink(), elements: els }
    }
    // Square / 16:9: each system centered over its own half, the pitch under them.
    const fit = fitPitch('full', false, t.cw, t.ch - z.h - gapV(t))
    const pxx = (t.W - fit.w) / 2
    const py = t.contentTop + z.h + gapV(t) + (t.ch - z.h - gapV(t) - fit.h) / 2
    const colW = fit.w / 2 - px(t, 24)
    const size = sharedSize(t, [homeTxt, awayTxt], colW, z.size)
    els.push(
      hl(t, homeHead, { x: pxx, y: z.y, w: colW, h: z.h }, size, { name: 'Sistema local', lineHeight: LH, verticalAlign: 'bottom' }),
      hl(t, awayHead, { x: pxx + fit.w - colW, y: z.y, w: colW, h: z.h }, size, { name: 'Sistema visitante', lineHeight: LH, verticalAlign: 'bottom' }),
      E.tactics({ name: 'Duelo de sistemas', x: pxx, y: py, width: fit.w, height: fit.h, tactics: data(fit.scale) }),
    )
    return { background: ink(), elements: els }
  },
}

// ── 12 · Movimiento clave: la diagonal del extremo ─────────────────────────
function cutInsideData(view: PitchView, scale: number, homeFormation: string, awayFormation: string): TacticsData {
  // Right winger receives wide, drives inside across the full-back and shoots far post.
  // Both teams stay neutral so the accent lives only on the winger's ring and his run.
  const home = team('home', [
    [1, 5, 34],
    [3, 55, 8],
    [5, 40, 24],
    [4, 40, 44],
    [2, 60, 58],
    [6, 62, 34],
    [8, 72, 22],
    [10, 79, 40],
    [11, 86, 9],
    [9, 90.5, 30],
    [7, 79, 63, { highlight: true, label: 'Extremo' }],
  ])
  const away = team('away', [
    [1, 102.5, 37.5],
    [2, 93, 11],
    [4, 95, 23],
    [5, 94.5, 47.5],
    [3, 90, 59],
    [7, 80, 13],
    [6, 82, 28],
    [8, 84, 45],
    [11, 71, 52],
    [9, 64, 26],
    [10, 62, 44],
  ])
  return board({
    view,
    vertical: true,
    homeFormation,
    awayFormation,
    homeColor: WHITE,
    awayColor: DARK,
    highlightColor: '$accent',
    playerSize: Math.max(14, Math.min(46, 2.7 * scale)),
    dimOthers: 0.3,
    players: [...home, ...away],
    annotations: [
      action('curve', [{ x: 80.6, y: 60.3 }, { x: 81.5, y: 48 }, { x: 91.5, y: 41.5 }], 1.1),
      annotation('pass', [{ x: 92.6, y: 40.6 }, { x: 104.6, y: 31.6 }], '$text', '', 0.4),
    ],
  })
}

const STEPS = [
  { n: '1', txt: 'Recibe pegado a la banda', short: 'Recibe pegado\na la banda' },
  { n: '2', txt: 'Conduce hacia dentro', short: 'Conduce\nhacia dentro' },
  { n: '3', txt: 'Remata al palo largo', short: 'Remata al\npalo largo' },
]

/** 16:9 column: one step per row (accent numeral + white line). */
function stepRows(t: TCtx, x: number, y: number, w: number, rowH: number, nSize: number, tSize: number): SlideElement[] {
  const nw = px(t, 70, 40)
  return STEPS.flatMap((s, i) => {
    const ry = y + i * rowH
    return [
      hl(t, s.n, { x, y: ry, w: nw, h: rowH }, nSize, { name: `Paso ${s.n}`, verticalAlign: 'middle', fill: { kind: 'solid', color: '$accent' }, autoFit: false }),
      support(t, s.txt, { x: x + nw + px(t, 18), y: ry, w: w - nw - px(t, 18), h: rowH }, tSize, { name: `Texto paso ${s.n}`, verticalAlign: 'middle', fontWeight: 600, fill: { kind: 'solid', color: '$text' } }),
    ]
  })
}

/** Vertical formats: three centered columns on the foot (accent numeral over two short lines). */
function stepCols(t: TCtx, y: number, nPx: number, tPx: number): SlideElement[] {
  const colW = t.cw / 3
  const nh = nPx * 1.04
  const ty = y + nh + px(t, 12)
  return STEPS.flatMap((s, i) => {
    const x = t.left + i * colW
    return [
      hl(t, s.n, { x, y, w: colW, h: nh }, nPx / t.s, { name: `Paso ${s.n}`, fill: { kind: 'solid', color: '$accent' }, autoFit: false }),
      support(t, s.short, { x: x + px(t, 8), y: ty, w: colW - px(t, 16), h: tPx * 1.22 * 2 + 4 }, tPx / t.s, { name: `Texto paso ${s.n}`, align: 'center', fontWeight: 600, fill: { kind: 'solid', color: '$text' } }),
    ]
  })
}

const stepColsH = (t: TCtx, nPx: number, tPx: number) => nPx * 1.04 + px(t, 12) + tPx * 1.22 * 2 + 4

export const keyMovement: TemplateDef = {
  id: 'key-movement',
  number: 12,
  name: 'Key Tactical Movement',
  category: 'tactics',
  description: 'Un movimiento concreto en el último tercio: una flecha gruesa y tres pasos.',
  build: (t, match) => {
    const k = vk(t)
    const els: SlideElement[] = [...cinematic(t), ...chrome(t)]
    if (t.landscape) {
      const colW = t.cw * 0.4
      // The whole half fills the height; headline on top of the column, the steps on its foot.
      const f = sidePitch(t, 'half', colW)
      const rowH = px(t, 96)
      els.push(
        colHead(t, '{home.short} [[rompe]]\npor dentro', colW),
        ...stepRows(t, t.left, t.contentBottom - rowH * STEPS.length, colW, rowH, 76 * k, 46 * k),
        E.tactics({ name: 'Movimiento', x: f.x, y: f.y, width: f.w, height: f.h, tactics: cutInsideData('half', f.scale, match.home.formation, match.away.formation) }),
      )
      return { background: ink(), accent: '$yellow', elements: els }
    }
    const lines = tacticLines(t)
    const head = lines === 2 ? '{home.short} [[rompe]]\npor dentro' : '{home.short} [[rompe]] por dentro'
    const nPx = px(t, 72)
    const tPx = px(t, 42)
    const sy = t.contentBottom - stepColsH(t, nPx, tPx)
    const a = headZone(t, lines).end + gapV(t)
    const b = sy - px(t, 48)
    const fit = centrePitch(t, 'attackingThird', b - a)
    const py = a + (b - a - fit.h) / 2
    els.push(
      mainHead(t, head, {}, lines),
      E.tactics({ name: 'Movimiento', x: (t.W - fit.w) / 2, y: py, width: fit.w, height: fit.h, tactics: cutInsideData('attackingThird', fit.scale, match.home.formation, match.away.formation) }),
      ...stepCols(t, sy, nPx, tPx),
    )
    return { background: ink(), accent: '$yellow', elements: els }
  },
}

// ── 19 · Estadio 3D: el contragolpe ─────────────────────────────────────────
// Ball won in midfield, a through ball and ONE bold run in behind the high line.
// The action is compact (≈25 × 20 m) so the camera can sit close and the players read big.
const CAM = { azimuth: 180, elevation: 46, fov: 34 }

function counterData(homeFormation: string, awayFormation: string): TacticsData {
  const home = team('home', [
    [1, 5, 34],
    [3, 34, 12],
    [5, 30, 27],
    [4, 30, 42],
    [2, 36, 58],
    [6, 46, 36],
    [8, 61, 28],
    [10, 56, 46],
    [11, 65, 12],
    [9, 66, 37],
    [7, 62, 58],
  ])
  const away = team('away', [
    [1, 100, 34],
    [3, 70.5, 18],
    [5, 71, 31],
    [4, 70.5, 44],
    [2, 69, 58],
    [6, 58, 23],
    [8, 57, 38],
    [11, 53, 12],
    [10, 54, 30],
    [7, 52, 54],
    [9, 47, 30],
  ])
  return defaultTactics({
    homeFormation,
    awayFormation,
    homeColor: '#FFFFFF',
    awayColor: '#5E5E5E',
    playerSize: 22,
    showLabels: false,
    // Number badges would be white on white for the light kit: the scene reads by kit colour.
    showNumbers: true,
    highlightColor: '$accent',
    players: [...home, ...away],
    annotations: [
      annotation('ball', [{ x: 62.4, y: 27 }], '$text'),
      annotation('pass', [{ x: 63, y: 26.4 }, { x: 73.5, y: 21.5 }, { x: 84, y: 18.6 }], '$text', '', 0.6),
      action('run', [{ x: 66.4, y: 12.6 }, { x: 77, y: 9.6 }, { x: 86, y: 16.6 }], 1.15),
    ],
  })
}

const LIGHT = { exposure: 0.62, floodlights: 1.1, fog: 0, accent: '$text', rim: 0.3, shadows: false }

export const stadium3D: TemplateDef = {
  id: 'stadium-3d',
  number: 19,
  name: 'Estadio 3D',
  category: 'tactics',
  description: 'Escena 3D (Three.js) a ras de césped: una sola acción en acento.',
  build: (t, match) => {
    const head = '{home.short} [[mata]]\na la contra'
    const sub = 'Robo en el centro y carrera a la espalda.'
    // Camera framings solved per format so the whole action (runner, passer, both arrow heads) sits
    // inside the safe area: the story looks at a point short of the action so it rises above the platform UI.
    const scene = (x: number, y: number, w: number, h: number, distance: number, target: { x: number; y: number }) =>
      E.stadium3d({
        name: 'Estadio 3D',
        x,
        y,
        width: w,
        height: h,
        tactics: counterData(match.home.formation, match.away.formation),
        camera: { ...CAM, distance, targetX: target.x, targetY: target.y },
        lighting: { ...LIGHT },
        background: 'transparent',
        showStands: false,
      })
    if (t.landscape) {
      const colW = t.cw * 0.4
      const sx = t.left + colW + px(t, 90)
      return {
        background: ink(),
        elements: [
          ...cinematic(t, 'stadium'),
          scene(sx, 0, t.W - sx, t.H, 48, { x: 70, y: 20 }),
          ...chrome(t),
          colHead(t, head, colW),
          colFoot(t, sub, colW, 2),
        ],
      }
    }
    const lines = tacticLines(t)
    const z = headZone(t, lines)
    const top = z.end + px(t, 24)
    // The scene bleeds to the bottom edge; a soft fade under the foot keeps the support line legible.
    const fy = footTop(t)
    const fadeTop = fy - px(t, 200)
    return {
      background: ink(),
      elements: [
        ...cinematic(t, 'stadium'),
        t.story ? scene(0, top, t.W, t.H - top, 52, { x: 64, y: 20 }) : scene(0, top, t.W, t.H - top, t.H > t.W * 1.1 ? 44 : 40, { x: 67.5, y: 20 }),
        { ...bottomFade(t, 0.5), name: 'Fundido inferior', y: fadeTop, height: fy + px(t, 12) - fadeTop },
        E.shape({ name: 'Base', shape: 'rect', x: 0, y: fy + px(t, 12), width: t.W, height: t.H - fy - px(t, 12), cornerRadius: 0, fill: { kind: 'solid', color: '$bg' }, locked: true }),
        ...chrome(t),
        mainHead(t, lines === 2 ? head : head.replace('\n', ' '), {}, lines),
        footSupport(t, sub, 1, 46, { name: 'Explicación', fill: { kind: 'solid', color: '$text' } }),
      ],
    }
  },
}

export const TACTICS_TEMPLATES = [tacticalBoard, formationBattle, keyMovement, stadium3D]
