import { uid } from './ids'
import { formatOf } from './formats'
import type {
  AgendaMatch,
  CrestStyle,
  ElementFx,
  FormatPreset,
  MatchData,
  Player,
  Project,
  ResultEntry,
  Slide,
  SlideBackground,
  StatRow,
  TeamData,
  TeamLibraryEntry,
} from './types'

export const SCHEMA_VERSION = 2

export function defaultBackground(): SlideBackground {
  return {
    fill: { kind: 'solid', color: '$bg' },
    imageAssetId: null,
    imageFit: 'cover',
    imageOpacity: 1,
    imageBlur: 0,
    transparent: false,
  }
}

export function emptyFx(): ElementFx {
  return {}
}

export function player(name: string, number: number, position: string, extra: Partial<Player> = {}): Player {
  return {
    id: uid('p'),
    name,
    number,
    position,
    status: 'available',
    note: '',
    stat: '',
    statLabel: '',
    key: false,
    ...extra,
  }
}

export function stat(label: string, home: number | null, away: number | null, unit = '', decimals = 0, lowerIsBetter = false): StatRow {
  return { id: uid('s'), label, home, away, unit, decimals, lowerIsBetter }
}

export function team(partial: Partial<TeamData> & { name: string }): TeamData {
  const abbr = partial.abbr ?? partial.name.replace(/[^A-Za-zÀ-ÿ]/g, '').slice(0, 3).toUpperCase()
  return {
    shortName: partial.name,
    abbr,
    primary: '#1E3A8A',
    secondary: '#F3F0E8',
    crestAssetId: null,
    crestStyle: { shape: 'shield', pattern: 'solid' },
    form: [],
    formation: '4-3-3',
    coach: '',
    players: [],
    ...partial,
  }
}

/**
 * Illustrative demo data. Team names follow the user's example brief; every
 * player name and number below is fictional and flagged with isSample.
 */
export function sampleMatch(): MatchData {
  return {
    home: team({
      name: 'PSG',
      shortName: 'PSG',
      abbr: 'PSG',
      primary: '#1B3A7A',
      secondary: '#D7263D',
      crestStyle: { shape: 'round', pattern: 'stripes' },
      form: ['W', 'W', 'D', 'L', 'W'],
      formation: '4-3-3',
      coach: 'Entrenador local',
      players: [
        player('M. Laurent', 10, 'MP', { key: true, stat: '7', statLabel: 'GOLES', note: 'Máximo goleador' }),
        player('A. Duval', 9, 'DC', { key: true, stat: '5', statLabel: 'ASIST.' }),
        player('K. Mensah', 8, 'MC', { key: true, stat: '91%', statLabel: 'PASE' }),
        player('T. Moreau', 4, 'DFC', { status: 'injured', note: 'Lesión muscular' }),
        player('R. Benali', 2, 'LD', { status: 'doubt', note: 'Duda' }),
      ],
    }),
    away: team({
      name: 'Barcelona',
      shortName: 'Barça',
      abbr: 'FCB',
      primary: '#A50044',
      secondary: '#004D98',
      crestStyle: { shape: 'classic', pattern: 'halves' },
      form: ['W', 'W', 'W', 'D', 'W'],
      formation: '4-2-3-1',
      coach: 'Entrenador visitante',
      players: [
        player('L. Ferrer', 19, 'ED', { key: true, stat: '6', statLabel: 'GOLES', note: 'Desequilibrio por banda' }),
        player('P. Navarro', 8, 'MC', { key: true, stat: '4', statLabel: 'ASIST.' }),
        player('D. Ortega', 9, 'DC', { key: true, stat: '3.1', statLabel: 'TIROS/P' }),
        player('J. Castell', 3, 'LI', { status: 'suspended', note: 'Sancionado' }),
        player('S. Vidal', 15, 'DFC', { status: 'injured', note: 'Rodilla' }),
      ],
    }),
    competition: 'Champions League',
    stage: 'Jornada 3',
    date: '2026-10-20',
    time: '21:00',
    venue: 'Parc des Princes',
    headline: 'El PSG no gana en [[París]]',
    subheadline: 'Tres razones que lo explican',
    stats: [
      stat('Goles por partido', 2.1, 2.6, '', 2),
      stat('Posesión', 58, 63, '%', 0),
      stat('Tiros a puerta', 5.4, 6.8, '', 1),
      stat('xG por partido', 1.82, 2.31, '', 2),
      stat('Goles encajados', 1.3, 0.9, '', 1, true),
      stat('Córners por partido', 5.1, 6.2, '', 1),
    ],
    predictions: [
      { id: uid('pr'), market: 'Resultado final', pick: 'Gana Barcelona', confidence: 72, note: 'Superioridad en transición y en duelos exteriores.' },
      { id: uid('pr'), market: 'Goles', pick: 'Más de 2.5 goles', confidence: 64, note: 'Ambos equipos promedian más de dos goles.' },
      { id: uid('pr'), market: 'Ambos marcan', pick: 'Sí', confidence: 60, note: '' },
    ],
    score: { home: '2', away: '1', note: 'Final' },
    notes: '',
    isSample: true,
  }
}

