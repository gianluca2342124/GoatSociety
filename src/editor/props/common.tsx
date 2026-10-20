import { useRef, useState } from 'react'
import { AlignCenterHorizontal, AlignCenterVertical, AlignEndHorizontal, AlignEndVertical, AlignStartHorizontal, AlignStartVertical, ImagePlus, Plus, Trash2, Upload } from 'lucide-react'
import type { AssetKind, BlendMode, Fill, GradientStop, SlideElement } from '../../model/types'
import { useEditor } from '../../store/editor'
import { useLibrary } from '../../store/library'
import { useUI } from '../../store/ui'
import { ColorField, NumberField, Row, Section, Segmented, Select, Slider, Toggle } from '../../ui/controls'
import { assetUrl, getImage, useAssetVersion } from '../../render/assetCache'
import { isModelFile } from '../../db/assets'

export function useElementSetter<T extends SlideElement>(el: T) {
  const updateElement = useEditor((s) => s.updateElement)
  return (patch: Partial<T> | ((d: T) => void), key?: string) => {
    if (typeof patch === 'function') updateElement(el.id, (d) => patch(d as unknown as T), { key: key ?? `fn-${el.id}` })
    else updateElement(el.id, patch as Partial<SlideElement>, { key: key ?? `p-${el.id}-${Object.keys(patch).join(',')}` })
  }
}

