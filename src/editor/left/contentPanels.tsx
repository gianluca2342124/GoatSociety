import { useState } from 'react'
import { DndContext, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core'
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Copy, GripVertical, LayoutTemplate, Plus, Replace, Sparkles, Trash2 } from 'lucide-react'
import { useEditor } from '../../store/editor'
import { useLibrary } from '../../store/library'
import { useUI } from '../../store/ui'
import { TEMPLATES, buildMatchCarousel, buildTemplateSlide, type TemplateDef } from '../../templates'
import { CATEGORY_LABELS, type TemplateCategory } from '../../templates/types'
import { useSlideThumb, useTemplateThumb } from '../thumbs'
import type { EffectElement, Project, Slide } from '../../model/types'
import { insertElement, canvasSize } from './insert'
import { EFFECT_OPTIONS, IconPreview, MASCOT_PRESETS } from '../props/basicProps'
import { ICONS } from '../../render/icons'
import { TACTICAL_PRESETS, defaultTactics } from '../../tactics/presets'
import { FORMATIONS } from '../../tactics/formations'
import { FINAL_VARIANTS } from '../../templates/brand'
import { makeCtx, atmosphere } from '../../templates/kit'
import { emptySlide } from '../../model/defaults'

export function PanelTitle({ title, sub }: { title: string; sub?: string }) {
  return (
    <div className="px-4 pt-4 pb-2">
      <h2 className="font-cond text-[17px] font-bold tracking-wide uppercase">{title}</h2>
      {sub && <p className="mt-0.5 text-[12px] leading-snug text-muted">{sub}</p>}
    </div>
  )
}

