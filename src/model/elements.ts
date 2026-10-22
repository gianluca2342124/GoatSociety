import { uid } from './ids'
import { defaultTactics } from '../tactics/presets'
import type {
  BrandMarkElement,
  CrestElement,
  EffectElement,
  ElementType,
  FormRowElement,
  GlassElement,
  IconElement,
  ImageElement,
  MascotElement,
  MatchListElement,
  Model3DElement,
  PlayerListElement,
  BadgeElement,
  PredictionElement,
  ProbabilityElement,
  ScoreboardElement,
  ProgressRingElement,
  RankingElement,
  ResultsListElement,
  ShapeElement,
  SlideElement,
  Stadium3DElement,
  StatBarsElement,
  StatNumberElement,
  TableElement,
  TacticsElement,
  TextElement,
} from './types'

type Base = Pick<SlideElement, 'id' | 'name' | 'x' | 'y' | 'width' | 'height' | 'rotation' | 'opacity' | 'visible' | 'locked'>

function base(name: string, x = 100, y = 100, width = 400, height = 200): Base {
  return { id: uid('el'), name, x, y, width, height, rotation: 0, opacity: 1, visible: true, locked: false }
}

export const ELEMENT_LABELS: Record<ElementType, string> = {
  text: 'Texto',
  shape: 'Forma',
  image: 'Imagen',
  crest: 'Escudo',
  statBars: 'Barras comparativas',
  statNumber: 'Dato destacado',
  progressRing: 'Anillo de progreso',
  formRow: 'Racha / forma',
  table: 'Tabla',
  playerList: 'Lista de jugadores',
  matchList: 'Agenda de partidos',
  prediction: 'Pronóstico',
  resultsList: 'Resultados verificados',
  ranking: 'Ranking',
  probability: 'Probabilidad 1X2',
  badge: 'Etiqueta',
  scoreboard: 'Marcador',
  tactics: 'Pizarra táctica',
  stadium3d: 'Estadio 3D',
  model3d: 'Modelo 3D',
  mascot: 'Mascota GOAT',
  brandMark: 'Marca',
  icon: 'Icono',
  effect: 'Efecto',
  glass: 'Cristal esmerilado',
}

export function text(p: Partial<TextElement> = {}): TextElement {
  return {
    ...base('Texto', 90, 200, 900, 160),
    type: 'text',
    text: 'Escribe tu titular',
    fontFamily: '$headline',
    fontSize: 120,
    fontWeight: 400,
    italic: false,
    fill: { kind: 'solid', color: '$text' },
    accentColor: '$accent',
    align: 'center',
    verticalAlign: 'middle',
    lineHeight: 0.95,
    letterSpacing: 0,
    uppercase: true,
    autoFit: true,
    minFontSize: 24,
    ...p,
  }
}

export function shape(p: Partial<ShapeElement> = {}): ShapeElement {
  return {
    ...base('Forma', 140, 300, 400, 240),
    type: 'shape',
    shape: 'rect',
    fill: { kind: 'solid', color: '$surface' },
    cornerRadius: 24,
    ...p,
  }
}

export function image(p: Partial<ImageElement> = {}): ImageElement {
  return {
    ...base('Imagen', 240, 400, 600, 600),
    type: 'image',
    assetId: null,
    fit: 'contain',
    focusX: 0.5,
    focusY: 0.5,
    cornerRadius: 0,
    flipX: false,
    grayscale: false,
    fadeBottom: 0,
    ...p,
  }
}

export function crest(p: Partial<CrestElement> = {}): CrestElement {
  return {
    ...base('Escudo', 340, 400, 400, 400),
    type: 'crest',
    side: 'home',
    customAssetId: null,
    customName: '',
    ring: { enabled: false, color: '$text', width: 3, glow: 0 },
    aura: 0,
    ...p,
  }
}

