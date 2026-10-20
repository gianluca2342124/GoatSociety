// Editor state: the open project, selection and undo/redo history.
import { create } from 'zustand'
import { produce, type Draft } from 'immer'
import type { ElementType, Project, Slide, SlideElement } from '../model/types'
import { cloneElement, createElement } from '../model/elements'
import { uid } from '../model/ids'
import { emptySlide } from '../model/defaults'

const HISTORY_LIMIT = 120
const COALESCE_MS = 900

export interface UpdateOptions {
  /** Changes with the same key within a short window merge into one undo step. */
  key?: string
  /** Skip history entirely (e.g. transient UI-only state). */
  history?: boolean
}

interface EditorState {
  project: Project | null
  activeSlideId: string | null
  selection: string[]
  past: Project[]
  future: Project[]
  lastKey: string | null
  lastTime: number
  revision: number
  clipboard: SlideElement[] | null

  open: (p: Project) => void
  close: () => void
  update: (recipe: (draft: Draft<Project>) => void, opts?: UpdateOptions) => void
  undo: () => void
  redo: () => void
  canUndo: () => boolean
  canRedo: () => boolean

  setActiveSlide: (id: string) => void
  select: (ids: string[]) => void
  toggleSelect: (id: string) => void

  // Slides
  addSlide: (slide?: Slide, index?: number) => void
  duplicateSlide: (id: string) => void
  deleteSlide: (id: string) => void
  moveSlide: (from: number, to: number) => void
  replaceSlide: (id: string, slide: Slide) => void

  // Elements
  updateElement: (id: string, patch: Partial<SlideElement> | ((el: Draft<SlideElement>) => void), opts?: UpdateOptions) => void
  updateElements: (ids: string[], recipe: (el: Draft<SlideElement>) => void, opts?: UpdateOptions) => void
  addElement: (el: SlideElement, opts?: { select?: boolean }) => void
  addElementOfType: (type: ElementType, patch?: Partial<SlideElement>) => SlideElement | null
  deleteSelection: () => void
  duplicateSelection: () => void
  copySelection: () => void
  paste: () => void
  reorderSelection: (dir: 'up' | 'down' | 'top' | 'bottom') => void
  moveElementTo: (id: string, index: number) => void
}

export function activeSlideOf(s: Pick<EditorState, 'project' | 'activeSlideId'>): Slide | null {
  if (!s.project) return null
  return s.project.slides.find((sl) => sl.id === s.activeSlideId) ?? s.project.slides[0] ?? null
}

function draftSlide(d: Draft<Project>, id: string | null): Draft<Slide> | undefined {
  return d.slides.find((s) => s.id === id) ?? d.slides[0]
}

