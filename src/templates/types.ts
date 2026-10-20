import type { MatchData, SlideBackground, SlideElement } from '../model/types'
import type { TCtx } from './kit'

export type TemplateCategory = 'match' | 'stats' | 'tactics' | 'predictions' | 'brand'

export interface TemplateOutput {
  background: SlideBackground
  elements: SlideElement[]
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
  stats: 'Estadísticas',
  tactics: 'Táctica',
  predictions: 'Pronósticos',
  brand: 'Comunidad',
}
