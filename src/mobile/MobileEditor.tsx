// Mobile-first editor: the page owns the screen, tools come from the bottom.
//
//  ┌ top bar: back · name · undo/redo · preview · Descargar ┐
//  │                                                         │
//  │                  canvas (auto-fit)                      │
//  │                                                         │
//  ├ page strip (thumbnails, + new page) ────────────────────┤
//  └ bottom nav: Plantillas · Elementos · Fotos · Datos · Estilo
//
// Selecting an element swaps the strip + nav for that element's tools.
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { ChevronLeft, ClipboardPaste, CloudOff, Download, Image as ImageIcon, LayoutTemplate, Minimize2, MoreHorizontal, Palette, Play, Plus, Redo2, Shapes, Table2, Undo2, X } from 'lucide-react'
import { activeSlideOf, useEditor } from '../store/editor'
import { useLibrary } from '../store/library'
import { useUI } from '../store/ui'
import { goHome, memoryWarning } from '../store/projectService'
import { EditorCanvas } from '../editor/canvas/EditorCanvas'
import { useSlideThumb } from '../editor/thumbs'
import { TacticsToolbar } from '../editor/props/tacticsProps'
import { pasteClipboard, setMultiSelect } from '../editor/actions'
import type { Project, Slide } from '../model/types'
import { useMobile, type MobileSheet } from './store'
import { ContextBar, SelectionPill } from './SelectionTools'
import { DataSheet, ElementsSheet, ExportSheet, LayersSheet, MenuSheet, MoreSheet, NewPageSheet, PageSheet, PhotosSheet, PropsSheet, StyleSheet, TemplatesSheet } from './Sheets'
import { TextSheet } from './TextSheet'

/** Track the visual viewport so the on-screen keyboard shrinks the editor instead of covering it. */
function useViewportHeight() {
  useEffect(() => {
    const vv = window.visualViewport
    const apply = () => {
      // Hosts may pad the root for the phone's safe areas (the artifact viewer does): fit inside it.
      const cs = getComputedStyle(document.documentElement)
      const pad = (parseFloat(cs.paddingTop) || 0) + (parseFloat(cs.paddingBottom) || 0)
      document.documentElement.style.setProperty('--app-h', `${(vv ? vv.height : window.innerHeight) - pad}px`)
    }
    apply()
    vv?.addEventListener('resize', apply)
    window.addEventListener('resize', apply)
    window.addEventListener('goat:insets', apply)
    return () => {
      vv?.removeEventListener('resize', apply)
      window.removeEventListener('resize', apply)
      window.removeEventListener('goat:insets', apply)
      document.documentElement.style.removeProperty('--app-h')
    }
  }, [])
}

function TopBar() {
  const project = useEditor((s) => s.project)!
  const canUndo = useEditor((s) => s.past.length > 0)
  const canRedo = useEditor((s) => s.future.length > 0)
  const pageIndex = useEditor((s) => Math.max(0, s.project?.slides.findIndex((x) => x.id === s.activeSlideId) ?? 0))
  const memoryOnly = useUI((s) => s.memoryOnly)
  const iconBtn = 'flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-ivory active:bg-white/10 disabled:opacity-30'
  return (
    <header className="flex h-[calc(52px+var(--in-top))] shrink-0 items-center gap-0.5 border-b border-line bg-ink-2 px-1.5 pt-[var(--in-top)]" data-testid="m-topbar">
      <button type="button" className={iconBtn} aria-label="Mis proyectos" onClick={() => void goHome()}>
        <ChevronLeft size={22} />
      </button>
      <button type="button" className={iconBtn} aria-label="Deshacer" disabled={!canUndo} onClick={() => useEditor.getState().undo()} data-testid="m-undo">
        <Undo2 size={19} />
      </button>
      <button type="button" className={`${iconBtn} max-[379px]:hidden`} aria-label="Rehacer" disabled={!canRedo} onClick={() => useEditor.getState().redo()}>
        <Redo2 size={19} />
      </button>
      <div className="min-w-0 flex-1 truncate px-1 text-center text-[12px] text-muted tabular-nums" aria-hidden>
        {project.slides.length > 1 ? `${pageIndex + 1} / ${project.slides.length}` : ''}
      </div>
      {memoryOnly && (
        <button type="button" className="flex h-10 shrink-0 items-center gap-1 rounded-full px-2 text-[11px] font-semibold text-gold active:bg-white/10" aria-label="Sin guardar: exporta una copia para conservar el proyecto" onClick={memoryWarning} data-testid="m-memory-only">
          <CloudOff size={16} className="shrink-0" /> <span className="max-[419px]:hidden">Sin guardar</span>
        </button>
      )}
      <button type="button" className={iconBtn} aria-label="Vista previa" onClick={() => useUI.getState().set({ modal: 'preview' })} data-testid="m-preview">
        <Play size={18} />
      </button>
      <button type="button" className={iconBtn} aria-label="Más" onClick={() => useMobile.getState().open('menu')} data-testid="m-menu">
        <MoreHorizontal size={20} />
      </button>
      <button type="button" className="ml-0.5 flex h-9 shrink-0 items-center gap-1.5 rounded-full bg-gold px-3.5 text-[13px] font-bold text-ink active:scale-95" onClick={() => useMobile.getState().open('export')} data-testid="m-download">
        <Download size={15} /> Descargar
      </button>
    </header>
  )
}

