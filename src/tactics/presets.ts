import { uid } from '../model/ids'
import type { AnnotationKind, PitchView, TacticalAnnotation, TacticalPlayer, TacticsData } from '../model/types'
import { buildTeam } from './formations'

export function annotation(kind: AnnotationKind, points: { x: number; y: number }[], color = '$accent', label = '', width = 0.45): TacticalAnnotation {
  return { id: uid('ta'), kind, points, color, width, label, opacity: 1 }
}

export function defaultTactics(overrides: Partial<TacticsData> = {}): TacticsData {
  const homeFormation = overrides.homeFormation ?? '4-3-3'
  const awayFormation = overrides.awayFormation ?? '4-2-3-1'
  return {
    view: 'full',
    camera: 'top',
    vertical: true,
    pitchColor: '#2D6A3C',
    pitchColor2: '#245731',
    lineColor: '#FFFFFF',
    lineOpacity: 0.78,
    stripes: true,
    homeColor: '$home',
    awayColor: '$away',
    homeFormation,
    awayFormation,
    showHome: true,
    showAway: true,
    players: [...buildTeam(homeFormation, 'home'), ...buildTeam(awayFormation, 'away')],
    annotations: [],
    playerStyle: 'flat',
    playerSize: 22,
    showLabels: true,
    showNumbers: true,
    tilt: 0.6,
    glow: 0,
    labelStyle: 'text',
    highlightColor: '$accent',
    ...overrides,
  }
}

function move(players: TacticalPlayer[], team: 'home' | 'away', number: number, x: number, y: number, extra: Partial<TacticalPlayer> = {}) {
  const p = players.find((pl) => pl.team === team && pl.number === number)
  if (p) Object.assign(p, { x, y }, extra)
}

export interface TacticalPreset {
  id: string
  label: string
  description: string
  view?: PitchView
  build: () => Pick<TacticsData, 'players' | 'annotations'> & { view?: PitchView }
}

