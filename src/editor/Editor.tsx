import { TopBar } from './TopBar'
import { LeftSidebar } from './left/LeftSidebar'
import { RightPanel } from './RightPanel'
import { SlideStrip } from './SlideStrip'
import { ZoomBar } from './ZoomBar'
import { EditorCanvas } from './canvas/EditorCanvas'
import { useShortcuts } from './useShortcuts'
import { useUI } from '../store/ui'
import { ExportDialog } from './dialogs/ExportDialog'
import { PreviewModal } from './dialogs/PreviewModal'
import { NewProjectDialog } from './dialogs/NewProjectDialog'
import { CanvasSizeDialog, ReplaceTemplateDialog, ShortcutsDialog } from './dialogs/MiscDialogs'
import { useEditor } from '../store/editor'
import { TacticsToolbar } from './props/tacticsProps'
import { useIsMobile } from '../ui/useMedia'
import { MobileEditor } from '../mobile/MobileEditor'

function TacticsHint() {
  const id = useUI((s) => s.tacticsEditId)
  if (!id) return null
  return (
    <div className="pointer-events-auto absolute top-3 left-1/2 z-10 w-[340px] -translate-x-1/2 rounded-xl border border-gold/40 bg-panel/95 p-2 shadow-xl backdrop-blur">
      <div className="mb-1.5 flex items-center justify-between px-1">
        <span className="label-xs text-gold">Edición táctica</span>
        <button type="button" className="text-[11px] text-muted hover:text-ivory" onClick={() => useUI.getState().set({ tacticsEditId: null, tacticsSel: null, tacticsTool: 'select' })}>
          Terminar (Esc)
        </button>
      </div>
      <TacticsToolbar />
    </div>
  )
}

function Modals() {
  const modal = useUI((s) => s.modal)
  return (
    <>
      {modal === 'export' && <ExportDialog />}
      {modal === 'preview' && <PreviewModal />}
      {modal === 'newProject' && <NewProjectDialog />}
      {modal === 'canvasSize' && <CanvasSizeDialog />}
      {modal === 'shortcuts' && <ShortcutsDialog />}
      {modal === 'replaceTemplate' && <ReplaceTemplateDialog />}
    </>
  )
}

export function Editor() {
  useShortcuts()
  const mobile = useIsMobile()
  if (mobile)
    return (
      <>
        <MobileEditor />
        <Modals />
      </>
    )
  return <DesktopEditor />
}

function DesktopEditor() {
  const hasSlide = useEditor((s) => (s.project?.slides.length ?? 0) > 0)
  return (
    <div className="flex h-full flex-col">
      <TopBar />
      <div className="flex min-h-0 flex-1">
        <LeftSidebar />
        <main className="relative flex min-w-0 flex-1 flex-col">
          <div className="relative min-h-0 flex-1">
            {hasSlide && <EditorCanvas />}
            <ZoomBar />
            <TacticsHint />
          </div>
          <SlideStrip />
        </main>
        <RightPanel />
      </div>
      <Modals />
    </div>
  )
}
