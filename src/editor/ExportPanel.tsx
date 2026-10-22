import { useEffect, useState } from 'react'
import { AlertTriangle, Check, Download, FileArchive, ImageDown } from 'lucide-react'
import { useEditor } from '../store/editor'
import { useLibrary } from '../store/library'
import { useUI } from '../store/ui'
import { Segmented, Slider, Spinner, Toggle } from '../ui/controls'
import { hostDownloads, inArtifact } from '../host'
import { downloadBlob, downloadFiles, exportCarouselZip, exportSlideFiles, exportWarnings, type ExportFormat } from '../render/exporter'
import { openPhotoGallery, PHOTO_HINT, photoMessage, photoMethod, saveToPhotos } from './saveToPhotos'
import { useSlideThumb } from './thumbs'
import type { Project, Slide } from '../model/types'

type Scope = 'current' | 'all' | 'pick'
type Packaging = 'zip' | 'files'

function PickThumb({ project, slide, index, on, toggle }: { project: Project; slide: Slide; index: number; on: boolean; toggle: () => void }) {
  const brand = useLibrary((s) => s.brand)
  const url = useSlideThumb(project, slide, brand, 140)
  const ratio = project.format.width / project.format.height
  return (
    <button type="button" onClick={toggle} aria-pressed={on} aria-label={`Página ${index + 1}`} className={`relative overflow-hidden rounded-lg border-2 transition ${on ? 'border-gold' : 'border-transparent opacity-60'}`} style={{ aspectRatio: `${ratio}` }}>
      {url ? <img src={url} alt="" className="h-full w-full object-cover" /> : <div className="h-full w-full bg-ink-2" />}
      <span className="absolute top-1 left-1 rounded bg-black/70 px-1 text-[10px] font-bold">{index + 1}</span>
      {on && (
        <span className="absolute top-1 right-1 flex h-5 w-5 items-center justify-center rounded-full bg-gold text-ink">
          <Check size={12} strokeWidth={3} />
        </span>
      )}
    </button>
  )
}

