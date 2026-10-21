import { uid } from '../model/ids'
import type { CanvasFormat, MatchData, Project, Slide } from '../model/types'
import { chrome, cinematic, ink, makeCtx } from './kit'
import { MATCH_TEMPLATES } from './match'
import { MEDIA_TEMPLATES } from './media'
import { STATS_TEMPLATES } from './stats'
import { TACTICS_TEMPLATES } from './tactics'
import { PREDICTION_TEMPLATES } from './predictions'
import { BRAND_TEMPLATES } from './brand'
import type { TemplateDef } from './types'

export const TEMPLATES: TemplateDef[] = [...MATCH_TEMPLATES, ...MEDIA_TEMPLATES, ...STATS_TEMPLATES, ...TACTICS_TEMPLATES, ...PREDICTION_TEMPLATES, ...BRAND_TEMPLATES].sort((a, b) => a.number - b.number)

export function templateById(id: string | null | undefined): TemplateDef | undefined {
  return TEMPLATES.find((t) => t.id === id)
}

export function buildTemplateSlide(def: TemplateDef, format: CanvasFormat, match: MatchData): Slide {
  const out = def.build(makeCtx(format), match)
  return {
    id: uid('sl'),
    name: def.name,
    templateId: def.id,
    background: out.background,
    elements: out.elements,
    overrides: {},
    ...(out.accent ? { accent: out.accent } : {}),
    ...(out.intensity ? { intensity: out.intensity } : {}),
  }
}

/**
 * Blank editorial page: gradient background, GOAT SOCIETY signature top-left
 * and the page number top-right, ready to compose from scratch.
 */
export function buildBlankSlide(format: CanvasFormat, name = 'Página en blanco'): Slide {
  const t = makeCtx(format)
  return { id: uid('sl'), name, templateId: null, background: ink(), elements: [...cinematic(t), ...chrome(t)], overrides: {} }
}

/** The seven-slide "New Match Carousel" composition. */
export const MATCH_CAROUSEL = ['matchday-elite', 'the-numbers', 'key-movement', 'key-players', 'statistical-dominance', 'locked-prediction', 'community']

export function buildMatchCarousel(project: Pick<Project, 'format' | 'match'>): Slide[] {
  return MATCH_CAROUSEL.map((id) => buildTemplateSlide(templateById(id)!, project.format, project.match))
}

export type { TemplateDef }
