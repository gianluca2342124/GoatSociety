// High-level user actions shared by the desktop and mobile editors.
// Destructive actions run immediately and offer a one-tap «Deshacer»
// instead of asking for confirmation.
import { useEditor, activeSlideOf } from '../store/editor'
import { useUI } from '../store/ui'
import { buildBlankSlide, buildTemplateSlide, templateById, type TemplateDef } from '../templates'
import { ELEMENT_LABELS } from '../model/elements'
import { formatOf } from '../model/formats'
import type { CanvasFormat, FormatPreset, MatchData, Slide, SlideElement } from '../model/types'

/** Marks the history before an action; pass it to undoToast afterwards. */
export function historyMark(): number {
  return useEditor.getState().steps
}

/**
 * Success toast with a «Deshacer» bound to the change just made (recorded
 * after `since`): as soon as anything else changes the toast goes away, so it
 * can never undo a newer edit. Without a new step there is nothing to undo
 * and it is a plain toast.
 */
export function undoToast(text: string, since: number) {
  const s = useEditor.getState()
  if (s.steps === since) {
    useUI.getState().toast(text, 'success')
    return
  }
  const after = s.project
  const id = useUI.getState().toast(text, 'success', {
    label: 'Deshacer',
    run: () => {
      if (useEditor.getState().project === after) useEditor.getState().undo()
    },
  })
  const unsub = useEditor.subscribe((st) => {
    if (st.project !== after) {
      useUI.getState().dismiss(id)
      unsub()
    }
  })
  setTimeout(unsub, 6000)
}

function toast(text: string, since?: number) {
  if (since != null) undoToast(text, since)
  else useUI.getState().toast(text, 'success')
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
  const slide = buildBlankSlide(p.format, 'Página en blanco')
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
  const mark = historyMark()
  // A name the person chose stays; the old template's own name follows the new template.
  const name = cur.name && cur.name !== templateById(cur.templateId)?.name ? cur.name : def.name
  s.replaceSlide(cur.id, { ...buildTemplateSlide(def, p.format, p.match), name, overrides: cur.overrides })
  toast(`Plantilla cambiada a «${def.name}»`, mark)
}

export function duplicatePage(id?: string) {
  const s = useEditor.getState()
  const cur = id ?? s.activeSlideId
  if (!cur) return
  const mark = historyMark()
  s.duplicateSlide(cur)
  toast('Página duplicada', mark)
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
  const mark = historyMark()
  s.deleteSlide(cur)
  toast('Página eliminada', mark)
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
  const many = els.length > 1
  const mark = historyMark()
  s.deleteSelection()
  useUI.getState().set({ editingTextId: null, tacticsEditId: null })
  toast(many ? `Se han eliminado ${label}` : `Se ha eliminado «${label}»`, mark)
}

export function duplicateSelection() {
  if (!useEditor.getState().selection.length) return
  useEditor.getState().duplicateSelection()
  toast('Duplicado')
}

export function copySelection() {
  if (!useEditor.getState().selection.length) return
  const label = selectionLabel()
  const many = useEditor.getState().selection.length > 1
  useEditor.getState().copySelection()
  toast(many ? `Se han copiado ${label} · pégalos en cualquier página` : `Se ha copiado «${label}» · pégalo en cualquier página`)
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
  const mark = historyMark()
  s.updateElements(ids, (e) => void (e.visible = false))
  s.select([])
  toast('Oculto · puedes mostrarlo desde Capas', mark)
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

/** Proportionally fit a slide's elements into a new canvas size. */
export function rescaleSlide(slide: Slide, from: { width: number; height: number }, to: { width: number; height: number }): Slide {
  const sx = to.width / from.width
  const sy = to.height / from.height
  const s = Math.min(sx, sy)
  const elements = slide.elements.map((e) => {
    // JSON copy: also works when called with an immer draft (structuredClone cannot clone proxies).
    const c = JSON.parse(JSON.stringify(e)) as SlideElement
    const full = e.x <= 1 && e.y <= 1 && e.width >= from.width - 2 && e.height >= from.height - 2
    if (full) {
      c.x = 0
      c.y = 0
      c.width = to.width
      c.height = to.height
      return c
    }
    const cx = (e.x + e.width / 2) * sx
    const cy = (e.y + e.height / 2) * sy
    c.width = e.width * s
    c.height = e.height * s
    c.x = cx - c.width / 2
    c.y = cy - c.height / 2
    if (c.type === 'text') {
      c.fontSize *= s
      c.minFontSize *= s
      c.letterSpacing *= s
      if (c.background) c.background = { ...c.background, paddingX: c.background.paddingX * s, paddingY: c.background.paddingY * s, radius: c.background.radius * s }
    }
    if (c.type === 'tactics' || c.type === 'stadium3d') c.tactics.playerSize *= s
    return c
  })
  return { ...slide, elements }
}

// Pages rescaled by a format change remember their layout from before it, so
// trying another format and coming back gives the page back exactly instead
// of shrinking it a little more with every switch. Any edit to the page
// creates a new slide object, which drops the link.
const scaledFrom = new WeakMap<Slide, { base: Slide; format: CanvasFormat }>()

function rescaleKeepingBase(sl: Slide, from: CanvasFormat, to: CanvasFormat): Slide {
  const prev = scaledFrom.get(sl)
  const base = prev?.base ?? sl
  const baseFormat = prev?.format ?? from
  if (baseFormat.width === to.width && baseFormat.height === to.height) return base
  const out = rescaleSlide(base, baseFormat, to)
  scaledFrom.set(out, { base, format: baseFormat })
  return out
}

/**
 * Change the project format. 'rebuild': untouched template pages are
 * recomposed for the new size and edited ones are rescaled; 'scale': every
 * page is rescaled.
 */
export function changeFormat(preset: FormatPreset, mode: 'rebuild' | 'scale' = 'rebuild') {
  const s = useEditor.getState()
  const p = s.project
  if (!p || p.format.preset === preset) return
  const to = formatOf(preset)
  const from = p.format
  // (Built from the plain, non-draft slides: rescaling clones them.)
  let rescaled = 0
  const slides: Slide[] = p.slides.map((sl) => {
    const tpl = templateById(sl.templateId)
    if (mode === 'rebuild' && tpl && isPristine(sl, tpl, from, p.match)) return { ...buildTemplateSlide(tpl, to, p.match), id: sl.id, name: sl.name, overrides: sl.overrides, accent: sl.accent, intensity: sl.intensity }
    if (tpl && mode === 'rebuild') rescaled++
    return rescaleKeepingBase(sl, from, to)
  })
  const mark = historyMark()
  s.update((d) => {
    d.format = to
    d.slides = slides as typeof d.slides
  })
  useUI.getState().set({ autoFit: true })
  toast(`Formato cambiado a ${to.width}×${to.height}${rescaled ? ` · ${rescaled === 1 ? 'la página editada se ha escalado' : `${rescaled} páginas editadas se han escalado`} para no perder tus cambios` : ''}`, mark)
}
