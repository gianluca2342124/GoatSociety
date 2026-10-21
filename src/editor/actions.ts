// High-level user actions shared by the desktop and mobile editors.
// Destructive actions run immediately and offer a one-tap «Deshacer»
// instead of asking for confirmation.
import { useEditor, activeSlideOf } from '../store/editor'
import { useUI } from '../store/ui'
import { buildBlankSlide, buildTemplateSlide, templateById, type TemplateDef } from '../templates'
import { ELEMENT_LABELS } from '../model/elements'
import { formatOf } from '../model/formats'
import type { FormatPreset, Slide } from '../model/types'
import { rescaleSlide } from './dialogs/MiscDialogs'

const undoAction = { label: 'Deshacer', run: () => useEditor.getState().undo() }

function toast(text: string, withUndo = false) {
  useUI.getState().toast(text, 'success', withUndo ? undoAction : undefined)
}

function project() {
  return useEditor.getState().project
}

export function activeIndex(): number {
  const s = useEditor.getState()
  const p = s.project
  if (!p) return 0
  return Math.max(0, p.slides.findIndex((x) => x.id === s.activeSlideId))
}

// ── Pages ──────────────────────────────────────────────────────────────────

export function addBlankPage() {
  const p = project()
  if (!p) return
  const at = activeIndex() + 1
  const slide = buildBlankSlide(p.format, `Página ${p.slides.length + 1}`)
  useEditor.getState().addSlide(slide, at)
  toast('Página en blanco añadida')
}

export function addTemplatePage(def: TemplateDef) {
  const p = project()
  if (!p) return
  const slide = buildTemplateSlide(def, p.format, p.match)
  useEditor.getState().addSlide(slide, activeIndex() + 1)
  toast(`Página «${def.name}» añadida`)
}

export function replacePageTemplate(def: TemplateDef) {
  const s = useEditor.getState()
  const p = s.project
  const cur = activeSlideOf(s)
  if (!p || !cur) return
  s.replaceSlide(cur.id, { ...buildTemplateSlide(def, p.format, p.match), name: cur.name, overrides: cur.overrides })
  toast(`Plantilla cambiada a «${def.name}»`, true)
}

export function duplicatePage(id?: string) {
  const s = useEditor.getState()
  const cur = id ?? s.activeSlideId
  if (!cur) return
  s.duplicateSlide(cur)
  toast('Página duplicada', true)
}

export function deletePage(id?: string) {
  const s = useEditor.getState()
  const p = s.project
  const cur = id ?? s.activeSlideId
  if (!p || !cur) return
  if (p.slides.length <= 1) {
    useUI.getState().toast('Un proyecto necesita al menos una página', 'info')
    return
  }
  s.deleteSlide(cur)
  toast('Página eliminada', true)
}

export function movePage(dir: -1 | 1) {
  const s = useEditor.getState()
  const p = s.project
  if (!p) return
  const from = activeIndex()
  const to = from + dir
  if (to < 0 || to >= p.slides.length) return
  s.moveSlide(from, to)
}

export function renamePage(name: string) {
  const s = useEditor.getState()
  const id = s.activeSlideId
  s.update(
    (d) => {
      const sl = d.slides.find((x) => x.id === id)
      if (sl) sl.name = name
    },
    { key: `slidename-${id}` },
  )
}

// ── Elements ───────────────────────────────────────────────────────────────

function selectionLabel(): string {
  const s = useEditor.getState()
  const slide = activeSlideOf(s)
  const els = slide?.elements.filter((e) => s.selection.includes(e.id)) ?? []
  if (els.length === 1) return ELEMENT_LABELS[els[0].type]
  return `${els.length} elementos`
}

export function deleteSelection() {
  const s = useEditor.getState()
  const slide = activeSlideOf(s)
  const els = slide?.elements.filter((e) => s.selection.includes(e.id)) ?? []
  if (!els.length) return
  // Locked elements are protected: unlock first.
  if (els.every((e) => e.locked)) {
    useUI.getState().toast('Elemento bloqueado: desbloquéalo para borrarlo', 'info')
    return
  }
  const label = selectionLabel()
  s.deleteSelection()
  useUI.getState().set({ editingTextId: null, tacticsEditId: null })
  toast(`${label} eliminado`, true)
}

export function duplicateSelection() {
  if (!useEditor.getState().selection.length) return
  useEditor.getState().duplicateSelection()
  toast('Duplicado')
}

export function copySelection() {
  if (!useEditor.getState().selection.length) return
  const label = selectionLabel()
  useEditor.getState().copySelection()
  toast(`${label} copiado · pégalo en cualquier página`)
}

export function pasteClipboard() {
  if (!useEditor.getState().clipboard?.length) return
  useEditor.getState().paste()
  toast('Pegado')
}

export function toggleLockSelection() {
  const s = useEditor.getState()
  const slide = activeSlideOf(s)
  const els = slide?.elements.filter((e) => s.selection.includes(e.id)) ?? []
  const lock = !els.every((e) => e.locked)
  s.updateElements(s.selection, (e) => void (e.locked = lock))
  toast(lock ? 'Bloqueado: no se moverá por accidente' : 'Desbloqueado')
}

export function hideSelection() {
  const s = useEditor.getState()
  const ids = [...s.selection]
  s.updateElements(ids, (e) => void (e.visible = false))
  s.select([])
  toast('Oculto · puedes mostrarlo desde Capas', true)
}

// ── Canvas format ──────────────────────────────────────────────────────────

/** Change the project format: template pages are rebuilt for the new size, free pages are rescaled. */
export function changeFormat(preset: FormatPreset) {
  const s = useEditor.getState()
  const p = s.project
  if (!p || p.format.preset === preset) return
  const to = formatOf(preset)
  const from = p.format
  s.update((d) => {
    d.format = to
    d.slides = d.slides.map((sl) => {
      const tpl = templateById(sl.templateId)
      if (tpl) return { ...buildTemplateSlide(tpl, to, p.match), id: sl.id, name: sl.name, overrides: sl.overrides, accent: sl.accent, intensity: sl.intensity } as typeof sl
      return rescaleSlide(sl as Slide, from, to) as typeof sl
    })
  })
  useUI.getState().set({ autoFit: true })
  toast(`Formato cambiado a ${to.width}×${to.height}`, true)
}
