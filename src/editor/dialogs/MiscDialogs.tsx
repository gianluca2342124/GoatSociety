import { useState } from 'react'
import type { FormatPreset, Slide, SlideElement } from '../../model/types'
import { FORMATS, formatOf } from '../../model/formats'
import { useEditor } from '../../store/editor'
import { useLibrary } from '../../store/library'
import { useUI } from '../../store/ui'
import { Modal, Segmented } from '../../ui/controls'
import { SHORTCUTS } from '../useShortcuts'
import { TEMPLATES, buildTemplateSlide, templateById } from '../../templates'
import { CATEGORY_LABELS } from '../../templates/types'
import { useTemplateThumb } from '../thumbs'
import type { TemplateDef } from '../../templates'

/** Proportionally fit a slide's elements into a new canvas size. */
export function rescaleSlide(slide: Slide, from: { width: number; height: number }, to: { width: number; height: number }): Slide {
  const sx = to.width / from.width
  const sy = to.height / from.height
  const s = Math.min(sx, sy)
  const elements = slide.elements.map((e) => {
    const c = structuredClone(e) as SlideElement
    const full = e.x <= 1 && e.y <= 1 && e.width >= from.width - 2 && e.height >= from.height - 2
    if (full) {
      c.x = 0
      c.y = 0
      c.width = to.width
      c.height = to.height
      return c
    }
    const cx = (e.x + e.width / 2) * sx
    const cy = (e.y + e.height / 2) * sy
    c.width = e.width * s
    c.height = e.height * s
    c.x = cx - c.width / 2
    c.y = cy - c.height / 2
    if (c.type === 'text') {
      c.fontSize *= s
      c.minFontSize *= s
      c.letterSpacing *= s
      if (c.background) c.background = { ...c.background, paddingX: c.background.paddingX * s, paddingY: c.background.paddingY * s, radius: c.background.radius * s }
    }
    if (c.type === 'tactics' || c.type === 'stadium3d') c.tactics.playerSize *= s
    return c
  })
  return { ...slide, elements }
}

export function CanvasSizeDialog() {
  const project = useEditor((s) => s.project)!
  const update = useEditor((s) => s.update)
  const close = () => useUI.getState().set({ modal: null })
  const [preset, setPreset] = useState<FormatPreset>(project.format.preset)
  const [mode, setMode] = useState<'rebuild' | 'scale'>('rebuild')
  const apply = () => {
    const to = formatOf(preset)
    const from = project.format
    update((d) => {
      d.format = to
      d.slides = d.slides.map((s) => {
        const tpl = templateById(s.templateId)
        if (mode === 'rebuild' && tpl) {
          const rebuilt = buildTemplateSlide(tpl, to, project.match)
          return { ...rebuilt, id: s.id, name: s.name, overrides: s.overrides } as typeof s
        }
        return rescaleSlide(s as Slide, from, to) as typeof s
      })
    })
    useUI.getState().set({ autoFit: true, modal: null })
    useUI.getState().toast(`Lienzo cambiado a ${to.width}×${to.height}`, 'success')
  }
  return (
    <Modal
      title="Tamaño del lienzo"
      onClose={close}
      width={560}
      footer={
        <>
          <button type="button" className="btn" onClick={close}>
            Cancelar
          </button>
          <button type="button" className="btn btn-gold" onClick={apply} disabled={preset === project.format.preset}>
            Aplicar
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-2">
          {(Object.keys(FORMATS) as FormatPreset[]).map((p) => (
            <button key={p} type="button" onClick={() => setPreset(p)} className={`rounded-xl border p-3 text-left ${preset === p ? 'border-gold bg-gold/10' : 'border-line hover:border-line-2'}`}>
              <div className="text-[13px] font-bold">{FORMATS[p].label}</div>
              <div className="text-[11px] text-muted">{FORMATS[p].hint}</div>
            </button>
          ))}
        </div>
        <Segmented
          value={mode}
          onChange={setMode}
          options={[
            { value: 'rebuild', label: 'Recomponer plantillas (recomendado)' },
            { value: 'scale', label: 'Escalar proporcionalmente' },
          ]}
        />
        <p className="text-[12px] leading-relaxed text-muted">
          {mode === 'rebuild'
            ? 'Las diapositivas creadas desde plantilla se recomponen para el nuevo formato con tus datos del partido (se pierden ajustes manuales de posición). Las diapositivas libres se escalan.'
            : 'Todos los elementos se escalan y recolocan manteniendo tus ediciones. Puede requerir retoques.'}{' '}
          Puedes deshacer el cambio con Ctrl+Z.
        </p>
      </div>
    </Modal>
  )
}

export function ShortcutsDialog() {
  return (
    <Modal title="Atajos de teclado" onClose={() => useUI.getState().set({ modal: null })} width={520}>
      <div className="divide-y divide-line">
        {SHORTCUTS.map(([k, d]) => (
          <div key={k} className="flex items-center justify-between py-2 text-[13px]">
            <span className="text-ivory/85">{d}</span>
            <kbd className="rounded-md border border-line-2 bg-ink-2 px-2 py-0.5 font-mono text-[11px] text-gold">{k}</kbd>
          </div>
        ))}
      </div>
    </Modal>
  )
}

function ReplaceCard({ def, onPick }: { def: TemplateDef; onPick: () => void }) {
  const project = useEditor((s) => s.project)!
  const brand = useLibrary((s) => s.brand)
  const url = useTemplateThumb(def, project, brand, 200)
  return (
    <button type="button" className="group text-left" onClick={onPick}>
      <div className="overflow-hidden rounded-lg border border-line bg-ink-2 group-hover:border-gold" style={{ aspectRatio: `${project.format.width} / ${project.format.height}` }}>
        {url && <img src={url} alt="" className="h-full w-full object-cover" />}
      </div>
      <div className="mt-1 truncate text-[11px] font-semibold">
        <span className="text-gold">{String(def.number).padStart(2, '0')}</span> {def.name}
      </div>
      <div className="text-[10px] text-muted">{CATEGORY_LABELS[def.category]}</div>
    </button>
  )
}

export function ReplaceTemplateDialog() {
  const project = useEditor((s) => s.project)!
  const activeId = useEditor((s) => s.activeSlideId)
  const replaceSlide = useEditor((s) => s.replaceSlide)
  const close = () => useUI.getState().set({ modal: null })
  const cur = project.slides.find((s) => s.id === activeId) ?? project.slides[0]
  return (
    <Modal title="Cambiar la plantilla de esta diapositiva" onClose={close} width={860}>
      <p className="mb-3 text-[12px] text-muted">La diapositiva se reemplaza por la nueva plantilla con los mismos datos del partido. Puedes deshacer con Ctrl+Z.</p>
      <div className="grid grid-cols-5 gap-3">
        {TEMPLATES.map((def) => (
          <ReplaceCard
            key={def.id}
            def={def}
            onPick={() => {
              replaceSlide(cur.id, { ...buildTemplateSlide(def, project.format, project.match), overrides: cur.overrides })
              close()
            }}
          />
        ))}
      </div>
    </Modal>
  )
}
