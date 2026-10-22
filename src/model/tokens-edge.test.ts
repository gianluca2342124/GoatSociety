// Edge cases found while hunting bugs: half-typed colours, tokens inside data
// fields, the page-number switch and per-page team overrides.
import { describe, expect, it } from 'vitest'
import { applyOverrides, isCssColor, resolveColor, resolveText } from './tokens'
import { sampleMatch } from './defaults'
import { DEFAULT_BRAND } from './brand'

const ctx = (extra: Partial<Parameters<typeof resolveText>[1]> = {}) => ({ match: sampleMatch(), brand: DEFAULT_BRAND, page: 2, pages: 7, ...extra })

describe('colours', () => {
  it('rejects half-typed hex values instead of passing them to the canvas', () => {
    expect(isCssColor('#2B')).toBe(false)
    expect(isCssColor('#F0F0F')).toBe(false)
    expect(isCssColor('#2BE477')).toBe(true)
    expect(isCssColor('rgba(0, 0, 0, 0.5)')).toBe(true)
    expect(resolveColor('#2B', { match: sampleMatch(), brand: DEFAULT_BRAND })).toMatch(/^#[0-9A-F]{6}$/i)
  })
})

describe('tokens', () => {
  it('resolves tokens written inside a data field such as the headline', () => {
    const c = ctx()
    c.match.headline = '{home.short} vs [[{away.short}]]'
    expect(resolveText('{headline}', c)).toBe(`${c.match.home.shortName} vs [[${c.match.away.shortName}]]`)
  })

  it('stops on self-referencing fields', () => {
    const c = ctx()
    c.match.headline = '{headline}'
    expect(() => resolveText('{headline}', c)).not.toThrow()
  })

  it('empties page numbers when the project switch is off', () => {
    expect(resolveText('{pageof}', ctx())).toBe('2/7')
    expect(resolveText('{pageof}', ctx({ pageNumbers: false }))).toBe('')
    expect(resolveText('{page}/{pages}', ctx({ pageNumbers: false }))).toBe('/')
  })
})

describe('per-page team override', () => {
  it('also renames the short name and crest letters', () => {
    const m = applyOverrides(sampleMatch(), { homeName: 'Atlético de Madrid' })
    expect(m.home.shortName).toBe('Atlético de Madrid')
    expect(m.home.abbr).toBe('ATL')
  })
  it('keeps an explicit short name override', () => {
    const m = applyOverrides(sampleMatch(), { homeName: 'Atlético de Madrid', homeShort: 'Atleti' })
    expect(m.home.shortName).toBe('Atleti')
  })
})
