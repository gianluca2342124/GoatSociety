// ─────────────────────────────────────────────────────────────────────────────
// GOAT SOCIETY STUDIO — structured document model
// Everything the editor shows and everything the exporter renders comes from
// these types. Colors and fonts may be literal values or brand tokens ("$gold").
// Text may contain data tokens ("{home}") resolved against the shared match.
// ─────────────────────────────────────────────────────────────────────────────

export type ID = string

export type FormatPreset = 'story' | 'portrait' | 'square' | 'landscape'

export interface CanvasFormat {
  preset: FormatPreset
  width: number
  height: number
}

/** A color is a hex/rgba string or a brand token like "$primary" / "$home". */
export type ColorValue = string

export interface GradientStop {
  offset: number
  color: ColorValue
  opacity?: number
}

export type Fill =
  | { kind: 'solid'; color: ColorValue; opacity?: number }
  | { kind: 'linear'; angle: number; stops: GradientStop[] }
  | { kind: 'radial'; cx: number; cy: number; radius: number; stops: GradientStop[] }
  | { kind: 'none' }

export type BlendMode =
  | 'source-over'
  | 'multiply'
  | 'screen'
  | 'overlay'
  | 'lighter'
  | 'soft-light'
  | 'color-dodge'
  | 'darken'
  | 'lighten'

export interface ShadowFx {
  enabled: boolean
  color: ColorValue
  blur: number
  offsetX: number
  offsetY: number
  opacity: number
}

export interface ElementFx {
  shadow?: ShadowFx
  /** Glow is a zero-offset colored shadow. */
  glow?: { enabled: boolean; color: ColorValue; blur: number; opacity: number }
  /** Gaussian-like blur applied to the rendered element (px). */
  blur?: number
  blend?: BlendMode
}

export interface BaseElement {
  id: ID
  type: ElementType
  name: string
  x: number
  y: number
  width: number
  height: number
  rotation: number
  opacity: number
  visible: boolean
  locked: boolean
  fx?: ElementFx
  /**
   * Visual intensity this element needs to be shown (GOAT EDITORIAL presets).
   * 'editorial' hides it on Minimal slides, 'cinematic' only shows it on
   * Cinematic slides. Undefined = always shown. Never deleted, only hidden.
   */
  minIntensity?: 'editorial' | 'cinematic'
}

/** Slide visual intensity (non-destructive creative preset). */
export type Intensity = 'minimal' | 'editorial' | 'cinematic'

// ── Text ────────────────────────────────────────────────────────────────────
export interface TextElement extends BaseElement {
  type: 'text'
  /** Supports data tokens {home} and accent markup [[word]]. */
  text: string
  fontFamily: string
  fontSize: number
  fontWeight: number
  italic: boolean
  fill: Fill
  accentColor: ColorValue
  align: 'left' | 'center' | 'right'
  verticalAlign: 'top' | 'middle' | 'bottom'
  lineHeight: number
  letterSpacing: number
  uppercase: boolean
  /** Shrink font size until the text fits inside the box. */
  autoFit: boolean
  minFontSize: number
  stroke?: { color: ColorValue; width: number }
  /** Optional pill/box behind text. */
  background?: { color: ColorValue; opacity: number; paddingX: number; paddingY: number; radius: number }
}

// ── Shapes ──────────────────────────────────────────────────────────────────
export interface ShapeElement extends BaseElement {
  type: 'shape'
  shape: 'rect' | 'ellipse' | 'line' | 'triangle' | 'hexagon' | 'star' | 'diamond' | 'parallelogram'
  fill: Fill
  stroke?: { color: ColorValue; width: number; dash?: number[]; opacity?: number }
  cornerRadius: number
}

// ── Images ──────────────────────────────────────────────────────────────────
export interface ImageElement extends BaseElement {
  type: 'image'
  assetId: ID | null
  fit: 'contain' | 'cover' | 'fill'
  /** Focus point for cover crop (0..1). */
  focusX: number
  focusY: number
  cornerRadius: number
  flipX: boolean
  grayscale: boolean
  /** Optional tint overlay (duotone feel). */
  tint?: { color: ColorValue; opacity: number; blend: BlendMode }
  /** Fade the bottom of the image into transparency (0 = off). */
  fadeBottom: number
}

// ── Team crest ─────────────────────────────────────────────────────────────
export interface CrestElement extends BaseElement {
  type: 'crest'
  side: 'home' | 'away' | 'custom'
  /** Used when side === 'custom'. */
  customAssetId: ID | null
  customName: string
  ring: { enabled: boolean; color: ColorValue; width: number; glow: number }
  /** Soft pedestal glow behind crest using team color. */
  aura: number
}

