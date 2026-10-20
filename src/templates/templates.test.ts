import { describe, expect, it } from 'vitest'
import { MATCH_CAROUSEL, TEMPLATES, buildMatchCarousel, buildTemplateSlide } from './index'
import { FORMATS, formatOf } from '../model/formats'
import { sampleMatch, newProject } from '../model/defaults'
import { FACTORIES } from '../model/elements'
import type { FormatPreset } from '../model/types'
import { exportBaseName, slideFileName } from '../render/exporter'
import { scramble } from '../render/painters/prediction'
import { tokenize, stripMarkup } from '../render/text/layout'

describe('template library', () => {
  it('ships at least 18 numbered templates in all five categories', () => {
    expect(TEMPLATES.length).toBeGreaterThanOrEqual(18)
    expect(new Set(TEMPLATES.map((t) => t.id)).size).toBe(TEMPLATES.length)
    expect(new Set(TEMPLATES.map((t) => t.category))).toEqual(new Set(['match', 'stats', 'tactics', 'predictions', 'brand']))
  })

  for (const preset of Object.keys(FORMATS) as FormatPreset[])
    it(`builds every template for ${preset}`, () => {
      const format = formatOf(preset)
      const match = sampleMatch()
      for (const def of TEMPLATES) {
        const slide = buildTemplateSlide(def, format, match)
        expect(slide.templateId).toBe(def.id)
        expect(slide.elements.length).toBeGreaterThan(3)
        const ids = slide.elements.map((e) => e.id)
        expect(new Set(ids).size).toBe(ids.length)
        for (const el of slide.elements) {
          expect(Object.keys(FACTORIES)).toContain(el.type)
          expect(Number.isFinite(el.x) && Number.isFinite(el.y)).toBe(true)
          expect(el.width).toBeGreaterThan(0)
          expect(el.height).toBeGreaterThan(0)
          // Content stays on the canvas (atmosphere layers may bleed slightly).
          if (el.type !== 'effect' && el.type !== 'mascot') {
            expect(el.x).toBeGreaterThanOrEqual(-format.width * 0.1)
            expect(el.x + el.width).toBeLessThanOrEqual(format.width * 1.1)
            expect(el.y + el.height).toBeLessThanOrEqual(format.height + 2)
          }
        }
      }
    })

  it('creates the seven-slide New Match Carousel from linked templates', () => {
    const p = newProject({ preset: 'story' })
    const slides = buildMatchCarousel(p)
    expect(slides.map((s) => s.templateId)).toEqual(MATCH_CAROUSEL)
    const linked = slides.flatMap((s) => s.elements).filter((e) => e.type === 'text' && /\{(home|away)/.test(e.text))
    expect(linked.length).toBeGreaterThan(5)
  })
})

describe('export naming and locked predictions', () => {
  it('produces sequential carousel file names', () => {
    const p = newProject({ preset: 'story' })
    expect(exportBaseName(p)).toBe('goat-society-psg-barcelona')
    expect(slideFileName(p, 0, 'png')).toBe('goat-society-psg-barcelona-01.png')
    expect(slideFileName(p, 11, 'jpeg')).toBe('goat-society-psg-barcelona-12.jpg')
    p.match.home.name = 'Atlético de Madrid'
    expect(exportBaseName(p)).toBe('goat-society-atletico-de-madrid-barcelona')
  })

  it('scrambles hidden picks deterministically so exports never leak them', () => {
    const a = scramble('Gana Barcelona')
    expect(a).not.toBe('Gana Barcelona')
    expect(a).toHaveLength('Gana Barcelona'.length)
    expect(scramble('Gana Barcelona')).toBe(a)
    expect(scramble('Más de 2.5')).not.toMatch(/2\.5/)
  })
})

describe('rich text markup', () => {
  it('parses [[accent]] spans', () => {
    const t = tokenize('El PSG no gana en [[París]]')
    expect(t.filter((x) => x.accent && !x.space).map((x) => x.text)).toEqual(['París'])
    expect(stripMarkup('A [[B C]] D')).toBe('A B C D')
  })
})
