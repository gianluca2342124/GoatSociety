import { useUI } from '../../store/ui'
import { Modal } from '../../ui/controls'
import { ExportPanel } from '../ExportPanel'

export function ExportDialog() {
  const close = () => useUI.getState().set({ modal: null })
  return (
    <Modal title="Descargar" onClose={close} width={560}>
      <ExportPanel onDone={close} />
    </Modal>
  )
}