// ── Statistics ─────────────────────────────────────────────────────────────
export interface StatRow {
  id: ID
  label: string
  home: number | null
  away: number | null
  unit: string
  decimals: number
  /** When true, a lower value is better (e.g. goals conceded). */
  lowerIsBetter?: boolean
}

export interface StatBarsElement extends BaseElement {
  type: 'statBars'
  source: 'match' | 'custom'
  rows: StatRow[]
  /** For source 'match': which match stats to include (empty = all). */
  statIds: ID[]
  maxRows: number
  /** 'editorial' = huge numbers + one thick proportional split bar per row. */
  style: 'dual' | 'split' | 'stacked' | 'editorial'
  /** 'leader' paints the leading side with the accent and the other neutral. Undefined = team colors. */
  colorMode?: 'teams' | 'leader'
  /** Accent used by colorMode 'leader' (default $accent). */
  accentColor?: ColorValue
  scaleMode: 'pair' | 'fixed' | 'global'
  fixedMax: number
  homeColor: ColorValue
  awayColor: ColorValue
  trackColor: ColorValue
  labelColor: ColorValue
  valueColor: ColorValue
  labelFont: string
  valueFont: string
  labelSize: number
  valueSize: number
  barHeight: number
  rowGap: number
  showCrests: boolean
  highlightLeader: boolean
  decimalSeparator: ',' | '.'
}

export interface StatNumberElement extends BaseElement {
  type: 'statNumber'
  value: string
  prefix: string
  suffix: string
  label: string
  description: string
  valueFont: string
  valueSize: number
  valueColor: ColorValue
  accentColor: ColorValue
  labelColor: ColorValue
  textColor: ColorValue
  /** 'hero' = giant number, large label, short support line (editorial). */
  layout: 'stacked' | 'inline' | 'card' | 'hero'
  align: 'left' | 'center' | 'right'
  cardFill: ColorValue
  cardOpacity: number
}

export interface ProgressRingElement extends BaseElement {
  type: 'progressRing'
  value: number
  max: number
  label: string
  sublabel: string
  color: ColorValue
  trackColor: ColorValue
  thickness: number
  valueFont: string
  textColor: ColorValue
  showPercent: boolean
  decimals: number
}

export type FormResult = 'W' | 'D' | 'L'

export interface FormRowElement extends BaseElement {
  type: 'formRow'
  source: 'home' | 'away' | 'custom'
  results: FormResult[]
  /** 'letter' = flat letters only, 'dot' = flat dots (editorial, no chips). */
  shape: 'circle' | 'square' | 'pill' | 'letter' | 'dot'
  winColor: ColorValue
  drawColor: ColorValue
  lossColor: ColorValue
  textColor: ColorValue
  showLetters: boolean
  gap: number
  /** Show newest first (left). */
  newestFirst: boolean
  /** Horizontal alignment of the results inside the box (default center). */
  align?: 'left' | 'center' | 'right'
}

export interface TableElement extends BaseElement {
  type: 'table'
  columns: string[]
  rows: string[][]
  headerColor: ColorValue
  textColor: ColorValue
  lineColor: ColorValue
  accentColumn: number
  accentColor: ColorValue
  font: string
  fontSize: number
  headerFont: string
  rowHeight: number
  zebra: boolean
}

export type PlayerStatus = 'available' | 'injured' | 'doubt' | 'suspended' | 'out'

export interface Player {
  id: ID
  name: string
  number: number
  position: string
  status: PlayerStatus
  note: string
  stat: string
  statLabel: string
  key: boolean
}

export interface PlayerListElement extends BaseElement {
  type: 'playerList'
  side: 'home' | 'away'
  filter: 'key' | 'absences' | 'all'
  maxItems: number
  textColor: ColorValue
  mutedColor: ColorValue
  accentColor: ColorValue
  nameFont: string
  nameSize: number
  showStatus: boolean
  showStat: boolean
  showNumber: boolean
  rowGap: number
  title: string
  align: 'left' | 'right'
  /** 'editorial' = open rows with hairline separators, no cards. Undefined = cards. */
  variant?: 'card' | 'editorial'
}

export interface MatchListElement extends BaseElement {
  type: 'matchList'
  rowHeight: number
  textColor: ColorValue
  accentColor: ColorValue
  cardColor: ColorValue
  cardOpacity: number
  nameFont: string
  timeFont: string
  showCompetition: boolean
  maxItems: number
  /** 'editorial' = open rows with hairline separators, no cards. Undefined = cards. */
  variant?: 'card' | 'editorial'
}