function StripThumb({ project, slide, index, active }: { project: Project; slide: Slide; index: number; active: boolean }) {
  const brand = useLibrary((s) => s.brand)
  const url = useSlideThumb(project, slide, brand, 120)
  const h = 56
  const w = (h * project.format.width) / project.format.height
  const ref = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    if (active) ref.current?.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' })
  }, [active])
  return (
    <button
      ref={ref}
      type="button"
      aria-label={`Página ${index + 1}${active ? ' (actual) · opciones' : ''}`}
      aria-current={active}
      data-testid="m-page"
      onClick={() => (active ? useMobile.getState().open('page') : useEditor.getState().setActiveSlide(slide.id))}
      className={`relative shrink-0 overflow-hidden rounded-lg border-2 transition active:scale-95 ${active ? 'border-gold' : 'border-transparent opacity-75'}`}
      style={{ width: w, height: h }}
    >
      {url ? <img src={url} alt="" className="h-full w-full object-cover" draggable={false} /> : <div className="h-full w-full animate-pulse bg-panel-3" />}
      <span className={`absolute bottom-0.5 left-0.5 rounded px-1 text-[10px] font-bold ${active ? 'bg-gold text-ink' : 'bg-black/70 text-ivory'}`}>{index + 1}</span>
      {active && <span className="absolute top-0.5 right-0.5 flex h-4 w-5 items-center justify-center rounded bg-black/70 text-[10px] leading-none">•••</span>}
    </button>
  )
}

function PageStrip() {
  const project = useEditor((s) => s.project)!
  const activeId = useEditor((s) => s.activeSlideId)
  return (
    <div className="flex h-[76px] shrink-0 items-center gap-2 overflow-x-auto border-t border-line bg-ink-2 px-3" aria-label="Páginas" data-testid="m-strip">
      {project.slides.map((s, i) => (
        <StripThumb key={s.id} project={project} slide={s} index={i} active={s.id === (activeId ?? project.slides[0]?.id)} />
      ))}
      <button type="button" aria-label="Nueva página" onClick={() => useMobile.getState().open('newPage')} data-testid="m-add-page" className="flex h-14 w-11 shrink-0 items-center justify-center rounded-lg border-2 border-dashed border-white/25 text-ivory/80 active:scale-95">
        <Plus size={20} />
      </button>
    </div>
  )
}

const NAV: { sheet: MobileSheet; label: string; icon: typeof Shapes }[] = [
  { sheet: 'templates', label: 'Plantillas', icon: LayoutTemplate },
  { sheet: 'elements', label: 'Elementos', icon: Shapes },
  { sheet: 'photos', label: 'Fotos', icon: ImageIcon },
  { sheet: 'data', label: 'Datos', icon: Table2 },
  { sheet: 'style', label: 'Estilo', icon: Palette },
]

