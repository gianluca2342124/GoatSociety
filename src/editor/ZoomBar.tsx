import { Grid3x3, Magnet, Maximize, Minus, Plus, ScanLine, Smartphone } from 'lucide-react'
import { useUI } from '../store/ui'
import { useEditor } from '../store/editor'

export function setZoom(z: number) {
  const ui = useUI.getState()
  const el = document.querySelector('[data-testid="canvas-workspace"]') as HTMLElement | null
  const w = el?.clientWidth ?? 800
  const h = el?.clientHeight ?? 600
  const nz = Math.max(0.05, Math.min(4, z))
  const cx = (w / 2 - ui.pan.x) / ui.zoom
  const cy = (h / 2 - ui.pan.y) / ui.zoom
  ui.set({ autoFit: false, zoom: nz, pan: { x: w / 2 - cx * nz, y: h / 2 - cy * nz } })
}

export function ZoomBar() {
  const { zoom, showGrid, snapToGrid, snapGuides, showSafeArea } = useUI()
  const set = useUI((s) => s.set)
  const project = useEditor((s) => s.project)!
  return (
    <div className="pointer-events-auto absolute bottom-3 left-1/2 z-10 flex -translate-x-1/2 items-center gap-0.5 rounded-xl border border-line-2 bg-panel/95 p-1 shadow-xl backdrop-blur">
      <button type="button" className="icon-btn" aria-label="Alejar" title="Alejar (−)" onClick={() => setZoom(zoom / 1.2)}>
        <Minus size={15} />
      </button>
      <button type="button" className="w-14 rounded-md py-1 text-center text-[12px] font-semibold tabular-nums hover:bg-white/5" title="Zoom 100%" onClick={() => setZoom(1)}>
        {Math.round(zoom * 100)}%
      </button>
      <button type="button" className="icon-btn" aria-label="Acercar" title="Acercar (+)" onClick={() => setZoom(zoom * 1.2)}>
        <Plus size={15} />
      </button>
      <button type="button" className="icon-btn" aria-label="Ajustar a pantalla" title="Ajustar (0)" onClick={() => set({ autoFit: true })}>
        <Maximize size={15} />
      </button>
      <div className="mx-1 h-5 w-px bg-line" />
      <button type="button" className="icon-btn" data-active={showGrid} aria-pressed={showGrid} aria-label="Cuadrícula" title="Mostrar cuadrícula" onClick={() => set({ showGrid: !showGrid })}>
        <Grid3x3 size={15} />
      </button>
      <button type="button" className="icon-btn" data-active={snapToGrid} aria-pressed={snapToGrid} aria-label="Ajustar a cuadrícula" title="Ajustar a la cuadrícula" onClick={() => set({ snapToGrid: !snapToGrid })}>
        <Magnet size={15} />
      </button>
      <button type="button" className="icon-btn" data-active={snapGuides} aria-pressed={snapGuides} aria-label="Guías inteligentes" title="Guías de alineación inteligentes" onClick={() => set({ snapGuides: !snapGuides })}>
        <ScanLine size={15} />
      </button>
      <button type="button" className="icon-btn" data-active={showSafeArea} aria-pressed={showSafeArea} aria-label="Zona segura" title={`Zona segura de la interfaz (${project.format.preset === 'story' ? 'TikTok / Stories' : 'Instagram'})`} onClick={() => set({ showSafeArea: !showSafeArea })}>
        <Smartphone size={15} />
      </button>
    </div>
  )
}