export interface PredictionElement extends BaseElement {
  type: 'prediction'
  predictionIndex: number
  mode: 'locked' | 'revealed' | 'plain'
  blurIntensity: number
  overlayOpacity: number
  lockStyle: 'padlock' | 'shield' | 'keyhole' | 'none'
  teaser: string
  accentColor: ColorValue
  cardColor: ColorValue
  textColor: ColorValue
  hiddenPosition: 'pick' | 'pickAndOdds' | 'all'
  showOdds: boolean
  showConfidence: boolean
  showMatch: boolean
  showNote: boolean
  cornerRadius: number
  revealStamp: string
  headlineFont: string
  /** 'none' = editorial layout without card, header, pills or gauges. Undefined = card. */
  chrome?: 'card' | 'none'
}

export interface ResultsListElement extends BaseElement {
  type: 'resultsList'
  maxItems: number
  textColor: ColorValue
  mutedColor: ColorValue
  winColor: ColorValue
  lossColor: ColorValue
  pendingColor: ColorValue
  showSummary: boolean
  showOdds: boolean
  rowGap: number
  font: string
  cardColor: ColorValue
  /** 'editorial' = hero hit-rate summary + open rows. Undefined = cards. */
  variant?: 'card' | 'editorial'
}

// ── Ranking & probability (editorial charts) ───────────────────────────────
export interface RankingRow {
  id: ID
  label: string
  sub: string
  value: number | null
  /** Text shown instead of the formatted value (optional). */
  display: string
}

export interface RankingElement extends BaseElement {
  type: 'ranking'
  rows: RankingRow[]
  maxRows: number
  unit: string
  decimals: number
  /** Row painted with the accent (-1 = none). */
  highlightIndex: number
  showRank: boolean
  showBars: boolean
  /** Bar thickness (px). Undefined = automatic (≈14 % of the row, max 36). */
  barHeight?: number
  accentColor: ColorValue
  textColor: ColorValue
  mutedColor: ColorValue
  lineColor: ColorValue
  barColor: ColorValue
  nameFont: string
  valueFont: string
  nameSize: number
  valueSize: number
}

export interface ProbabilityElement extends BaseElement {
  type: 'probability'
  home: number | null
  draw: number | null
  away: number | null
  showDraw: boolean
  homeLabel: string
  drawLabel: string
  awayLabel: string
  /** 'leader' = favourite in the accent, the rest neutral. 'teams' = team colors. */
  colorMode: 'leader' | 'teams'
  accentColor: ColorValue
  trackColor: ColorValue
  textColor: ColorValue
  mutedColor: ColorValue
  valueFont: string
  labelFont: string
  valueSize: number
  labelSize: number
  barHeight: number
  /** Normalise the three values to 100 % for the bar (labels keep the typed numbers). */
  normalize: boolean
}

// ── Tactics ────────────────────────────────────────────────────────────────
export type PitchView = 'full' | 'half' | 'attackingThird' | 'defensiveThird'
export type PitchCamera = 'top' | 'perspective' | 'isometric'

export interface TacticalPlayer {
  id: ID
  team: 'home' | 'away'
  number: number
  label: string
  /** Pitch coordinates in meters: x along length (0..105), y across width (0..68). */
  x: number
  y: number
  highlight: boolean
}

export type AnnotationKind = 'arrow' | 'curve' | 'pass' | 'run' | 'press' | 'circle' | 'zone' | 'spotlight' | 'ball'

export interface TacticalAnnotation {
  id: ID
  kind: AnnotationKind
  /** Pitch coordinates. arrow/pass/run/press: [start, end] (+ control for curve). circle/spotlight: [center, edge]. zone: polygon/rect corners. */
  points: { x: number; y: number }[]
  color: ColorValue
  width: number
  label: string
  opacity: number
}

