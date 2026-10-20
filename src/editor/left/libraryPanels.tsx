import { useRef, useState } from 'react'
import { Box, ImagePlus, Trash2, Upload } from 'lucide-react'
import type { AssetKind, AssetMeta, BrandKit } from '../../model/types'
import { useEditor } from '../../store/editor'
import { useLibrary } from '../../store/library'
import { useUI } from '../../store/ui'
import { assetUrl, getImage, useAssetVersion } from '../../render/assetCache'
import { isModelFile } from '../../db/assets'
import { FONTS } from '../../fonts/fonts'
import { DEFAULT_BRAND } from '../../model/brand'
import { Row, Section, Segmented, Select, Slider, TextField, Toggle } from '../../ui/controls'
import { AssetPicker } from '../props/common'
import { PanelTitle } from './contentPanels'
import { insertElement, canvasSize } from './insert'

const KIND_LABELS: Record<AssetKind, string> = {
  crest: 'Escudos',
  logo: 'Logos',
  background: 'Fondos',
  mascot: 'Mascota',
  player: 'Jugadores',
  texture: 'Texturas',
  icon: 'Iconos',
  model3d: 'Modelos 3D',
  other: 'Otros',
}

function AssetTile({ a }: { a: AssetMeta }) {
  const removeAsset = useLibrary((s) => s.removeAsset)
  const setBrand = useLibrary((s) => s.setBrand)
  const update = useEditor((s) => s.update)
  const slideId = useEditor((s) => s.activeSlideId)
  const toast = useUI((s) => s.toast)
  const [menu, setMenu] = useState(false)
  const { W, H } = canvasSize()
  if (a.kind !== 'model3d') getImage(a.id)
  const url = a.kind !== 'model3d' ? assetUrl(a.id) : null
  const addImage = () => {
    const ratio = a.width && a.height ? a.height / a.width : 1
    const w = Math.min(W * 0.6, 700)
    insertElement('image', { assetId: a.id, width: w, height: w * ratio, name: a.name })
  }
  return (
    <div className="group relative">
      <button type="button" className="checker flex aspect-square w-full items-center justify-center overflow-hidden rounded-lg border border-line transition hover:border-gold/60" title={a.name} aria-label={`Recurso ${a.name}`} onClick={() => setMenu(!menu)}>
        {url ? <img src={url} alt={a.name} className="h-full w-full object-contain" /> : <Box size={22} className="text-muted" />}
      </button>
      <div className="mt-0.5 truncate text-[10px] text-muted">{a.name}</div>
      {menu && (
        <div className="animate-in absolute top-full left-0 z-30 mt-1 w-48 rounded-lg border border-line-2 bg-panel-2 p-1 shadow-2xl" onMouseLeave={() => setMenu(false)}>
          {a.kind === 'model3d' ? (
            <MenuItem onClick={() => insertElement('model3d', { assetId: a.id, name: a.name })}>Añadir como modelo 3D</MenuItem>
          ) : (
            <>
              <MenuItem onClick={addImage}>Añadir a la diapositiva</MenuItem>
              <MenuItem
                onClick={() =>
                  update((d) => {
                    const s = d.slides.find((x) => x.id === slideId)
                    if (s) s.background.imageAssetId = a.id
                  })
                }
              >
                Usar como fondo
              </MenuItem>
              <MenuItem onClick={() => (update((d) => void (d.match.home.crestAssetId = a.id)), toast('Escudo local actualizado en todo el proyecto', 'success'))}>Escudo del equipo local</MenuItem>
              <MenuItem onClick={() => (update((d) => void (d.match.away.crestAssetId = a.id)), toast('Escudo visitante actualizado en todo el proyecto', 'success'))}>Escudo del equipo visitante</MenuItem>
              <MenuItem onClick={() => (setBrand({ logoAssetId: a.id }), toast('Logo de marca actualizado', 'success'))}>Usar como logo de marca</MenuItem>
              <MenuItem onClick={() => insertElement('image', { assetId: a.id, fit: 'cover', x: 0, y: 0, width: W, height: H, name: `Fondo · ${a.name}`, fadeBottom: 0.4 })}>Imagen a pantalla completa</MenuItem>
            </>
          )}
          <MenuItem
            danger
            onClick={() => {
              if (confirm(`¿Eliminar «${a.name}» de la biblioteca? Las diapositivas que lo usen mostrarán un hueco.`)) void removeAsset(a.id)
            }}
          >
            <Trash2 size={12} /> Eliminar
          </MenuItem>
        </div>
      )}
    </div>
  )
}

function MenuItem({ children, onClick, danger }: { children: React.ReactNode; onClick: () => void; danger?: boolean }) {
  return (
    <button type="button" className={`flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-left text-[12px] hover:bg-white/5 ${danger ? 'text-loss' : ''}`} onClick={onClick}>
      {children}
    </button>
  )
}

