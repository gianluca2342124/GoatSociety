import { describe, expect, it } from 'vitest'
import { computeBars, formatNumber, globalMaxOf, parseNumberInput, rowLeader, summarizeResults } from './stats'
import type { StatRow } from './types'

const row = (home: number | null, away: number | null, extra: Partial<StatRow> = {}): StatRow => ({ id: 'r', label: 'x', home, away, unit: '', decimals: 2, ...extra })

describe('computeBars', () => {
  it('scales the pair to its own maximum (Barcelona 5.43 vs Getafe 1.57)', () => {
    const b = computeBars(row(5.43, 1.57), 'pair')
    expect(b.home).toBe(1)
    expect(b.away).toBeCloseTo(1.57 / 5.43, 6)
    expect(b.leader).toBe('home')
  })

  it('updates immediately when a value changes (5.43 → 3.20)', () => {
    const before = computeBars(row(5.43, 1.57), 'pair')
    const after = computeBars(row(3.2, 1.57), 'pair')
    expect(after.away).toBeCloseTo(1.57 / 3.2, 6)
    expect(after.away).toBeGreaterThan(before.away)
  })

  it('handles zero, missing, invalid and negative values without NaN', () => {
    const zero = computeBars(row(0, 0), 'pair')
    expect(zero.home).toBe(0)
    expect(zero.away).toBe(0)
    expect(zero.homeShare).toBe(0.5)
    const missing = computeBars(row(null, 4), 'pair')
    expect(missing.home).toBe(0)
    expect(missing.away).toBe(1)
    expect(missing.homeValid).toBe(false)
    expect(missing.leader).toBe('none')
    const neg = computeBars(row(-3, 2), 'pair')
    expect(neg.home).toBe(0)
    expect(neg.away).toBe(1)
    const nan = computeBars(row(Number.NaN, 2), 'pair')
    expect(Number.isNaN(nan.home)).toBe(false)
  })

  it('supports fixed and global scales', () => {
    const fixed = computeBars(row(58, 63), 'fixed', 100)
    expect(fixed.home).toBeCloseTo(0.58)
    expect(fixed.away).toBeCloseTo(0.63)
    const over = computeBars(row(150, 20), 'fixed', 100)
    expect(over.home).toBe(1)
    const rows = [row(2, 4), row(8, 1)]
    const g = globalMaxOf(rows)
    expect(g).toBe(8)
    expect(computeBars(rows[0], 'global', 0, g).away).toBeCloseTo(0.5)
  })

  it('computes split shares and leaders (lower is better)', () => {
    const b = computeBars(row(1, 3), 'pair')
    expect(b.homeShare).toBeCloseTo(0.25)
    expect(rowLeader(row(1.3, 0.9, { lowerIsBetter: true }))).toBe('away')
    expect(rowLeader(row(2, 2))).toBe('tie')
  })
})

describe('number helpers', () => {
  it('formats with decimals, separator and units', () => {
    expect(formatNumber(5.432, 2)).toBe('5,43')
    expect(formatNumber(5.432, 2, '.')).toBe('5.43')
    expect(formatNumber(62, 0, ',', '%')).toBe('62%')
    expect(formatNumber(null)).toBe('—')
    expect(formatNumber(Number.POSITIVE_INFINITY)).toBe('—')
  })

  it('parses user input tolerantly', () => {
    expect(parseNumberInput('5,43')).toBe(5.43)
    expect(parseNumberInput(' 62% ')).toBe(62)
    expect(parseNumberInput('-1.5')).toBe(-1.5)
    expect(parseNumberInput('')).toBeNull()
    expect(parseNumberInput('abc')).toBeNull()
  })

  it('summarizes manually entered results only', () => {
    const s = summarizeResults([{ outcome: 'won' }, { outcome: 'lost' }, { outcome: 'won' }, { outcome: 'pending' }, { outcome: 'void' }])
    expect(s).toMatchObject({ won: 2, lost: 1, pending: 1, void: 1, settled: 3 })
    expect(s.rate).toBeCloseTo(2 / 3)
    expect(summarizeResults([]).rate).toBeNull()
  })
})
