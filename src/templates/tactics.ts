import * as E from '../model/elements'
import { uid } from '../model/ids'
import type { PitchView, SlideElement, TacticalAnnotation, TacticalPlayer, TacticsData } from '../model/types'
import { annotation, defaultTactics } from '../tactics/presets'
import { regionFor } from '../tactics/projection'
import type { TemplateDef } from './types'
import type { TCtx } from './kit'
import { cinematic, hl, ink, px, signature, support } from './kit'

// GOAT EDITORIAL · Táctica
// Black background, a large realistic pitch seen from above, flat players,
// ONE action drawn as ONE thick arrow in the slide accent, everything else dimmed.

/** Vertical type factor: 1 on story/portrait, ≈0.85 on square/landscape. */
const vk = (t: TCtx) => Math.min(1, t.v + 0.18)

/** Neutral kits. Pure white is tinted ivory by the painter and very dark grays are lifted, so use these. */
const WHITE = '#EBEBEB'
const DARK = '#444444'

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
function buildUpData(vertical: boolean, scale: number, homeFormation: string, awayFormation: string): TacticsData {
  // Home (white) builds from its own goal, the opponent presses with two forwards.
  const home = team('home', [
    [1, 4, 34],
    [5, 11, 14, { highlight: true }],
    [4, 11, 54, { highlight: true }],
    [6, 23, 34, { highlight: true }],
    [3, 28, 5],
    [2, 28, 63],
    [8, 33, 21],
    [10, 34, 47],
    [11, 58, 8],
    [9, 62, 34],
    [7, 58, 60],
  ])
  const away = team('away', [
    [9, 22, 22],
    [10, 22, 46],
    [7, 44, 8],
    [8, 42, 26],
    [6, 42, 42],
    [11, 44, 60],
    [2, 62, 12],
    [4, 60, 28],
    [5, 60, 40],
    [3, 62, 56],
    [1, 100, 34],
  ])
  const r = Math.max(14, 2.6 * scale)
  return board({
    view: 'defensiveThird',
    vertical,
    homeFormation,
    awayFormation,
    homeColor: WHITE,
    awayColor: DARK,
    playerSize: r,
    dimOthers: 0.42,
    showLabels: false,
    players: [...home, ...away],
    annotations: [
      // The pivot drops between the centre-backs: line of three.
      action('run', [{ x: 20.2, y: 34 }, { x: 11.5, y: 34 }], 1.1),
      annotation('ball', [{ x: 7.6, y: 36.2 }], '$text'),
    ],
  })
}

