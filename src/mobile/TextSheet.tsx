// Keyboard-friendly text editing: a plain textarea pinned above the keyboard,
// the page stays visible and updates live while typing. Only this text
// changes; the match data for every page lives in Datos.
import { useEffect, useRef } from 'react'
import { Check } from 'lucide-react'
import { activeSlideOf, useEditor } from '../store/editor'
import { useUI } from '../store/ui'
import { useEditableText } from '../editor/textEditing'
import type { BadgeElement, TextElement } from '../model/types'
import { useMobile } from './store'

export function TextSheet() {
  const id = useUI((s) => s.editingTextId)
  const el = useEditor((s) => activeSlideOf(s)?.elements.find((e) => e.id === id) ?? null) as TextElement | BadgeElement | null
  const edit = useEditableText(el && (el.type === 'text' || el.type === 'badge') ? el : null)
  const ref = useRef<HTMLTextAreaElement>(null)
  useEffect(() => {
    const t = ref.current
    if (!t) return
    t.focus({ preventScroll: true })
    t.setSelectionRange(t.value.length, t.value.length)
  }, [id])
  if (!el || !edit || (el.type !== 'text' && el.type !== 'badge')) return null
  const done = () => useUI.getState().set({ editingTextId: null })
  const openData = () => {
    done()
    useEditor.getState().select([])
    useMobile.getState().open('data')
  }
  return (
    <section className="shrink-0 border-t border-line-2 bg-panel px-3 pt-3 pb-[calc(10px+var(--in-bottom))] shadow-[0_-12px_40px_rgba(0,0,0,0.5)]" aria-label="Editar texto" data-testid="m-text-sheet">
      <div className="flex items-start gap-2">
        <textarea
          ref={ref}
          className="field min-h-[76px] flex-1 resize-none text-[16px] leading-snug"
          rows={el.type === 'badge' ? 1 : 3}
          aria-label="Texto"
          value={edit.value}
          onChange={(e) => edit.onChange(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && el.type === 'badge' && (e.preventDefault(), done())}
        />
        <button type="button" className="flex h-11 shrink-0 items-center gap-1 rounded-full bg-gold px-4 text-[14px] font-bold text-ink active:scale-95" onClick={done} data-testid="m-text-done">
          <Check size={16} strokeWidth={3} /> Listo
        </button>
      </div>
      <p className="mt-1.5 text-[11px] leading-snug text-dim">
        Solo cambia este texto.{edit.hasLive ? ' Lo que va entre llaves, como {pageof}, se rellena solo.' : ''}{el.type === 'text' ? ' Pon una palabra entre [[corchetes]] para destacarla en color.' : ''}
        {edit.fieldLabel && (
          <>
            {' '}
            <button type="button" className="font-semibold text-gold underline-offset-2 active:underline" onClick={openData} data-testid="m-text-all-pages">
              Cambiar {edit.fieldLabel} en todas las páginas
            </button>
          </>
        )}
      </p>
    </section>
  )
}
