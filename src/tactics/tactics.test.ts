import { describe, expect, it } from 'vitest'
import { buildProjection, invertMat, applyMat, squareToQuad } from './projection'
import { FORMATIONS, PITCH_LENGTH, PITCH_WIDTH, applyFormation, buildTeam, formationPositions } from './formations'
import { TACTICAL_PRESETS } from './presets'
import type { PitchCamera, PitchView } from '../model/types'

describe('projection', () => {
  it('inverts the unit-square homography', () => {
    const m = squareToQuad([
      { x: 100, y: 50 },
      { x: 400, y: 60 },
      { x: 480, y: 300 },
      { x: 20, y: 280 },
    ])
    const inv = invertMat(m)
    for (const [u, v] of [
      [0, 0],
      [1, 1],
      [0.3, 0.7],
    ]) {
      const p = applyMat(m, u, v)
      const back = applyMat(inv, p.x, p.y)
      expect(back.x).toBeCloseTo(u, 6)
      expect(back.y).toBeCloseTo(v, 6)
    }
  })

  const cameras: PitchCamera[] = ['top', 'perspective', 'isometric']
  const views: PitchView[] = ['full', 'half', 'attackingThird', 'defensiveThird']
  for (const camera of cameras)
    for (const view of views)
      for (const vertical of [true, false])
        it(`round-trips pitch ↔ screen (${camera}, ${view}, vertical=${vertical})`, () => {
          const proj = buildProjection({ width: 900, height: 1100, view, camera, vertical, tilt: 0.6 })
          const pts = [
            { x: proj.region.x0 + 2, y: 5 },
            { x: (proj.region.x0 + proj.region.x1) / 2, y: 34 },
            { x: proj.region.x1 - 2, y: 60 },
          ]
          for (const p of pts) {
            const s = proj.toScreen(p)
            expect(s.x).toBeGreaterThan(-1)
            expect(s.x).toBeLessThan(901)
            expect(s.y).toBeGreaterThan(-1)
            expect(s.y).toBeLessThan(1101)
            const back = proj.toPitch(s)
            expect(back.x).toBeCloseTo(p.x, 4)
            expect(back.y).toBeCloseTo(p.y, 4)
          }
          expect(proj.refScale).toBeGreaterThan(0)
        })

  it('foreshortens the far end in perspective', () => {
    const proj = buildProjection({ width: 900, height: 1100, view: 'full', camera: 'perspective', vertical: true, tilt: 0.8 })
    expect(proj.scaleAt({ x: 100, y: 34 })).toBeLessThan(proj.scaleAt({ x: 5, y: 34 }))
  })
})

describe('formations', () => {
  it('builds 11 players inside the pitch for every formation and side', () => {
    for (const f of FORMATIONS)
      for (const side of ['home', 'away'] as const) {
        const team = buildTeam(f, side)
        expect(team).toHaveLength(11)
        for (const p of team) {
          expect(p.x).toBeGreaterThanOrEqual(0)
          expect(p.x).toBeLessThanOrEqual(PITCH_LENGTH)
          expect(p.y).toBeGreaterThanOrEqual(0)
          expect(p.y).toBeLessThanOrEqual(PITCH_WIDTH)
        }
        expect(new Set(team.map((p) => p.id)).size).toBe(11)
      }
  })

  it('mirrors the away team into the other half', () => {
    const home = formationPositions('4-3-3', 'home')
    const away = formationPositions('4-3-3', 'away')
    expect(home[0].x).toBeLessThan(PITCH_LENGTH / 2)
    expect(away[0].x).toBeGreaterThan(PITCH_LENGTH / 2)
  })

  it('falls back to 4-3-3 for invalid formations', () => {
    expect(formationPositions('9-9-9')).toEqual(formationPositions('4-3-3'))
  })

  it('re-applies a formation keeping ids and labels', () => {
    const players = buildTeam('4-3-3', 'home')
    players[5].label = 'Pivote'
    const next = applyFormation(players, '3-5-2', 'home')
    expect(next.filter((p) => p.team === 'home')).toHaveLength(11)
    expect(next.find((p) => p.id === players[5].id)?.label).toBe('Pivote')
  })

  it('every tactical preset produces players and editable annotations', () => {
    for (const preset of TACTICAL_PRESETS) {
      const r = preset.build()
      expect(r.players.length).toBeGreaterThanOrEqual(22)
      expect(r.annotations.length).toBeGreaterThan(0)
      for (const a of r.annotations) expect(a.points.length).toBeGreaterThan(0)
    }
  })
})
