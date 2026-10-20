import { useRef } from 'react'
import { Check, CloudOff, Download, FilePlus2, FolderOpen, Frame, Keyboard, Loader2, Palette, PanelRight, Play, Redo2, Save, Undo2, Upload } from 'lucide-react'
import { useEditor } from '../store/editor'
import { useUI } from '../store/ui'
import { exportProjectFile, goHome, importProjectFile, saveNow } from '../store/projectService'
import { GoatGlyph } from '../ui/GoatGlyph'
import { FORMATS } from '../model/formats'

export function TopBar() {
  const project = useEditor((s) => s.project)!
  const canUndo = useEditor((s) => s.past.length > 0)
  const canRedo = useEditor((s) => s.future.length > 0)
  const update = useEditor((s) => s.update)
  const saveState = useUI((s) => s.saveState)
  const rightOpen = useUI((s) => s.rightOpen)
  const fileRef = useRef<HTMLInputElement>(null)
  return (
    <header className="flex h-[52px] shrink-0 items-center gap-1 border-b border-line bg-ink-2 px-2">
      <button type="button" className="flex items-center gap-2 rounded-lg px-2 py-1 hover:bg-white/5" onClick={() => void goHome()} title="Volver a mis proyectos" aria-label="Volver a mis proyectos">
        <GoatGlyph size={26} />
        <div className="hidden leading-none xl:block">
          <div className="font-cond text-[13px] font-extrabold tracking-[0.22em]">GOAT SOCIETY</div>
          <div className="font-cond text-[9px] font-bold tracking-[0.42em] text-gold">STUDIO</div>
        </div>
      </button>
      <div className="mx-1 h-6 w-px bg-line" />
      <button type="button" className="icon-btn" title="Nuevo proyecto" aria-label="Nuevo proyecto" onClick={() => useUI.getState().set({ modal: 'newProject', newProjectMode: 'carousel' })}>
        <FilePlus2 size={17} />
      </button>
      <button type="button" className="icon-btn" title="Abrir proyecto (mis proyectos)" aria-label="Abrir proyecto" onClick={() => void goHome()}>
        <FolderOpen size={17} />
      </button>
      <button type="button" className="icon-btn" title="Guardar (Ctrl+S)" aria-label="Guardar" onClick={() => void saveNow()}>
        <Save size={17} />
      </button>
      <button type="button" className="icon-btn" title="Exportar proyecto (.goat.json)" aria-label="Exportar archivo de proyecto" onClick={() => void exportProjectFile()}>
        <Download size={17} />
      </button>
      <button type="button" className="icon-btn" title="Importar proyecto (.goat.json)" aria-label="Importar archivo de proyecto" onClick={() => fileRef.current?.click()}>
        <Upload size={17} />
      </button>
      <input ref={fileRef} type="file" hidden accept=".json,application/json" onChange={(e) => (e.target.files?.[0] && void importProjectFile(e.target.files[0]), (e.target.value = ''))} />
      <div className="mx-1 h-6 w-px bg-line" />
      <button type="button" className="icon-btn" title="Deshacer (Ctrl+Z)" aria-label="Deshacer" disabled={!canUndo} onClick={() => useEditor.getState().undo()}>
        <Undo2 size={17} />
      </button>
      <button type="button" className="icon-btn" title="Rehacer (Ctrl+Shift+Z)" aria-label="Rehacer" disabled={!canRedo} onClick={() => useEditor.getState().redo()}>
        <Redo2 size={17} />
      </button>
      <div className="mx-1 h-6 w-px bg-line" />
      <input
        className="w-[220px] min-w-[80px] shrink rounded-md border border-transparent bg-transparent px-2 py-1 text-[13px] font-semibold outline-none hover:border-line focus:border-gold/60"
        aria-label="Nombre del proyecto"
        value={project.name}
        onChange={(e) => update((d) => void (d.name = e.target.value), { key: 'project-name' })}
      />
      <span className="flex items-center gap-1 text-[11px] text-muted" aria-live="polite" data-testid="save-state">
        {saveState === 'saving' && (
          <>
            <Loader2 size={12} className="spin" /> Guardando…
          </>
        )}
        {saveState === 'saved' && (
          <>
            <Check size={12} className="text-win" /> Guardado
          </>
        )}
        {saveState === 'error' && (
          <>
            <CloudOff size={12} className="text-loss" /> Error al guardar
          </>
        )}
      </span>
      <div className="flex-1" />
      <button type="button" className="btn btn-ghost text-[12px]" title="Tamaño del lienzo" onClick={() => useUI.getState().set({ modal: 'canvasSize' })}>
        <Frame size={15} /> <span className="hidden lg:inline">{FORMATS[project.format.preset].label}</span>
        <span className="hidden text-dim md:inline">{project.format.width}×{project.format.height}</span>
      </button>
      <button type="button" className="icon-btn" title="Kit de marca" aria-label="Kit de marca" onClick={() => useUI.getState().set({ leftTab: 'brand', panelOpen: true })}>
        <Palette size={17} />
      </button>
      <button type="button" className="icon-btn" title="Mostrar/ocultar propiedades" aria-label="Panel de propiedades" aria-pressed={rightOpen} data-active={rightOpen} onClick={() => useUI.getState().set({ rightOpen: !rightOpen })}>
        <PanelRight size={17} />
      </button>
      <button type="button" className="icon-btn" title="Atajos de teclado (?)" aria-label="Atajos de teclado" onClick={() => useUI.getState().set({ modal: 'shortcuts' })}>
        <Keyboard size={17} />
      </button>
      <button type="button" className="btn" onClick={() => useUI.getState().set({ modal: 'preview' })}>
        <Play size={14} /> <span className="hidden lg:inline">Vista previa</span>
      </button>
      <button type="button" className="btn btn-gold" data-testid="open-export" onClick={() => useUI.getState().set({ modal: 'export' })}>
        <Download size={14} /> Exportar
      </button>
    </header>
  )
}
