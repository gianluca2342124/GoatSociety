// What appears when an element is selected on a phone:
// - a floating pill next to it with the object actions (edit, duplicate, delete, more)
// - a bottom bar with the styling tools for that kind of element
// - an inline panel above the bar for the active tool (color, size, font…)
import { useRef, type ReactNode } from 'react'
import {
  AlignCenter,
  AlignCenterHorizontal,
  AlignCenterVertical,
  AlignEndHorizontal,
  AlignEndVertical,
  AlignHorizontalDistributeCenter,
  AlignStartHorizontal,
  AlignStartVertical,
  AlignVerticalDistributeCenter,
  BoxSelect,
  AlignLeft,
  AlignRight,
  ArrowDownToLine,
  ArrowUpToLine,
  Box,
  Check,
  ChevronDown,
  ChevronUp,
  Contrast,
  Copy,
  Crop,
  Crosshair,
  Database,
  Droplet,
  Image as ImageIcon,
  ImageOff,
  Layers,
  Lock,
  MoreHorizontal,
  Move3d,
  Palette,
  Pencil,
  RotateCw,
  Ruler,
  Shield,
  SlidersHorizontal,
  Sparkles,
  SunDim,
  Trash2,
  Type,
  Users,
  Wand2,
} from 'lucide-react'
import type { BadgeElement, SlideElement, TextElement } from '../model/types'
import { activeSlideOf, useEditor } from '../store/editor'
import { useUI } from '../store/ui'
import { useLibrary } from '../store/library'
import { FONTS } from '../fonts/fonts'
import { resolveColor, slideAccent } from '../model/tokens'
import { MASCOT_PRESETS } from '../editor/props/basicProps'
import { alignSelection, deleteSelection, duplicateSelection, setMultiSelect, toggleLockSelection, type AlignMode } from '../editor/actions'
import { useMobile } from './store'
import { ToolButton } from './ui'
import { addAsset } from '../db/assets'

type Tool = { id: string; label: string; icon: typeof Type; run?: () => void }

function useSelectedList(): SlideElement[] {
  const slide = useEditor((s) => activeSlideOf(s))
  const selection = useEditor((s) => s.selection)
  return slide?.elements.filter((e) => selection.includes(e.id)) ?? []
}

function patch(el: SlideElement, p: Partial<SlideElement> | ((d: SlideElement) => void), key?: string) {
  useEditor.getState().updateElement(el.id, p as never, { key: key ?? `m-${el.id}-${typeof p === 'function' ? 'fn' : Object.keys(p).join()}` })
}

const editable = (el: SlideElement) => el.type === 'text' || el.type === 'badge'

// ── Floating pill ──────────────────────────────────────────────────────────

