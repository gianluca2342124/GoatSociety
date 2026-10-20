import type { StatRow } from './types'

export function isValidNumber(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v)
}

/** Parse user input like "5,43", "62%", " 1.5 " into a number (null when invalid). */
export function parseNumberInput(input: string): number | null {
  if (input == null) return null
  const cleaned = String(input).trim().replace('%', '').replace(/\s/g, '').replace(',', '.')
  if (cleaned === '' || cleaned === '-' || cleaned === '.') return null
  const n = Number(cleaned)
  return Number.isFinite(n) ? n : null
}

export function formatNumber(v: number | null | undefined, decimals = 0, sep: ',' | '.' = ',', unit = ''): string {
  if (!isValidNumber(v)) return '—'
  const d = Math.max(0, Math.min(4, Math.round(decimals)))
  let s = v.toFixed(d)
  if (sep === ',') s = s.replace('.', ',')
  const u = unit ? (unit === '%' ? '%' : unit.startsWith(' ') ? unit : unit.length <= 2 ? unit : ` ${unit}`) : ''
  return s + u
}

export interface BarResult {
  home: number // 0..1 length ratio
  away: number
  homeShare: number // for split style (0..1, home portion)
  leader: 'home' | 'away' | 'tie' | 'none'
  homeValid: boolean
  awayValid: boolean
}

export function rowLeader(row: StatRow): BarResult['leader'] {
  const hv = isValidNumber(row.home)
  const av = isValidNumber(row.away)
  if (!hv || !av) return 'none'
  if (row.home === row.away) return 'tie'
  const homeHigher = (row.home as number) > (row.away as number)
  return homeHigher !== !!row.lowerIsBetter ? 'home' : 'away'
}

/**
 * Compute relative bar lengths for a two-team comparison.
 * - pair: each row scaled to its own max (classic broadcast look)
 * - fixed: scaled to a user-defined maximum (e.g. 100 for percentages)
 * - global: scaled to the largest value of all rows
 * Negative or invalid values produce empty bars but never NaN.
 */
export function computeBars(row: StatRow, mode: 'pair' | 'fixed' | 'global', fixedMax = 100, globalMax = 0): BarResult {
  const hv = isValidNumber(row.home)
  const av = isValidNumber(row.away)
  const h = hv ? Math.max(0, row.home as number) : 0
  const a = av ? Math.max(0, row.away as number) : 0
  let max: number
  if (mode === 'fixed') max = fixedMax > 0 ? fixedMax : Math.max(h, a)
  else if (mode === 'global') max = globalMax > 0 ? globalMax : Math.max(h, a)
  else max = Math.max(h, a)
  const ratio = (v: number) => (max > 0 ? Math.min(1, v / max) : 0)
  const sum = h + a
  return {
    home: ratio(h),
    away: ratio(a),
    homeShare: sum > 0 ? h / sum : 0.5,
    leader: rowLeader(row),
    homeValid: hv,
    awayValid: av,
  }
}

export function globalMaxOf(rows: StatRow[]): number {
  let m = 0
  for (const r of rows) {
    if (isValidNumber(r.home)) m = Math.max(m, r.home)
    if (isValidNumber(r.away)) m = Math.max(m, r.away)
  }
  return m
}

export function summarizeResults(outcomes: { outcome: string }[]): { won: number; lost: number; pending: number; void: number; settled: number; rate: number | null } {
  let won = 0
  let lost = 0
  let pending = 0
  let voids = 0
  for (const o of outcomes) {
    if (o.outcome === 'won') won++
    else if (o.outcome === 'lost') lost++
    else if (o.outcome === 'void') voids++
    else pending++
  }
  const settled = won + lost
  return { won, lost, pending, void: voids, settled, rate: settled > 0 ? won / settled : null }
}
