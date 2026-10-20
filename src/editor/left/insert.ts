import type { ElementType, SlideElement } from '../../model/types'
import { useEditor } from '../../store/editor'
import { useUI } from '../../store/ui'

/** Insert an element centered on the active slide, scaled to the canvas format. */
export function insertElement<T extends ElementType>(type: T, patch: Partial<Extract<SlideElement, { type: T }>> = {}) {
  const p = useEditor.getState().project
  if (!p) return null
  const W = p.format.width
  const H = p.format.height
  const el = useEditor.getState().addElementOfType(type, patch as Partial<SlideElement>)
  if (el && patch.x == null && patch.y == null) {
    // Effects default to full canvas.
    if (type === 'effect') {
      useEditor.getState().updateElement(el.id, { x: 0, y: 0, width: W, height: H })
    }
  }
  useUI.getState().set({ tacticsEditId: null })
  return el
}

export function canvasSize() {
  const p = useEditor.getState().project
  return { W: p?.format.width ?? 1080, H: p?.format.height ?? 1920 }
}