export const TACTICAL_PRESETS: TacticalPreset[] = [
  {
    id: 'counter',
    label: 'Contraataque',
    description: 'Robo en campo propio y transición vertical rápida.',
    build: () => {
      const players = [...buildTeam('4-3-3', 'home'), ...buildTeam('4-2-3-1', 'away')]
      // Away team caught high.
      players.filter((p) => p.team === 'away' && p.number !== 1).forEach((p) => (p.x -= 14))
      move(players, 'home', 8, 40, 30, { highlight: true, label: 'Robo' })
      move(players, 'home', 11, 52, 12)
      move(players, 'home', 7, 50, 56)
      move(players, 'home', 9, 55, 34)
      return {
        players,
        annotations: [
          annotation('pass', [{ x: 40, y: 30 }, { x: 58, y: 14 }], '$text'),
          annotation('run', [{ x: 52, y: 12 }, { x: 78, y: 18 }, { x: 88, y: 28 }], '$accent', 'Carrera'),
          annotation('run', [{ x: 55, y: 34 }, { x: 86, y: 36 }], '$accent'),
          annotation('run', [{ x: 50, y: 56 }, { x: 72, y: 54 }, { x: 84, y: 44 }], '$accent'),
          annotation('zone', [{ x: 62, y: 6 }, { x: 92, y: 6 }, { x: 92, y: 62 }, { x: 62, y: 62 }], '$accent', 'ESPACIO'),
        ],
      }
    },
  },
  {
    id: 'press',
    label: 'Presión alta',
    description: 'Bloque alto, salto sobre el pivote y cierre de líneas de pase.',
    build: () => {
      const players = [...buildTeam('4-3-3', 'home'), ...buildTeam('4-2-3-1', 'away')]
      players.filter((p) => p.team === 'home' && p.number !== 1).forEach((p) => (p.x += 22))
      move(players, 'away', 1, 101, 34, { label: 'Portero' })
      return {
        players,
        annotations: [
          annotation('press', [{ x: 69, y: 34 }, { x: 80, y: 32 }], '$accent'),
          annotation('press', [{ x: 66, y: 10 }, { x: 80, y: 14 }], '$accent'),
          annotation('press', [{ x: 66, y: 58 }, { x: 80, y: 54 }], '$accent'),
          annotation('circle', [{ x: 84, y: 34 }, { x: 89, y: 34 }], '$accent', 'Pivote aislado'),
          annotation('zone', [{ x: 74, y: 8 }, { x: 105, y: 8 }, { x: 105, y: 60 }, { x: 74, y: 60 }], '$accent', 'ZONA DE PRESIÓN'),
        ],
      }
    },
  },
  {
    id: 'through',
    label: 'Pase al espacio',
    description: 'Ruptura a la espalda de la defensa con pase filtrado.',
    view: 'half',
    build: () => {
      const players = [...buildTeam('4-2-3-1', 'home'), ...buildTeam('4-4-2', 'away')]
      players.filter((p) => p.team === 'home' && p.number !== 1).forEach((p) => (p.x += 26))
      move(players, 'home', 10, 70, 34, { highlight: true })
      move(players, 'home', 9, 80, 30)
      return {
        view: 'half',
        players,
        annotations: [
          annotation('pass', [{ x: 70, y: 34 }, { x: 80, y: 36 }, { x: 94, y: 36 }], '$text', 'Pase filtrado'),
          annotation('run', [{ x: 80, y: 30 }, { x: 94, y: 35 }], '$accent', 'Desmarque'),
          annotation('spotlight', [{ x: 94, y: 36 }, { x: 99, y: 36 }], '$accent'),
        ],
      }
    },
  },
  {
    id: 'overlap',
    label: 'Desdoblamiento',
    description: 'El lateral dobla por fuera al extremo para crear superioridad.',
    view: 'half',
    build: () => {
      const players = [...buildTeam('4-3-3', 'home'), ...buildTeam('4-4-2', 'away')]
      players.filter((p) => p.team === 'home' && p.number !== 1).forEach((p) => (p.x += 26))
      move(players, 'home', 7, 82, 60, { highlight: true })
      move(players, 'home', 2, 72, 64, { highlight: true, label: 'Lateral' })
      return {
        view: 'half',
        players,
        annotations: [
          annotation('run', [{ x: 72, y: 64 }, { x: 86, y: 68 }, { x: 96, y: 60 }], '$accent', 'Desdoble'),
          annotation('arrow', [{ x: 82, y: 60 }, { x: 88, y: 50 }], '$text'),
          annotation('pass', [{ x: 88, y: 50 }, { x: 97, y: 58 }], '$text'),
          annotation('circle', [{ x: 84, y: 58 }, { x: 91, y: 58 }], '$accent', '2v1'),
        ],
      }
    },
  },
  {
    id: 'overload',
    label: 'Sobrecarga en banda',
    description: 'Acumulación de jugadores en un carril para liberar el lado débil.',
    build: () => {
      const players = [...buildTeam('4-3-3', 'home'), ...buildTeam('4-4-2', 'away')]
      players.filter((p) => p.team === 'home' && p.number !== 1).forEach((p) => (p.x += 18))
      move(players, 'home', 10, 70, 12)
      move(players, 'home', 11, 80, 8)
      move(players, 'home', 3, 66, 6)
      move(players, 'home', 7, 82, 58, { highlight: true, label: 'Lado débil' })
      return {
        players,
        annotations: [
          annotation('zone', [{ x: 60, y: 0 }, { x: 92, y: 0 }, { x: 92, y: 22 }, { x: 60, y: 22 }], '$accent', 'SOBRECARGA'),
          annotation('pass', [{ x: 70, y: 12 }, { x: 64, y: 40 }, { x: 82, y: 58 }], '$text', 'Cambio de orientación'),
          annotation('spotlight', [{ x: 82, y: 58 }, { x: 87, y: 58 }], '$accent'),
        ],
      }
    },
  },
  {
    id: 'transition',
    label: 'Transición defensiva',
    description: 'Repliegue tras pérdida y vigilancias defensivas.',
    build: () => {
      const players = [...buildTeam('4-3-3', 'home'), ...buildTeam('4-2-3-1', 'away')]
      players.filter((p) => p.team === 'home' && p.number !== 1).forEach((p) => (p.x += 20))
      move(players, 'away', 10, 55, 30, { highlight: true, label: 'Pérdida' })
      return {
        players,
        annotations: [
          annotation('run', [{ x: 64, y: 22 }, { x: 46, y: 26 }], '$accent', 'Repliegue'),
          annotation('run', [{ x: 64, y: 46 }, { x: 46, y: 42 }], '$accent'),
          annotation('press', [{ x: 62, y: 34 }, { x: 57, y: 31 }], '$accent', 'Contrapresión'),
          annotation('zone', [{ x: 20, y: 14 }, { x: 46, y: 14 }, { x: 46, y: 54 }, { x: 20, y: 54 }], '$accent', 'ESPACIO A PROTEGER'),
        ],
      }
    },
  },
  {
    id: 'buildup',
    label: 'Salida de balón',
    description: 'Construcción desde atrás con el pivote incrustado entre centrales.',
    build: () => {
      const players = [...buildTeam('4-3-3', 'home'), ...buildTeam('4-4-2', 'away')]
      move(players, 'home', 6, 14, 34, { highlight: true, label: 'Pivote' })
      move(players, 'home', 5, 13, 18)
      move(players, 'home', 4, 13, 50)
      move(players, 'home', 3, 30, 6)
      move(players, 'home', 2, 30, 62)
      return {
        players,
        annotations: [
          annotation('pass', [{ x: 5, y: 34 }, { x: 13, y: 18 }], '$text'),
          annotation('pass', [{ x: 13, y: 18 }, { x: 30, y: 6 }], '$text'),
          annotation('pass', [{ x: 30, y: 6 }, { x: 38, y: 24 }], '$text'),
          annotation('run', [{ x: 32, y: 26 }, { x: 40, y: 22 }], '$accent'),
          annotation('zone', [{ x: 6, y: 12 }, { x: 22, y: 12 }, { x: 22, y: 56 }, { x: 6, y: 56 }], '$accent', 'LÍNEA DE 3'),
        ],
      }
    },
  },
  {
    id: 'cutinside',
    label: 'Diagonal del extremo',
    description: 'Extremo recibe abierto, conduce hacia dentro y ataca la espalda del lateral.',
    view: 'half',
    build: () => {
      const players = [...buildTeam('4-2-3-1', 'home'), ...buildTeam('4-4-2', 'away')]
      players.filter((p) => p.team === 'home' && p.number !== 1).forEach((p) => (p.x += 26))
      move(players, 'home', 7, 80, 62, { highlight: true, label: 'Extremo' })
      move(players, 'away', 3, 88, 58, { label: 'Lateral' })
      return {
        view: 'half',
        players,
        annotations: [
          annotation('pass', [{ x: 66, y: 50 }, { x: 80, y: 62 }], '$text', 'Recepción'),
          annotation('curve', [{ x: 80, y: 62 }, { x: 86, y: 46 }, { x: 93, y: 40 }], '$accent', 'Conducción interior'),
          annotation('zone', [{ x: 88, y: 46 }, { x: 102, y: 46 }, { x: 102, y: 66 }, { x: 88, y: 66 }], '$accent', 'ESPALDA DEL LATERAL'),
          annotation('spotlight', [{ x: 80, y: 62 }, { x: 85, y: 62 }], '$accent'),
        ],
      }
    },
  },
]
