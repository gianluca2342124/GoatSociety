import { deleteSelection } from './actions'
import { useEffect } from 'react'
import { activeSlideOf, useEditor } from '../store/editor'
import { useUI } from '../store/ui'
import { saveNow } from '../store/projectService'
import { setZoom } from './ZoomBar'

const TEXT_TYPES = new Set(['', 'text', 'search', 'number', 'email', 'url', 'tel', 'password'])

/** Focus is in a control that edits text: its keys (letters, arrows, its own undo) belong to it. */
function typing(e: KeyboardEvent): boolean {
  const t = e.target as HTMLElement | null
  if (!t) return false
  if (t.tagName === 'TEXTAREA' || t.isContentEditable) return true
  return t.tagName === 'INPUT' && TEXT_TYPES.has((t as HTMLInputElement).type)
}

// Fields whose plain keys are their own (typeahead, clearing a date part, Backspace…).
const FIELD_TYPES = new Set(['date', 'time', 'datetime-local', 'month', 'week', 'color'])

/** Focus is in a select or a date/time/colour field: only Ctrl/⌘ shortcuts reach the editor. */
function fieldKeys(e: KeyboardEvent): boolean {
  if (e.ctrlKey || e.metaKey) return false
  const t = e.target as HTMLElement | null
  return t?.tagName === 'SELECT' || (t?.tagName === 'INPUT' && FIELD_TYPES.has((t as HTMLInputElement).type))
}

/** Focus is on a widget that uses the arrow and page keys itself (slider, select, colour picker…). */
export function ownsArrows(target: EventTarget | null): boolean {
  const t = target as HTMLElement | null
  if (!t?.tagName) return false
  if (t.tagName === 'INPUT' || t.tagName === 'SELECT') return true
  return !!t.closest('[role=slider],[role=listbox],[role=radiogroup],[role=tablist],[role=menu]')
}

export const SHORTCUTS: [string, string][] = [
  ['Ctrl/⌘ + Z', 'Deshacer'],
  ['Ctrl/⌘ + Shift + Z · Ctrl + Y', 'Rehacer'],
  ['Ctrl/⌘ + S', 'Guardar'],
  ['Ctrl/⌘ + E', 'Exportar'],
  ['Ctrl/⌘ + C / V', 'Copiar / pegar elementos'],
  ['Ctrl/⌘ + D', 'Duplicar selección'],
  ['Supr / Retroceso', 'Eliminar selección'],
  ['Flechas (Shift ×10)', 'Mover selección'],
  ['Ctrl/⌘ + ] / [', 'Subir / bajar capa'],
  ['Ctrl/⌘ + A', 'Seleccionar todo'],
  ['Esc', 'Deseleccionar / salir de edición'],
  ['Espacio + arrastrar', 'Desplazar el lienzo'],
  ['Ctrl/⌘ + rueda', 'Zoom'],
  ['+ / − / 0', 'Acercar / alejar / ajustar'],
  ['RePág / AvPág', 'Diapositiva anterior / siguiente'],
  ['P', 'Vista previa'],
  ['Doble clic', 'Editar texto o pizarra táctica'],
]

export function useShortcuts() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const ui = useUI.getState()
      if (ui.modal && e.key !== 'Escape') return
      // Already handled by the focused widget (e.g. arrows on the colour picker).
      if (e.defaultPrevented || typing(e) || fieldKeys(e)) return
      const ed = useEditor.getState()
      const mod = e.metaKey || e.ctrlKey
      const k = e.key.toLowerCase()
      if (mod && k === 'z') {
        e.preventDefault()
        if (e.shiftKey) ed.redo()
        else ed.undo()
        return
      }
      if (mod && k === 'y') {
        e.preventDefault()
        ed.redo()
        return
      }
      if (mod && k === 's') {
        e.preventDefault()
        void saveNow()
        return
      }
      if (mod && k === 'e') {
        e.preventDefault()
        ui.set({ modal: 'export' })
        return
      }
      if (mod && k === 'c') {
        ed.copySelection()
        return
      }
      if (mod && k === 'v') {
        ed.paste()
        return
      }
      if (mod && k === 'd') {
        e.preventDefault()
        ed.duplicateSelection()
        return
      }
      if (mod && k === 'a') {
        e.preventDefault()
        const s = activeSlideOf(ed)
        if (s) ed.select(s.elements.filter((x) => !x.locked && x.visible).map((x) => x.id))
        return
      }
      const bracket = e.code === 'BracketRight' || e.key === ']' || e.key === '}' ? ']' : e.code === 'BracketLeft' || e.key === '[' || e.key === '{' ? '[' : null
      if (mod && bracket) {
        e.preventDefault()
        ed.reorderSelection(bracket === ']' ? (e.shiftKey ? 'top' : 'up') : e.shiftKey ? 'bottom' : 'down')
        return
      }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault()
        // Holding the key down must not go on deleting.
        if (e.repeat) return
        // While editing a board, Supr only removes the player or drawing picked on it.
        if (ui.tacticsEditId) {
          const sel = ui.tacticsSel
          if (!sel) return
          ed.updateElement(ui.tacticsEditId, (d) => {
            if (d.type !== 'tactics') return
            d.tactics.annotations = d.tactics.annotations.filter((a) => a.id !== sel)
            d.tactics.players = d.tactics.players.filter((p) => p.id !== sel)
          })
          ui.set({ tacticsSel: null })
          return
        }
        deleteSelection()
        return
      }
      if (e.key === 'Escape') {
        if (ui.modal) return
        if (ui.tacticsEditId) ui.set({ tacticsEditId: null, tacticsSel: null, tacticsTool: 'select' })
        else ed.select([])
        return
      }
      if ((e.key.startsWith('Arrow') || e.key.startsWith('Page')) && ownsArrows(e.target)) return
      if (e.key.startsWith('Arrow') && ed.selection.length && !ui.tacticsEditId) {
        e.preventDefault()
        const d = e.shiftKey ? 10 : 1
        const dx = e.key === 'ArrowLeft' ? -d : e.key === 'ArrowRight' ? d : 0
        const dy = e.key === 'ArrowUp' ? -d : e.key === 'ArrowDown' ? d : 0
        ed.updateElements(
          ed.selection,
          (el) => {
            if (el.locked) return
            el.x += dx
            el.y += dy
          },
          { key: `nudge-${ed.selection.join()}` },
        )
        return
      }
      if (e.key === 'PageDown' || e.key === 'PageUp') {
        const p = ed.project
        if (!p) return
        const i = p.slides.findIndex((s) => s.id === ed.activeSlideId)
        const n = p.slides[Math.max(0, Math.min(p.slides.length - 1, i + (e.key === 'PageDown' ? 1 : -1)))]
        if (n) ed.setActiveSlide(n.id)
        return
      }
      if (mod) return
      if (e.key === '+' || e.key === '=') setZoom(ui.zoom * 1.2)
      else if (e.key === '-') setZoom(ui.zoom / 1.2)
      else if (e.key === '0') ui.set({ autoFit: true })
      else if (k === 'p') ui.set({ modal: 'preview' })
      else if (e.key === '?') ui.set({ modal: 'shortcuts' })
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])
}
