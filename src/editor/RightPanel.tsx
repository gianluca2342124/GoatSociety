import { useState } from 'react'
import { DndContext, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core'
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  AlignCenterHorizontal,
  AlignCenterVertical,
  AlignEndHorizontal,
  AlignEndVertical,
  AlignHorizontalDistributeCenter,
  AlignStartHorizontal,
  AlignStartVertical,
  AlignVerticalDistributeCenter,
  ArrowDownToLine,
  ArrowUpToLine,
  ChevronDown,
  ChevronUp,
  Copy,
  Eye,
  EyeOff,
  GripVertical,
  Lock,
  RefreshCw,
  Trash2,
  Unlock,
} from 'lucide-react'
import type { SlideElement } from '../model/types'
import { shownAtIntensity, slideIntensity } from '../model/tokens'
import { activeSlideOf, useActiveSlide, useEditor } from '../store/editor'
import { useUI } from '../store/ui'
import { ELEMENT_LABELS } from '../model/elements'
import { AppearanceSection, AssetPicker, FillEditor, TransformSection } from './props/common'
import { BrandMarkProps, CrestProps, EffectProps, GlassProps, IconProps, ImageProps, MascotProps, Model3DProps, ShapeProps, TextProps } from './props/basicProps'
import { FormRowProps, MatchListProps, PlayerListProps, PredictionProps, ProbabilityProps, ProgressRingProps, RankingProps, ResultsListProps, StatBarsProps, StatNumberProps, TableProps } from './props/dataProps'
import { Stadium3DProps, TacticsProps } from './props/tacticsProps'
import { Section, Slider, TextField, Toggle } from '../ui/controls'
import { buildTemplateSlide, templateById } from '../templates'
import { SlideStyleSection } from './StylePanel'

function ElementSpecific({ el }: { el: SlideElement }) {
  switch (el.type) {
    case 'text':
      return <TextProps el={el} />
    case 'shape':
      return <ShapeProps el={el} />
    case 'image':
      return <ImageProps el={el} />
    case 'crest':
      return <CrestProps el={el} />
    case 'icon':
      return <IconProps el={el} />
    case 'effect':
      return <EffectProps el={el} />
    case 'glass':
      return <GlassProps el={el} />
    case 'brandMark':
      return <BrandMarkProps el={el} />
    case 'mascot':
      return <MascotProps el={el} />
    case 'model3d':
      return <Model3DProps el={el} />
    case 'statBars':
      return <StatBarsProps el={el} />
    case 'statNumber':
      return <StatNumberProps el={el} />
    case 'progressRing':
      return <ProgressRingProps el={el} />
    case 'formRow':
      return <FormRowProps el={el} />
    case 'table':
      return <TableProps el={el} />
    case 'playerList':
      return <PlayerListProps el={el} />
    case 'matchList':
      return <MatchListProps el={el} />
    case 'prediction':
      return <PredictionProps el={el} />
    case 'resultsList':
      return <ResultsListProps el={el} />
    case 'ranking':
      return <RankingProps el={el} />
    case 'probability':
      return <ProbabilityProps el={el} />
    case 'tactics':
      return <TacticsProps el={el} />
    case 'stadium3d':
      return <Stadium3DProps el={el} />
  }
}

function ElementHeader({ el }: { el: SlideElement }) {
  const updateElement = useEditor((s) => s.updateElement)
  const { duplicateSelection, deleteSelection, reorderSelection } = useEditor.getState()
  return (
    <div className="sticky top-0 z-10 border-b border-line bg-panel/95 px-3.5 py-3 backdrop-blur">
      <div className="label-xs mb-1 text-gold">{ELEMENT_LABELS[el.type]}</div>
      <input className="field mb-2 font-semibold" aria-label="Nombre de la capa" value={el.name} onChange={(e) => updateElement(el.id, { name: e.target.value }, { key: `name-${el.id}` })} />
      <div className="flex items-center gap-0.5">
        <button type="button" className="icon-btn" title={el.visible ? 'Ocultar' : 'Mostrar'} aria-label={el.visible ? 'Ocultar' : 'Mostrar'} onClick={() => updateElement(el.id, { visible: !el.visible })}>
          {el.visible ? <Eye size={15} /> : <EyeOff size={15} />}
        </button>
        <button type="button" className="icon-btn" title={el.locked ? 'Desbloquear' : 'Bloquear'} aria-label={el.locked ? 'Desbloquear' : 'Bloquear'} data-active={el.locked} onClick={() => updateElement(el.id, { locked: !el.locked })}>
          {el.locked ? <Lock size={15} /> : <Unlock size={15} />}
        </button>
        <button type="button" className="icon-btn" title="Traer al frente" aria-label="Traer al frente" onClick={() => reorderSelection('top')}>
          <ArrowUpToLine size={15} />
        </button>
        <button type="button" className="icon-btn" title="Subir una capa" aria-label="Subir una capa" onClick={() => reorderSelection('up')}>
          <ChevronUp size={15} />
        </button>
        <button type="button" className="icon-btn" title="Bajar una capa" aria-label="Bajar una capa" onClick={() => reorderSelection('down')}>
          <ChevronDown size={15} />
        </button>
        <button type="button" className="icon-btn" title="Enviar al fondo" aria-label="Enviar al fondo" onClick={() => reorderSelection('bottom')}>
          <ArrowDownToLine size={15} />
        </button>
        <div className="flex-1" />
        <button type="button" className="icon-btn" title="Duplicar (Ctrl+D)" aria-label="Duplicar" onClick={duplicateSelection}>
          <Copy size={15} />
        </button>
        <button type="button" className="icon-btn hover:!text-loss" title="Eliminar (Supr)" aria-label="Eliminar" onClick={() => (el.locked ? updateElement(el.id, { locked: false }) : deleteSelection())}>
          <Trash2 size={15} />
        </button>
      </div>
    </div>
  )
}

