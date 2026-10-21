import { useEffect, useRef } from 'react'
import type { TextElement } from '../../model/types'
import { useUI } from '../../store/ui'
import { useEditableText } from '../textEditing'

/** In-place text editor positioned over the element. Edits apply live and only to this text. */
export function TextEditOverlay({ el, zoom, pan }: { el: TextElement; zoom: number; pan: { x: number; y: number } }) {
  const ref = useRef<HTMLTextAreaElement>(null)
  const edit = useEditableText(el)!
  useEffect(() => {
    const t = ref.current
    if (!t) return
    t.focus()
    t.select()
  }, [el.id])
  const close = () => useUI.getState().set({ editingTextId: null })
  const fontPx = Math.max(15, Math.min(34, el.fontSize * zoom * 0.55))
  return (
    <div
      className="absolute z-20"
      style={{
        left: pan.x + el.x * zoom,
        top: pan.y + el.y * zoom,
        width: Math.max(220, el.width * zoom),
        minHeight: Math.max(60, el.height * zoom),
        transform: `rotate(${el.rotation}deg)`,
        transformOrigin: '0 0',
      }}
    >
      <textarea
        ref={ref}
        aria-label="Editar texto"
        className="h-full w-full resize-none rounded-lg border-2 border-gold bg-ink/80 p-3 leading-tight text-ivory shadow-2xl outline-none backdrop-blur"
        style={{ fontSize: fontPx, minHeight: Math.max(60, el.height * zoom), textAlign: el.align, fontFamily: 'var(--font-cond)', fontWeight: 700 }}
        value={edit.value}
        onChange={(e) => edit.onChange(e.target.value)}
        onBlur={close}
        onKeyDown={(e) => {
          e.stopPropagation()
          if (e.key === 'Escape' || (e.key === 'Enter' && (e.metaKey || e.ctrlKey))) close()
        }}
      />
      <div className="mt-1 rounded bg-ink/80 px-2 py-1 text-[11px] text-muted">
        Solo cambia este texto · <b className="text-gold">[[palabra]]</b> para resaltar · Esc para terminar
        {edit.fieldLabel && (
          <>
            {' · '}
            <button
              type="button"
              className="font-semibold text-gold hover:underline"
              // Keep the textarea focused until the click lands.
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => useUI.getState().set({ editingTextId: null, leftTab: 'match', panelOpen: true })}
            >
              Cambiar {edit.fieldLabel} en todas las páginas
            </button>
          </>
        )}
      </div>
    </div>
  )
}