export const useEditor = create<EditorState>((set, get) => ({
  project: null,
  activeSlideId: null,
  selection: [],
  past: [],
  future: [],
  lastKey: null,
  lastTime: 0,
  revision: 0,
  clipboard: null,

  open: (p) => set({ project: p, activeSlideId: p.slides[0]?.id ?? null, selection: [], past: [], future: [], lastKey: null, revision: 0 }),
  close: () => set({ project: null, activeSlideId: null, selection: [], past: [], future: [] }),

  update: (recipe, opts = {}) => {
    const { project, past, lastKey, lastTime } = get()
    if (!project) return
    const next = produce(project, (d) => {
      recipe(d)
      d.updatedAt = Date.now()
    })
    if (next === project) return
    const now = Date.now()
    const coalesce = opts.key != null && opts.key === lastKey && now - lastTime < COALESCE_MS
    const record = opts.history !== false && !coalesce
    set((s) => ({
      project: next,
      past: record ? [...past, project].slice(-HISTORY_LIMIT) : past,
      future: opts.history === false ? s.future : [],
      lastKey: opts.key ?? null,
      lastTime: now,
      revision: s.revision + 1,
    }))
  },

  undo: () => {
    const { past, project, future } = get()
    if (!past.length || !project) return
    const prev = past[past.length - 1]
    const slideExists = prev.slides.some((s) => s.id === get().activeSlideId)
    set((s) => ({
      project: prev,
      past: past.slice(0, -1),
      future: [project, ...future].slice(0, HISTORY_LIMIT),
      lastKey: null,
      revision: s.revision + 1,
      activeSlideId: slideExists ? s.activeSlideId : (prev.slides[0]?.id ?? null),
      selection: s.selection.filter((id) => activeSlideOf({ project: prev, activeSlideId: s.activeSlideId })?.elements.some((e) => e.id === id)),
    }))
  },

  redo: () => {
    const { past, project, future } = get()
    if (!future.length || !project) return
    const next = future[0]
    const slideExists = next.slides.some((s) => s.id === get().activeSlideId)
    set((s) => ({
      project: next,
      past: [...past, project].slice(-HISTORY_LIMIT),
      future: future.slice(1),
      lastKey: null,
      revision: s.revision + 1,
      activeSlideId: slideExists ? s.activeSlideId : (next.slides[0]?.id ?? null),
      selection: s.selection.filter((id) => activeSlideOf({ project: next, activeSlideId: s.activeSlideId })?.elements.some((e) => e.id === id)),
    }))
  },

  canUndo: () => get().past.length > 0,
  canRedo: () => get().future.length > 0,

  setActiveSlide: (id) => set({ activeSlideId: id, selection: [] }),
  select: (ids) => set({ selection: ids }),
  toggleSelect: (id) => set((s) => ({ selection: s.selection.includes(id) ? s.selection.filter((x) => x !== id) : [...s.selection, id] })),

  addSlide: (slide, index) => {
    const sl = slide ?? emptySlide(`Diapositiva`)
    get().update((d) => {
      const at = index ?? d.slides.findIndex((s) => s.id === get().activeSlideId) + 1
      d.slides.splice(Math.max(0, Math.min(d.slides.length, at < 0 ? d.slides.length : at)), 0, sl)
    })
    set({ activeSlideId: sl.id, selection: [] })
  },

  duplicateSlide: (id) => {
    const p = get().project
    const src = p?.slides.find((s) => s.id === id)
    if (!src) return
    const copy: Slide = { ...structuredClone(src), id: uid('sl'), name: `${src.name} (copia)` }
    copy.elements = copy.elements.map((e) => ({ ...cloneElement(e, 0) }))
    get().update((d) => {
      const i = d.slides.findIndex((s) => s.id === id)
      d.slides.splice(i + 1, 0, copy)
    })
    set({ activeSlideId: copy.id, selection: [] })
  },

  deleteSlide: (id) => {
    const p = get().project
    if (!p || p.slides.length <= 1) return
    const i = p.slides.findIndex((s) => s.id === id)
    get().update((d) => {
      d.slides.splice(i, 1)
    })
    const after = get().project!
    if (get().activeSlideId === id) set({ activeSlideId: after.slides[Math.max(0, i - 1)]?.id ?? null, selection: [] })
  },

  moveSlide: (from, to) => {
    if (from === to) return
    get().update((d) => {
      const [s] = d.slides.splice(from, 1)
      d.slides.splice(to, 0, s)
    })
  },

  replaceSlide: (id, slide) => {
    get().update((d) => {
      const i = d.slides.findIndex((s) => s.id === id)
      if (i >= 0) d.slides[i] = { ...slide, id } as Draft<Slide>
    })
    set({ selection: [] })
  },

  updateElement: (id, patch, opts) => {
    get().update((d) => {
      const slide = draftSlide(d, get().activeSlideId)
      const el = slide?.elements.find((e) => e.id === id)
      if (!el) return
      if (typeof patch === 'function') patch(el)
      else Object.assign(el, patch)
    }, opts)
  },

  updateElements: (ids, recipe, opts) => {
    get().update((d) => {
      const slide = draftSlide(d, get().activeSlideId)
      if (!slide) return
      for (const el of slide.elements) if (ids.includes(el.id)) recipe(el)
    }, opts)
  },

  addElement: (el, opts = {}) => {
    get().update((d) => {
      draftSlide(d, get().activeSlideId)?.elements.push(el as Draft<SlideElement>)
    })
    if (opts.select !== false) set({ selection: [el.id] })
  },

  addElementOfType: (type, patch) => {
    const p = get().project
    const slide = activeSlideOf(get())
    if (!p || !slide) return null
    const el = createElement(type, patch as never) as SlideElement
    // Center on the canvas when no explicit position is given.
    if (!patch || (patch.x == null && patch.y == null)) {
      el.width = Math.min(el.width, p.format.width - 80)
      el.height = Math.min(el.height, p.format.height - 80)
      el.x = Math.round((p.format.width - el.width) / 2)
      el.y = Math.round((p.format.height - el.height) / 2)
    }
    get().addElement(el)
    return el
  },

  deleteSelection: () => {
    const sel = get().selection
    if (!sel.length) return
    get().update((d) => {
      const slide = draftSlide(d, get().activeSlideId)
      if (slide) slide.elements = slide.elements.filter((e) => !sel.includes(e.id) || e.locked)
    })
    set({ selection: [] })
  },

  duplicateSelection: () => {
    const slide = activeSlideOf(get())
    const sel = get().selection
    if (!slide || !sel.length) return
    const copies = slide.elements.filter((e) => sel.includes(e.id)).map((e) => cloneElement(e))
    get().update((d) => {
      const s = draftSlide(d, get().activeSlideId)
      if (!s) return
      const maxIndex = Math.max(...sel.map((id) => s.elements.findIndex((e) => e.id === id)))
      s.elements.splice(maxIndex + 1, 0, ...(copies as Draft<SlideElement>[]))
    })
    set({ selection: copies.map((c) => c.id) })
  },

  copySelection: () => {
    const slide = activeSlideOf(get())
    const sel = get().selection
    if (!slide || !sel.length) return
    set({ clipboard: structuredClone(slide.elements.filter((e) => sel.includes(e.id))) })
  },

  paste: () => {
    const clip = get().clipboard
    if (!clip?.length) return
    const copies = clip.map((e) => cloneElement(e, 30))
    get().update((d) => {
      draftSlide(d, get().activeSlideId)?.elements.push(...(copies as Draft<SlideElement>[]))
    })
    set({ selection: copies.map((c) => c.id), clipboard: copies })
  },

  reorderSelection: (dir) => {
    const sel = get().selection
    if (!sel.length) return
    get().update((d) => {
      const s = draftSlide(d, get().activeSlideId)
      if (!s) return
      const els = s.elements
      const picked = els.filter((e) => sel.includes(e.id))
      const rest = els.filter((e) => !sel.includes(e.id))
      if (dir === 'top') s.elements = [...rest, ...picked]
      else if (dir === 'bottom') s.elements = [...picked, ...rest]
      else {
        const idx = els.map((e, i) => (sel.includes(e.id) ? i : -1)).filter((i) => i >= 0)
        if (dir === 'up') {
          for (let k = idx.length - 1; k >= 0; k--) {
            const i = idx[k]
            if (i < els.length - 1 && !sel.includes(els[i + 1].id)) [els[i], els[i + 1]] = [els[i + 1], els[i]]
          }
        } else {
          for (const i of idx) if (i > 0 && !sel.includes(els[i - 1].id)) [els[i], els[i - 1]] = [els[i - 1], els[i]]
        }
      }
    })
  },

  moveElementTo: (id, index) => {
    get().update((d) => {
      const s = draftSlide(d, get().activeSlideId)
      if (!s) return
      const from = s.elements.findIndex((e) => e.id === id)
      if (from < 0) return
      const [el] = s.elements.splice(from, 1)
      s.elements.splice(Math.max(0, Math.min(s.elements.length, index)), 0, el)
    })
  },
}))

export function useActiveSlide(): Slide | null {
  return useEditor((s) => activeSlideOf(s))
}

export function useSelectedElements(): SlideElement[] {
  const slide = useActiveSlide()
  const sel = useEditor((s) => s.selection)
  if (!slide) return []
  return slide.elements.filter((e) => sel.includes(e.id))
}
