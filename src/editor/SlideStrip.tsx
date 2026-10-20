import { DndContext, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core'
import { SortableContext, horizontalListSortingStrategy, useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Copy, Plus, Trash2 } from 'lucide-react'
import type { Project, Slide } from '../model/types'
import { useEditor } from '../store/editor'
import { useLibrary } from '../store/library'
import { useUI } from '../store/ui'
import { useSlideThumb } from './thumbs'

function Thumb({ slide, index, project, active }: { slide: Slide; index: number; project: Project; active: boolean }) {
  const brand = useLibrary((s) => s.brand)
  const url = useSlideThumb(project, slide, brand, 150)
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: slide.id })
  const h = 92
  const w = (h * project.format.width) / project.format.height
  return (
    <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition, zIndex: isDragging ? 10 : undefined }} className="group relative shrink-0" data-testid="slide-thumb">
      <button
        type="button"
        {...attributes}
        {...listeners}
        aria-label={`Diapositiva ${index + 1}: ${slide.name}`}
        aria-current={active}
        onClick={() => useEditor.getState().setActiveSlide(slide.id)}
        className={`block overflow-hidden rounded-md border-2 bg-ink transition ${active ? 'border-gold shadow-[0_0_0_3px_rgba(203,170,98,0.18)]' : 'border-transparent opacity-80 hover:opacity-100'}`}
        style={{ width: w, height: h }}
      >
        {url ? <img src={url} alt="" className="h-full w-full object-cover" draggable={false} /> : <div className="h-full w-full animate-pulse bg-panel-3" />}
      </button>
      <span className={`absolute -top-1.5 -left-1.5 rounded-md px-1.5 py-0.5 text-[10px] font-bold ${active ? 'bg-gold text-ink' : 'bg-panel-3 text-ivory/80'}`}>{String(index + 1).padStart(2, '0')}</span>
      <div className="absolute top-1 right-1 hidden flex-col gap-0.5 group-hover:flex">
        <button type="button" className="rounded bg-ink/85 p-1 text-ivory/80 hover:text-gold" aria-label="Duplicar diapositiva" title="Duplicar" onClick={() => useEditor.getState().duplicateSlide(slide.id)}>
          <Copy size={11} />
        </button>
        {project.slides.length > 1 && (
          <button type="button" className="rounded bg-ink/85 p-1 text-ivory/80 hover:text-loss" aria-label="Eliminar diapositiva" title="Eliminar" onClick={() => confirm('¿Eliminar esta diapositiva?') && useEditor.getState().deleteSlide(slide.id)}>
            <Trash2 size={11} />
          </button>
        )}
      </div>
    </div>
  )
}

export function SlideStrip() {
  const project = useEditor((s) => s.project)!
  const activeId = useEditor((s) => s.activeSlideId)
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }))
  const onDragEnd = (e: DragEndEvent) => {
    if (!e.over || e.active.id === e.over.id) return
    const from = project.slides.findIndex((s) => s.id === e.active.id)
    const to = project.slides.findIndex((s) => s.id === e.over!.id)
    useEditor.getState().moveSlide(from, to)
  }
  return (
    <div className="flex h-[124px] shrink-0 items-center gap-3 overflow-x-auto border-t border-line bg-ink-2 px-4" aria-label="Diapositivas del carrusel">
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={project.slides.map((s) => s.id)} strategy={horizontalListSortingStrategy}>
          {project.slides.map((s, i) => (
            <Thumb key={s.id} slide={s} index={i} project={project} active={s.id === activeId} />
          ))}
        </SortableContext>
      </DndContext>
      <button type="button" className="flex h-[92px] w-[58px] shrink-0 flex-col items-center justify-center gap-1 rounded-md border-2 border-dashed border-line-2 text-[10px] font-semibold text-muted hover:border-gold/60 hover:text-gold" onClick={() => useUI.getState().set({ leftTab: 'templates', panelOpen: true })} aria-label="Añadir diapositiva">
        <Plus size={18} /> Añadir
      </button>
    </div>
  )
}