export function sampleAgenda(): AgendaMatch[] {
  const row = (home: string, away: string, time: string, competition: string, hc: string, ac: string, highlight = false): AgendaMatch => ({
    id: uid('ag'),
    home,
    away,
    homeColor: hc,
    awayColor: ac,
    homeCrestAssetId: null,
    awayCrestAssetId: null,
    time,
    competition,
    highlight,
  })
  return [
    row('PSG', 'Barcelona', '21:00', 'Champions League', '#1B3A7A', '#A50044', true),
    row('Arsenal', 'Atlético', '21:00', 'Champions League', '#DB0007', '#CB3524'),
    row('Bayern', 'Brujas', '21:00', 'Champions League', '#DC052D', '#1E5AA8'),
    row('Inter', 'Benfica', '18:45', 'Champions League', '#0A3A8C', '#E31B23'),
    row('Liverpool', 'Leipzig', '18:45', 'Champions League', '#C8102E', '#DD0741'),
  ]
}

export function sampleResults(): ResultEntry[] {
  const r = (match: string, pick: string, date: string, outcome: ResultEntry['outcome']): ResultEntry => ({ id: uid('r'), match, pick, date, outcome })
  return [
    r('Equipo A vs Equipo B', 'Más de 2.5 goles', '2026-10-12', 'won'),
    r('Equipo C vs Equipo D', 'Gana local', '2026-10-11', 'won'),
    r('Equipo E vs Equipo F', 'Ambos marcan', '2026-10-08', 'lost'),
    r('Equipo G vs Equipo H', 'Empate al descanso', '2026-10-05', 'won'),
    r('Equipo I vs Equipo J', 'Menos de 3.5', '2026-10-04', 'pending'),
  ]
}

export function emptySlide(name = 'Diapositiva'): Slide {
  return { id: uid('sl'), name, templateId: null, background: defaultBackground(), elements: [], overrides: {} }
}

export function newProject(opts: { name?: string; preset?: FormatPreset; kind?: Project['kind']; match?: MatchData } = {}): Project {
  const now = Date.now()
  return {
    id: uid('prj'),
    name: opts.name ?? 'Nuevo proyecto',
    kind: opts.kind ?? 'carousel',
    createdAt: now,
    updatedAt: now,
    schemaVersion: SCHEMA_VERSION,
    format: formatOf(opts.preset ?? 'vertical'),
    match: opts.match ?? sampleMatch(),
    agenda: sampleAgenda(),
    results: sampleResults(),
    slides: [],
    pageNumbers: true,
  }
}

const S = (shape: CrestStyle['shape'], pattern: CrestStyle['pattern']): CrestStyle => ({ shape, pattern })

/**
 * Starter team list: names and kit colors only (facts). No official crests are
 * bundled — a generated placeholder badge is used until the user uploads one.
 */
