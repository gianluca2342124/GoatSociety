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
import { ChevronLeft, ClipboardPaste, Download, Image as ImageIcon, LayoutTemplate, Minimize2, MoreHorizontal, Palette, Play, Plus, Redo2, Shapes, Table2, Undo2, X } from 'lucide-react'
import { activeSlideOf, useEditor } from '../store/editor'
import { useLibrary } from '../store/library'
import { useUI } from '../store/ui'
import { goHome } from '../store/projectService'
import { EditorCanvas } from '../editor/canvas/EditorCanvas'
import { useSlideThumb } from '../editor/thumbs'
import { TacticsToolbar } from '../editor/props/tacticsProps'
import { pasteClipboard } from '../editor/actions'
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
    return () => {
      vv?.removeEventListener('resize', apply)
      window.removeEventListener('resize', apply)
      document.documentElement.style.removeProperty('--app-h')
    }
  }, [])
}

function TopBar() {
  const project = useEditor((s) => s.project)!
  const canUndo = useEditor((s) => s.past.length > 0)
  const canRedo = useEditor((s) => s.future.length > 0)
  const pageIndex = useEditor((s) => Math.max(0, s.project?.slides.findIndex((x) => x.id === s.activeSlideId) ?? 0))
  const iconBtn = 'flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-ivory active:bg-white/10 disabled:opacity-30'
  return (
    <header className="flex h-[52px] shrink-0 items-center gap-0.5 border-b border-line bg-ink-2 px-1.5 pt-[env(safe-area-inset-top)]" data-testid="m-topbar">
      <button type="button" className={iconBtn} aria-label="Mis proyectos" onClick={() => void goHome()}>
        <ChevronLeft size={22} />
      </button>
      <button type="button" className={iconBtn} aria-label="Deshacer" disabled={!canUndo} onClick={() => useEditor.getState().undo()} data-testid="m-undo">
        <Undo2 size={19} />
      </button>
      <button type="button" className={iconBtn} aria-label="Rehacer" disabled={!canRedo} onClick={() => useEditor.getState().redo()}>
        <Redo2 size={19} />
      </button>
      <div className="min-w-0 flex-1 truncate px-1 text-center text-[12px] text-muted tabular-nums" aria-hidden>
        {project.slides.length > 1 ? `${pageIndex + 1} / ${project.slides.length}` : ''}
      </div>
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
    <nav className="flex h-[62px] shrink-0 items-stretch border-t border-line bg-panel pb-[env(safe-area-inset-bottom)]" aria-label="Herramientas" data-testid="m-nav">
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
    <div className="shrink-0 border-t border-gold/40 bg-panel px-3 pt-2 pb-[calc(8px+env(safe-area-inset-bottom))]" data-testid="m-tactics-bar">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-[12px] font-semibold tracking-wide text-gold uppercase">Edición táctica · arrastra jugadores y flechas</span>
        <button type="button" className="h-8 rounded-full bg-gold px-3 text-[12px] font-bold text-ink" onClick={() => useUI.getState().set({ tacticsEditId: null, tacticsSel: null, tacticsTool: 'select' })}>
          Listo
        </button>
      </div>
      <TacticsToolbar />
    </div>
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
  useEffect(() => useUI.getState().set({ autoFit: true }), [sheet, selected, focus, editingTextId])
  useEffect(() => useMobile.getState().set({ tool: null }), [selected])
  // Leaving the editor resets the mobile UI.
  useEffect(() => () => useMobile.getState().set({ sheet: null, tool: null, focus: false }), [])

  const editingText = !!editingTextId
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
    <div className="m-editor flex flex-col overflow-hidden bg-ink" style={{ height: 'var(--app-h, 100dvh)' }} data-testid="mobile-editor">
      {!focus && <TopBar />}
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
        {focus && (
          <button type="button" className="absolute top-[calc(12px+env(safe-area-inset-top))] right-3 z-20 flex h-10 items-center gap-1.5 rounded-full border border-white/15 bg-[#1b1d22]/90 px-3.5 text-[13px] font-semibold shadow-xl" onClick={() => useMobile.getState().set({ focus: false })} data-testid="m-exit-focus">
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