export interface TacticsData {
  view: PitchView
  camera: PitchCamera
  /** Pitch rendered with the long axis vertical. */
  vertical: boolean
  pitchColor: ColorValue
  pitchColor2: ColorValue
  lineColor: ColorValue
  lineOpacity: number
  stripes: boolean
  homeColor: ColorValue
  awayColor: ColorValue
  homeFormation: string
  awayFormation: string
  showHome: boolean
  showAway: boolean
  players: TacticalPlayer[]
  annotations: TacticalAnnotation[]
  playerStyle: 'disc' | 'shirt' | 'ring' | 'flat'
  playerSize: number
  showLabels: boolean
  showNumbers: boolean
  /** Perspective tilt for camera 'perspective' (0..1). */
  tilt: number
  glow: number
  /** Opacity for players that are not highlighted (focus one action). Undefined = 1. */
  dimOthers?: number
  /** 'text' = plain bold labels instead of pills (editorial). */
  labelStyle?: 'pill' | 'text'
  /** Highlight ring color (default $accent). */
  highlightColor?: ColorValue
}

export interface TacticsElement extends BaseElement {
  type: 'tactics'
  tactics: TacticsData
}

export interface Stadium3DElement extends BaseElement {
  type: 'stadium3d'
  tactics: TacticsData
  camera: { azimuth: number; elevation: number; distance: number; fov: number; targetX: number; targetY: number }
  lighting: { exposure: number; floodlights: number; fog: number; accent: ColorValue; rim: number }
  background: 'transparent' | 'night'
  showStands: boolean
}

export interface Model3DElement extends BaseElement {
  type: 'model3d'
  assetId: ID | null
  camera: { yaw: number; pitch: number; distance: number; fov: number }
  lighting: { preset: 'cinematic' | 'studio' | 'rimRed' | 'rimGreen' | 'gold'; exposure: number; rimIntensity: number; rimColor: ColorValue; keyIntensity: number }
  material: 'original' | 'obsidian' | 'gold' | 'ivory' | 'chrome'
  autoRotate: number
}

// ── Brand & mascot ─────────────────────────────────────────────────────────
export interface MascotElement extends BaseElement {
  type: 'mascot'
  variant: 'icon' | 'cinematic' | 'background' | 'outline'
  baseColor: ColorValue
  shadowColor: ColorValue
  rimColor: ColorValue
  rimIntensity: number
  backlightColor: ColorValue
  backlight: number
  lightAngle: number
  eyeColor: ColorValue
  eyeGlow: number
  fog: number
  /** Fade towards the bottom (useful for background usage). */
  fadeBottom: number
  facetGap: number
  contrast: number
}

export interface BrandMarkElement extends BaseElement {
  type: 'brandMark'
  /** 'editorial' = small mark + name with tight tracking; 'icon' = goat mark only. */
  variant: 'watermark' | 'header' | 'badge' | 'signature' | 'wordmark' | 'editorial' | 'icon'
  color: ColorValue
  accentColor: ColorValue
  useLogo: boolean
  text: string
  align?: 'left' | 'center' | 'right'
}

export interface IconElement extends BaseElement {
  type: 'icon'
  icon: string
  color: ColorValue
  strokeWidth: number
  background?: { color: ColorValue; opacity: number; shape: 'circle' | 'square' }
}

export type EffectKind =
  | 'vignette'
  | 'spotlight'
  | 'fog'
  | 'grain'
  | 'glow'
  | 'gradient'
  | 'lightRays'
  | 'scanlines'
  | 'grid'
  | 'pitchLines'
  | 'bokeh'
  | 'stadiumLights'
  | 'noiseGradient'

export interface EffectElement extends BaseElement {
  type: 'effect'
  effect: EffectKind
  color: ColorValue
  color2: ColorValue
  intensity: number
  /** Generic 0..1 parameters, meaning depends on effect. */
  spread: number
  angle: number
  seed: number
}

export interface GlassElement extends BaseElement {
  type: 'glass'
  backdropBlur: number
  tint: ColorValue
  tintOpacity: number
  cornerRadius: number
  borderColor: ColorValue
  borderOpacity: number
  highlight: number
  noise: number
}

export type SlideElement =
  | TextElement
  | ShapeElement
  | ImageElement
  | CrestElement
  | StatBarsElement
  | StatNumberElement
  | ProgressRingElement
  | FormRowElement
  | TableElement
  | PlayerListElement
  | MatchListElement
  | PredictionElement
  | ResultsListElement
  | RankingElement
  | ProbabilityElement
  | TacticsElement
  | Stadium3DElement
  | Model3DElement
  | MascotElement
  | BrandMarkElement
  | IconElement
  | EffectElement
  | GlassElement

export type ElementType = SlideElement['type']

// ── Background ─────────────────────────────────────────────────────────────
export interface SlideBackground {
  fill: Fill
  imageAssetId: ID | null
  imageFit: 'cover' | 'contain'
  imageOpacity: number
  imageBlur: number
  transparent: boolean
}

