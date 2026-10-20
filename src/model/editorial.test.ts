import { describe, expect, it } from 'vitest'
import { DEFAULT_BRAND, migrateBrand } from './brand'
import { resolveColor, resolveText, shownAtIntensity, slideIntensity } from './tokens'
import { applyEditorial } from './editorial'
import { newProject, sampleMatch, emptySlide } from './defaults'
import * as E from './elements'
import { migrateProject } from '../db/serialize'
import { probabilityShares } from '../render/painters/editorial'
import type { BrandKit, Project } from './types'

const V1_BRAND = {
  name: 'GOAT SOCIETY',
  handle: '@goatsociety',
  telegramUrl: 't.me/goatsociety',
  telegramLabel: 'TELEGRAM',
  logoAssetId: null,
  logoTreatment: 'original',
  palette: { bg: '#08090B', surface: '#14171B', primary: '#CBAA62', secondary: '#103E34', tertiary: '#641C2A', text: '#F3F0E8', muted: '#8D9096', positive: '#27D477', negative: '#EF4655' },
  fonts: { headline: 'Anton', display: 'Big Shoulders Display Variable', label: 'Barlow Condensed', body: 'Inter Variable', numbers: 'Barlow Condensed', serif: 'Instrument Serif' },
  disclaimer: 'x',
  dateLocale: 'es-ES',
  watermark: { enabled: false, position: 'br', size: 90, opacity: 0.5 },
} as unknown as Partial<BrandKit>

describe('brand migration (GOAT EDITORIAL)', () => {
  it('upgrades untouched v1 defaults and drops platform-specific defaults', () => {
    const b = migrateBrand(V1_BRAND)
    expect(b.palette.bg).toBe(DEFAULT_BRAND.palette.bg)
    expect(b.palette.text).toBe('#F5F5F5')
    expect(b.palette.accent).toBe('#2BE477')
    expect(b.palette.line).toBe('#242424')
    expect(b.fonts.body).toBe('Inter Tight Variable')
    expect(b.fonts.numbers).toBe('Anton')
    expect(b.telegramUrl).toBe('')
    expect(b.telegramLabel).toBe('')
    expect(b.brandVersion).toBe(2)
  })

  it('keeps values the user customised', () => {
    const b = migrateBrand({ ...V1_BRAND, telegramUrl: 'mi-comunidad.com', palette: { ...V1_BRAND.palette!, bg: '#111111', primary: '#FF0000' }, fonts: { ...V1_BRAND.fonts!, body: 'Inter Variable', display: 'Oswald Variable' } })
    expect(b.palette.bg).toBe('#111111')
    expect(b.palette.primary).toBe('#FF0000')
    expect(b.fonts.display).toBe('Oswald Variable')
    expect(b.telegramUrl).toBe('mi-comunidad.com')
  })

  it('does not touch an already migrated kit', () => {
    const b = migrateBrand({ ...DEFAULT_BRAND, palette: { ...DEFAULT_BRAND.palette, muted: '#8D9096' } })
    expect(b.palette.muted).toBe('#8D9096')
  })
})

describe('accent and intensity', () => {
  const match = sampleMatch()
  it('resolves $accent from slide → project → brand', () => {
    expect(resolveColor('$accent', { match, brand: DEFAULT_BRAND })).toBe('#2BE477')
    expect(resolveColor('$accent', { match, brand: DEFAULT_BRAND, accent: '$red' })).toBe('#FF4055')
    expect(resolveColor('$accent', { match, brand: DEFAULT_BRAND, accent: '#123456' })).toBe('#123456')
    expect(resolveColor('$line', { match, brand: DEFAULT_BRAND })).toBe('#242424')
    expect(resolveColor('$yellow', { match, brand: DEFAULT_BRAND })).toBe('#FFD43B')
  })

  it('gates elements by intensity without deleting them', () => {
    const fx = E.effect({ minIntensity: 'cinematic' })
    const soft = E.text({ minIntensity: 'editorial' })
    const always = E.text()
    expect(shownAtIntensity(fx, 'editorial')).toBe(false)
    expect(shownAtIntensity(fx, 'cinematic')).toBe(true)
    expect(shownAtIntensity(soft, 'minimal')).toBe(false)
    expect(shownAtIntensity(soft, 'editorial')).toBe(true)
    expect(shownAtIntensity(always, 'minimal')).toBe(true)
    const p = newProject()
    const s = emptySlide()
    expect(slideIntensity(p, s)).toBe('editorial')
    p.style = { intensity: 'cinematic' }
    expect(slideIntensity(p, s)).toBe('cinematic')
    expect(slideIntensity(p, { ...s, intensity: 'minimal' })).toBe('minimal')
  })

  it('keeps the legacy community token working but never ships it by default', () => {
    const ctx = { match, brand: DEFAULT_BRAND, page: 1, pages: 1 }
    expect(resolveText('{community}', ctx)).toBe('')
    expect(resolveText('{telegram}', { ...ctx, brand: { ...DEFAULT_BRAND, telegramUrl: 'x.y' } })).toBe('x.y')
  })
})