function MultiPanel({ els }: { els: SlideElement[] }) {
  const update = useEditor((s) => s.update)
  const project = useEditor((s) => s.project)!
  const slideId = useEditor((s) => activeSlideOf(s)?.id)
  const ids = els.map((e) => e.id)
  const align = (mode: string) =>
    update((d) => {
      const s = d.slides.find((x) => x.id === slideId)
      if (!s) return
      const list = s.elements.filter((e) => ids.includes(e.id))
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
      for (const e of list) {
        if (mode === 'l') e.x = minX
        if (mode === 'r') e.x = maxX - e.width
        if (mode === 'c') e.x = (minX + maxX) / 2 - e.width / 2
        if (mode === 't') e.y = minY
        if (mode === 'b') e.y = maxY - e.height
        if (mode === 'm') e.y = (minY + maxY) / 2 - e.height / 2
        if (mode === 'pc') e.x = project.format.width / 2 - e.width / 2
      }
    })
  const buttons: [string, typeof AlignStartVertical, string][] = [
    ['l', AlignStartVertical, 'Alinear izquierdas'],
    ['c', AlignCenterVertical, 'Centrar en horizontal'],
    ['r', AlignEndVertical, 'Alinear derechas'],
    ['t', AlignStartHorizontal, 'Alinear arriba'],
    ['m', AlignCenterHorizontal, 'Centrar en vertical'],
    ['b', AlignEndHorizontal, 'Alinear abajo'],
    ['distH', AlignHorizontalDistributeCenter, 'Distribuir horizontalmente'],
    ['distV', AlignVerticalDistributeCenter, 'Distribuir verticalmente'],
  ]
  return (
    <>
      <div className="border-b border-line px-3.5 py-3">
        <div className="label-xs text-gold">{els.length} elementos seleccionados</div>
      </div>
      <Section title="Alinear y distribuir">
        <div className="grid grid-cols-4 gap-1">
          {buttons.map(([k, Icon, label]) => (
            <button key={k} type="button" className="icon-btn h-9 w-full border border-line" title={label} aria-label={label} onClick={() => align(k)}>
              <Icon size={15} />
            </button>
          ))}
        </div>
        <button type="button" className="btn w-full" onClick={() => align('pc')}>
          Centrar todos en el lienzo
        </button>
      </Section>
      <Section title="Acciones">
        <Slider
          label="Opacidad"
          value={els[0].opacity}
          onChange={(v) =>
            useEditor.getState().updateElements(ids, (e) => void (e.opacity = v), { key: 'multi-opacity' })
          }
        />
        <div className="grid grid-cols-2 gap-1.5">
          <button type="button" className="btn" onClick={() => useEditor.getState().duplicateSelection()}>
            <Copy size={14} /> Duplicar
          </button>
          <button type="button" className="btn btn-danger" onClick={() => useEditor.getState().deleteSelection()}>
            <Trash2 size={14} /> Eliminar
          </button>
        </div>
      </Section>
    </>
  )
}