export const tacticalBoard: TemplateDef = {
  id: 'tactical-board',
  number: 10,
  name: 'Tactical Board',
  category: 'tactics',
  description: 'Pizarra táctica: el campo a todo el ancho y una sola acción en acento.',
  build: (t, match) => {
    const k = vk(t)
    const head = '{home.short} sale\n[[con tres]]'
    const sub = 'El pivote baja entre los centrales y forma la línea de tres.'
    if (t.landscape) {
      const colW = t.cw * 0.36
      const f = sidePitch(t, 'defensiveThird', colW)
      const hh = px(t, 260)
      return {
        background: ink(),
        elements: [
          ...cinematic(t),
          signature(t),
          hl(t, head, { y: f.y, w: colW, h: hh }, 130 * k),
          support(t, sub, { y: f.y + hh + px(t, 30), w: colW, h: px(t, 200) }, 46, { name: 'Explicación' }),
          E.tactics({ name: 'Pizarra', x: f.x, y: f.y, width: f.w, height: f.h, tactics: buildUpData(true, f.scale, match.home.formation, match.away.formation) }),
        ],
      }
    }
    const hh = px(t, t.story ? 300 : 250)
    const sh = px(t, 130)
    const gap = px(t, 50)
    const fit = fitPitch('defensiveThird', true, t.W, t.ch - hh - sh - gap * 2)
    // Headline, pitch and caption stacked and centred in the safe area.
    const y0 = t.contentTop + Math.max(0, (t.ch - (hh + gap * 1.8 + fit.h + sh)) / 2)
    const py = y0 + hh + gap
    const sy = py + fit.h + gap * 0.8
    return {
      background: ink(),
      elements: [
        ...cinematic(t),
        signature(t),
        hl(t, head, { y: y0, h: hh }, 140 * k, { verticalAlign: 'bottom' }),
        E.tactics({ name: 'Pizarra', x: (t.W - fit.w) / 2, y: py, width: fit.w, height: fit.h, tactics: buildUpData(true, fit.scale, match.home.formation, match.away.formation) }),
        support(t, sub, { y: sy, h: sh }, 48, { name: 'Explicación' }),
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
    const k = vk(t)
    const fs = 120 * k
    const homeHead = '{home.short} [[{home.formation}]]'
    const awayHead = '{away.short} {away.formation}'
    const els: SlideElement[] = [...cinematic(t), signature(t)]
    const vertical = t.story
    if (vertical) {
      // Away defends the top goal, home the bottom one: each name sits next to its half.
      const th = px(t, 135)
      const gap = px(t, 30)
      const top = t.contentTop + th + gap
      const bottom = t.contentBottom - th - gap
      const fit = fitPitch('full', true, t.W, bottom - top)
      const pxx = (t.W - fit.w) / 2
      const py = top + (bottom - top - fit.h) / 2
      els.push(
        hl(t, awayHead, { y: py - gap - th, h: th }, fs, { name: 'Sistema visitante', verticalAlign: 'bottom', align: 'center' }),
        E.tactics({ name: 'Duelo de sistemas', x: pxx, y: py, width: fit.w, height: fit.h, tactics: systemsData(true, fit.scale, match.home.formation, match.away.formation) }),
        hl(t, homeHead, { y: py + fit.h + gap, h: th }, fs, { name: 'Sistema local', align: 'center' }),
      )
      return { background: ink(), elements: els }
    }
    // Shorter formats: horizontal pitch, home attacks left → right.
    const homeTxt = `${match.home.shortName} ${match.home.formation}`
    const awayTxt = `${match.away.shortName} ${match.away.formation}`
    if (!t.landscape && t.H > t.W * 1.1) {
      // Room for one name above (home, left) and one below (away, right) the pitch.
      const th = px(t, 130)
      const gap = px(t, 26)
      const fit = fitPitch('full', false, t.W, t.ch - (th + gap) * 2)
      const py = t.contentTop + th + gap + (t.ch - (th + gap) * 2 - fit.h) / 2
      const size = sharedSize(t, [homeTxt, awayTxt], t.cw, fs)
      els.push(
        hl(t, homeHead, { y: py - gap - th, h: th }, size, { name: 'Sistema local', verticalAlign: 'bottom' }),
        E.tactics({ name: 'Duelo de sistemas', x: (t.W - fit.w) / 2, y: py, width: fit.w, height: fit.h, tactics: systemsData(false, fit.scale, match.home.formation, match.away.formation) }),
        hl(t, awayHead, { y: py + fit.h + gap, h: th }, size, { name: 'Sistema visitante', align: 'right' }),
      )
      return { background: ink(), elements: els }
    }
    const th = px(t, 130)
    const gap = px(t, 20)
    const fit = fitPitch('full', false, t.landscape ? t.cw : t.W, t.ch - th - gap)
    const pxx = (t.W - fit.w) / 2
    const py = t.contentTop + th + gap + (t.ch - th - gap - fit.h) / 2
    const lx = Math.max(t.left, pxx)
    const rx = Math.min(t.right, pxx + fit.w)
    const colW = (rx - lx) / 2 - px(t, 20)
    const size = sharedSize(t, [homeTxt, awayTxt], colW, fs)
    els.push(
      hl(t, homeHead, { x: lx, y: py - gap - th, w: colW, h: th }, size, { name: 'Sistema local', verticalAlign: 'bottom' }),
      hl(t, awayHead, { x: rx - colW, y: py - gap - th, w: colW, h: th }, size, { name: 'Sistema visitante', verticalAlign: 'bottom', align: 'right' }),
      E.tactics({ name: 'Duelo de sistemas', x: pxx, y: py, width: fit.w, height: fit.h, tactics: systemsData(false, fit.scale, match.home.formation, match.away.formation) }),
    )
    return { background: ink(), elements: els }
  },
}

// ── 12 · Movimiento clave: la diagonal del extremo ─────────────────────────
function cutInsideData(vertical: boolean, scale: number, homeFormation: string, awayFormation: string): TacticsData {
  // Right winger (accent) receives wide, drives inside across the full-back and shoots far post.
  const home = team('home', [
    [1, 5, 34],
    [3, 52, 8],
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
    [3, 90, 59, { highlight: true, label: 'Lateral' }],
    [7, 80, 13],
    [6, 82, 28],
    [8, 84, 45],
    [11, 71, 52],
    [9, 64, 26],
    [10, 62, 44],
  ])
  return board({
    view: 'attackingThird',
    vertical,
    homeFormation,
    awayFormation,
    homeColor: '$accent',
    awayColor: WHITE,
    highlightColor: '$text',
    playerSize: Math.max(14, Math.min(46, 2.7 * scale)),
    dimOthers: 0.3,
    players: [...home, ...away],
    annotations: [
      action('curve', [{ x: 80.6, y: 60.3 }, { x: 81.5, y: 48 }, { x: 91.5, y: 41.5 }], 1.0),
      annotation('pass', [{ x: 92.6, y: 40.6 }, { x: 104.6, y: 31.6 }], '$text', '', 0.4),
    ],
  })
}

const STEPS = [
  { n: '1', txt: 'Recibe pegado a la banda' },
  { n: '2', txt: 'Conduce hacia dentro' },
  { n: '3', txt: 'Remata al palo largo' },
]

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

export const keyMovement: TemplateDef = {
  id: 'key-movement',
  number: 12,
  name: 'Key Tactical Movement',
  category: 'tactics',
  description: 'Un movimiento concreto en el último tercio: una flecha gruesa y tres pasos.',
  build: (t, match) => {
    const k = vk(t)
    const head = '{home.short} [[rompe]]\npor dentro'
    const els: SlideElement[] = [...cinematic(t), signature(t)]
    if (t.landscape) {
      const colW = t.cw * 0.38
      const f = sidePitch(t, 'attackingThird', colW)
      const hh = px(t, 250)
      els.push(
        hl(t, head, { y: f.y, w: colW, h: hh }, 125 * k),
        ...stepRows(t, t.left, f.y + hh + px(t, 40), colW, px(t, 96), 76 * k, 46 * k),
        E.tactics({ name: 'Movimiento', x: f.x, y: f.y, width: f.w, height: f.h, tactics: cutInsideData(true, f.scale, match.home.formation, match.away.formation) }),
      )
      return { background: ink(), accent: '$yellow', elements: els }
    }
    const hh = px(t, t.story ? 270 : 230)
    const stepsH = px(t, t.story ? 330 : 250)
    const top = t.contentTop + hh + px(t, 40)
    const bottom = t.contentBottom - stepsH - px(t, 30)
    const fit = fitPitch('attackingThird', true, t.W, bottom - top)
    const py = top + (bottom - top - fit.h) / 2
    els.push(
      hl(t, head, { y: t.contentTop, h: hh }, 125 * k, { verticalAlign: 'bottom' }),
      E.tactics({ name: 'Movimiento', x: (t.W - fit.w) / 2, y: py, width: fit.w, height: fit.h, tactics: cutInsideData(true, fit.scale, match.home.formation, match.away.formation) }),
      ...stepRows(t, t.left, py + fit.h + px(t, 30), t.cw, stepsH / STEPS.length, 76 * k, 47 * k),
    )
    return { background: ink(), accent: '$yellow', elements: els }
  },
}

// ── 19 · Estadio 3D: el contragolpe ─────────────────────────────────────────
function counterData(homeFormation: string, awayFormation: string): TacticsData {
  // Ball won in midfield, through ball and a run in behind the high line.
  const home = team('home', [
    [1, 5, 34],
    [3, 36, 10],
    [5, 30, 26],
    [4, 30, 44],
    [2, 38, 60],
    [6, 46, 36],
    [8, 58, 30],
    [10, 56, 48],
    [11, 64, 11],
    [9, 66, 38],
    [7, 62, 58],
  ])
  const away = team('away', [
    [1, 100, 34],
    [2, 69, 9],
    [5, 70, 26],
    [4, 70, 42],
    [3, 69, 58],
    [6, 60, 26],
    [8, 58, 40],
    [7, 52, 14],
    [10, 54, 34],
    [11, 52, 56],
    [9, 46, 30],
  ])
  return defaultTactics({
    homeFormation,
    awayFormation,
    homeColor: WHITE,
    awayColor: DARK,
    playerSize: 18,
    showLabels: false,
    highlightColor: '$accent',
    players: [...home, ...away],
    annotations: [
      annotation('ball', [{ x: 59.3, y: 31 }], '$text'),
      annotation('pass', [{ x: 60, y: 29 }, { x: 71, y: 21 }, { x: 84, y: 17 }], '$text', '', 0.5),
      action('run', [{ x: 65.5, y: 11 }, { x: 78, y: 9 }, { x: 89, y: 20 }]),
    ],
  })
}

export const stadium3D: TemplateDef = {
  id: 'stadium-3d',
  number: 19,
  name: 'Estadio 3D',
  category: 'tactics',
  description: 'Escena 3D (Three.js) a ras de césped: una sola acción en acento.',
  build: (t, match) => {
    const k = vk(t)
    const head = '{home.short} [[mata]]\na la contra'
    const sub = 'Robo en el centro y carrera a la espalda.'
    if (t.landscape) {
      const colW = t.cw * 0.4
      const hh = px(t, 300)
      const sx = t.left + colW + px(t, 90)
      return {
        background: ink(),
        elements: [
          ...cinematic(t, 'stadium'),
          E.stadium3d({
            name: 'Estadio 3D',
            x: sx,
            y: 0,
            width: t.W - sx,
            height: t.H,
            tactics: counterData(match.home.formation, match.away.formation),
            camera: { azimuth: 180, elevation: 52, distance: 70, fov: 36, targetX: 70, targetY: 24 },
            lighting: { exposure: 0.5, floodlights: 1.1, fog: 0, accent: '$text', rim: 0.3 },
            background: 'transparent',
            showStands: false,
          }),
          signature(t),
          hl(t, head, { y: t.contentTop, w: colW, h: hh }, 125 * k),
          support(t, sub, { y: t.contentTop + hh + px(t, 30), w: colW, h: px(t, 140) }, 46, { name: 'Explicación' }),
        ],
      }
    }
    const hh = px(t, t.story ? 280 : 240)
    const sy = t.contentTop + hh + px(t, 16)
    const sh = px(t, 70)
    const top = sy + sh + px(t, 30)
    // Same framing as the story: wider frames move the camera closer so the pitch still fills them.
    const dist = 60 * Math.min(1, Math.sqrt((t.H - top) / t.W / 1.07))
    return {
      background: ink(),
      elements: [
        ...cinematic(t, 'stadium'),
        E.stadium3d({
          name: 'Estadio 3D',
          x: 0,
          y: top,
          width: t.W,
          height: t.H - top,
          tactics: counterData(match.home.formation, match.away.formation),
          camera: { azimuth: 180, elevation: 52, distance: dist, fov: 36, targetX: t.story ? 68 : 71, targetY: 22 },
          lighting: { exposure: 0.5, floodlights: 1.1, fog: 0, accent: '$text', rim: 0.3 },
          background: 'transparent',
          showStands: false,
        }),
        signature(t),
        hl(t, head, { y: t.contentTop, h: hh }, 125 * k, { verticalAlign: 'bottom' }),
        support(t, sub, { y: sy, h: sh }, 46, { name: 'Explicación' }),
      ],
    }
  },
}

export const TACTICS_TEMPLATES = [tacticalBoard, formationBattle, keyMovement, stadium3D]