describe('Aplicar GOAT EDITORIAL', () => {
  it('converts a classic slide non-destructively', () => {
    const s = emptySlide()
    s.background = { ...s.background, fill: { kind: 'radial', cx: 0.5, cy: 0.5, radius: 1, stops: [] } }
    s.elements = [
      E.effect({ effect: 'lightRays' }),
      E.text({ accentColor: '$primary', letterSpacing: 12, fontSize: 30 }),
      E.statBars({ style: 'dual' }),
      E.prediction({ chrome: 'card', accentColor: '$primary', showConfidence: true }),
      E.playerList({ variant: 'card' }),
      E.crest({ aura: 0.6 }),
    ]
    const out = applyEditorial(s)
    expect(out.elements).toHaveLength(s.elements.length)
    expect(out.background.fill).toEqual({ kind: 'solid', color: '$bg' })
    const [fx, txt, bars, pred, list, crest] = out.elements
    expect(fx.minIntensity).toBe('cinematic')
    expect(txt.type === 'text' && txt.accentColor).toBe('$accent')
    expect(txt.type === 'text' && txt.letterSpacing).toBeLessThan(2)
    expect(bars.type === 'statBars' && bars.style).toBe('editorial')
    expect(pred.type === 'prediction' && pred.chrome).toBe('none')
    expect(pred.type === 'prediction' && pred.showConfidence).toBe(false)
    expect(list.type === 'playerList' && list.variant).toBe('editorial')
    expect(crest.type === 'crest' && crest.aura).toBe(0)
    // Original slide untouched.
    expect(s.elements[2].type === 'statBars' && s.elements[2].style).toBe('dual')
  })
})

describe('project migration v1 → v2', () => {
  it('replaces printed community links with a neutral profile CTA', () => {
    const p = newProject()
    p.schemaVersion = 1
    const s = emptySlide()
    s.elements = [E.text({ name: 'Botón Telegram', text: '{telegram.label}  ·  {telegram}' }), E.text({ name: 'Enlace Telegram', text: '{telegram}' }), E.text({ text: 'El PSG no gana' })]
    p.slides = [s]
    const out = migrateProject(JSON.parse(JSON.stringify(p)) as Project)
    const texts = out.slides[0].elements.map((e) => (e.type === 'text' ? e.text : ''))
    expect(texts).toEqual(['Link en la bio ↗', 'Link en la bio', 'El PSG no gana'])
    expect(out.slides[0].elements.map((e) => e.name)).toEqual(['Llamada a la acción', 'Llamada al perfil', 'Texto'])
    expect(out.schemaVersion).toBe(2)
  })

  it('leaves v2 projects alone', () => {
    const p = newProject()
    const s = emptySlide()
    s.elements = [E.text({ text: '{telegram}' })]
    p.slides = [s]
    const out = migrateProject(JSON.parse(JSON.stringify(p)) as Project)
    expect(out.slides[0].elements[0].type === 'text' && out.slides[0].elements[0].text).toBe('{telegram}')
  })
})

describe('probability bar', () => {
  it('normalises shares and respects the draw toggle', () => {
    const el = E.probability({ home: 50, draw: 25, away: 25 })
    expect(probabilityShares(el)).toEqual({ home: 0.5, draw: 0.25, away: 0.25 })
    const noDraw = probabilityShares({ ...el, showDraw: false })
    expect(noDraw.home).toBeCloseTo(2 / 3)
    expect(noDraw.draw).toBe(0)
    expect(probabilityShares({ ...el, home: null, draw: null, away: null })).toEqual({ home: 0, draw: 0, away: 0 })
  })
})