function SlidePanel() {
  const slide = useActiveSlide()!
  const update = useEditor((s) => s.update)
  const project = useEditor((s) => s.project)!
  const replaceSlide = useEditor((s) => s.replaceSlide)
  const setBg = (patch: Partial<typeof slide.background>) =>
    update(
      (d) => {
        const s = d.slides.find((x) => x.id === slide.id)
        if (s) Object.assign(s.background, patch)
      },
      { key: `bg-${slide.id}-${Object.keys(patch).join()}` },
    )
  const tpl = templateById(slide.templateId)
  const overrides = Object.keys(slide.overrides).length
  return (
    <>
      <div className="border-b border-line px-3.5 py-3">
        <div className="label-xs mb-1 text-gold">Diapositiva {project.slides.indexOf(slide) + 1}</div>
        <input
          className="field font-semibold"
          aria-label="Nombre de la diapositiva"
          value={slide.name}
          onChange={(e) =>
            update(
              (d) => {
                const s = d.slides.find((x) => x.id === slide.id)
                if (s) s.name = e.target.value
              },
              { key: `slidename-${slide.id}` },
            )
          }
        />
      </div>
      <Section title="Plantilla">
        <div className="text-[12px] text-muted">{tpl ? `Basada en «${tpl.name}»` : 'Diapositiva libre'}</div>
        <div className="grid grid-cols-2 gap-1.5">
          <button type="button" className="btn text-[12px]" onClick={() => useUI.getState().set({ modal: 'replaceTemplate' })}>
            Cambiar plantilla
          </button>
          {tpl && (
            <button
              type="button"
              className="btn text-[12px]"
              title="Reconstruye el diseño original con los datos actuales del partido"
              onClick={() => {
                if (confirm('¿Restaurar el diseño original de la plantilla? Se perderán las ediciones manuales de esta diapositiva (puedes deshacer).')) replaceSlide(slide.id, { ...buildTemplateSlide(tpl, project.format, project.match), name: slide.name, overrides: slide.overrides })
              }}
            >
              <RefreshCw size={13} /> Restaurar
            </button>
          )}
        </div>
      </Section>
      <SlideStyleSection />
      <Section title="Fondo">
        <Toggle label="Fondo transparente (PNG/WebP)" checked={slide.background.transparent} onChange={(v) => setBg({ transparent: v })} />
        {!slide.background.transparent && <FillEditor fill={slide.background.fill} onChange={(f) => setBg({ fill: f })} allowNone={false} label="Color de fondo" />}
        <AssetPicker label="Imagen de fondo" value={slide.background.imageAssetId} onChange={(id) => setBg({ imageAssetId: id })} uploadKind="background" />
        {slide.background.imageAssetId && (
          <>
            <Slider label="Opacidad de la imagen" value={slide.background.imageOpacity} onChange={(v) => setBg({ imageOpacity: v })} />
            <Slider label="Desenfoque de la imagen" min={0} max={60} step={1} value={slide.background.imageBlur} onChange={(v) => setBg({ imageBlur: v })} />
          </>
        )}
      </Section>
      <Section title="Datos de esta diapositiva">
        <p className="text-[12px] leading-relaxed text-muted">
          {overrides > 0 ? `Esta diapositiva sobrescribe ${overrides} dato(s) del partido.` : 'Usa los datos compartidos del partido.'} Edita en la pestaña «Partido» con el modo «Solo esta diapositiva».
        </p>
        <button type="button" className="btn w-full text-[12px]" onClick={() => useUI.getState().set({ leftTab: 'match', panelOpen: true })}>
          Abrir datos del partido
        </button>
      </Section>
      <Section title="Proyecto">
        <TextField
          label="Nombre del proyecto"
          value={project.name}
          onChange={(v) =>
            update(
              (d) => {
                d.name = v
              },
              { key: 'project-name' },
            )
          }
        />
        <Toggle
          label="Numeración de páginas (01 / 07)"
          checked={project.pageNumbers}
          onChange={(v) =>
            update((d) => {
              d.pageNumbers = v
              for (const s of d.slides) for (const e of s.elements) if (e.type === 'text' && e.text.includes('{page}')) e.visible = v
            })
          }
        />
      </Section>
    </>
  )
}

