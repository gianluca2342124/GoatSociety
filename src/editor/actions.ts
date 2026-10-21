// High-level user actions shared by the desktop and mobile editors.
// Destructive actions run immediately and offer a one-tap «Deshacer»
// instead of asking for confirmation.
import { useEditor, activeSlideOf } from '../store/editor'
import { useUI } from '../store/ui'
import { buildBlankSlide, buildTemplateSlide, templateById, type TemplateDef } from '../templates'
import { ELEMENT_LABELS } from '../model/elements'
import { formatOf } from '../model/formats'
import type { CanvasFormat, FormatPreset, MatchData, Slide } from '../model/types'
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

export type AlignMode = 'l' | 'c' | 'r' | 't' | 'm' | 'b' | 'distH' | 'distV' | 'pc' | 'pm'

/** Align or distribute the selected elements (several) or centre them on the page. */
export function alignSelection(mode: AlignMode) {
  const s = useEditor.getState()
  const p = s.project
  const ids = s.selection
  const slideId = activeSlideOf(s)?.id
  if (!p || !ids.length) return
  s.update((d) => {
    const sl = d.slides.find((x) => x.id === slideId)
    if (!sl) return
    const list = sl.elements.filter((e) => ids.includes(e.id) && !e.locked)
    if (!list.length) return
    const minX = Math.min(...list.map((e) => e.x))
    const maxX = Math.max(...list.map((e) => e.x + e.width))
    const minY = Math.min(...list.map((e) => e.y))
    const maxY = Math.max(...list.map((e) => e.y + e.height))
    if (mode === 'distH' || mode === 'distV') {
      const horiz = mode === 'distH'
      const sorted = [...list].sort((a, b) => (horiz ? a.x - b.x : a.y - b.y))
      const total = sorted.reduce((acc, e) => acc + (horiz ? e.width : e.height), 0)
      const span = horiz ? maxX - minX : maxY - minY
      const gap = sorted.length > 1 ? (span - total) / (sorted.length - 1) : 0
      let cur = horiz ? minX : minY
      for (const e of sorted) {
        if (horiz) e.x = cur
        else e.y = cur
        cur += (horiz ? e.width : e.height) + gap
      }
      return
    }
    // Centre on the page as one block, keeping the elements' relative layout.
    const dx = (p.format.width - (maxX - minX)) / 2 - minX
    const dy = (p.format.height - (maxY - minY)) / 2 - minY
    for (const e of list) {
      if (mode === 'l') e.x = minX
      if (mode === 'r') e.x = maxX - e.width
      if (mode === 'c') e.x = (minX + maxX) / 2 - e.width / 2
      if (mode === 't') e.y = minY
      if (mode === 'b') e.y = maxY - e.height
      if (mode === 'm') e.y = (minY + maxY) / 2 - e.height / 2
      if (mode === 'pc') e.x += dx
      if (mode === 'pm') e.y += dy
    }
  })
}

/** Select every visible, unlocked element on the current page. */
export function selectAllOnPage() {
  const s = useEditor.getState()
  const slide = activeSlideOf(s)
  if (!slide) return
  s.select(slide.elements.filter((e) => e.visible && !e.locked).map((e) => e.id))
}

/** Phone multi-selection: taps add or remove elements until «Listo». */
export function setMultiSelect(on: boolean) {
  useUI.getState().set({ multiSelect: on, editingTextId: null })
}

// ── Canvas format ──────────────────────────────────────────────────────────

/** True when a template page still matches what its template builds (ignoring ids). */
function isPristine(slide: Slide, tpl: TemplateDef, format: CanvasFormat, match: MatchData): boolean {
  // Ids are random (elements, players, rows…): leave every «id» out of the comparison.
  const strip = (v: unknown) => JSON.stringify(v, (k, x) => (k === 'id' ? undefined : x))
  const fresh = buildTemplateSlide(tpl, format, match)
  return strip(fresh.elements) === strip(slide.elements) && strip(fresh.background) === strip(slide.background)
}

/** Change the project format: template pages are rebuilt for the new size, free pages are rescaled. */
export function changeFormat(preset: FormatPreset) {
  const s = useEditor.getState()
  const p = s.project
  if (!p || p.format.preset === preset) return
  const to = formatOf(preset)
  const from = p.format
  // Untouched template pages are recomposed for the new size; pages with
  // manual edits are rescaled so nothing the person did is lost.
  // (Built from the plain, non-draft slides: rescaling clones them.)
  let rescaled = 0
  const slides: Slide[] = p.slides.map((sl) => {
    const tpl = templateById(sl.templateId)
    if (tpl && isPristine(sl, tpl, from, p.match)) return { ...buildTemplateSlide(tpl, to, p.match), id: sl.id, name: sl.name, overrides: sl.overrides, accent: sl.accent, intensity: sl.intensity }
    if (tpl) rescaled++
    return rescaleSlide(sl, from, to)
  })
  s.update((d) => {
    d.format = to
    d.slides = slides as typeof d.slides
  })
  useUI.getState().set({ autoFit: true })
  toast(`Formato cambiado a ${to.width}×${to.height}${rescaled ? ` · ${rescaled === 1 ? 'la página editada se ha escalado' : `${rescaled} páginas editadas se han escalado`} para no perder tus cambios` : ''}`, true)
}