// ── Match data ─────────────────────────────────────────────────────────────
export interface TeamData {
  name: string
  shortName: string
  abbr: string
  primary: string
  secondary: string
  crestAssetId: ID | null
  crestStyle: CrestStyle
  form: FormResult[]
  formation: string
  coach: string
  players: Player[]
}

export interface CrestStyle {
  shape: 'shield' | 'round' | 'hex' | 'classic' | 'diamond'
  pattern: 'solid' | 'stripes' | 'halves' | 'sash' | 'chevron' | 'hoops'
}

export interface Prediction {
  id: ID
  market: string
  pick: string
  odds: string
  confidence: number
  note: string
}

export interface MatchData {
  home: TeamData
  away: TeamData
  competition: string
  stage: string
  date: string // ISO yyyy-mm-dd
  time: string // HH:mm
  venue: string
  headline: string
  subheadline: string
  stats: StatRow[]
  predictions: Prediction[]
  notes: string
  /** True while the demo data has not been replaced by the user. */
  isSample: boolean
}

export interface MatchOverrides {
  homeName?: string
  awayName?: string
  homeShort?: string
  awayShort?: string
  competition?: string
  stage?: string
  date?: string
  time?: string
  venue?: string
  headline?: string
  subheadline?: string
}

export interface AgendaMatch {
  id: ID
  home: string
  away: string
  homeColor: string
  awayColor: string
  homeCrestAssetId: ID | null
  awayCrestAssetId: ID | null
  time: string
  competition: string
  highlight: boolean
}

export type ResultOutcome = 'won' | 'lost' | 'pending' | 'void'

export interface ResultEntry {
  id: ID
  match: string
  pick: string
  odds: string
  date: string
  outcome: ResultOutcome
}

export interface Slide {
  id: ID
  name: string
  templateId: string | null
  background: SlideBackground
  elements: SlideElement[]
  overrides: MatchOverrides
  /** Slide accent (token or hex). Undefined = project style → brand accent. */
  accent?: ColorValue
  /** Slide visual intensity. Undefined = project style → 'editorial'. */
  intensity?: Intensity
}

export interface ProjectStyle {
  accent?: ColorValue
  intensity?: Intensity
}

export interface Project {
  id: ID
  name: string
  kind: 'carousel' | 'post'
  createdAt: number
  updatedAt: number
  schemaVersion: number
  format: CanvasFormat
  match: MatchData
  agenda: AgendaMatch[]
  results: ResultEntry[]
  slides: Slide[]
  /** Show "01 / 07" page numbers on slides that contain a page token. */
  pageNumbers: boolean
  /** Project-wide creative preset (accent + intensity). */
  style?: ProjectStyle
}

// ── Brand kit (global) ─────────────────────────────────────────────────────
export interface BrandPalette {
  bg: string
  surface: string
  primary: string // gold
  secondary: string // forest green
  tertiary: string // burgundy
  text: string // ivory
  muted: string
  positive: string
  negative: string
  /** Default single accent for slides (GOAT EDITORIAL). */
  accent: string
  /** Hairline separators. */
  line: string
}

export interface BrandFonts {
  headline: string
  display: string
  label: string
  body: string
  numbers: string
  serif: string
}

export interface BrandKit {
  name: string
  handle: string
  /**
   * Optional external community destination (internal, never rendered by
   * default). Field names kept for backward compatibility with saved kits.
   */
  telegramUrl: string
  telegramLabel: string
  /** Design-system version of the kit (used for safe default upgrades). */
  brandVersion?: number
  logoAssetId: ID | null
  logoTreatment: 'original' | 'ivory' | 'gold' | 'black'
  palette: BrandPalette
  fonts: BrandFonts
  disclaimer: string
  dateLocale: string
  watermark: { enabled: boolean; position: 'tl' | 'tr' | 'bl' | 'br' | 'center'; size: number; opacity: number }
}

export interface TeamLibraryEntry {
  id: ID
  name: string
  shortName: string
  abbr: string
  primary: string
  secondary: string
  crestAssetId: ID | null
  crestStyle: CrestStyle
  builtIn?: boolean
}

export type AssetKind = 'crest' | 'logo' | 'background' | 'mascot' | 'player' | 'texture' | 'icon' | 'model3d' | 'other'

export interface AssetRecord {
  id: ID
  name: string
  kind: AssetKind
  mime: string
  blob: Blob
  width: number
  height: number
  size: number
  createdAt: number
}

export type AssetMeta = Omit<AssetRecord, 'blob'>