export const STARTER_TEAMS: Omit<TeamLibraryEntry, 'id'>[] = [
  { name: 'PSG', shortName: 'PSG', abbr: 'PSG', primary: '#1B3A7A', secondary: '#D7263D', crestAssetId: null, crestStyle: S('round', 'stripes') },
  { name: 'Barcelona', shortName: 'Barça', abbr: 'FCB', primary: '#A50044', secondary: '#004D98', crestAssetId: null, crestStyle: S('classic', 'halves') },
  { name: 'Real Madrid', shortName: 'R. Madrid', abbr: 'RMA', primary: '#F3F0E8', secondary: '#C9A24B', crestAssetId: null, crestStyle: S('round', 'solid') },
  { name: 'Atlético de Madrid', shortName: 'Atlético', abbr: 'ATM', primary: '#CB3524', secondary: '#27408B', crestAssetId: null, crestStyle: S('shield', 'stripes') },
  { name: 'Athletic Club', shortName: 'Athletic', abbr: 'ATH', primary: '#EE2523', secondary: '#FFFFFF', crestAssetId: null, crestStyle: S('shield', 'stripes') },
  { name: 'Real Sociedad', shortName: 'R. Sociedad', abbr: 'RSO', primary: '#0067B1', secondary: '#FFFFFF', crestAssetId: null, crestStyle: S('round', 'stripes') },
  { name: 'Villarreal', shortName: 'Villarreal', abbr: 'VIL', primary: '#FFE667', secondary: '#005187', crestAssetId: null, crestStyle: S('shield', 'solid') },
  { name: 'Real Betis', shortName: 'Betis', abbr: 'BET', primary: '#0BB363', secondary: '#FFFFFF', crestAssetId: null, crestStyle: S('classic', 'stripes') },
  { name: 'Sevilla', shortName: 'Sevilla', abbr: 'SEV', primary: '#F3F0E8', secondary: '#D71920', crestAssetId: null, crestStyle: S('classic', 'sash') },
  { name: 'Valencia', shortName: 'Valencia', abbr: 'VCF', primary: '#F3F0E8', secondary: '#EE8707', crestAssetId: null, crestStyle: S('round', 'solid') },
  { name: 'Getafe', shortName: 'Getafe', abbr: 'GET', primary: '#005999', secondary: '#FFFFFF', crestAssetId: null, crestStyle: S('shield', 'solid') },
  { name: 'Girona', shortName: 'Girona', abbr: 'GIR', primary: '#CD2534', secondary: '#FFFFFF', crestAssetId: null, crestStyle: S('shield', 'stripes') },
  { name: 'Manchester City', shortName: 'Man City', abbr: 'MCI', primary: '#6CABDD', secondary: '#1C2C5B', crestAssetId: null, crestStyle: S('round', 'solid') },
  { name: 'Liverpool', shortName: 'Liverpool', abbr: 'LIV', primary: '#C8102E', secondary: '#00B2A9', crestAssetId: null, crestStyle: S('shield', 'solid') },
  { name: 'Arsenal', shortName: 'Arsenal', abbr: 'ARS', primary: '#DB0007', secondary: '#FFFFFF', crestAssetId: null, crestStyle: S('classic', 'solid') },
  { name: 'Chelsea', shortName: 'Chelsea', abbr: 'CHE', primary: '#034694', secondary: '#FFFFFF', crestAssetId: null, crestStyle: S('round', 'solid') },
  { name: 'Manchester United', shortName: 'Man United', abbr: 'MUN', primary: '#DA291C', secondary: '#FBE122', crestAssetId: null, crestStyle: S('shield', 'solid') },
  { name: 'Tottenham', shortName: 'Spurs', abbr: 'TOT', primary: '#F3F0E8', secondary: '#132257', crestAssetId: null, crestStyle: S('shield', 'solid') },
  { name: 'Bayern', shortName: 'Bayern', abbr: 'FCB', primary: '#DC052D', secondary: '#0066B2', crestAssetId: null, crestStyle: S('round', 'solid') },
  { name: 'Borussia Dortmund', shortName: 'Dortmund', abbr: 'BVB', primary: '#FDE100', secondary: '#111111', crestAssetId: null, crestStyle: S('round', 'solid') },
  { name: 'Leipzig', shortName: 'Leipzig', abbr: 'RBL', primary: '#DD0741', secondary: '#F3F0E8', crestAssetId: null, crestStyle: S('round', 'solid') },
  { name: 'Inter', shortName: 'Inter', abbr: 'INT', primary: '#0A3A8C', secondary: '#111111', crestAssetId: null, crestStyle: S('round', 'stripes') },
  { name: 'Milan', shortName: 'Milan', abbr: 'MIL', primary: '#FB090B', secondary: '#111111', crestAssetId: null, crestStyle: S('classic', 'stripes') },
  { name: 'Juventus', shortName: 'Juventus', abbr: 'JUV', primary: '#F3F0E8', secondary: '#111111', crestAssetId: null, crestStyle: S('shield', 'stripes') },
  { name: 'Napoli', shortName: 'Napoli', abbr: 'NAP', primary: '#12A0D7', secondary: '#F3F0E8', crestAssetId: null, crestStyle: S('round', 'solid') },
  { name: 'Benfica', shortName: 'Benfica', abbr: 'SLB', primary: '#E31B23', secondary: '#F3F0E8', crestAssetId: null, crestStyle: S('round', 'solid') },
  { name: 'Porto', shortName: 'Porto', abbr: 'FCP', primary: '#00428C', secondary: '#F3F0E8', crestAssetId: null, crestStyle: S('classic', 'solid') },
  { name: 'Ajax', shortName: 'Ajax', abbr: 'AJA', primary: '#D2122E', secondary: '#F3F0E8', crestAssetId: null, crestStyle: S('round', 'hoops') },
  { name: 'Brujas', shortName: 'Brujas', abbr: 'BRU', primary: '#1E5AA8', secondary: '#111111', crestAssetId: null, crestStyle: S('shield', 'stripes') },
  { name: 'Marsella', shortName: 'Marsella', abbr: 'OM', primary: '#2FAEE0', secondary: '#F3F0E8', crestAssetId: null, crestStyle: S('round', 'solid') },
]
