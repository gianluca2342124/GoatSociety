import { useEffect, useState } from 'react'
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react'
import { useUI } from './store/ui'
import { useIsMobile } from './ui/useMedia'
import { useLibrary } from './store/library'
import { useEditor } from './store/editor'
import { preloadAllFonts } from './fonts/fonts'
import { clearLayoutCache } from './render/text/layout'
import { clearBitmapCache } from './render/paint/bitmapCache'
import { hasPendingSave, startAutosave } from './store/projectService'
import { Home } from './home/Home'
import { Editor } from './editor/Editor'
import { GoatCanvas } from './ui/GoatGlyph'

function Toasts() {
  const all = useUI((s) => s.toasts)
  const dismiss = useUI((s) => s.dismiss)
  const mobile = useIsMobile()
  // Phones: one toast at a time, under the top bar, never over the tools.
  const toasts = mobile ? all.slice(-1) : all
  return (
    <div className={`toast-stack pointer-events-none fixed z-[90] flex flex-col gap-2 ${mobile ? 'inset-x-3 top-[calc(58px+env(safe-area-inset-top))] items-center' : 'right-4 bottom-4'}`} aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className="animate-in pointer-events-auto flex max-w-[380px] items-start gap-2 rounded-xl border border-line-2 bg-panel-2/95 px-3.5 py-2.5 text-[13px] shadow-2xl backdrop-blur" role={t.kind === 'error' ? 'alert' : 'status'} data-testid="toast">
          {t.kind === 'success' ? <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-win" /> : t.kind === 'error' ? <AlertCircle size={16} className="mt-0.5 shrink-0 text-loss" /> : <Info size={16} className="mt-0.5 shrink-0 text-gold" />}
          <span className="flex-1 leading-snug">{t.text}</span>
          {t.action && (
            <button type="button" className="-my-1 shrink-0 rounded-md px-2 py-1 font-semibold text-gold hover:bg-white/5" data-testid="toast-action" onClick={() => (t.action!.run(), dismiss(t.id))}>
              {t.action.label}
            </button>
          )}
          <button type="button" className="text-muted hover:text-ivory" aria-label="Cerrar aviso" onClick={() => dismiss(t.id)}>
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  )
}

function Loading({ error }: { error: string | null }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-5">
      <GoatCanvas width={120} height={154} options={{ variant: 'cinematic', base: '#4A4F57', rim: '#CBAA62', rimIntensity: 0.7, backlight: '#641C2A', backlightAmount: 0.8, eye: '#CBAA62', eyeGlow: 0.9, fog: 0 }} />
      <div className="font-cond text-[13px] font-bold tracking-[0.5em] text-gold">GOAT SOCIETY STUDIO</div>
      {error ? <div className="max-w-md text-center text-[13px] text-loss">{error}</div> : <div className="text-[12px] text-muted">Preparando tu estudio…</div>}
    </div>
  )
}

export function App() {
  const view = useUI((s) => s.view)
  const ready = useLibrary((s) => s.ready)
  const hasProject = useEditor((s) => !!s.project)
  const [fontsReady, setFontsReady] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const stop = startAutosave()
    useLibrary
      .getState()
      .init()
      .catch((e) => setError(`No se pudo abrir el almacenamiento local (IndexedDB). ${e instanceof Error ? e.message : ''} Comprueba que el navegador no esté en modo privado estricto.`))
    preloadAllFonts()
      .catch(() => undefined)
      .finally(() => {
        clearLayoutCache()
        clearBitmapCache()
        setFontsReady(true)
      })
    const before = (e: BeforeUnloadEvent) => {
      if (hasPendingSave()) {
        e.preventDefault()
        e.returnValue = ''
      }
    }
    window.addEventListener('beforeunload', before)
    return () => {
      stop()
      window.removeEventListener('beforeunload', before)
    }
  }, [])

  if (!ready || !fontsReady) return <Loading error={error} />
  return (
    <>
      {view === 'editor' && hasProject ? <Editor /> : <Home />}
      <Toasts />
    </>
  )
}
