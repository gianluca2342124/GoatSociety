import type { ColorValue, Intensity, MatchData, SlideBackground, SlideElement } from '../model/types'
import type { TCtx } from './kit'

export type TemplateCategory = 'match' | 'media' | 'stats' | 'tactics' | 'predictions' | 'brand'

export interface TemplateOutput {
  background: SlideBackground
  elements: SlideElement[]
  /** Optional suggested slide accent (token like '$red'). Undefined = project/brand accent. */
  accent?: ColorValue
  /** Optional suggested intensity. Undefined = project default (Editorial). */
  intensity?: Intensity
}

export interface TemplateDef {
  id: string
  number: number
  name: string
  category: TemplateCategory
  description: string
  build: (t: TCtx, match: MatchData) => TemplateOutput
}

export const CATEGORY_LABELS: Record<TemplateCategory, string> = {
  match: 'Previas',
  media: 'Noticias',
  stats: 'Estadísticas',
  tactics: 'Táctica',
  predictions: 'Pronósticos',
  brand: 'Comunidad',
}