function BottomNav() {
  return (
    <nav className="flex h-[calc(62px+var(--in-bottom))] shrink-0 items-stretch border-t border-line bg-panel pb-[var(--in-bottom)]" aria-label="Herramientas" data-testid="m-nav">
      {NAV.map((n) => (
        <button
          key={n.sheet}
          type="button"
          data-testid={`m-nav-${n.sheet}`}
          onClick={() => useMobile.getState().open(n.sheet, n.sheet === 'templates' ? { templateMode: 'add' } : n.sheet === 'photos' ? { photoMode: 'add' } : {})}
          className="flex flex-1 flex-col items-center justify-center gap-1 text-[11px] font-semibold text-ivory/85 active:bg-white/6"
        >
          <n.icon size={21} strokeWidth={1.9} />
          {n.label}
        </button>
      ))}
    </nav>
  )
}

function SheetHost() {
  const sheet = useMobile((s) => s.sheet)
  switch (sheet) {
    case 'templates':
      return <TemplatesSheet />
    case 'elements':
      return <ElementsSheet />
    case 'photos':
      return <PhotosSheet />
    case 'data':
      return <DataSheet />
    case 'style':
      return <StyleSheet />
    case 'export':
      return <ExportSheet />
    case 'page':
      return <PageSheet />
    case 'newPage':
      return <NewPageSheet />
    case 'more':
      return <MoreSheet />
    case 'layers':
      return <LayersSheet />
    case 'props':
      return <PropsSheet />
    case 'menu':
      return <MenuSheet />
    default:
      return null
  }
}

function TacticsBar() {
  return (
    <div className="shrink-0 border-t border-gold/40 bg-panel px-3 pt-2 pb-[calc(8px+var(--in-bottom))]" data-testid="m-tactics-bar">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-[12px] font-semibold tracking-wide text-gold uppercase">Edición táctica · arrastra jugadores y flechas</span>
        <button type="button" className="h-10 rounded-full bg-gold px-4 text-[13px] font-bold text-ink" onClick={() => useUI.getState().set({ tacticsEditId: null, tacticsSel: null, tacticsTool: 'select' })}>
          Listo
        </button>
      </div>
      <TacticsToolbar />
      <TacticsDelete />
    </div>
  )
}

function TacticsDelete() {
  const sel = useUI((s) => s.tacticsSel)
  const id = useUI((s) => s.tacticsEditId)
  if (!sel || !id) return null
  const remove = () => {
    useEditor.getState().updateElement(id, (d) => {
      if (d.type !== 'tactics' && d.type !== 'stadium3d') return
      d.tactics.annotations = d.tactics.annotations.filter((a) => a.id !== sel)
      d.tactics.players = d.tactics.players.filter((p) => p.id !== sel)
    })
    useUI.getState().set({ tacticsSel: null })
  }
  return (
    <button type="button" className="mt-2 flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-loss/12 text-[13px] font-semibold text-loss active:scale-[0.99]" onClick={remove} data-testid="m-tactics-delete">
      Borrar lo seleccionado
    </button>
  )
}