export function AssetsPanel() {
  const assets = useLibrary((s) => s.assets)
  const upload = useLibrary((s) => s.uploadAsset)
  const toast = useUI((s) => s.toast)
  useAssetVersion((s) => s.version)
  const input = useRef<HTMLInputElement>(null)
  const [kind, setKind] = useState<AssetKind>('crest')
  const [filter, setFilter] = useState<AssetKind | 'all'>('all')
  const [busy, setBusy] = useState(false)
  const [drag, setDrag] = useState(false)
  const handleFiles = async (files: FileList | File[]) => {
    setBusy(true)
    let ok = 0
    for (const f of Array.from(files)) {
      try {
        await upload(f, isModelFile(f) ? 'model3d' : kind)
        ok++
      } catch (e) {
        toast(`${f.name}: ${e instanceof Error ? e.message : 'error'}`, 'error')
      }
    }
    setBusy(false)
    if (ok) toast(`${ok} recurso(s) guardado(s) localmente`, 'success')
  }
  const list = assets.filter((a) => filter === 'all' || a.kind === filter)
  return (
    <div>
      <PanelTitle title="Imágenes y recursos" sub="Todo se guarda en este equipo (IndexedDB). Reutilizable en todos tus proyectos." />
      <div className="space-y-2 px-4 pb-3">
        <Select label="Tipo de lo que vas a subir" value={kind} onChange={setKind} options={(Object.keys(KIND_LABELS) as AssetKind[]).filter((k) => k !== 'model3d').map((k) => ({ value: k, label: KIND_LABELS[k] }))} />
        <div
          className={`flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed px-3 py-5 text-center transition ${drag ? 'border-gold bg-gold/10' : 'border-line-2 hover:border-gold/50'}`}
          onClick={() => input.current?.click()}
          onDragOver={(e) => (e.preventDefault(), setDrag(true))}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => {
            e.preventDefault()
            setDrag(false)
            void handleFiles(e.dataTransfer.files)
          }}
          role="button"
          tabIndex={0}
          aria-label="Subir archivos"
          onKeyDown={(e) => e.key === 'Enter' && input.current?.click()}
        >
          <Upload size={20} className="text-gold" />
          <div className="text-[12px] font-semibold">{busy ? 'Guardando…' : 'Arrastra o haz clic para subir'}</div>
          <div className="text-[11px] text-muted">PNG, JPG, WebP, SVG (saneado) · GLB/GLTF</div>
        </div>
        <input ref={input} type="file" multiple hidden data-testid="asset-upload" accept="image/png,image/jpeg,image/webp,image/svg+xml,.glb,.gltf" onChange={(e) => (e.target.files && void handleFiles(e.target.files), (e.target.value = ''))} />
      </div>
      <div className="flex flex-wrap gap-1 px-4 pb-3">
        {(['all', ...Object.keys(KIND_LABELS)] as (AssetKind | 'all')[]).map((k) => {
          const n = k === 'all' ? assets.length : assets.filter((a) => a.kind === k).length
          if (k !== 'all' && n === 0) return null
          return (
            <button key={k} type="button" className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${filter === k ? 'border-gold bg-gold/15 text-gold' : 'border-line text-muted hover:text-ivory'}`} onClick={() => setFilter(k)}>
              {k === 'all' ? 'Todos' : KIND_LABELS[k]} · {n}
            </button>
          )
        })}
      </div>
      <div className="px-4 pb-6">
        {list.length === 0 ? (
          <div className="rounded-lg border border-dashed border-line-2 px-3 py-6 text-center text-[12px] text-muted">
            <ImagePlus size={20} className="mx-auto mb-2 text-dim" />
            Aún no hay recursos. Sube escudos de tus equipos, tu logo o fondos.
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {list.map((a) => (
              <AssetTile key={a.id} a={a} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

const PALETTE_LABELS: { key: keyof BrandKit['palette']; label: string }[] = [
  { key: 'accent', label: 'Acento por defecto' },
  { key: 'bg', label: 'Fondo' },
  { key: 'text', label: 'Texto' },
  { key: 'muted', label: 'Texto secundario' },
  { key: 'line', label: 'Separadores' },
  { key: 'surface', label: 'Superficie' },
  { key: 'primary', label: 'Oro (solo marca)' },
  { key: 'secondary', label: 'Verde bosque (cinemático)' },
  { key: 'tertiary', label: 'Burdeos (cinemático)' },
  { key: 'positive', label: 'Acierto' },
  { key: 'negative', label: 'Fallo' },
]

const FONT_ROLES: { key: keyof BrandKit['fonts']; label: string }[] = [
  { key: 'headline', label: 'Titulares' },
  { key: 'display', label: 'Display' },
  { key: 'label', label: 'Etiquetas' },
  { key: 'body', label: 'Texto' },
  { key: 'numbers', label: 'Números' },
  { key: 'serif', label: 'Serif editorial' },
]

export function BrandPanel() {
  const brand = useLibrary((s) => s.brand)
  const setBrand = useLibrary((s) => s.setBrand)
  const resetBrand = useLibrary((s) => s.resetBrand)
  return (
    <div>
      <PanelTitle title="Kit de marca" sub="Cambios globales: se aplican a todas las diapositivas que usan colores y fuentes de marca." />
      <Section title="Identidad">
        <TextField label="Nombre de la marca" value={brand.name} onChange={(v) => setBrand({ name: v })} />
        <TextField label="Usuario" value={brand.handle} onChange={(v) => setBrand({ handle: v })} />
        <TextField label="Aviso legal" multiline rows={2} value={brand.disclaimer} onChange={(v) => setBrand({ disclaimer: v })} />
      </Section>
      <Section title="Destino de la comunidad (opcional)" defaultOpen={false}>
        <TextField label="Enlace externo de la comunidad" value={brand.telegramUrl} onChange={(v) => setBrand({ telegramUrl: v })} placeholder="Opcional" />
        <TextField label="Etiqueta del destino" value={brand.telegramLabel} onChange={(v) => setBrand({ telegramLabel: v })} placeholder="Opcional" />
        <p className="text-[11px] leading-snug text-dim">Uso interno. Las plantillas nunca lo muestran: usan llamadas neutras como «Enlace en la bio». Si lo quieres en una diapositiva, escribe {'{community}'} en un texto.</p>
      </Section>
      <Section title="Logo">
        <AssetPicker label="Tu logo de GOAT SOCIETY" value={brand.logoAssetId} uploadKind="logo" kinds={['logo', 'mascot', 'other']} onChange={(id) => setBrand({ logoAssetId: id })} />
        <p className="text-[11px] leading-snug text-dim">Mientras no subas tu logo se usa la mascota facetada como marca provisional. Al subirlo, sustituye al icono en cabeceras, insignias y marcas de agua.</p>
        <Row label="Tratamiento de color">
          <Segmented value={brand.logoTreatment} onChange={(v) => setBrand({ logoTreatment: v })} options={[{ value: 'original', label: 'Original' }, { value: 'ivory', label: 'Marfil' }, { value: 'gold', label: 'Oro' }, { value: 'black', label: 'Negro' }]} />
        </Row>
      </Section>
      <Section title="Marca de agua global">
        <Toggle label="Añadir marca de agua a todas las diapositivas" checked={brand.watermark.enabled} onChange={(v) => setBrand({ watermark: { ...brand.watermark, enabled: v } })} />
        {brand.watermark.enabled && (
          <>
            <Select label="Posición" value={brand.watermark.position} onChange={(v) => setBrand({ watermark: { ...brand.watermark, position: v } })} options={[{ value: 'tl', label: 'Arriba izquierda' }, { value: 'tr', label: 'Arriba derecha' }, { value: 'bl', label: 'Abajo izquierda' }, { value: 'br', label: 'Abajo derecha' }, { value: 'center', label: 'Centro' }]} />
            <Slider label="Tamaño" min={30} max={500} step={1} value={brand.watermark.size} onChange={(v) => setBrand({ watermark: { ...brand.watermark, size: v } })} />
            <Slider label="Opacidad" value={brand.watermark.opacity} onChange={(v) => setBrand({ watermark: { ...brand.watermark, opacity: v } })} />
          </>
        )}
      </Section>
      <Section title="Paleta">
        <div className="space-y-1.5">
          {PALETTE_LABELS.map((p) => (
            <div key={p.key} className="flex items-center gap-2">
              <input type="color" className="h-7 w-8 cursor-pointer rounded border border-line bg-transparent" aria-label={p.label} value={brand.palette[p.key]} onChange={(e) => setBrand({ palette: { ...brand.palette, [p.key]: e.target.value.toUpperCase() } })} />
              <span className="flex-1 text-[12px]">{p.label}</span>
              <input className="field w-24 px-2 py-1 text-[11px]" aria-label={`${p.label} hex`} value={brand.palette[p.key]} onChange={(e) => setBrand({ palette: { ...brand.palette, [p.key]: e.target.value } })} />
            </div>
          ))}
        </div>
      </Section>
      <Section title="Tipografías">
        {FONT_ROLES.map((r) => (
          <Select key={r.key} label={r.label} value={brand.fonts[r.key]} options={FONTS.map((f) => ({ value: f.family, label: f.label }))} onChange={(v) => setBrand({ fonts: { ...brand.fonts, [r.key]: v } })} />
        ))}
      </Section>
      <Section title="Avanzado" defaultOpen={false}>
        <Select label="Formato de fecha" value={brand.dateLocale} onChange={(v) => setBrand({ dateLocale: v })} options={[{ value: 'es-ES', label: 'Español (España)' }, { value: 'es-MX', label: 'Español (México)' }, { value: 'es-AR', label: 'Español (Argentina)' }, { value: 'en-GB', label: 'English (UK)' }, { value: 'pt-PT', label: 'Português' }]} />
        <button
          type="button"
          className="btn btn-danger w-full"
          onClick={() => {
            if (confirm('¿Restaurar la paleta, fuentes y textos por defecto? Tu logo se mantiene.')) resetBrand()
          }}
        >
          Restaurar valores de GOAT SOCIETY
        </button>
        <p className="text-[11px] text-dim">Paleta GOAT EDITORIAL: fondo {DEFAULT_BRAND.palette.bg} · texto {DEFAULT_BRAND.palette.text} · acento {DEFAULT_BRAND.palette.accent}</p>
      </Section>
    </div>
  )
}