function LayerRow({ el, selected, intensityHidden }: { el: SlideElement; selected: boolean; intensityHidden: boolean }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: el.id })
  const updateElement = useEditor((s) => s.updateElement)
  const [editing, setEditing] = useState(false)
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.6 : 1 }}
      className={`group flex items-center gap-1 rounded-md px-1 py-1 text-[12px] ${selected ? 'bg-gold/12 text-ivory ring-1 ring-gold/40' : 'text-ivory/80 hover:bg-white/4'}`}
      onClick={(e) => {
        if (e.shiftKey) useEditor.getState().toggleSelect(el.id)
        else useEditor.getState().select([el.id])
      }}
    >
      <span className="cursor-grab text-dim" {...attributes} {...listeners} aria-label="Arrastrar para reordenar">
        <GripVertical size={13} />
      </span>
      {editing ? (
        <input autoFocus className="field flex-1 px-1.5 py-0.5 text-[12px]" aria-label="Renombrar capa" value={el.name} onChange={(e) => updateElement(el.id, { name: e.target.value }, { key: `name-${el.id}` })} onBlur={() => setEditing(false)} onKeyDown={(e) => e.key === 'Enter' && setEditing(false)} />
      ) : (
        <span className={`flex-1 truncate ${el.visible ? '' : 'text-dim line-through'}`} onDoubleClick={() => setEditing(true)} title="Doble clic para renombrar">
          <span className={intensityHidden ? 'opacity-45' : ''}>{el.name}</span>
          <span className="ml-1.5 text-[10px] text-dim">{ELEMENT_LABELS[el.type]}</span>
          {intensityHidden && (
            <span className="ml-1.5 text-[10px] text-dim" title="Oculto por la intensidad visual de la diapositiva">
              · {el.minIntensity === 'cinematic' ? 'solo cinemático' : 'oculto en mínimo'}
            </span>
          )}
        </span>
      )}
      <button type="button" className="icon-btn h-6 w-6" aria-label={el.visible ? 'Ocultar capa' : 'Mostrar capa'} onClick={(e) => (e.stopPropagation(), updateElement(el.id, { visible: !el.visible }))}>
        {el.visible ? <Eye size={13} /> : <EyeOff size={13} />}
      </button>
      <button type="button" className="icon-btn h-6 w-6" data-active={el.locked} aria-label={el.locked ? 'Desbloquear capa' : 'Bloquear capa'} onClick={(e) => (e.stopPropagation(), updateElement(el.id, { locked: !el.locked }))}>
        {el.locked ? <Lock size={12} /> : <Unlock size={12} className="opacity-40 group-hover:opacity-100" />}
      </button>
    </div>
  )
}

export function LayersPanel() {
  const slide = useActiveSlide()
  const project = useEditor((s) => s.project)
  const selection = useEditor((s) => s.selection)
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }))
  if (!slide) return null
  const reversed = [...slide.elements].reverse()
  const onDragEnd = (e: DragEndEvent) => {
    if (!e.over || e.active.id === e.over.id) return
    const overIndexReversed = reversed.findIndex((x) => x.id === e.over!.id)
    const target = slide.elements.length - 1 - overIndexReversed
    useEditor.getState().moveElementTo(String(e.active.id), target)
  }
  return (
    <div className="p-2">
      <p className="px-1 pb-2 text-[11px] text-dim">Arriba = delante. Los efectos de ambiente están bloqueados para no seleccionarlos por accidente.</p>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={reversed.map((e) => e.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-0.5">
            {reversed.map((el) => (
              <LayerRow key={el.id} el={el} selected={selection.includes(el.id)} intensityHidden={!shownAtIntensity(el, slideIntensity(project, slide))} />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  )
}

export function RightPanel() {
  const slide = useActiveSlide()
  const selection = useEditor((s) => s.selection)
  const [tab, setTab] = useState<'props' | 'layers'>('props')
  const open = useUI((s) => s.rightOpen)
  if (!slide || !open) return null
  const els = slide.elements.filter((e) => selection.includes(e.id))
  return (
    <aside className="flex w-[300px] shrink-0 flex-col border-l border-line bg-panel" aria-label="Propiedades">
      <div className="flex border-b border-line p-1.5" role="tablist">
        {(
          [
            ['props', 'Propiedades'],
            ['layers', `Capas · ${slide.elements.length}`],
          ] as const
        ).map(([k, label]) => (
          <button key={k} type="button" role="tab" aria-selected={tab === k} className={`flex-1 rounded-md py-1.5 text-[12px] font-semibold ${tab === k ? 'bg-panel-3 text-ivory' : 'text-muted hover:text-ivory'}`} onClick={() => setTab(k)}>
            {label}
          </button>
        ))}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        {tab === 'layers' ? (
          <LayersPanel />
        ) : els.length === 1 ? (
          <div key={els[0].id}>
            <ElementHeader el={els[0]} />
            <ElementSpecific el={els[0]} />
            <TransformSection el={els[0]} />
            <AppearanceSection el={els[0]} />
          </div>
        ) : els.length > 1 ? (
          <MultiPanel els={els} />
        ) : (
          <SlidePanel />
        )}
      </div>
    </aside>
  )
}
