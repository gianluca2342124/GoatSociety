// Keyboard-friendly text editing: a plain textarea pinned above the keyboard,
// the page stays visible and updates live while typing.
//
// Linked texts never show raw tokens: «{headline}» edits the match headline
// (every page that uses it updates), and mixed texts like «{home} vs {away}»
// show the real words and become plain text once edited.
import { useEffect, useRef } from 'react'
import { Check } from 'lucide-react'
import { activeSlideOf, useEditor } from '../store/editor'
import { useLibrary } from '../store/library'
import { useUI } from '../store/ui'
import { applyOverrides, resolveText } from '../model/tokens'
import type { BadgeElement, MatchData, MatchOverrides, TextElement } from '../model/types'

type Field = { ov: keyof MatchOverrides; label: string; get: (m: MatchData) => string; set: (m: MatchData, v: string) => void }

/** Single-token texts that map straight onto a match field. */
const FIELDS: Record<string, Field> = {
  headline: { ov: 'headline', label: 'el titular', get: (m) => m.headline, set: (m, v) => void (m.headline = v) },
  subheadline: { ov: 'subheadline', label: 'el subtítulo', get: (m) => m.subheadline, set: (m, v) => void (m.subheadline = v) },
  competition: { ov: 'competition', label: 'la competición', get: (m) => m.competition, set: (m, v) => void (m.competition = v) },
  stage: { ov: 'stage', label: 'la jornada', get: (m) => m.stage, set: (m, v) => void (m.stage = v) },
  venue: { ov: 'venue', label: 'el estadio', get: (m) => m.venue, set: (m, v) => void (m.venue = v) },
  home: { ov: 'homeName', label: 'el equipo local', get: (m) => m.home.name, set: (m, v) => void (m.home.name = v) },
  away: { ov: 'awayName', label: 'el equipo visitante', get: (m) => m.away.name, set: (m, v) => void (m.away.name = v) },
}

export function TextSheet() {
  const id = useUI((s) => s.editingTextId)
  const project = useEditor((s) => s.project)!
  const slide = useEditor((s) => activeSlideOf(s))
  const brand = useLibrary((s) => s.brand)
  const el = (slide?.elements.find((e) => e.id === id) ?? null) as TextElement | BadgeElement | null
  const ref = useRef<HTMLTextAreaElement>(null)
  useEffect(() => {
    const t = ref.current
    if (!t) return
    t.focus({ preventScroll: true })
    t.setSelectionRange(t.value.length, t.value.length)
  }, [id])
  if (!el || !slide || (el.type !== 'text' && el.type !== 'badge')) return null
  const done = () => useUI.getState().set({ editingTextId: null })
  const update = useEditor.getState().update

  const single = /^\{([a-z.]+)\}$/i.exec(el.text.trim())
  const field = single ? FIELDS[single[1]] : undefined
  const hasTokens = /\{[a-z.]+\}/i.test(el.text)
  const ctx = { match: applyOverrides(project.match, slide.overrides), brand, page: project.slides.indexOf(slide) + 1, pages: project.slides.length }

  let value = el.text
  let onChange = (v: string) => useEditor.getState().updateElement(el.id, { text: v } as Partial<TextElement>, { key: `text-${el.id}` })
  let hint = ''
  if (field) {
    const overridden = slide.overrides[field.ov] !== undefined
    value = overridden ? slide.overrides[field.ov]! : field.get(project.match)
    onChange = (v) =>
      update(
        (d) => {
          if (overridden) {
            const s = d.slides.find((x) => x.id === slide.id)
            if (s) s.overrides[field.ov] = v
          } else field.set(d.match as MatchData, v)
        },
        { key: `field-${field.ov}` },
      )
    hint = overridden ? `Cambias ${field.label} solo en esta página.` : `Cambias ${field.label} del partido: se actualiza en todas las páginas que lo usan.`
  } else if (hasTokens) {
    value = resolveText(el.text, ctx)
    hint = 'Este texto se rellena con los datos del partido. Al escribir aquí pasa a ser un texto fijo.'
  }
  if (el.type === 'text') hint += `${hint ? ' ' : ''}Pon una palabra entre [[corchetes]] para destacarla en color.`

  return (
    <section className="shrink-0 border-t border-line-2 bg-panel px-3 pt-3 pb-[calc(10px+env(safe-area-inset-bottom))] shadow-[0_-12px_40px_rgba(0,0,0,0.5)]" aria-label="Editar texto" data-testid="m-text-sheet">
      <div className="flex items-start gap-2">
        <textarea
          ref={ref}
          className="field min-h-[76px] flex-1 resize-none text-[16px] leading-snug"
          rows={el.type === 'badge' ? 1 : 3}
          aria-label="Texto"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && el.type === 'badge' && (e.preventDefault(), done())}
        />
        <button type="button" className="flex h-11 shrink-0 items-center gap-1 rounded-full bg-gold px-4 text-[14px] font-bold text-ink active:scale-95" onClick={done} data-testid="m-text-done">
          <Check size={16} strokeWidth={3} /> Listo
        </button>
      </div>
      {hint && <p className="mt-1.5 text-[11px] leading-snug text-dim">{hint}</p>}
    </section>
  )
}