/** Export UI shared by the desktop dialog and the mobile sheet. */
export function ExportPanel({ onDone, compact = false }: { onDone: () => void; compact?: boolean }) {
  const project = useEditor((s) => s.project)!
  const activeId = useEditor((s) => s.activeSlideId)
  const brand = useLibrary((s) => s.brand)
  const toast = useUI((s) => s.toast)
  const n = project.slides.length
  const current = Math.max(0, project.slides.findIndex((s) => s.id === activeId))
  const [scope, setScope] = useState<Scope>(n > 1 ? 'all' : 'current')
  // Picked pages are kept by id, so undo/redo or moved pages never change what gets exported.
  const [picked, setPicked] = useState<string[]>(() => [project.slides[current]?.id ?? ''])
  const [packaging, setPackaging] = useState<Packaging>('zip')
  const [format, setFormat] = useState<ExportFormat>('png')
  const [quality, setQuality] = useState(0.92)
  const [scale, setScale] = useState<'1' | '2'>('1')
  const [transparent, setTransparent] = useState(false)
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState(0)
  /** Rendering is done and the file is being handed over (inside claude.ai: waiting for the person to confirm). */
  const [saving, setSaving] = useState(false)
  // Phones (and touch tablets) get «Guardar en Fotos» as the main action.
  const phone = compact || (typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches)
  const [method, setMethod] = useState(photoMethod)
  // Inside claude.ai the viewer may still refuse to save files: then the hint describes the manual route.
  useEffect(() => {
    if (method === 'viewer') void hostDownloads().then((d) => !d && setMethod('gallery'))
  }, [method])
  const [busyPhotos, setBusyPhotos] = useState(false)
  const indices = scope === 'current' ? [current] : scope === 'all' ? project.slides.map((_, i) => i) : project.slides.flatMap((sl, i) => (picked.includes(sl.id) ? [i] : []))
  const many = indices.length > 1
  const opts = { format, quality, scale: Number(scale), transparent: transparent && format !== 'jpeg' }
  const onProgress = (d: number, t: number) => setProgress(d / t)

  const finish = () => {
    for (const w of new Set(exportWarnings)) toast(w, 'error')
    onDone()
  }

  /** After a partial save, keep only the pages still missing picked, so a retry doesn't save the others twice. */
  const keepRemaining = (saved: number): string => {
    if (saved <= 0 || saved >= indices.length) return ''
    const rest = indices.slice(saved).map((i) => project.slides[i].id)
    setScope('pick')
    setPicked(rest)
    return ` Quedan ${rest.length}: vuelve a pulsar para guardarlas.`
  }

  const download = async () => {
    if (!indices.length) return
    setBusy(true)
    setProgress(0)
    exportWarnings.length = 0
    try {
      if (many && packaging === 'zip') {
        const { blob, name } = await exportCarouselZip(project, brand, opts, onProgress, indices)
        setSaving(true)
        if (!(await downloadBlob(blob, name))) return toast('Descarga cancelada', 'info')
        toast(`${indices.length} imágenes descargadas en ${name}`, 'success')
      } else {
        const files = await exportSlideFiles(project, brand, opts, indices, onProgress)
        setSaving(true)
        const { saved, error } = await downloadFiles(files)
        if (saved < files.length) {
          // Keep the panel open with the same choices so the rest can be retried.
          const done = saved ? `Se guardaron ${saved} de ${files.length} imágenes. ` : ''
          const rest = keepRemaining(saved)
          return toast(error ? `${done}${error}${rest}` : saved ? `${done}El resto se canceló.${rest}` : 'Descarga cancelada', error ? 'error' : 'info')
        }
        toast(saved === 1 ? `Descargada ${files[0].name}` : `${saved} imágenes descargadas`, 'success')
      }
      finish()
    } catch (e) {
      console.error(e)
      toast(`No se pudo exportar: ${e instanceof Error ? e.message : 'error desconocido'}`, 'error')
    } finally {
      setBusy(false)
      setSaving(false)
    }
  }

  /** Pages as loose images (never a ZIP: Photos can't open one). */
  const renderFiles = async () => {
    setProgress(0)
    exportWarnings.length = 0
    return exportSlideFiles(project, brand, opts, indices, onProgress)
  }

  const savePhotos = async () => {
    if (!indices.length) return
    setBusy(true)
    setBusyPhotos(true)
    try {
      const files = await renderFiles()
      setSaving(true)
      const r = await saveToPhotos(files)
      const msg = photoMessage(r, files.length)
      const rest = r.method !== 'gallery' ? keepRemaining(r.saved) : ''
      if (msg) toast(msg.text + rest, msg.kind)
      if (r.method !== 'gallery' && r.saved === files.length && !r.error) finish()
    } catch (e) {
      console.error(e)
      toast(`No se pudo exportar: ${e instanceof Error ? e.message : 'error desconocido'}`, 'error')
    } finally {
      setBusy(false)
      setBusyPhotos(false)
      setSaving(false)
    }
  }

  /** «Guardar a mano»: the press-and-hold screen, whatever the device. */
  const manualPhotos = async () => {
    if (!indices.length) return
    setBusy(true)
    setBusyPhotos(true)
    try {
      await openPhotoGallery(await renderFiles())
    } catch (e) {
      toast(`No se pudo preparar: ${e instanceof Error ? e.message : 'error desconocido'}`, 'error')
    } finally {
      setBusy(false)
      setBusyPhotos(false)
    }
  }

  const label = phone
    ? many
      ? packaging === 'zip'
        ? `Descargar archivo ZIP (${indices.length})`
        : `Descargar ${indices.length} archivos`
      : 'Descargar archivo'
    : scope === 'current'
      ? 'Descargar esta página'
      : many
        ? packaging === 'zip'
          ? `Descargar ${indices.length} en ZIP`
          : `Descargar ${indices.length} imágenes`
        : 'Descargar imagen'

  const packagingControl = (
    <Segmented
      ariaLabel="Cómo descargar"
      value={packaging}
      onChange={setPackaging}
      options={[
        { value: 'zip', label: 'Un archivo ZIP' },
        { value: 'files', label: 'Imágenes sueltas' },
      ]}
    />
  )

  return (
    <div className="space-y-4">
      {project.match.isSample && (
        <div className="flex gap-2 rounded-lg border border-[#F2B33D]/40 bg-[#F2B33D]/10 p-3 text-[12px] leading-snug text-[#F5CF7A]">
          <AlertTriangle size={15} className="mt-0.5 shrink-0" />
          Aún hay datos de ejemplo ficticios. Revísalos antes de publicar.
        </div>
      )}
      <div className="space-y-2">
        <div className="text-[12px] font-semibold text-muted">{phone ? '¿Qué páginas?' : '¿Qué quieres descargar?'}</div>
        <Segmented
          ariaLabel="Páginas a descargar"
          value={scope}
          onChange={setScope}
          options={[
            { value: 'current', label: 'Esta página' },
            { value: 'all', label: `Todas (${n})` },
            ...(n > 1 ? [{ value: 'pick' as const, label: 'Elegir' }] : []),
          ]}
        />
        {scope === 'pick' && (
          <div className="grid grid-cols-4 gap-2 pt-1 sm:grid-cols-6" data-testid="export-pick">
            {project.slides.map((s, i) => (
              <PickThumb key={s.id} project={project} slide={s} index={i} on={picked.includes(s.id)} toggle={() => setPicked((p) => (p.includes(s.id) ? p.filter((x) => x !== s.id) : [...p, s.id]))} />
            ))}
          </div>
        )}
        {many && !phone && packagingControl}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <div className="text-[12px] font-semibold text-muted">Formato</div>
          <Segmented
            ariaLabel="Formato de imagen"
            value={format}
            onChange={setFormat}
            options={[
              { value: 'png', label: 'PNG' },
              { value: 'jpeg', label: 'JPG' },
              { value: 'webp', label: 'WebP' },
            ]}
          />
        </div>
        <div className="space-y-2">
          <div className="text-[12px] font-semibold text-muted">Calidad</div>
          <Segmented
            ariaLabel="Resolución"
            value={scale}
            onChange={setScale}
            options={[
              { value: '1', label: 'Normal' },
              { value: '2', label: 'Alta 2×' },
            ]}
          />
        </div>
      </div>
      {!compact && format !== 'png' && <Slider label="Compresión" min={0.5} max={1} step={0.01} value={quality} format={(v) => `${Math.round(v * 100)}%`} onChange={setQuality} />}
      {!compact && format !== 'jpeg' && <Toggle label="Fondo transparente (solo el diseño)" checked={transparent} onChange={setTransparent} />}
      <p className="text-[11px] text-dim">
        {project.format.width * Number(scale)}×{project.format.height * Number(scale)} px por imagen · solo el diseño, sin guías ni controles.
      </p>
      <div className="flex flex-col gap-2 pt-1">
        {phone && (
          <>
            <button type="button" className="btn btn-gold h-12 w-full text-[15px]" disabled={busy || !indices.length} onClick={() => void savePhotos()} data-testid="save-photos">
              {busyPhotos ? <Spinner size={15} /> : <ImageDown size={17} />}
              {busyPhotos ? (saving ? (inArtifact ? 'Confirma en el aviso…' : 'Abriendo…') : `Preparando ${Math.round(progress * 100)}%`) : indices.length > 1 ? `Guardar ${indices.length} en Fotos` : 'Guardar en Fotos'}
            </button>
            <p className="-mt-0.5 text-center text-[11px] leading-snug text-dim">{PHOTO_HINT[method]}</p>
          </>
        )}
        {phone && (
          <div className="mt-2 flex items-center gap-2 text-[11px] font-semibold tracking-wide text-dim uppercase">
            <span className="h-px flex-1 bg-line" /> o como archivo <span className="h-px flex-1 bg-line" />
          </div>
        )}
        {many && phone && packagingControl}
        <button type="button" className={`btn h-12 w-full text-[14px] ${phone ? '' : 'btn-gold'}`} disabled={busy || !indices.length} onClick={() => void download()} data-testid="do-export">
          {busy && !busyPhotos ? <Spinner size={15} /> : many && packaging === 'zip' ? <FileArchive size={16} /> : <Download size={16} />}
          {busy && !busyPhotos ? (saving ? (inArtifact ? 'Confirma la descarga en el aviso…' : 'Guardando…') : `Renderizando ${Math.round(progress * 100)}%`) : label}
        </button>
        {phone && method !== 'gallery' && (
          <button type="button" className="mt-0.5 self-center py-1 text-[12px] font-semibold text-gold underline-offset-2 active:underline disabled:opacity-40" disabled={busy || !indices.length} onClick={() => void manualPhotos()} data-testid="photos-manual">
            ¿No aparecen en Fotos? Guárdalas a mano
          </button>
        )}
      </div>
    </div>
  )
}
