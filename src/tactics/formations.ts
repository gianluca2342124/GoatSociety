import { uid } from '../model/ids'
import type { TacticalPlayer } from '../model/types'

export const PITCH_LENGTH = 105
export const PITCH_WIDTH = 68

export const FORMATIONS = ['4-3-3', '4-2-3-1', '4-4-2', '3-5-2', '3-4-3', '5-3-2', '4-1-4-1', '4-3-1-2'] as const

/**
 * Positions for a formation, attacking left → right (home side).
 * Returns pitch coordinates in meters (x: 0..105, y: 0..68).
 * Lines are spread between the goalkeeper and ~half way (compact block),
 * which reads best on social graphics.
 */
export function formationPositions(formation: string, side: 'home' | 'away' = 'home'): { x: number; y: number }[] {
  const lines = formation
    .split('-')
    .map((n) => parseInt(n, 10))
    .filter((n) => Number.isFinite(n) && n > 0)
  const valid = lines.reduce((a, b) => a + b, 0) === 10 ? lines : [4, 3, 3]
  const pts: { x: number; y: number }[] = [{ x: 5, y: PITCH_WIDTH / 2 }]
  const first = 17
  const last = 47
  valid.forEach((count, li) => {
    const x = valid.length === 1 ? (first + last) / 2 : first + ((last - first) * li) / (valid.length - 1)
    for (let i = 0; i < count; i++) {
      const spread = count === 1 ? 0 : Math.min(56, 14 * (count - 1) + (count >= 4 ? 8 : 4))
      const y = count === 1 ? PITCH_WIDTH / 2 : PITCH_WIDTH / 2 - spread / 2 + (spread * i) / (count - 1)
      // Wide players of 4/5 lines sit slightly higher (fullbacks/wing-backs).
      const isWide = count >= 4 && (i === 0 || i === count - 1)
      pts.push({ x: x + (isWide ? 2.5 : 0), y })
    }
  })
  if (side === 'away') return pts.map((p) => ({ x: PITCH_LENGTH - p.x, y: PITCH_WIDTH - p.y }))
  return pts
}

/** Default shirt numbers per formation slot (GK first, then each line from left flank to right flank). */
const NUMBER_SETS: Record<string, number[]> = {
  '4-3-3': [1, 3, 5, 4, 2, 10, 6, 8, 11, 9, 7],
  '4-2-3-1': [1, 3, 5, 4, 2, 8, 6, 11, 10, 7, 9],
  '4-4-2': [1, 3, 5, 4, 2, 11, 8, 6, 7, 10, 9],
  '3-5-2': [1, 15, 4, 5, 3, 10, 6, 8, 2, 11, 9],
  '3-4-3': [1, 15, 4, 5, 3, 6, 8, 2, 11, 9, 7],
  '5-3-2': [1, 3, 15, 4, 5, 2, 10, 6, 8, 11, 9],
  '4-1-4-1': [1, 3, 5, 4, 2, 6, 11, 10, 8, 7, 9],
  '4-3-1-2': [1, 3, 5, 4, 2, 8, 6, 14, 10, 11, 9],
}

export function buildTeam(formation: string, side: 'home' | 'away', names: string[] = []): TacticalPlayer[] {
  const pos = formationPositions(formation, side)
  const nums = NUMBER_SETS[formation] ?? [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]
  // Players are mirrored for the away side so wing numbers stay on the correct flank.
  return pos.map((p, i) => ({
    id: uid('tp'),
    team: side,
    number: nums[i] ?? i + 1,
    label: names[i] ?? '',
    x: +p.x.toFixed(2),
    y: +p.y.toFixed(2),
    highlight: false,
  }))
}

/** Re-apply a formation to existing players of a team, keeping ids/labels/highlights. */
export function applyFormation(players: TacticalPlayer[], formation: string, side: 'home' | 'away'): TacticalPlayer[] {
  const pos = formationPositions(formation, side)
  const teamPlayers = players.filter((p) => p.team === side)
  const others = players.filter((p) => p.team !== side)
  const nums = NUMBER_SETS[formation] ?? []
  const next: TacticalPlayer[] = pos.map((p, i) => {
    const prev = teamPlayers[i]
    return {
      id: prev?.id ?? uid('tp'),
      team: side,
      number: prev?.number ?? nums[i] ?? i + 1,
      label: prev?.label ?? '',
      highlight: prev?.highlight ?? false,
      x: +p.x.toFixed(2),
      y: +p.y.toFixed(2),
    }
  })
  return [...others, ...next]
}
