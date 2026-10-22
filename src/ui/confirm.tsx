// In-app confirmation for the few actions that can't be undone (deleting a
// project or a library file). Native confirm() is unreliable in embedded
// viewers, and everything undoable uses a «Deshacer» toast instead.
import { create } from 'zustand'
import { Modal } from './controls'

interface ConfirmRequest {
  title: string
  body: string
  confirmLabel: string
  danger?: boolean
  /** A third button that runs without closing (e.g. «Exportar copia» before leaving). */
  extra?: { label: string; run: () => void }
  resolve: (ok: boolean) => void
}

const useConfirm = create<{ req: ConfirmRequest | null }>(() => ({ req: null }))

/** A confirmation is on screen: the editor's keyboard shortcuts stay out of it. */
export function isConfirmOpen(): boolean {
  return useConfirm.getState().req !== null
}

export function askConfirm(opts: Omit<ConfirmRequest, 'resolve'>): Promise<boolean> {
  useConfirm.getState().req?.resolve(false)
  return new Promise((resolve) => useConfirm.setState({ req: { ...opts, resolve } }))
}

export function ConfirmHost() {
  const req = useConfirm((s) => s.req)
  if (!req) return null
  const answer = (ok: boolean) => {
    useConfirm.setState({ req: null })
    req.resolve(ok)
  }
  return (
    <Modal
      title={req.title}
      width={420}
      onClose={() => answer(false)}
      footer={
        <>
          {req.extra && (
            <button type="button" className="btn btn-gold min-h-10 sm:mr-auto" onClick={req.extra.run} data-testid="confirm-extra">
              {req.extra.label}
            </button>
          )}
          {/* With a destructive answer, Enter keeps the safe choice. */}
          <button type="button" className="btn btn-ghost min-h-10" onClick={() => answer(false)} data-testid="confirm-cancel" autoFocus={!!req.danger}>
            Cancelar
          </button>
          <button type="button" className={`btn min-h-10 ${req.danger ? 'border-loss/60 bg-loss/15 text-loss' : 'btn-gold'}`} onClick={() => answer(true)} data-testid="confirm-ok" autoFocus={!req.danger}>
            {req.confirmLabel}
          </button>
        </>
      }
    >
      <p className="text-[14px] leading-relaxed text-ivory/85">{req.body}</p>
    </Modal>
  )
}