export function MobileEditor() {
  useViewportHeight()
  const hasSlide = useEditor((s) => (s.project?.slides.length ?? 0) > 0)
  const selected = useEditor((s) => s.selection.length > 0)
  const pasteChip = useMobile((s) => s.pasteChip) && hasClipboard()
  const sheet = useMobile((s) => s.sheet)
  const focus = useMobile((s) => s.focus)
  const editingTextId = useUI((s) => s.editingTextId)
  const multi = useUI((s) => s.multiSelect)
  const count = useEditor((s) => s.selection.length)
  const tacticsEditId = useUI((s) => s.tacticsEditId)
  const canvasBox = useRef<HTMLDivElement>(null)
  const [box, setBox] = useState({ w: 0, h: 0 })

  useLayoutEffect(() => {
    const el = canvasBox.current
    if (!el) return
    const ro = new ResizeObserver(() => setBox({ w: el.clientWidth, h: el.clientHeight }))
    ro.observe(el)
    setBox({ w: el.clientWidth, h: el.clientHeight })
    return () => ro.disconnect()
  }, [])

  // Always keep the page fitted on phones; close the tool panel when the selection changes.
  useEffect(() => useUI.getState().set({ autoFit: true }), [sheet, selected, focus, editingTextId, multi])
  // Multi-selection belongs to one page.
  const activeSlideId = useEditor((s) => s.activeSlideId)
  useEffect(() => {
    if (useUI.getState().multiSelect) setMultiSelect(false)
  }, [activeSlideId])
  useEffect(() => useMobile.getState().set({ tool: null }), [count])
  // Leaving the editor resets the mobile UI.
  useEffect(
    () => () => {
      useMobile.getState().set({ sheet: null, tool: null, focus: false, pasteChip: false })
      useUI.getState().set({ multiSelect: false })
    },
    [],
  )

  const editingExists = useEditor((s) => !!editingTextId && !!activeSlideOf(s)?.elements.some((e) => e.id === editingTextId))
  const editingText = editingExists
  let bottom: React.ReactNode
  if (editingText) bottom = <TextSheet />
  else if (tacticsEditId) bottom = <TacticsBar />
  else if (sheet) bottom = <SheetHost />
  else if (selected) bottom = <ContextBar />
  else if (!focus)
    bottom = (
      <>
        <PageStrip />
        <BottomNav />
      </>
    )

  return (
    <div className="m-editor flex flex-col overflow-hidden bg-ink" style={{ height: 'var(--app-h, 100dvh)', paddingLeft: 'var(--in-left)', paddingRight: 'var(--in-right)' }} data-testid="mobile-editor">
      {!focus && <TopBar />}
        {multi && !editingText && (
          <div className="mx-3 mt-2 flex shrink-0 items-center gap-2 rounded-2xl border border-gold/40 bg-[#1b1d22] py-2 pr-2 pl-4" role="status" data-testid="m-multi-banner">
            <span className="min-w-0 flex-1 text-[13px] leading-tight">
              <b className="text-gold tabular-nums">{count}</b> seleccionado{count === 1 ? '' : 's'}
              <span className="block text-[11px] text-muted">Toca para añadir o quitar. Arrastra para mover todo.</span>
            </span>
            <button type="button" className="h-9 shrink-0 rounded-full bg-gold px-4 text-[13px] font-bold text-ink active:scale-95" onClick={() => setMultiSelect(false)} data-testid="m-multi-done">
              Listo
            </button>
          </div>
        )}
      <div ref={canvasBox} className="relative min-h-0 flex-1">
        {hasSlide && <EditorCanvas mobile />}
        <SelectionPill containerW={box.w} containerH={box.h} />
        {pasteChip && !selected && !sheet && !editingText && (
          <div className="absolute bottom-3 left-1/2 z-20 flex h-10 -translate-x-1/2 items-center overflow-hidden rounded-full border border-white/15 bg-[#1b1d22]/95 text-[13px] font-semibold shadow-xl">
            <button type="button" className="flex h-full items-center gap-2 pr-2 pl-4 active:bg-white/10" onClick={() => (pasteClipboard(), useMobile.getState().set({ pasteChip: false }))} data-testid="m-paste">
              <ClipboardPaste size={16} /> Pegar aquí
            </button>
            <button type="button" className="flex h-full w-9 items-center justify-center border-l border-white/10 text-muted active:bg-white/10" aria-label="Descartar" onClick={() => useMobile.getState().set({ pasteChip: false })}>
              <X size={15} />
            </button>
          </div>
        )}
        {focus && !selected && !multi && (
          <button type="button" className="absolute top-[calc(12px+var(--in-top))] right-3 z-20 flex h-10 items-center gap-1.5 rounded-full border border-white/15 bg-[#1b1d22]/90 px-3.5 text-[13px] font-semibold shadow-xl" onClick={() => useMobile.getState().set({ focus: false })} data-testid="m-exit-focus">
            <Minimize2 size={15} /> Salir del enfoque
          </button>
        )}
      </div>
      {bottom}
    </div>
  )
}

function hasClipboard() {
  return !!useEditor.getState().clipboard?.length
}

/** Selected element (for tests and debugging). */
export function mobileSelected() {
  const s = useEditor.getState()
  return activeSlideOf(s)?.elements.find((e) => s.selection.includes(e.id)) ?? null
}