export function statBars(p: Partial<StatBarsElement> = {}): StatBarsElement {
  return {
    ...base('Barras comparativas', 90, 500, 900, 700),
    type: 'statBars',
    source: 'match',
    rows: [],
    statIds: [],
    maxRows: 3,
    style: 'editorial',
    colorMode: 'leader',
    accentColor: '$accent',
    scaleMode: 'pair',
    fixedMax: 100,
    homeColor: '$home',
    awayColor: '$away',
    trackColor: '$text',
    labelColor: '$muted',
    valueColor: '$text',
    labelFont: '$label',
    valueFont: '$numbers',
    labelSize: 40,
    valueSize: 130,
    barHeight: 26,
    rowGap: 56,
    showCrests: false,
    highlightLeader: true,
    decimalSeparator: ',',
    ...p,
  }
}

export function statNumber(p: Partial<StatNumberElement> = {}): StatNumberElement {
  return {
    ...base('Dato destacado', 90, 500, 900, 360),
    type: 'statNumber',
    value: '3 DE 3',
    prefix: '',
    suffix: '',
    label: 'Partidos en casa',
    description: 'En los que ha encajado al menos un gol.',
    valueFont: '$numbers',
    valueSize: 260,
    valueColor: '$accent',
    accentColor: '$accent',
    labelColor: '$text',
    textColor: '$muted',
    layout: 'hero',
    align: 'left',
    cardFill: '$surface',
    cardOpacity: 0.8,
    ...p,
  }
}

export function progressRing(p: Partial<ProgressRingElement> = {}): ProgressRingElement {
  return {
    ...base('Anillo', 340, 600, 400, 460),
    type: 'progressRing',
    value: 70,
    max: 100,
    label: 'Ambos marcan',
    sublabel: 'últimos 10',
    color: '$accent',
    trackColor: '$text',
    thickness: 22,
    valueFont: '$numbers',
    textColor: '$text',
    showPercent: true,
    decimals: 0,
    ...p,
  }
}

export function formRow(p: Partial<FormRowElement> = {}): FormRowElement {
  return {
    ...base('Racha', 140, 600, 800, 110),
    type: 'formRow',
    source: 'home',
    results: ['W', 'D', 'W', 'L', 'W'],
    shape: 'letter',
    winColor: '$accent',
    drawColor: '$muted',
    lossColor: '$muted',
    textColor: '#050505',
    showLetters: true,
    gap: 14,
    newestFirst: true,
    ...p,
  }
}

export function table(p: Partial<TableElement> = {}): TableElement {
  return {
    ...base('Tabla', 90, 600, 900, 420),
    type: 'table',
    columns: ['Partido', 'Fecha', 'Resultado'],
    rows: [
      ['{home} vs {away}', '12/03', '2 - 1'],
      ['{away} vs {home}', '04/11', '1 - 1'],
      ['{home} vs {away}', '18/04', '0 - 2'],
    ],
    headerColor: '$muted',
    textColor: '$text',
    lineColor: '$text',
    accentColumn: 2,
    accentColor: '$text',
    font: '$label',
    fontSize: 34,
    headerFont: '$label',
    rowHeight: 84,
    zebra: false,
    ...p,
  }
}

export function playerList(p: Partial<PlayerListElement> = {}): PlayerListElement {
  return {
    ...base('Jugadores', 90, 600, 440, 520),
    type: 'playerList',
    side: 'home',
    filter: 'key',
    maxItems: 3,
    textColor: '$text',
    mutedColor: '$muted',
    accentColor: '$accent',
    nameFont: '$label',
    nameSize: 56,
    showStatus: true,
    showStat: true,
    showNumber: false,
    rowGap: 0,
    title: '',
    align: 'left',
    variant: 'editorial',
    ...p,
  }
}

export function matchList(p: Partial<MatchListElement> = {}): MatchListElement {
  return {
    ...base('Agenda', 70, 500, 940, 900),
    type: 'matchList',
    rowHeight: 160,
    textColor: '$text',
    accentColor: '$accent',
    cardColor: '$surface',
    cardOpacity: 0.72,
    nameFont: '$label',
    timeFont: '$numbers',
    showCompetition: false,
    maxItems: 5,
    variant: 'editorial',
    ...p,
  }
}

