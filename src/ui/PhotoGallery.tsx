// Manual «Guardar en Fotos»: the exported pages full screen, ready to be
// pressed and held («Añadir a Fotos» on iPhone, «Descargar imagen» on Android).
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { closePhotoGallery, usePhotoGallery } from '../editor/saveToPhotos'

export function PhotoGallery() {
  const images = usePhotoGallery((s) => s.images)
  if (!images) return null
  return createPortal(
    <div className="fixed inset-0 z-[85] flex flex-col bg-black" role="dialog" aria-modal="true" aria-label="Guardar en Fotos" data-testid="photo-gallery">
      <header className="flex items-start gap-3 border-b border-white/10 pt-[calc(12px+var(--edge-top))] pr-[calc(16px+var(--edge-right))] pb-3 pl-[calc(16px+var(--edge-left))]">
        <div className="min-w-0 flex-1">
          <h2 className="font-cond text-[19px] font-bold tracking-wide uppercase">Guardar en Fotos</h2>
          <p className="mt-0.5 text-[13px] leading-snug text-ivory/80">
            Mantén pulsada cada imagen y elige <b className="text-gold">«Añadir a Fotos»</b> (iPhone) o <b className="text-gold">«Descargar imagen»</b> (Android).
          </p>
        </div>
        <button type="button" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/10" aria-label="Cerrar" onClick={closePhotoGallery} data-testid="photo-gallery-close">
          <X size={20} />
        </button>
      </header>
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-4 py-4 pb-[calc(16px+var(--edge-bottom))]">
        {images.map((img, i) => (
          <figure key={img.name} className="space-y-1.5">
            <img src={img.url} alt={`Página ${i + 1}`} className="photo-saveable mx-auto block w-full max-w-[520px] rounded-lg" />
            <figcaption className="text-center text-[11px] text-dim">
              {i + 1} / {images.length} · {img.name}
            </figcaption>
          </figure>
        ))}
      </div>
    </div>,
    document.body,
  )
}
