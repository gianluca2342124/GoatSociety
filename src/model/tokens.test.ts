import { describe, expect, it } from 'vitest'
import { applyOverrides, formatDate, isLinked, luminance, resolveColor, resolveFont, resolveText, visibleOnDark } from './tokens'
import { sampleMatch } from './defaults'
import { DEFAULT_BRAND } from './brand'

describe('text tokens', () => {
  const match = sampleMatch()
  const ctx = { match, brand: DEFAULT_BRAND, page: 3, pages: 7 }

  it('resolves shared match data', () => {
    expect(resolveText('{home} vs {away}', ctx)).toBe('PSG vs Barcelona')
    expect(resolveText('{competition} · {time}', ctx)).toBe('Champions League · 21:00')
    expect(resolveText('{page} / {pages}', ctx)).toBe('03 / 07')
    expect(resolveText('{handle}', ctx)).toBe('@goatsociety')
    expect(resolveText('{pick}', ctx)).toBe(match.predictions[0].pick)
  })

  it('leaves unknown tokens and plain text untouched', () => {
    expect(resolveText('Hola {nope}', ctx)).toBe('Hola {nope}')
    expect(resolveText('Sin tokens', ctx)).toBe('Sin tokens')
  })

  it('updates every linked text when the shared match changes', () => {
    const renamed = { ...match, away: { ...match.away, name: 'Getafe' } }
    expect(resolveText('{home} vs {away}', { ...ctx, match: renamed })).toBe('PSG vs Getafe')
    expect(isLinked('{away} gana')).toBe(true)
    expect(isLinked('{handle}')).toBe(false)
  })

  it('applies per-slide overrides without touching the project data', () => {
    const o = applyOverrides(match, { awayName: 'Getafe', time: '18:30' })
    expect(o.away.name).toBe('Getafe')
    expect(o.time).toBe('18:30')
    expect(match.away.name).toBe('Barcelona')
    expect(applyOverrides(match, {})).toBe(match)
  })

  it('formats dates in Spanish', () => {
    expect(formatDate('2026-10-20', 'default', 'es-ES')).toMatch(/20 oct 2026/i)
    expect(formatDate('2026-10-20', 'weekday', 'es-ES')).toMatch(/martes/i)
    expect(formatDate('not-a-date', 'default')).toBe('not-a-date')
  })
})

describe('brand tokens', () => {
  const match = sampleMatch()
  it('resolves palette and team colors', () => {
    expect(resolveColor('$primary', { match, brand: DEFAULT_BRAND })).toBe('#CBAA62')
    expect(resolveColor('$home', { match, brand: DEFAULT_BRAND })).toBe(match.home.primary)
    expect(resolveColor('#123456', { match, brand: DEFAULT_BRAND })).toBe('#123456')
    expect(resolveFont('$headline', DEFAULT_BRAND)).toBe('Anton')
  })

  it('lifts very dark team colors so they stay visible on black', () => {
    const lifted = visibleOnDark('#050510', 0.06)
    expect(luminance(lifted)).toBeGreaterThan(luminance('#050510'))
    expect(visibleOnDark('#EF4655')).toBe('#EF4655')
  })
})
