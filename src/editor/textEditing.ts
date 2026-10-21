// Editing a text on the canvas changes ONLY that text. Linked texts such as
// «{headline}» show their real words; the first keystroke turns them into
// plain text for this element. Changing the match data for every page is a
// separate, explicit action (Datos → Partido).
import { activeSlideOf, useEditor } from '../store/editor'
import { useLibrary } from '../store/library'
import { applyOverrides, resolveText } from '../model/tokens'
import type { BadgeElement, TextElement } from '../model/types'

/** Data fields a single-token text can come from, with how to name them to a person. */
const FIELD_LABELS: Record<string, string> = {
  headline: 'el titular',
  subheadline: 'el subtítulo',
  competition: 'la competición',
  stage: 'la jornada',
  venue: 'el estadio',
  home: 'el equipo local',
  away: 'el equipo visitante',
  'home.short': 'el equipo local',
  'away.short': 'el equipo visitante',
}

export interface EditableText {
  /** What the person sees and edits: tokens resolved to their current words. */
  value: string
  onChange: (v: string) => void
  /** The text still follows the match data (it contains tokens). */
  linked: boolean
  /** For a text that is exactly one data field, how to name that field («el titular»). */
  fieldLabel: string | null
}

export function useEditableText(el: TextElement | BadgeElement | null): EditableText | null {
  const project = useEditor((s) => s.project)
  const slide = useEditor((s) => activeSlideOf(s))
  const brand = useLibrary((s) => s.brand)
  if (!el || !project || !slide) return null
  const value = resolveText(el.text, { match: applyOverrides(project.match, slide.overrides), brand, page: project.slides.indexOf(slide) + 1, pages: project.slides.length })
  const single = /^\{([a-z.]+)\}$/i.exec(el.text.trim())
  return {
    value,
    onChange: (v) => useEditor.getState().updateElement(el.id, { text: v } as Partial<TextElement>, { key: `text-${el.id}` }),
    linked: value !== el.text,
    fieldLabel: single ? (FIELD_LABELS[single[1]] ?? null) : null,
  }
}