export function prediction(p: Partial<PredictionElement> = {}): PredictionElement {
  return {
    ...base('Pronóstico', 90, 600, 900, 820),
    type: 'prediction',
    predictionIndex: 0,
    mode: 'plain',
    blurIntensity: 44,
    overlayOpacity: 0.35,
    lockStyle: 'padlock',
    teaser: '',
    accentColor: '$accent',
    cardColor: '$surface',
    textColor: '$text',
    hiddenPosition: 'pick',
    showConfidence: false,
    showMatch: false,
    showNote: true,
    chrome: 'none',
    frost: true,
    lockGlow: 0.6,
    cornerRadius: 36,
    revealStamp: 'Revelado',
    headlineFont: '$headline',
    ...p,
  }
}

export function resultsList(p: Partial<ResultsListElement> = {}): ResultsListElement {
  return {
    ...base('Resultados', 90, 500, 900, 1000),
    type: 'resultsList',
    maxItems: 5,
    textColor: '$text',
    mutedColor: '$muted',
    winColor: '$accent',
    lossColor: '$muted',
    pendingColor: '$muted',
    showSummary: true,
    rowGap: 0,
    font: '$label',
    cardColor: '$surface',
    variant: 'editorial',
    ...p,
  }
}

export function ranking(p: Partial<RankingElement> = {}): RankingElement {
  const row = (label: string, sub: string, value: number) => ({ id: uid('rk'), label, sub, value, display: '' })
  return {
    ...base('Ranking', 72, 560, 936, 900),
    type: 'ranking',
    rows: [row('M. Laurent', '{home.short}', 7), row('L. Ferrer', '{away.short}', 6), row('A. Duval', '{home.short}', 5), row('D. Ortega', '{away.short}', 4), row('P. Navarro', '{away.short}', 3)],
    maxRows: 5,
    unit: '',
    decimals: 0,
    highlightIndex: 0,
    showRank: true,
    showBars: true,
    accentColor: '$accent',
    textColor: '$text',
    mutedColor: '$muted',
    lineColor: '$line',
    barColor: '#3A3A3A',
    nameFont: '$label',
    valueFont: '$numbers',
    nameSize: 56,
    valueSize: 96,
    ...p,
  }
}

export function probability(p: Partial<ProbabilityElement> = {}): ProbabilityElement {
  return {
    ...base('Probabilidad 1X2', 72, 760, 936, 420),
    type: 'probability',
    home: 38,
    draw: 26,
    away: 36,
    showDraw: true,
    homeLabel: '{home.short}',
    drawLabel: 'Empate',
    awayLabel: '{away.short}',
    colorMode: 'leader',
    accentColor: '$accent',
    trackColor: '#3A3A3A',
    textColor: '$text',
    mutedColor: '$muted',
    valueFont: '$numbers',
    labelFont: '$label',
    valueSize: 150,
    labelSize: 42,
    barHeight: 28,
    normalize: true,
    ...p,
  }
}

export type BadgeIcon = BadgeElement['icon']

export function badge(p: Partial<BadgeElement> = {}): BadgeElement {
  return {
    ...base('Etiqueta', 340, 900, 400, 84),
    type: 'badge',
    text: 'Solo en mi comunidad',
    style: 'glow',
    color: '$accent',
    textColor: '$text',
    icon: 'lock',
    font: '$label',
    fontSize: 38,
    radius: 14,
    align: 'center',
    ...p,
  }
}

export function scoreboard(p: Partial<ScoreboardElement> = {}): ScoreboardElement {
  return {
    ...base('Marcador', 90, 700, 900, 300),
    type: 'scoreboard',
    layout: 'row',
    showCrests: true,
    showNames: true,
    showNote: true,
    textColor: '$text',
    mutedColor: '$muted',
    accentColor: '$accent',
    highlightWinner: true,
    scoreFont: '$numbers',
    nameFont: '$label',
    scoreSize: 220,
    ...p,
  }
}

export function tactics(p: Partial<TacticsElement> = {}): TacticsElement {
  return {
    ...base('Pizarra táctica', 60, 420, 960, 1200),
    type: 'tactics',
    tactics: defaultTactics(),
    ...p,
  }
}