export function SelectionPill({ containerH, containerW }: { containerH: number; containerW: number }) {
  const list = useSelectedList()
  const { zoom, pan, editingTextId, tacticsEditId } = useUI()
  const sheet = useMobile((s) => s.sheet)
  if (!list.length || editingTextId || tacticsEditId || sheet) return null
  const el = list.length === 1 ? list[0] : null
  const bx = Math.min(...list.map((e) => e.x))
  const by = Math.min(...list.map((e) => e.y))
  const x = pan.x + bx * zoom
  const y = pan.y + by * zoom
  const w = (Math.max(...list.map((e) => e.x + e.width)) - bx) * zoom
  const h = (Math.max(...list.map((e) => e.y + e.height)) - by) * zoom
  const pillW = el && editable(el) ? 230 : el ? 180 : 210
  const pillH = 44
  let top = y - pillH - 46
  if (top < 8) top = Math.min(containerH - pillH - 8, y + h + 46)
  if (top < 8 || top > containerH - pillH - 8) top = 8
  const left = Math.max(8, Math.min(containerW - pillW - 8, x + w / 2 - pillW / 2))
  const btn = 'flex h-11 flex-1 items-center justify-center gap-1.5 text-[12px] font-semibold active:bg-white/10'
  return (
    <div className="absolute z-20 flex overflow-hidden rounded-full border border-white/12 bg-[#1b1d22]/95 shadow-2xl backdrop-blur" style={{ left, top, width: pillW, height: pillH }} data-testid="selection-pill">
      {!el && (
        <span className="flex h-11 items-center pr-1 pl-4 text-[12px] font-bold text-gold tabular-nums" data-testid="pill-count">
          {list.length}
        </span>
      )}
      {el && editable(el) && (
        <button type="button" className={btn} aria-label="Editar texto" onClick={() => useUI.getState().set({ editingTextId: el.id })} data-testid="pill-edit">
          <Pencil size={16} /> Editar
        </button>
      )}
      <button type="button" className={btn} aria-label="Duplicar" onClick={duplicateSelection} data-testid="pill-duplicate">
        <Copy size={16} />
      </button>
      <button type="button" className={`${btn} text-loss`} aria-label="Eliminar" onClick={deleteSelection} data-testid="pill-delete">
        <Trash2 size={16} />
      </button>
      <button type="button" className={btn} aria-label="Más opciones" onClick={() => useMobile.getState().open('more')} data-testid="pill-more">
        <MoreHorizontal size={18} />
      </button>
    </div>
  )
}

// ── Tool panels ────────────────────────────────────────────────────────────

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="border-t border-line bg-panel px-4 pt-3 pb-2" data-testid="tool-panel">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-[12px] font-semibold tracking-wide text-muted uppercase">{title}</span>
        <button type="button" className="flex h-8 items-center gap-1 rounded-full bg-gold px-3 text-[12px] font-bold text-ink" onClick={() => useMobile.getState().set({ tool: null })}>
          <Check size={14} strokeWidth={3} /> Listo
        </button>
      </div>
      {children}
    </div>
  )
}

function RangeRow({ label, value, min, max, step = 1, onChange, format }: { label: string; value: number; min: number; max: number; step?: number; onChange: (v: number) => void; format?: (v: number) => string }) {
  const pct = ((value - min) / (max - min)) * 100
  return (
    <label className="flex items-center gap-3 py-1.5">
      <span className="w-20 shrink-0 text-[13px] text-ivory/80">{label}</span>
      <input type="range" className="m-range flex-1" min={min} max={max} step={step} value={value} style={{ ['--fill' as string]: `${pct}%` }} onChange={(e) => onChange(Number(e.target.value))} aria-label={label} />
      <span className="w-12 text-right text-[12px] text-muted tabular-nums">{format ? format(value) : Math.round(value)}</span>
    </label>
  )
}

function Seg<T extends string>({ value, options, onChange }: { value: T; options: { value: T; label: ReactNode }[]; onChange: (v: T) => void }) {
  return (
    <div className="flex gap-2">
      {options.map((o) => (
        <button key={o.value} type="button" onClick={() => onChange(o.value)} aria-pressed={value === o.value} className={`flex h-11 flex-1 items-center justify-center gap-1.5 rounded-xl text-[13px] font-semibold ${value === o.value ? 'bg-ivory text-ink' : 'bg-white/7 text-ivory/85'}`}>
          {o.label}
        </button>
      ))}
    </div>
  )
}

const SWATCHES: { token: string; label: string }[] = [
  { token: '$text', label: 'Blanco' },
  { token: '$muted', label: 'Gris' },
  { token: '$accent', label: 'Acento' },
  { token: '$green', label: 'Verde' },
  { token: '$yellow', label: 'Amarillo' },
  { token: '$red', label: 'Rojo' },
  { token: '$blue', label: 'Azul' },
  { token: '$bg', label: 'Negro' },
]