function TemplateCard({ def, project, onPick, onReplace }: { def: TemplateDef; project: Project; onPick: () => void; onReplace?: () => void }) {
  const brand = useLibrary((s) => s.brand)
  const url = useTemplateThumb(def, project, brand, 200)
  const ratio = project.format.height / project.format.width
  return (
    <div className="group relative" data-testid={`template-${def.id}`}>
      <button type="button" onClick={onPick} className="block w-full overflow-hidden rounded-lg border border-line bg-ink-2 transition hover:border-gold/70" style={{ aspectRatio: `1 / ${ratio}` }} title={def.description} aria-label={`Añadir plantilla ${def.name}`}>
        {url ? <img src={url} alt="" className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-[10px] text-dim">Generando…</div>}
      </button>
      <div className="mt-1 flex items-start justify-between gap-1">
        <div className="min-w-0">
          <div className="truncate text-[11px] font-semibold">
            <span className="text-gold">{String(def.number).padStart(2, '0')}</span> {def.name}
          </div>
        </div>
        {onReplace && (
          <button type="button" className="icon-btn h-5 w-5 shrink-0 opacity-0 group-hover:opacity-100" title="Reemplazar la diapositiva actual" aria-label={`Reemplazar con ${def.name}`} onClick={onReplace}>
            <Replace size={11} />
          </button>
        )}
      </div>
    </div>
  )
}

export function TemplatesPanel() {
  const project = useEditor((s) => s.project)!
  const addSlide = useEditor((s) => s.addSlide)
  const replaceSlide = useEditor((s) => s.replaceSlide)
  const activeId = useEditor((s) => s.activeSlideId)
  const [cat, setCat] = useState<TemplateCategory | 'all'>('all')
  const list = TEMPLATES.filter((t) => cat === 'all' || t.category === cat)
  return (
    <div>
      <PanelTitle title="Plantillas" sub="Clic para añadir como nueva diapositiva. Todas usan los datos del partido." />
      <div className="px-4 pb-3">
        <button
          type="button"
          className="btn btn-gold w-full py-2.5"
          onClick={() => {
            const slides = buildMatchCarousel(project)
            useEditor.getState().update((d) => {
              d.slides.push(...(slides as typeof d.slides))
            })
            useEditor.getState().setActiveSlide(slides[0].id)
            useUI.getState().toast('Carrusel de 7 diapositivas añadido', 'success')
          }}
        >
          <Sparkles size={15} /> Nuevo carrusel de partido (7)
        </button>
      </div>
      <div className="flex flex-wrap gap-1 px-4 pb-3">
        {(['all', 'match', 'stats', 'tactics', 'predictions', 'brand'] as const).map((c) => (
          <button key={c} type="button" className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${cat === c ? 'border-gold bg-gold/15 text-gold' : 'border-line text-muted hover:text-ivory'}`} onClick={() => setCat(c)}>
            {c === 'all' ? 'Todas' : CATEGORY_LABELS[c]}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-3 px-4 pb-6">
        {list.map((def) => (
          <TemplateCard
            key={def.id}
            def={def}
            project={project}
            onPick={() => addSlide(buildTemplateSlide(def, project.format, project.match))}
            onReplace={() => {
              const cur = project.slides.find((s) => s.id === activeId)
              if (cur) replaceSlide(cur.id, { ...buildTemplateSlide(def, project.format, project.match), overrides: cur.overrides })
            }}
          />
        ))}
      </div>
      {cat === 'all' || cat === 'brand' ? (
        <div className="px-4 pb-6">
          <div className="label-xs mb-2">Variantes de cierre</div>
          <div className="space-y-1.5">
            {FINAL_VARIANTS.map((v) => (
              <button
                key={v.id}
                type="button"
                className="btn w-full justify-start text-left text-[11px]"
                onClick={() => {
                  const def = TEMPLATES.find((t) => t.id === 'final-slide')!
                  const slide = buildTemplateSlide(def, project.format, project.match)
                  for (const el of slide.elements) {
                    if (el.type === 'text' && el.name === 'Mensaje final') el.text = v.headline
                    if (el.type === 'text' && el.name === 'Submensaje') el.text = v.sub
                  }
                  addSlide(slide)
                }}
              >
                <LayoutTemplate size={13} /> {v.headline.replace(/\[\[|\]\]/g, '')}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  )
}

function SlideRow({ slide, index, project, active }: { slide: Slide; index: number; project: Project; active: boolean }) {
  const brand = useLibrary((s) => s.brand)
  const url = useSlideThumb(project, slide, brand, 120)
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: slide.id })
  const { duplicateSlide, deleteSlide, setActiveSlide } = useEditor.getState()
  return (
    <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.6 : 1 }} className={`group flex items-center gap-2 rounded-lg border p-1.5 ${active ? 'border-gold/70 bg-gold/8' : 'border-line hover:border-line-2'}`} onClick={() => setActiveSlide(slide.id)}>
      <span className="cursor-grab text-dim" {...attributes} {...listeners} aria-label="Arrastrar para reordenar">
        <GripVertical size={14} />
      </span>
      <div className="w-12 shrink-0 overflow-hidden rounded border border-line bg-ink" style={{ aspectRatio: `${project.format.width} / ${project.format.height}` }}>
        {url && <img src={url} alt="" className="h-full w-full object-cover" />}
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[10px] font-bold text-gold">{String(index + 1).padStart(2, '0')}</div>
        <div className="truncate text-[12px]">{slide.name}</div>
      </div>
      <button type="button" className="icon-btn h-6 w-6 opacity-0 group-hover:opacity-100" aria-label="Duplicar diapositiva" onClick={(e) => (e.stopPropagation(), duplicateSlide(slide.id))}>
        <Copy size={12} />
      </button>
      <button type="button" className="icon-btn h-6 w-6 opacity-0 group-hover:opacity-100 hover:!text-loss" aria-label="Eliminar diapositiva" disabled={project.slides.length <= 1} onClick={(e) => (e.stopPropagation(), confirm('¿Eliminar esta diapositiva?') && deleteSlide(slide.id))}>
        <Trash2 size={12} />
      </button>
    </div>
  )
}

export function SlidesPanel() {
  const project = useEditor((s) => s.project)!
  const activeId = useEditor((s) => s.activeSlideId)
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }))
  const onDragEnd = (e: DragEndEvent) => {
    if (!e.over || e.active.id === e.over.id) return
    const from = project.slides.findIndex((s) => s.id === e.active.id)
    const to = project.slides.findIndex((s) => s.id === e.over!.id)
    useEditor.getState().moveSlide(from, to)
  }
  return (
    <div>
      <PanelTitle title="Páginas" sub="Arrastra para reordenar. La numeración 01 / 07 se actualiza sola." />
      <div className="px-4 pb-6">
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={project.slides.map((s) => s.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-1.5">
              {project.slides.map((s, i) => (
                <SlideRow key={s.id} slide={s} index={i} project={project} active={s.id === activeId} />
              ))}
            </div>
          </SortableContext>
        </DndContext>
        <div className="mt-3 grid grid-cols-2 gap-1.5">
          <button
            type="button"
            className="btn text-[12px]"
            onClick={() => {
              const s = emptySlide(`Diapositiva ${project.slides.length + 1}`)
              s.elements = atmosphere(makeCtx(project.format), 'noir')
              useEditor.getState().addSlide(s)
            }}
          >
            <Plus size={13} /> En blanco
          </button>
          <button type="button" className="btn text-[12px]" onClick={() => useUI.getState().set({ leftTab: 'templates' })}>
            <LayoutTemplate size={13} /> Plantilla
          </button>
        </div>
      </div>
    </div>
  )
}

function InsertTile({ label, onClick, children, testId }: { label: string; onClick: () => void; children?: React.ReactNode; testId?: string }) {
  return (
    <button type="button" data-testid={testId} className="flex flex-col items-center justify-center gap-1.5 rounded-lg border border-line bg-ink-2 px-2 py-3 text-center text-[11px] font-semibold text-ivory/85 transition hover:border-gold/60 hover:text-ivory" onClick={onClick}>
      {children}
      <span className="leading-tight">{label}</span>
    </button>
  )
}

export function TextPanel() {
  const { W } = canvasSize()
  const presets = [
    { label: 'Titular grande', preview: <span className="font-display text-xl text-ivory">TITULAR</span>, patch: { text: 'Tu [[titular]] aquí', fontSize: 170, width: W - 160, height: 360, x: 80 } },
    { label: 'Subtítulo editorial', preview: <span className="font-serif text-lg text-ivory italic" style={{ fontFamily: 'Instrument Serif' }}>Subtítulo</span>, patch: { text: 'Un subtítulo con carácter', fontFamily: '$serif', fontSize: 70, italic: true, uppercase: false, width: W - 160, height: 140, x: 80, lineHeight: 1.05 } },
    { label: 'Etiqueta', preview: <span className="font-cond text-xs font-bold tracking-[0.3em] text-gold">ETIQUETA</span>, patch: { text: '{competition}', fontFamily: '$label', fontSize: 30, fontWeight: 700, letterSpacing: 9, fill: { kind: 'solid' as const, color: '$primary' }, width: W - 160, height: 50, x: 80 } },
    { label: 'Párrafo', preview: <span className="text-[11px] text-muted">Texto de apoyo…</span>, patch: { text: 'Escribe aquí el análisis o la explicación del dato.', fontFamily: '$body', fontSize: 36, fontWeight: 500, uppercase: false, lineHeight: 1.32, fill: { kind: 'solid' as const, color: '$muted' }, width: W - 160, height: 200, x: 80 } },
    { label: 'Cifra gigante', preview: <span className="font-display text-2xl text-gold">72%</span>, patch: { text: '72%', fontSize: 320, width: 700, height: 340, fill: { kind: 'linear' as const, angle: 180, stops: [{ offset: 0, color: '#F3E3B5' }, { offset: 0.5, color: '$primary' }, { offset: 1, color: '#8E7438' }] } } },
    { label: 'Botón / CTA', preview: <span className="rounded-full bg-gold px-2 py-0.5 font-cond text-[10px] font-bold text-ink">ÚNETE</span>, patch: { text: 'Únete a {brand}', fontFamily: '$label', fontSize: 34, fontWeight: 800, letterSpacing: 5, fill: { kind: 'solid' as const, color: '#08090B' }, background: { color: '$primary', opacity: 1, paddingX: 44, paddingY: 22, radius: 60 }, width: W - 200, height: 110, x: 100, autoFit: false } },
    { label: 'Titular metálico', preview: <span className="font-display text-xl" style={{ background: 'linear-gradient(#fff,#8a8f98)', WebkitBackgroundClip: 'text', color: 'transparent' }}>METAL</span>, patch: { text: 'Partido [[grande]]', fontSize: 170, width: W - 160, height: 360, x: 80, fill: { kind: 'linear' as const, angle: 180, stops: [{ offset: 0, color: '#FFFFFF' }, { offset: 0.48, color: '#D9DCE1' }, { offset: 0.52, color: '#8C929B' }, { offset: 1, color: '#E7E9EC' }] } } },
    { label: 'Equipos (vinculado)', preview: <span className="font-cond text-sm font-bold text-ivory">PSG vs FCB</span>, patch: { text: '{home} [[vs]] {away}', fontFamily: '$label', fontSize: 70, fontWeight: 800, width: W - 160, height: 110, x: 80, accentColor: '$muted' } },
  ]
  return (
    <div>
      <PanelTitle title="Texto" sub="Doble clic en un texto del lienzo para editarlo directamente." />
      <div className="grid grid-cols-2 gap-2 px-4 pb-6">
        {presets.map((p) => (
          <InsertTile key={p.label} label={p.label} testId={`add-text-${p.label}`} onClick={() => insertElement('text', p.patch)}>
            <div className="flex h-8 items-center">{p.preview}</div>
          </InsertTile>
        ))}
      </div>
    </div>
  )
}

export function ShapesPanel() {
  const shapes: { label: string; shape: 'rect' | 'ellipse' | 'line' | 'triangle' | 'hexagon' | 'star' | 'diamond' | 'parallelogram'; radius?: number; w?: number; h?: number }[] = [
    { label: 'Rectángulo', shape: 'rect', radius: 0 },
    { label: 'Tarjeta', shape: 'rect', radius: 32 },
    { label: 'Círculo', shape: 'ellipse', w: 300, h: 300 },
    { label: 'Línea', shape: 'line', w: 600, h: 4 },
    { label: 'Triángulo', shape: 'triangle' },
    { label: 'Hexágono', shape: 'hexagon', w: 300, h: 300 },
    { label: 'Estrella', shape: 'star', w: 300, h: 300 },
    { label: 'Rombo', shape: 'diamond', w: 300, h: 300 },
    { label: 'Paralelogramo', shape: 'parallelogram', w: 600, h: 120 },
  ]
  const [iconOpen, setIconOpen] = useState(false)
  return (
    <div>
      <PanelTitle title="Formas e iconos" />
      <div className="grid grid-cols-3 gap-2 px-4">
        {shapes.map((s) => (
          <InsertTile
            key={s.label}
            label={s.label}
            onClick={() => insertElement('shape', { shape: s.shape, cornerRadius: s.radius ?? 0, width: s.w ?? 420, height: s.h ?? 260, fill: s.shape === 'line' ? { kind: 'solid', color: '$primary' } : { kind: 'solid', color: '$surface' } })}
          >
            <ShapeGlyph shape={s.shape} r={s.radius} />
          </InsertTile>
        ))}
        <InsertTile label="Cristal esmerilado" onClick={() => insertElement('glass', {})}>
          <div className="h-7 w-10 rounded-md border border-white/30 bg-white/10 backdrop-blur" />
        </InsertTile>
      </div>
      <div className="px-4 pt-4 pb-6">
        <button type="button" className="btn w-full" onClick={() => setIconOpen(!iconOpen)}>
          {iconOpen ? 'Ocultar iconos' : 'Iconos'}
        </button>
        {iconOpen && (
          <div className="mt-2 grid grid-cols-6 gap-1 rounded-lg bg-ink-2 p-1.5">
            {Object.entries(ICONS).map(([k, v]) => (
              <button key={k} type="button" title={v.label} aria-label={`Añadir icono ${v.label}`} className="flex aspect-square items-center justify-center rounded-md text-ivory/80 hover:bg-white/5 hover:text-gold" onClick={() => insertElement('icon', { icon: k })}>
                <IconPreview name={k} />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function ShapeGlyph({ shape, r }: { shape: string; r?: number }) {
  const common = 'fill-current text-ivory/60'
  return (
    <svg width="40" height="28" viewBox="0 0 40 28" aria-hidden>
      {shape === 'rect' && <rect x="4" y="4" width="32" height="20" rx={r ? 6 : 0} className={common} />}
      {shape === 'ellipse' && <circle cx="20" cy="14" r="11" className={common} />}
      {shape === 'line' && <rect x="3" y="13" width="34" height="2.5" className="fill-current text-gold" />}
      {shape === 'triangle' && <polygon points="20,3 36,25 4,25" className={common} />}
      {shape === 'hexagon' && <polygon points="31,14 25.5,23.5 14.5,23.5 9,14 14.5,4.5 25.5,4.5" className={common} />}
      {shape === 'star' && <polygon points="20,2 23.5,10.5 33,11 25.5,17 28,26 20,21 12,26 14.5,17 7,11 16.5,10.5" className={common} />}
      {shape === 'diamond' && <polygon points="20,2 34,14 20,26 6,14" className={common} />}
      {shape === 'parallelogram' && <polygon points="10,6 38,6 30,22 2,22" className={common} />}
    </svg>
  )
}

export function ChartsPanel() {
  const { W } = canvasSize()
  const w = W - 160
  const items: { label: string; run: () => void }[] = [
    { label: 'Barras enfrentadas', run: () => insertElement('statBars', { style: 'dual', width: w, height: 640, x: 80 }) },
    { label: 'Barras de proporción', run: () => insertElement('statBars', { style: 'split', width: w, height: 560, x: 80 }) },
    { label: 'Barras apiladas', run: () => insertElement('statBars', { style: 'stacked', width: w, height: 700, x: 80, maxRows: 3 }) },
    { label: 'Tarjeta de métrica', run: () => insertElement('statBars', { style: 'split', width: 440, height: 230, maxRows: 1, valueSize: 80 }) },
    { label: 'Dato destacado', run: () => insertElement('statNumber', { width: w, height: 380, x: 80 }) },
    { label: 'Dato en tarjeta', run: () => insertElement('statNumber', { layout: 'card', width: w, height: 320, x: 80, valueSize: 150 }) },
    { label: 'Anillo de progreso', run: () => insertElement('progressRing', {}) },
    { label: 'Racha (forma)', run: () => insertElement('formRow', {}) },
    { label: 'Tabla compacta', run: () => insertElement('table', { width: w, x: 80 }) },
    { label: 'Jugadores clave', run: () => insertElement('playerList', { filter: 'key' }) },
    { label: 'Bajas y dudas', run: () => insertElement('playerList', { filter: 'absences', showStat: false, showNumber: false }) },
    { label: 'Agenda de partidos', run: () => insertElement('matchList', { width: w, x: 80 }) },
    { label: 'Pronóstico', run: () => insertElement('prediction', { mode: 'plain', width: w, x: 80 }) },
    { label: 'Pronóstico bloqueado', run: () => insertElement('prediction', { mode: 'locked', width: w, x: 80, showNote: false }) },
    { label: 'Pronóstico revelado', run: () => insertElement('prediction', { mode: 'revealed', width: w, x: 80 }) },
    { label: 'Resultados verificados', run: () => insertElement('resultsList', { width: w, x: 80 }) },
    { label: 'Escudo local', run: () => insertElement('crest', { side: 'home', width: 360, height: 360 }) },
    { label: 'Escudo visitante', run: () => insertElement('crest', { side: 'away', width: 360, height: 360 }) },
  ]
  return (
    <div>
      <PanelTitle title="Gráficos y datos" sub="Los valores se calculan automáticamente desde los datos del partido." />
      <div className="grid grid-cols-2 gap-2 px-4 pb-6">
        {items.map((i) => (
          <InsertTile key={i.label} label={i.label} onClick={i.run} testId={`add-chart-${i.label}`} />
        ))}
      </div>
    </div>
  )
}

export function TacticsPanel() {
  const project = useEditor((s) => s.project)!
  const { W, H } = canvasSize()
  const match = project.match
  const add = (patch: Parameters<typeof defaultTactics>[0]) =>
    insertElement('tactics', { width: W - 80, height: Math.min(H * 0.62, (W - 80) * 1.4), x: 40, tactics: defaultTactics({ homeFormation: match.home.formation, awayFormation: match.away.formation, ...patch }) })
  return (
    <div>
      <PanelTitle title="Táctica" sub="Doble clic en una pizarra para mover jugadores y dibujar flechas." />
      <div className="grid grid-cols-2 gap-2 px-4">
        <InsertTile label="Campo completo (cenital)" testId="add-tactics-full" onClick={() => add({ view: 'full', camera: 'top' })} />
        <InsertTile label="Medio campo (perspectiva)" onClick={() => add({ view: 'half', camera: 'perspective', tilt: 0.55 })} />
        <InsertTile label="Último tercio" onClick={() => add({ view: 'attackingThird', camera: 'perspective', tilt: 0.5 })} />
        <InsertTile label="Isométrica" onClick={() => add({ view: 'full', camera: 'isometric' })} />
        <InsertTile label="Duelo de sistemas" onClick={() => add({ view: 'full', camera: 'perspective', tilt: 0.75, showLabels: false })} />
        <InsertTile label="Estadio 3D real" onClick={() => insertElement('stadium3d', { width: W, height: Math.min(H * 0.55, W), x: 0 })} />
      </div>
      <div className="px-4 pt-5">
        <div className="label-xs mb-2">Crear desde preajuste</div>
        <div className="space-y-1.5">
          {TACTICAL_PRESETS.map((p) => (
            <button
              key={p.id}
              type="button"
              className="w-full rounded-lg border border-line bg-ink-2 px-3 py-2 text-left transition hover:border-gold/60"
              onClick={() => {
                const r = p.build()
                add({ ...r, view: r.view ?? 'full', camera: r.view === 'half' ? 'perspective' : 'top', tilt: 0.5 })
              }}
            >
              <div className="text-[12px] font-semibold">{p.label}</div>
              <div className="text-[11px] leading-snug text-muted">{p.description}</div>
            </button>
          ))}
        </div>
      </div>
      <div className="px-4 pt-5 pb-6">
        <div className="label-xs mb-2">Formaciones incluidas</div>
        <div className="flex flex-wrap gap-1">
          {FORMATIONS.map((f) => (
            <span key={f} className="rounded-md border border-line px-2 py-0.5 text-[11px] text-muted">
              {f}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}

export function MascotPanel() {
  const { W, H } = canvasSize()
  const size = Math.min(W * 0.75, H * 0.5)
  return (
    <div>
      <PanelTitle title="Mascota y marca" sub="Mascota original facetada con iluminación real por faceta." />
      <div className="grid grid-cols-2 gap-2 px-4">
        {MASCOT_PRESETS.map((p) => (
          <InsertTile key={p.label} label={p.label} onClick={() => insertElement('mascot', { ...p.patch, width: size * 0.78, height: size, name: `Mascota · ${p.label}` })} />
        ))}
      </div>
      <div className="label-xs px-4 pt-5 pb-2">Marca GOAT SOCIETY</div>
      <div className="grid grid-cols-2 gap-2 px-4">
        <InsertTile label="Cabecera" onClick={() => insertElement('brandMark', { variant: 'header', width: 460, height: 56 })} />
        <InsertTile label="Firma de pie" onClick={() => insertElement('brandMark', { variant: 'signature', width: W - 160, height: 44, x: 80 })} />
        <InsertTile label="Insignia circular" onClick={() => insertElement('brandMark', { variant: 'badge', width: 240, height: 240 })} />
        <InsertTile label="Marca de agua" onClick={() => insertElement('brandMark', { variant: 'watermark', width: 160, height: 160, opacity: 0.4 })} />
        <InsertTile label="Logotipo apilado" onClick={() => insertElement('brandMark', { variant: 'wordmark', width: 480, height: 380 })} />
      </div>
      <div className="label-xs px-4 pt-5 pb-2">3D opcional</div>
      <div className="px-4 pb-6">
        <InsertTile label="Modelo 3D (GLB/GLTF)" onClick={() => insertElement('model3d', {})} />
        <p className="mt-2 text-[11px] leading-snug text-dim">Si tienes un modelo de cabra en .glb, súbelo en el panel del elemento. Sin modelo, la mascota facetada 2.5D ofrece el mismo acabado premium.</p>
      </div>
    </div>
  )
}

export function EffectsPanel() {
  const project = useEditor((s) => s.project)!
  const slideId = useEditor((s) => s.activeSlideId)
  const defaults: Partial<Record<EffectElement['effect'], Partial<EffectElement>>> = {
    vignette: { color: '#000000', intensity: 0.85, spread: 0.35 },
    spotlight: { color: '#FFFFFF', intensity: 0.25, spread: 0.5 },
    stadiumLights: { color: '#FFF1D6', intensity: 0.6, spread: 0.3 },
    lightRays: { color: '$primary', intensity: 0.35, spread: 0.5 },
    fog: { color: '#9AA4B2', intensity: 0.3, spread: 0.4 },
    glow: { color: '$primary', intensity: 0.35 },
    gradient: { color: '$bg', color2: '$bg', angle: 180, spread: 0.5, intensity: 1 },
    noiseGradient: { color: '$secondary', color2: '#0B2A23', intensity: 0.7, spread: 0.35 },
    grain: { intensity: 0.08, spread: 0.3, fx: { blend: 'overlay' } },
    bokeh: { color: '#FFE6B0', color2: '$primary', intensity: 0.5, spread: 0.4 },
    pitchLines: { color: '$text', intensity: 0.12, spread: 0.3 },
    grid: { color: '$text', intensity: 0.08, spread: 0.2 },
    scanlines: { color: '#000000', intensity: 0.18, spread: 0.2 },
  }
  const presets = [
    { id: 'stadium', label: 'Estadio nocturno' },
    { id: 'emerald', label: 'Esmeralda' },
    { id: 'burgundy', label: 'Burdeos' },
    { id: 'gold', label: 'Oro y rayos' },
    { id: 'pitch', label: 'Campo' },
    { id: 'noir', label: 'Noir con foco' },
  ] as const
  return (
    <div>
      <PanelTitle title="Efectos" sub="Úsalos con moderación: legibilidad primero." />
      <div className="label-xs px-4 pb-2">Atmósferas completas</div>
      <div className="grid grid-cols-2 gap-2 px-4">
        {presets.map((p) => (
          <InsertTile
            key={p.id}
            label={p.label}
            onClick={() => {
              const fx = atmosphere(makeCtx(project.format), p.id)
              useEditor.getState().update((d) => {
                const s = d.slides.find((x) => x.id === slideId) ?? d.slides[0]
                // Replace existing locked atmosphere layers, keep content.
                const content = s.elements.filter((e) => !(e.type === 'effect' && e.locked))
                s.elements = [...(fx as typeof s.elements), ...content]
              })
            }}
          />
        ))}
      </div>
      <div className="label-xs px-4 pt-5 pb-2">Capas de efecto</div>
      <div className="grid grid-cols-2 gap-2 px-4 pb-6">
        {EFFECT_OPTIONS.map((o) => (
          <InsertTile key={o.value} label={o.label} onClick={() => insertElement('effect', { effect: o.value, name: o.label, ...(defaults[o.value] ?? {}) })} />
        ))}
      </div>
    </div>
  )
}