export function stadium3d(p: Partial<Stadium3DElement> = {}): Stadium3DElement {
  return {
    ...base('Estadio 3D', 0, 420, 1080, 1000),
    type: 'stadium3d',
    tactics: defaultTactics({ playerSize: 18 }),
    camera: { azimuth: 180, elevation: 34, distance: 88, fov: 38, targetX: 60, targetY: 34 },
    lighting: { exposure: 1.3, floodlights: 1.35, fog: 0.3, accent: '$primary', rim: 0.7 },
    background: 'transparent',
    showStands: true,
    ...p,
  }
}

export function model3d(p: Partial<Model3DElement> = {}): Model3DElement {
  return {
    ...base('Modelo 3D', 140, 400, 800, 800),
    type: 'model3d',
    assetId: null,
    camera: { yaw: 0, pitch: 8, distance: 3.2, fov: 35 },
    lighting: { preset: 'cinematic', exposure: 1.1, rimIntensity: 1, rimColor: '$negative', keyIntensity: 0.8 },
    material: 'original',
    autoRotate: 0,
    ...p,
  }
}

export function mascot(p: Partial<MascotElement> = {}): MascotElement {
  return {
    ...base('Mascota GOAT', 190, 300, 700, 900),
    type: 'mascot',
    variant: 'cinematic',
    baseColor: '#4A4F57',
    shadowColor: '#050506',
    rimColor: '$negative',
    rimIntensity: 0.85,
    backlightColor: '$tertiary',
    backlight: 0.9,
    lightAngle: 75,
    eyeColor: '$primary',
    eyeGlow: 0.9,
    fog: 0.5,
    fadeBottom: 0,
    facetGap: 0,
    contrast: 0.6,
    ...p,
  }
}

export function brandMark(p: Partial<BrandMarkElement> = {}): BrandMarkElement {
  return {
    ...base('Marca', 340, 90, 400, 56),
    type: 'brandMark',
    variant: 'editorial',
    color: '$text',
    accentColor: '$text',
    useLogo: true,
    text: '{brand}',
    ...p,
  }
}

export function icon(p: Partial<IconElement> = {}): IconElement {
  return {
    ...base('Icono', 480, 800, 120, 120),
    type: 'icon',
    icon: 'lock',
    color: '$accent',
    strokeWidth: 2,
    ...p,
  }
}

export function effect(p: Partial<EffectElement> = {}): EffectElement {
  return {
    ...base('Efecto', 0, 0, 1080, 1920),
    type: 'effect',
    effect: 'vignette',
    color: '#000000',
    color2: '#000000',
    intensity: 0.7,
    spread: 0.4,
    angle: 0,
    seed: 1,
    ...p,
  }
}

export function glass(p: Partial<GlassElement> = {}): GlassElement {
  return {
    ...base('Cristal', 90, 600, 900, 500),
    type: 'glass',
    backdropBlur: 24,
    tint: '$surface',
    tintOpacity: 0.35,
    cornerRadius: 36,
    borderColor: '$text',
    borderOpacity: 0.35,
    highlight: 1,
    noise: 0.25,
    ...p,
  }
}

export const FACTORIES: { [K in ElementType]: (p?: Partial<Extract<SlideElement, { type: K }>>) => Extract<SlideElement, { type: K }> } = {
  text,
  shape,
  image,
  crest,
  statBars,
  statNumber,
  progressRing,
  formRow,
  table,
  playerList,
  matchList,
  prediction,
  resultsList,
  ranking,
  probability,
  badge,
  scoreboard,
  tactics,
  stadium3d,
  model3d,
  mascot,
  brandMark,
  icon,
  effect,
  glass,
}

export function createElement<K extends ElementType>(type: K, p?: Partial<Extract<SlideElement, { type: K }>>): Extract<SlideElement, { type: K }> {
  return FACTORIES[type](p as never) as Extract<SlideElement, { type: K }>
}

/** Deep copy with fresh ids (for duplicate / paste). */
export function cloneElement<T extends SlideElement>(el: T, offset = 30): T {
  const c = structuredClone(el)
  c.id = uid('el')
  c.x += offset
  c.y += offset
  if (c.type === 'tactics' || c.type === 'stadium3d') {
    c.tactics.players = c.tactics.players.map((p) => ({ ...p, id: uid('tp') }))
    c.tactics.annotations = c.tactics.annotations.map((a) => ({ ...a, id: uid('ta') }))
  }
  return c
}
