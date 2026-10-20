import { useState } from 'react'
import { AlertTriangle, Download, FileArchive, Image as ImageIcon } from 'lucide-react'
import { useEditor } from '../../store/editor'
import { useLibrary } from '../../store/library'
import { useUI } from '../../store/ui'
import { Modal, Row, Segmented, Slider, Spinner, Toggle } from '../../ui/controls'
import { downloadBlob, exportCarouselZip, exportSlideBlob, slideFileName, type ExportFormat } from '../../render/exporter'

export function ExportDialog() {
  const project = useEditor((s) => s.project)!
  const activeId = useEditor((s) => s.activeSlideId)
  const brand = useLibrary((s) => s.brand)
  const close = () => useUI.getState().set({ modal: null })
  const toast = useUI((s) => s.toast)
  const [format, setFormat] = useState<ExportFormat>('png')
  const [quality, setQuality] = useState(0.92)
  const [scale, setScale] = useState<'1' | '2'>('1')
  const [transparent, setTransparent] = useState(false)
  const [scope, setScope] = useState<'all' | 'current'>(project.slides.length > 1 ? 'all' : 'current')
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState(0)
  const index = Math.max(0, project.slides.findIndex((s) => s.id === activeId))
  const opts = { format, quality, scale: Number(scale), transparent: transparent && format !== 'jpeg' }
  const w = project.format.width * Number(scale)
  const h = project.format.height * Number(scale)

  const run = async () => {
    setBusy(true)
    setProgress(0)
    try {
      if (scope === 'current') {
        const { blob, name } = await exportSlideBlob(project, index, brand, opts)
        downloadBlob(blob, name)
        toast(`Exportado ${name}`, 'success')
      } else {
        const { blob, name } = await exportCarouselZip(project, brand, opts, (d, t) => setProgress(d / t))
        downloadBlob(blob, name)
        toast(`Carrusel exportado: ${project.slides.length} imágenes en ${name}`, 'success')
      }
      close()
    } catch (e) {
      console.error(e)
      toast(`No se pudo exportar: ${e instanceof Error ? e.message : 'error desconocido'}`, 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal
      title="Exportar"
      onClose={close}
      width={520}
      footer={
        <>
          <button type="button" className="btn" onClick={close} disabled={busy}>
            Cancelar
          </button>
          <button type="button" className="btn btn-gold min-w-[160px]" onClick={() => void run()} disabled={busy} data-testid="do-export">
            {busy ? <Spinner size={14} /> : scope === 'all' ? <FileArchive size={15} /> : <Download size={15} />}
            {busy ? (scope === 'all' ? `Renderizando ${Math.round(progress * 100)}%` : 'Renderizando…') : scope === 'all' ? 'Descargar ZIP' : 'Descargar imagen'}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        {project.match.isSample && (
          <div className="flex gap-2 rounded-lg border border-[#F2B33D]/40 bg-[#F2B33D]/10 p-3 text-[12px] leading-snug text-[#F5CF7A]">
            <AlertTriangle size={15} className="mt-0.5 shrink-0" />
            Este proyecto aún contiene datos de ejemplo ficticios (jugadores, cifras o pronósticos). Revísalos antes de publicar.
          </div>
        )}
        <Row label="Qué exportar">
          <Segmented
            value={scope}
            onChange={setScope}
            options={[
              { value: 'all', label: `Carrusel completo · ${project.slides.length} (ZIP)` },
              { value: 'current', label: `Solo diapositiva ${index + 1}` },
            ]}
          />
        </Row>
        <Row label="Formato">
          <Segmented
            value={format}
            onChange={setFormat}
            options={[
              { value: 'png', label: 'PNG (máxima calidad)' },
              { value: 'jpeg', label: 'JPEG' },
              { value: 'webp', label: 'WebP' },
            ]}
          />
        </Row>
        {format !== 'png' && <Slider label="Calidad" min={0.5} max={1} step={0.01} value={quality} format={(v) => `${Math.round(v * 100)}%`} onChange={setQuality} />}
        <Row label="Resolución">
          <Segmented
            value={scale}
            onChange={setScale}
            options={[
              { value: '1', label: `1× · ${project.format.width}×${project.format.height}` },
              { value: '2', label: `2× · ${project.format.width * 2}×${project.format.height * 2}` },
            ]}
          />
        </Row>
        {format !== 'jpeg' && <Toggle label="Fondo transparente (solo el diseño, sin color de fondo)" checked={transparent} onChange={setTransparent} />}
        <div className="rounded-lg border border-line bg-ink-2 p-3">
          <div className="label-xs mb-2 flex items-center gap-1.5">
            <ImageIcon size={12} /> Archivos
          </div>
          <ul className="space-y-0.5 font-mono text-[11px] text-ivory/75">
            {(scope === 'all' ? project.slides.slice(0, 4).map((_, i) => i) : [index]).map((i) => (
              <li key={i}>{slideFileName(project, i, format)}</li>
            ))}
            {scope === 'all' && project.slides.length > 4 && <li className="text-dim">… y {project.slides.length - 4} más</li>}
          </ul>
          <p className="mt-2 text-[11px] text-muted">
            {w}×{h}px por imagen. Solo el diseño: sin guías, sin controles y sin interfaz de la plataforma.
          </p>
        </div>
      </div>
    </Modal>
  )
}