export function TransformSection({ el }: { el: SlideElement }) {
  const set = useElementSetter(el)
  const project = useEditor((s) => s.project)!
  const W = project.format.width
  const H = project.format.height
  const align = (k: 'l' | 'c' | 'r' | 't' | 'm' | 'b') => {
    const p: Partial<SlideElement> = {}
    if (k === 'l') p.x = 0
    if (k === 'c') p.x = (W - el.width) / 2
    if (k === 'r') p.x = W - el.width
    if (k === 't') p.y = 0
    if (k === 'm') p.y = (H - el.height) / 2
    if (k === 'b') p.y = H - el.height
    set(p, `align-${el.id}`)
  }
  return (
    <Section title="Posición y tamaño">
      <div className="grid grid-cols-6 gap-1">
        {(
          [
            ['l', AlignStartVertical, 'Alinear a la izquierda'],
            ['c', AlignCenterVertical, 'Centrar horizontalmente'],
            ['r', AlignEndVertical, 'Alinear a la derecha'],
            ['t', AlignStartHorizontal, 'Alinear arriba'],
            ['m', AlignCenterHorizontal, 'Centrar verticalmente'],
            ['b', AlignEndHorizontal, 'Alinear abajo'],
          ] as const
        ).map(([k, Icon, label]) => (
          <button key={k} type="button" className="icon-btn w-full" title={label} aria-label={label} onClick={() => align(k)}>
            <Icon size={15} />
          </button>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <NumberField label="X" value={Math.round(el.x)} onChange={(v) => set({ x: v ?? 0 })} />
        <NumberField label="Y" value={Math.round(el.y)} onChange={(v) => set({ y: v ?? 0 })} />
        <NumberField label="Ancho" value={Math.round(el.width)} min={4} onChange={(v) => set({ width: Math.max(4, v ?? 4) })} />
        <NumberField label="Alto" value={Math.round(el.height)} min={4} onChange={(v) => set({ height: Math.max(4, v ?? 4) })} />
      </div>
      <Slider label="Rotación" min={-180} max={180} step={1} value={el.rotation} format={(v) => `${Math.round(v)}°`} onChange={(v) => set({ rotation: v })} />
    </Section>
  )
}

const BLENDS: { value: BlendMode; label: string }[] = [
  { value: 'source-over', label: 'Normal' },
  { value: 'screen', label: 'Trama (aclarar)' },
  { value: 'lighter', label: 'Añadir (luz)' },
  { value: 'overlay', label: 'Superponer' },
  { value: 'soft-light', label: 'Luz suave' },
  { value: 'multiply', label: 'Multiplicar' },
  { value: 'color-dodge', label: 'Sobreexponer' },
  { value: 'darken', label: 'Oscurecer' },
  { value: 'lighten', label: 'Aclarar' },
]

const MIN_INTENSITY_OPTIONS: { value: 'always' | 'editorial' | 'cinematic'; label: string }[] = [
  { value: 'always', label: 'Siempre' },
  { value: 'editorial', label: 'Editorial y Cinemático' },
  { value: 'cinematic', label: 'Solo Cinemático' },
]

export function AppearanceSection({ el }: { el: SlideElement }) {
  const set = useElementSetter(el)
  const fx = el.fx ?? {}
  const shadow = fx.shadow ?? { enabled: false, color: '#000000', blur: 30, offsetX: 0, offsetY: 12, opacity: 0.6 }
  const glow = fx.glow ?? { enabled: false, color: '$accent', blur: 30, opacity: 0.8 }
  const setFx = (patch: Partial<NonNullable<SlideElement['fx']>>) => set((d) => void (d.fx = { ...(d.fx ?? {}), ...patch }), `fx-${el.id}-${Object.keys(patch).join()}`)
  return (
    <>
      <Section title="Apariencia">
        <Slider label="Opacidad" value={el.opacity} onChange={(v) => set({ opacity: v })} format={(v) => `${Math.round(v * 100)}%`} />
        <Select label="Fusión" value={(fx.blend ?? 'source-over') as BlendMode} options={BLENDS} onChange={(v) => setFx({ blend: v })} />
        <Select
          label="Visible en intensidad"
          value={el.minIntensity ?? 'always'}
          options={MIN_INTENSITY_OPTIONS}
          onChange={(v) =>
            set((d) => {
              if (v === 'always') delete d.minIntensity
              else d.minIntensity = v
            })
          }
        />
      </Section>
      <Section title="Efectos del elemento" defaultOpen={!!(fx.shadow?.enabled || fx.glow?.enabled || fx.blur)}>
        <Toggle label="Sombra editorial" checked={shadow.enabled} onChange={(v) => setFx({ shadow: { ...shadow, enabled: v } })} />
        {shadow.enabled && (
          <div className="space-y-3 rounded-lg bg-ink-2 p-2.5">
            <ColorField label="Color" value={shadow.color} onChange={(c) => setFx({ shadow: { ...shadow, color: c } })} />
            <Slider label="Desenfoque" min={0} max={120} step={1} value={shadow.blur} onChange={(v) => setFx({ shadow: { ...shadow, blur: v } })} />
            <Slider label="Desplazamiento Y" min={-80} max={80} step={1} value={shadow.offsetY} onChange={(v) => setFx({ shadow: { ...shadow, offsetY: v } })} />
            <Slider label="Desplazamiento X" min={-80} max={80} step={1} value={shadow.offsetX} onChange={(v) => setFx({ shadow: { ...shadow, offsetX: v } })} />
            <Slider label="Intensidad" value={shadow.opacity} onChange={(v) => setFx({ shadow: { ...shadow, opacity: v } })} />
          </div>
        )}
        <Toggle label="Resplandor (glow)" checked={glow.enabled} onChange={(v) => setFx({ glow: { ...glow, enabled: v } })} />
        {glow.enabled && (
          <div className="space-y-3 rounded-lg bg-ink-2 p-2.5">
            <ColorField label="Color" value={glow.color} onChange={(c) => setFx({ glow: { ...glow, color: c } })} />
            <Slider label="Radio" min={0} max={140} step={1} value={glow.blur} onChange={(v) => setFx({ glow: { ...glow, blur: v } })} />
            <Slider label="Intensidad" value={glow.opacity} onChange={(v) => setFx({ glow: { ...glow, opacity: v } })} />
          </div>
        )}
        <Slider label="Desenfoque del elemento" min={0} max={60} step={0.5} value={fx.blur ?? 0} format={(v) => `${v.toFixed(1)} px`} onChange={(v) => setFx({ blur: v })} />
      </Section>
    </>
  )
}

export function FillEditor({ fill, onChange, label = 'Relleno', allowNone = true }: { fill: Fill; onChange: (f: Fill) => void; label?: string; allowNone?: boolean }) {
  const toKind = (k: Fill['kind']): Fill => {
    const base = fill.kind === 'solid' ? fill.color : fill.kind === 'linear' || fill.kind === 'radial' ? fill.stops[0]?.color ?? '$primary' : '$primary'
    const stops: GradientStop[] = fill.kind === 'linear' || fill.kind === 'radial' ? fill.stops : [{ offset: 0, color: base }, { offset: 1, color: '$bg' }]
    if (k === 'solid') return { kind: 'solid', color: base }
    if (k === 'linear') return { kind: 'linear', angle: 180, stops }
    if (k === 'radial') return { kind: 'radial', cx: 0.5, cy: 0.4, radius: 0.7, stops }
    return { kind: 'none' }
  }
  const opts: { value: Fill['kind']; label: string }[] = [
    { value: 'solid', label: 'Sólido' },
    { value: 'linear', label: 'Lineal' },
    { value: 'radial', label: 'Radial' },
  ]
  if (allowNone) opts.push({ value: 'none', label: 'Nada' })
  const setStop = (i: number, patch: Partial<GradientStop>) => {
    if (fill.kind !== 'linear' && fill.kind !== 'radial') return
    onChange({ ...fill, stops: fill.stops.map((s, k) => (k === i ? { ...s, ...patch } : s)) })
  }
  return (
    <div className="space-y-2.5">
      <Row label={label}>
        <Segmented value={fill.kind} onChange={(k) => onChange(toKind(k))} options={opts} ariaLabel={label} />
      </Row>
      {fill.kind === 'solid' && (
        <>
          <ColorField label="Color" value={fill.color} onChange={(c) => onChange({ ...fill, color: c })} />
          <Slider label="Opacidad del relleno" value={fill.opacity ?? 1} onChange={(v) => onChange({ ...fill, opacity: v })} />
        </>
      )}
      {fill.kind === 'linear' && <Slider label="Ángulo" min={0} max={360} step={1} value={fill.angle} format={(v) => `${Math.round(v)}°`} onChange={(v) => onChange({ ...fill, angle: v })} />}
      {fill.kind === 'radial' && (
        <div className="grid grid-cols-3 gap-2">
          <Slider label="Centro X" value={fill.cx} onChange={(v) => onChange({ ...fill, cx: v })} />
          <Slider label="Centro Y" value={fill.cy} onChange={(v) => onChange({ ...fill, cy: v })} />
          <Slider label="Radio" min={0.05} max={1.5} value={fill.radius} onChange={(v) => onChange({ ...fill, radius: v })} />
        </div>
      )}
      {(fill.kind === 'linear' || fill.kind === 'radial') && (
        <div className="space-y-2 rounded-lg bg-ink-2 p-2.5">
          <div className="flex items-center justify-between">
            <span className="label-xs">Paradas</span>
            <button type="button" className="icon-btn h-6 w-6" aria-label="Añadir parada" onClick={() => onChange({ ...fill, stops: [...fill.stops, { offset: 0.5, color: '$primary' }].sort((a, b) => a.offset - b.offset) })}>
              <Plus size={13} />
            </button>
          </div>
          {fill.stops.map((s, i) => (
            <div key={i} className="space-y-1.5 border-t border-line pt-2 first:border-0 first:pt-0">
              <div className="flex items-end gap-1.5">
                <div className="flex-1">
                  <ColorField label={`Color ${i + 1}`} value={s.color} onChange={(c) => setStop(i, { color: c })} />
                </div>
                {fill.stops.length > 2 && (
                  <button type="button" className="icon-btn mb-0.5" aria-label="Quitar parada" onClick={() => onChange({ ...fill, stops: fill.stops.filter((_, k) => k !== i) })}>
                    <Trash2 size={13} />
                  </button>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Slider label="Posición" value={s.offset} onChange={(v) => setStop(i, { offset: v })} />
                <Slider label="Opacidad" value={s.opacity ?? 1} onChange={(v) => setStop(i, { opacity: v })} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/** Choose a stored asset (or upload a new one) of the given kinds. */
export function AssetPicker({ value, onChange, kinds, uploadKind, label = 'Imagen', models = false }: { value: string | null; onChange: (id: string | null) => void; kinds?: AssetKind[]; uploadKind: AssetKind; label?: string; models?: boolean }) {
  const assets = useLibrary((s) => s.assets)
  const upload = useLibrary((s) => s.uploadAsset)
  const toast = useUI((s) => s.toast)
  const input = useRef<HTMLInputElement>(null)
  const [open, setOpen] = useState(false)
  useAssetVersion((s) => s.version)
  const list = assets.filter((a) => (models ? a.kind === 'model3d' : a.kind !== 'model3d') && (!kinds || kinds.includes(a.kind) || !models))
  const current = assets.find((a) => a.id === value)
  if (value) getImage(value)
  return (
    <Row label={label}>
      <div className="flex items-center gap-2">
        <button type="button" className="checker flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-line" onClick={() => setOpen(!open)} aria-label={`Elegir ${label.toLowerCase()}`}>
          {current && !models && assetUrl(current.id) ? <img src={assetUrl(current.id)!} alt="" className="h-full w-full object-contain" /> : <ImagePlus size={16} className="text-muted" />}
        </button>
        <div className="min-w-0 flex-1">
          <div className="truncate text-[12px]">{current ? current.name : <span className="text-muted">Sin seleccionar</span>}</div>
          <div className="mt-1 flex gap-1.5">
            <button type="button" className="btn px-2 py-1 text-[11px]" onClick={() => input.current?.click()}>
              <Upload size={12} /> Subir
            </button>
            {list.length > 0 && (
              <button type="button" className="btn px-2 py-1 text-[11px]" onClick={() => setOpen(!open)}>
                Biblioteca
              </button>
            )}
            {value && (
              <button type="button" className="btn btn-danger px-2 py-1 text-[11px]" onClick={() => onChange(null)}>
                Quitar
              </button>
            )}
          </div>
        </div>
        <input
          ref={input}
          type="file"
          hidden
          data-testid="asset-file-input"
          accept={models ? '.glb,.gltf' : 'image/png,image/jpeg,image/webp,image/svg+xml'}
          onChange={async (e) => {
            const f = e.target.files?.[0]
            e.target.value = ''
            if (!f) return
            try {
              const meta = await upload(f, models || isModelFile(f) ? 'model3d' : uploadKind)
              onChange(meta.id)
            } catch (err) {
              toast(err instanceof Error ? err.message : 'No se pudo subir el archivo', 'error')
            }
          }}
        />
      </div>
      {open && list.length > 0 && (
        <div className="mt-2 grid max-h-48 grid-cols-4 gap-1.5 overflow-y-auto rounded-lg border border-line bg-ink-2 p-1.5">
          {list.map((a) => {
            if (!models) getImage(a.id)
            const url = assetUrl(a.id)
            return (
              <button
                key={a.id}
                type="button"
                title={a.name}
                onClick={() => {
                  onChange(a.id)
                  setOpen(false)
                }}
                className={`checker flex aspect-square items-center justify-center overflow-hidden rounded-md border ${a.id === value ? 'border-gold' : 'border-line'}`}
              >
                {url && !models ? <img src={url} alt={a.name} className="h-full w-full object-contain" /> : <span className="px-1 text-[9px] break-all text-muted">{a.name}</span>}
              </button>
            )
          })}
        </div>
      )}
    </Row>
  )
}
