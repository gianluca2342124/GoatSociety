import { useState } from 'react'
import type { FormatPreset } from '../../model/types'
import { FORMATS } from '../../model/formats'
import { useEditor } from '../../store/editor'
import { useLibrary } from '../../store/library'
import { useUI } from '../../store/ui'
import { Modal, Segmented } from '../../ui/controls'
import { SHORTCUTS } from '../useShortcuts'
import { TEMPLATES } from '../../templates'
import { changeFormat, replacePageTemplate } from '../actions'
import { CATEGORY_LABELS } from '../../templates/types'
import { useTemplateThumb } from '../thumbs'
import type { TemplateDef } from '../../templates'

export function CanvasSizeDialog() {
  const project = useEditor((s) => s.project)!
  const close = () => useUI.getState().set({ modal: null })
  const [preset, setPreset] = useState<FormatPreset>(project.format.preset)
  const [mode, setMode] = useState<'rebuild' | 'scale'>('rebuild')
  const apply = () => {
    close()
    changeFormat(preset, mode)
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
            ? 'Las páginas de plantilla que no has tocado se recomponen para el nuevo formato con tus datos del partido. Las que has editado y las páginas libres se escalan para no perder tus cambios.'
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
  const close = () => useUI.getState().set({ modal: null })
  return (
    <Modal title="Cambiar la plantilla de esta diapositiva" onClose={close} width={860}>
      <p className="mb-3 text-[12px] text-muted">La diapositiva se reemplaza por la nueva plantilla con los mismos datos del partido. Puedes deshacer con Ctrl+Z.</p>
      <div className="grid grid-cols-5 gap-3">
        {TEMPLATES.map((def) => (
          <ReplaceCard
            key={def.id}
            def={def}
            onPick={() => {
              close()
              replacePageTemplate(def)
            }}
          />
        ))}
      </div>
    </Modal>
  )
}