function ColorSwatches({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const project = useEditor((s) => s.project)!
  const slide = useEditor((s) => activeSlideOf(s))
  const brand = useLibrary((s) => s.brand)
  const ctx = { match: project.match, brand, accent: slide ? slideAccent(project, slide) : undefined }
  const inputRef = useRef<HTMLInputElement>(null)
  return (
    <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-1">
      {SWATCHES.map((s) => (
        <button key={s.token} type="button" onClick={() => onChange(s.token)} aria-label={s.label} aria-pressed={value === s.token} className="flex shrink-0 flex-col items-center gap-1">
          <span className={`h-11 w-11 rounded-full border-2 ${value === s.token ? 'border-gold' : 'border-white/15'}`} style={{ background: resolveColor(s.token, ctx) }} />
          <span className="text-[10px] text-muted">{s.label}</span>
        </button>
      ))}
      <button type="button" onClick={() => inputRef.current?.click()} aria-label="Color personalizado" className="flex shrink-0 flex-col items-center gap-1">
        <span className="h-11 w-11 rounded-full border-2 border-white/15" style={{ background: 'conic-gradient(#ff4055, #ffd43b, #2be477, #3b8bff, #ff4055)' }} />
        <span className="text-[10px] text-muted">Otro</span>
      </button>
      <input ref={inputRef} type="color" className="sr-only" onChange={(e) => onChange(e.target.value.toUpperCase())} />
    </div>
  )
}

function textColorOf(el: TextElement): string {
  return el.fill.kind === 'solid' ? el.fill.color : '$text'
}

function FontList({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const brand = useLibrary((s) => s.brand)
  const options = [
    { family: '$headline', label: 'Titular de marca', css: brand.fonts.headline },
    { family: '$label', label: 'Etiqueta de marca', css: brand.fonts.label },
    { family: '$body', label: 'Texto de marca', css: brand.fonts.body },
    ...FONTS.map((f) => ({ family: f.family, label: f.label, css: f.family })),
  ]
  return (
    <div className="-mx-4 flex max-h-[28dvh] flex-col overflow-y-auto px-4">
      {options.map((o) => (
        <button key={o.family} type="button" onClick={() => onChange(o.family)} className={`flex h-12 shrink-0 items-center justify-between rounded-xl px-3 text-left ${value === o.family ? 'bg-gold/15 text-gold' : 'text-ivory'}`}>
          <span style={{ fontFamily: `"${o.css}"`, fontSize: 20 }}>{o.label}</span>
          {value === o.family && <Check size={16} />}
        </button>
      ))}
    </div>
  )
}

function ToolPanel({ el, tool }: { el: SlideElement; tool: string }) {
  switch (tool) {
    case 'opacity':
      return (
        <Panel title="Opacidad">
          <RangeRow label="Opacidad" min={0} max={1} step={0.01} value={el.opacity} format={(v) => `${Math.round(v * 100)}%`} onChange={(v) => patch(el, { opacity: v })} />
        </Panel>
      )
    case 'layer':
      return (
        <Panel title="Posición en capas">
          <div className="grid grid-cols-4 gap-2">
            {(
              [
                ['top', 'Al frente', ArrowUpToLine],
                ['up', 'Adelante', ChevronUp],
                ['down', 'Atrás', ChevronDown],
                ['bottom', 'Al fondo', ArrowDownToLine],
              ] as const
            ).map(([dir, label, Icon]) => (
              <button key={dir} type="button" className="flex h-14 flex-col items-center justify-center gap-1 rounded-xl bg-white/7 text-[11px] font-semibold" onClick={() => useEditor.getState().reorderSelection(dir)}>
                <Icon size={18} /> {label}
              </button>
            ))}
          </div>
        </Panel>
      )
  }
  if (el.type === 'text') {
    switch (tool) {
      case 'color':
        return (
          <Panel title="Color del texto">
            <ColorSwatches value={textColorOf(el)} onChange={(c) => patch(el, { fill: { kind: 'solid', color: c } })} />
            <div className="mt-3 text-[12px] text-muted">Palabras resaltadas</div>
            <div className="mt-2">
              <ColorSwatches value={el.accentColor} onChange={(c) => patch(el, { accentColor: c })} />
            </div>
          </Panel>
        )
      case 'font':
        return (
          <Panel title="Fuente">
            <FontList value={el.fontFamily} onChange={(f) => patch(el, { fontFamily: f })} />
          </Panel>
        )
      case 'size':
        return (
          <Panel title="Tamaño">
            <RangeRow
              label="Tamaño"
              min={16}
              max={360}
              value={el.fontSize}
              onChange={(v) =>
                patch(el, (d) => {
                  const t = d as TextElement
                  const k = v / Math.max(1, t.fontSize)
                  t.fontSize = v
                  t.minFontSize = Math.min(t.minFontSize, v)
                  t.height = Math.max(20, t.height * k)
                })
              }
            />
          </Panel>
        )
      case 'align':
        return (
          <Panel title="Alineación">
            <Seg
              value={el.align}
              onChange={(v) => patch(el, { align: v })}
              options={[
                { value: 'left', label: <AlignLeft size={18} /> },
                { value: 'center', label: <AlignCenter size={18} /> },
                { value: 'right', label: <AlignRight size={18} /> },
              ]}
            />
          </Panel>
        )
      case 'effect':
        return (
          <Panel title="Acabado">
            <Seg
              value={el.effect ?? 'none'}
              onChange={(v) => patch(el, { effect: v })}
              options={[
                { value: 'none', label: 'Liso' },
                { value: 'metallic', label: 'Metálico' },
                { value: 'gradient', label: 'Degradado' },
              ]}
            />
          </Panel>
        )
    }
  }
  if (el.type === 'image') {
    switch (tool) {
      case 'fit':
        return (
          <Panel title="Ajuste de la foto">
            <Seg
              value={el.fit}
              onChange={(v) => patch(el, { fit: v })}
              options={[
                { value: 'cover', label: 'Rellenar' },
                { value: 'contain', label: 'Encajar' },
                { value: 'fill', label: 'Estirar' },
              ]}
            />
            <RangeRow label="Esquinas" min={0} max={200} value={el.cornerRadius} onChange={(v) => patch(el, { cornerRadius: v })} />
          </Panel>
        )
      case 'frame':
        return (
          <Panel title="Encuadre">
            <RangeRow label="Horizontal" min={0} max={1} step={0.01} value={el.focusX} format={(v) => `${Math.round(v * 100)}%`} onChange={(v) => patch(el, { focusX: v, fit: 'cover' })} />
            <RangeRow label="Vertical" min={0} max={1} step={0.01} value={el.focusY} format={(v) => `${Math.round(v * 100)}%`} onChange={(v) => patch(el, { focusY: v, fit: 'cover' })} />
          </Panel>
        )
      case 'fade':
        return (
          <Panel title="Fundido inferior">
            <RangeRow label="Fundido" min={0} max={0.9} step={0.01} value={el.fadeBottom} format={(v) => `${Math.round(v * 100)}%`} onChange={(v) => patch(el, { fadeBottom: v })} />
            <div className="mt-2">
              <Seg
                value={el.grayscale ? 'bw' : 'color'}
                onChange={(v) => patch(el, { grayscale: v === 'bw' })}
                options={[
                  { value: 'color', label: 'Color' },
                  { value: 'bw', label: 'Blanco y negro' },
                ]}
              />
            </div>
          </Panel>
        )
    }
  }
  if (el.type === 'shape' && tool === 'color') {
    const c = el.fill.kind === 'solid' ? el.fill.color : '$surface'
    return (
      <Panel title="Color">
        <ColorSwatches value={c} onChange={(v) => patch(el, { fill: { kind: 'solid', color: v } })} />
        <RangeRow label="Esquinas" min={0} max={300} value={el.cornerRadius} onChange={(v) => patch(el, { cornerRadius: v })} />
      </Panel>
    )
  }
  if (el.type === 'badge') {
    const b = el as BadgeElement
    switch (tool) {
      case 'style':
        return (
          <Panel title="Estilo de la etiqueta">
            <Seg
              value={b.style}
              onChange={(v) => patch(el, { style: v } as Partial<BadgeElement>)}
              options={[
                { value: 'solid', label: 'Sólida' },
                { value: 'glow', label: 'Luz' },
                { value: 'outline', label: 'Borde' },
                { value: 'text', label: 'Texto' },
              ]}
            />
            <div className="mt-3 grid grid-cols-7 gap-1.5">
              {(['none', 'check', 'lock', 'star', 'bolt', 'trophy', 'arrow'] as const).map((ic) => (
                <button key={ic} type="button" onClick={() => patch(el, { icon: ic } as Partial<BadgeElement>)} className={`h-10 rounded-lg text-[11px] font-semibold ${b.icon === ic ? 'bg-ivory text-ink' : 'bg-white/7'}`}>
                  {{ none: 'Sin', check: '✓', lock: '🔒', star: '★', bolt: '⚡', trophy: '🏆', arrow: '↗' }[ic]}
                </button>
              ))}
            </div>
          </Panel>
        )
      case 'color':
        return (
          <Panel title="Color">
            <ColorSwatches value={b.color} onChange={(c) => patch(el, { color: c } as Partial<BadgeElement>)} />
          </Panel>
        )
    }
  }
  if (el.type === 'scoreboard' && tool === 'score') return <ScorePanel />
  if (el.type === 'scoreboard' && tool === 'layout')
    return (
      <Panel title="Diseño del marcador">
        <Seg
          value={el.layout}
          onChange={(v) => patch(el, { layout: v } as never)}
          options={[
            { value: 'row', label: 'Fila' },
            { value: 'stacked', label: 'Apilado' },
            { value: 'compact', label: 'Píldora' },
          ]}
        />
      </Panel>
    )
  if (el.type === 'crest' && tool === 'team')
    return (
      <Panel title="Equipo del escudo">
        <Seg
          value={el.side === 'custom' ? 'home' : el.side}
          onChange={(v) => patch(el, { side: v } as never)}
          options={[
            { value: 'home', label: 'Local' },
            { value: 'away', label: 'Visitante' },
          ]}
        />
      </Panel>
    )
  if (el.type === 'prediction') {
    if (tool === 'mode')
      return (
        <Panel title="Modo del pronóstico">
          <Seg
            value={el.mode}
            onChange={(v) => patch(el, { mode: v } as never)}
            options={[
              { value: 'plain', label: 'Normal' },
              { value: 'locked', label: 'Bloqueado' },
              { value: 'revealed', label: 'Revelado' },
            ]}
          />
        </Panel>
      )
    if (tool === 'blur')
      return (
        <Panel title="Desenfoque">
          <RangeRow label="Intensidad" min={8} max={80} value={el.blurIntensity} onChange={(v) => patch(el, { blurIntensity: v } as never)} />
          <RangeRow label="Brillo" min={0} max={1} step={0.01} value={el.lockGlow ?? 0} format={(v) => `${Math.round(v * 100)}%`} onChange={(v) => patch(el, { lockGlow: v } as never)} />
        </Panel>
      )
  }
  if (el.type === 'model3d') {
    if (tool === 'scale')
      return (
        <Panel title="Tamaño y giro">
          <RangeRow label="Distancia" min={1} max={10} step={0.05} value={el.camera.distance} onChange={(v) => patch(el, (d) => void ((d as typeof el).camera.distance = v))} />
          <RangeRow label="Giro" min={-180} max={180} value={el.camera.yaw} onChange={(v) => patch(el, (d) => void ((d as typeof el).camera.yaw = v))} />
          <RangeRow label="Inclinación" min={-60} max={60} value={el.camera.pitch} onChange={(v) => patch(el, (d) => void ((d as typeof el).camera.pitch = v))} />
        </Panel>
      )
  }
  if (el.type === 'mascot' && tool === 'style')
    return (
      <Panel title="Estilo de la mascota">
        <div className="grid grid-cols-2 gap-2">
          {MASCOT_PRESETS.slice(0, 8).map((p) => (
            <button key={p.label} type="button" className="h-11 rounded-xl bg-white/7 text-[13px] font-semibold" onClick={() => patch(el, p.patch as never)}>
              {p.label}
            </button>
          ))}
        </div>
      </Panel>
    )
  return null
}

function ScorePanel() {
  const match = useEditor((s) => s.project!.match)
  const score = match.score ?? { home: '', away: '', note: '' }
  const set = (p: Partial<typeof score>) => useEditor.getState().update((d) => void (d.match.score = { ...score, ...p }), { key: `score-${Object.keys(p).join()}` })
  return (
    <Panel title="Resultado del partido">
      <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-2">
        <label className="block">
          <span className="mb-1 block truncate text-[12px] text-muted">{match.home.shortName || match.home.name}</span>
          <input className="field h-12 text-center text-[20px] font-bold" inputMode="numeric" aria-label="Goles local" value={score.home} onChange={(e) => set({ home: e.target.value })} />
        </label>
        <span className="pb-3 text-muted">–</span>
        <label className="block">
          <span className="mb-1 block truncate text-[12px] text-muted">{match.away.shortName || match.away.name}</span>
          <input className="field h-12 text-center text-[20px] font-bold" inputMode="numeric" aria-label="Goles visitante" value={score.away} onChange={(e) => set({ away: e.target.value })} />
        </label>
      </div>
      <input className="field mt-2 h-11" aria-label="Estado del partido" placeholder="Final, Descanso, 78'…" value={score.note} onChange={(e) => set({ note: e.target.value })} />
    </Panel>
  )
}

// ── Contextual bottom bar ──────────────────────────────────────────────────

function openPhotos(mode: 'replace' | 'crest-home' | 'crest-away') {
  useMobile.getState().open('photos', { photoMode: mode })
}

function toolsFor(el: SlideElement, replaceModel: () => void): Tool[] {
  const more: Tool = { id: 'props', label: 'Ajustes', icon: SlidersHorizontal, run: () => useMobile.getState().open('props') }
  const opacity: Tool = { id: 'opacity', label: 'Opacidad', icon: SunDim }
  const layer: Tool = { id: 'layer', label: 'Capa', icon: Layers }
  const data: Tool = { id: 'data', label: 'Datos', icon: Database, run: () => useMobile.getState().open('data') }
  switch (el.type) {
    case 'text':
      return [
        { id: 'edit', label: 'Editar', icon: Pencil, run: () => useUI.getState().set({ editingTextId: el.id }) },
        { id: 'font', label: 'Fuente', icon: Type },
        { id: 'color', label: 'Color', icon: Palette },
        { id: 'size', label: 'Tamaño', icon: Ruler },
        { id: 'align', label: 'Alinear', icon: AlignCenter },
        { id: 'effect', label: 'Acabado', icon: Sparkles },
        opacity,
        layer,
        more,
      ]
    case 'image':
      return [
        { id: 'replace', label: el.assetId ? 'Reemplazar' : 'Añadir foto', icon: ImageIcon, run: () => openPhotos('replace') },
        { id: 'fit', label: 'Ajuste', icon: Crop },
        { id: 'frame', label: 'Encuadre', icon: Crosshair },
        { id: 'fade', label: 'Fundido', icon: Contrast },
        opacity,
        ...(el.assetId ? [{ id: 'remove', label: 'Quitar foto', icon: ImageOff, run: () => patch(el, { assetId: null } as never) }] : []),
        layer,
        more,
      ]
    case 'crest':
      return [
        { id: 'team', label: 'Equipo', icon: Users },
        { id: 'crest', label: 'Cambiar escudo', icon: Shield, run: () => openPhotos(el.side === 'away' ? 'crest-away' : 'crest-home') },
        opacity,
        layer,
        more,
      ]
    case 'badge':
      return [
        { id: 'edit', label: 'Texto', icon: Pencil, run: () => useUI.getState().set({ editingTextId: el.id }) },
        { id: 'style', label: 'Estilo', icon: Wand2 },
        { id: 'color', label: 'Color', icon: Palette },
        opacity,
        layer,
        more,
      ]
    case 'scoreboard':
      return [{ id: 'score', label: 'Resultado', icon: Pencil }, { id: 'layout', label: 'Diseño', icon: Box }, opacity, layer, more]
    case 'shape':
      return [{ id: 'color', label: 'Color', icon: Droplet }, opacity, layer, more]
    case 'prediction':
      return [{ id: 'mode', label: 'Modo', icon: Lock }, ...(el.mode === 'locked' ? [{ id: 'blur', label: 'Desenfoque', icon: Contrast }] : []), data, opacity, layer, more]
    case 'tactics':
      return [{ id: 'edit', label: 'Editar jugadores', icon: Pencil, run: () => useUI.getState().set({ tacticsEditId: el.id, tacticsSel: null }) }, opacity, layer, more]
    case 'model3d':
      return [{ id: 'replace', label: 'Cambiar 3D', icon: Box, run: replaceModel }, { id: 'scale', label: 'Tamaño y giro', icon: Move3d }, opacity, layer, more]
    case 'mascot':
      return [{ id: 'style', label: 'Estilo', icon: Wand2 }, opacity, layer, more]
    case 'statBars':
    case 'statNumber':
    case 'formRow':
    case 'playerList':
    case 'matchList':
    case 'resultsList':
    case 'ranking':
    case 'probability':
    case 'table':
      return [data, more, opacity, layer]
    case 'brandMark':
    case 'stadium3d':
      return [more, opacity, layer, { id: 'rotate', label: 'Girar 0°', icon: RotateCw, run: () => patch(el, { rotation: 0 }) }]
    default:
      return [opacity, layer, more]
  }
}

const ALIGN_BUTTONS: [AlignMode, typeof AlignCenter, string][] = [
  ['l', AlignStartVertical, 'Izquierda'],
  ['c', AlignCenterVertical, 'Centro'],
  ['r', AlignEndVertical, 'Derecha'],
  ['t', AlignStartHorizontal, 'Arriba'],
  ['m', AlignCenterHorizontal, 'Medio'],
  ['b', AlignEndHorizontal, 'Abajo'],
  ['distH', AlignHorizontalDistributeCenter, 'Repartir ↔'],
  ['distV', AlignVerticalDistributeCenter, 'Repartir ↕'],
]

/** Tools for several selected elements at once. Moving and resizing the group happen on the canvas. */
function GroupBar({ list }: { list: SlideElement[] }) {
  const tool = useMobile((s) => s.tool)
  const multi = useUI((s) => s.multiSelect)
  const ids = list.map((e) => e.id)
  const opacity = list.reduce((a, e) => a + e.opacity, 0) / list.length
  const allLocked = list.every((e) => e.locked)
  const tools: Tool[] = [
    { id: 'g-align', label: 'Alinear', icon: AlignCenter },
    { id: 'layer', label: 'Capa', icon: Layers },
    { id: 'g-opacity', label: 'Opacidad', icon: SunDim },
    { id: 'g-lock', label: allLocked ? 'Desbloquear' : 'Bloquear', icon: Lock, run: () => toggleLockSelection() },
    ...(multi ? [] : [{ id: 'multi', label: 'Añadir más', icon: BoxSelect, run: () => setMultiSelect(true) }]),
  ]
  return (
    <div className="shrink-0">
      {tool === 'g-align' && (
        <Panel title={`Alinear ${list.length} elementos`}>
          <div className="grid grid-cols-4 gap-2">
            {ALIGN_BUTTONS.map(([mode, Icon, label]) => (
              <button key={mode} type="button" className="flex h-14 flex-col items-center justify-center gap-1 rounded-xl bg-white/7 text-[11px] font-semibold active:bg-white/12" onClick={() => alignSelection(mode)} data-testid={`align-${mode}`}>
                <Icon size={18} /> {label}
              </button>
            ))}
          </div>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <button type="button" className="h-11 rounded-xl bg-white/7 text-[12px] font-semibold active:bg-white/12" onClick={() => alignSelection('pc')}>
              Centrar en la página ↔
            </button>
            <button type="button" className="h-11 rounded-xl bg-white/7 text-[12px] font-semibold active:bg-white/12" onClick={() => alignSelection('pm')}>
              Centrar en la página ↕
            </button>
          </div>
        </Panel>
      )}
      {tool === 'layer' && <ToolPanel el={list[0]} tool="layer" />}
      {tool === 'g-opacity' && (
        <Panel title="Opacidad del grupo">
          <RangeRow label="Opacidad" min={0} max={1} step={0.01} value={opacity} format={(v) => `${Math.round(v * 100)}%`} onChange={(v) => useEditor.getState().updateElements(ids, (e) => void (e.opacity = v), { key: 'm-group-opacity' })} />
        </Panel>
      )}
      <nav className="flex h-[70px] items-center gap-1 overflow-x-auto border-t border-line bg-panel px-2 pb-[env(safe-area-inset-bottom)]" aria-label="Herramientas del grupo" data-testid="context-bar">
        {tools.map((t) => (
          <ToolButton key={t.id} icon={t.icon} label={t.label} active={tool === t.id} testId={`tool-${t.id}`} onClick={() => (t.run ? t.run() : useMobile.getState().set({ tool: tool === t.id ? null : t.id }))} />
        ))}
      </nav>
    </div>
  )
}

export function ContextBar() {
  const list = useSelectedList()
  const el = list.length === 1 ? list[0] : null
  const tool = useMobile((s) => s.tool)
  const multi = useUI((s) => s.multiSelect)
  const modelRef = useRef<HTMLInputElement>(null)
  if (list.length > 1) return <GroupBar list={list} />
  if (!el) return null
  const tools = [...toolsFor(el, () => modelRef.current?.click()), ...(multi ? [] : [{ id: 'multi', label: 'Varios', icon: BoxSelect, run: () => setMultiSelect(true) }])]
  const onModel = async (file: File | undefined) => {
    if (!file) return
    try {
      const meta = await addAsset(file, { kind: 'model3d' })
      await useLibrary.getState().refreshAssets()
      patch(el, { assetId: meta.id } as never)
      useUI.getState().toast('Modelo 3D cambiado', 'success')
    } catch (e) {
      useUI.getState().toast(e instanceof Error ? e.message : 'No se pudo cargar el modelo', 'error')
    }
  }
  return (
    <div className="shrink-0">
      {tool && <ToolPanel el={el} tool={tool} />}
      <nav className="flex h-[70px] items-center gap-1 overflow-x-auto border-t border-line bg-panel px-2 pb-[env(safe-area-inset-bottom)]" aria-label="Herramientas del elemento" data-testid="context-bar">
        {tools.map((t) => (
          <ToolButton
            key={t.id}
            icon={t.icon}
            label={t.label}
            active={tool === t.id}
            testId={`tool-${t.id}`}
            onClick={() => (t.run ? t.run() : useMobile.getState().set({ tool: tool === t.id ? null : t.id }))}
          />
        ))}
      </nav>
      <input ref={modelRef} type="file" accept=".glb,.gltf" hidden onChange={(e) => (void onModel(e.target.files?.[0]), (e.target.value = ''))} />
    </div>
  )
}
