import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { ChevronLeft, ChevronRight, Heart, MessageCircle, Monitor, Music2, ScanLine, Share2, Smartphone, X } from 'lucide-react'
import { platformZones } from '../../model/formats'
import { useEditor } from '../../store/editor'
import { useLibrary } from '../../store/library'
import { useUI } from '../../store/ui'
import { renderSlideCanvas } from '../../render/exporter'
import { Spinner } from '../../ui/controls'
import { useIsMobile } from '../../ui/useMedia'

export function PreviewModal() {
  return useIsMobile() ? <MobilePreview /> : <DesktopPreview />
}

/** Phone preview: the page full-screen, swipe between pages, tap to hide the chrome. */
function MobilePreview() {
  const project = useEditor((s) => s.project)!
  const activeId = useEditor((s) => s.activeSlideId)
  const brand = useLibrary((s) => s.brand)
  const n = project.slides.length
  const [i, setI] = useState(Math.max(0, project.slides.findIndex((s) => s.id === activeId)))
  const [urls, setUrls] = useState<Record<string, string>>({})
  const [chrome, setChrome] = useState(true)
  const [dx, setDx] = useState(0)
  const start = useRef<{ x: number; y: number; t: number } | null>(null)
  const close = () => useUI.getState().set({ modal: null })
  const slide = project.slides[i]

  // Render the current page first, then its neighbours so swiping feels instant.
  useEffect(() => {
    let alive = true
    const scale = Math.min(1, (window.innerWidth * Math.min(2, window.devicePixelRatio || 1)) / project.format.width)
    const order = [i, i + 1, i - 1].filter((k) => k >= 0 && k < n)
    void (async () => {
      for (const k of order) {
        const s = project.slides[k]
        const c = await renderSlideCanvas(project, s, brand, { scale, transparent: false, format: 'png' })
        if (!alive) return
        const url = c.toDataURL('image/jpeg', 0.9)
        setUrls((u) => ({ ...u, [s.id]: url }))
      }
    })()
    return () => {
      alive = false
    }
  }, [i, project, brand, n])

  const go = (d: number) => setI((v) => Math.min(n - 1, Math.max(0, v + d)))
  const onTouchStart = (e: React.TouchEvent) => {
    // Taps on the arrows and dots are buttons, not swipes or «hide controls» taps.
    if ((e.target as Element).closest('button')) return
    const t = e.touches[0]
    start.current = { x: t.clientX, y: t.clientY, t: Date.now() }
  }
  const onTouchMove = (e: React.TouchEvent) => {
    if (!start.current) return
    const d = e.touches[0].clientX - start.current.x
    setDx((i === 0 && d > 0) || (i === n - 1 && d < 0) ? d / 3 : d)
  }
  const onTouchEnd = (e: React.TouchEvent) => {
    const s0 = start.current
    start.current = null
    setDx(0)
    if (!s0) return
    const t = e.changedTouches[0]
    const ddx = t.clientX - s0.x
    const ddy = t.clientY - s0.y
    if (Math.abs(ddx) > 50 && Math.abs(ddx) > Math.abs(ddy)) go(ddx < 0 ? 1 : -1)
    else if (ddy > 110 && Math.abs(ddy) > Math.abs(ddx)) close()
    else if (Math.abs(ddx) < 8 && Math.abs(ddy) < 8 && Date.now() - s0.t < 300) setChrome((c) => !c)
  }
  const url = urls[slide.id]
  return createPortal(
    <div className="fixed inset-0 z-[75] flex flex-col bg-black select-none" role="dialog" aria-modal="true" aria-label="Vista previa" data-testid="m-preview-screen">
      <div className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden" onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}>
        <div className="flex h-full w-full items-center justify-center" style={{ transform: `translateX(${dx}px)`, transition: dx ? 'none' : 'transform 0.2s ease-out' }}>
          {url ? (
            <img src={url} alt={`Página ${i + 1}`} className="max-h-full max-w-full object-contain" draggable={false} data-testid="preview-frame" />
          ) : (
            <Spinner size={28} />
          )}
        </div>
        {chrome && i > 0 && (
          <button type="button" aria-label="Anterior" className="absolute top-1/2 left-2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-black/45 text-white" onClick={() => go(-1)}>
            <ChevronLeft size={22} />
          </button>
        )}
        {chrome && i < n - 1 && (
          <button type="button" aria-label="Siguiente" className="absolute top-1/2 right-2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-black/45 text-white" onClick={() => go(1)}>
            <ChevronRight size={22} />
          </button>
        )}
      </div>
      {chrome && (
        <>
          <div className="pointer-events-none absolute inset-x-0 top-0 flex items-center justify-between px-3 pt-[calc(10px+var(--edge-top))]">
            <span className="rounded-full bg-black/55 px-3 py-1.5 text-[13px] font-semibold text-white tabular-nums">
              {i + 1} / {n}
            </span>
            <button type="button" className="pointer-events-auto flex h-11 w-11 items-center justify-center rounded-full bg-black/55 text-white" aria-label="Cerrar vista previa" onClick={close} data-testid="m-preview-close">
              <X size={20} />
            </button>
          </div>
          <div className="flex justify-center gap-1.5 pt-3 pb-[calc(14px+var(--edge-bottom))]">
            {project.slides.map((s, k) => (
              <button key={s.id} type="button" aria-label={`Ir a la página ${k + 1}`} onClick={() => setI(k)} className="flex h-9 items-center px-1">
                <span className={`block h-1.5 rounded-full transition-all ${k === i ? 'w-6 bg-white' : 'w-1.5 bg-white/35'}`} />
              </button>
            ))}
          </div>
        </>
      )}
    </div>,
    document.body,
  )
}

function DesktopPreview() {
  const project = useEditor((s) => s.project)!
  const activeId = useEditor((s) => s.activeSlideId)
  const brand = useLibrary((s) => s.brand)
  const [i, setI] = useState(Math.max(0, project.slides.findIndex((s) => s.id === activeId)))
  const [url, setUrl] = useState('')
  const [phone, setPhone] = useState(false)
  // Real mobile-feed size: the slide at ≈390 CSS px wide, like on a phone.
  const [real, setReal] = useState(true)
  const [guides, setGuides] = useState(false)
  const close = () => useUI.getState().set({ modal: null })
  const n = project.slides.length
  useEffect(() => {
    let alive = true
    setUrl('')
    const scale = Math.min(1, Math.max((window.innerHeight * 1.6) / project.format.height, (400 * (window.devicePixelRatio || 1)) / project.format.width))
    void renderSlideCanvas(project, project.slides[i], brand, { scale, transparent: false, format: 'png' }).then((c) => alive && setUrl(c.toDataURL('image/jpeg', 0.92)))
    return () => {
      alive = false
    }
  }, [i, project, brand])
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
      if (e.key === 'ArrowRight') setI((v) => Math.min(n - 1, v + 1))
      if (e.key === 'ArrowLeft') setI((v) => Math.max(0, v - 1))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [n])
  const ratio = project.format.width / project.format.height
  const story = project.format.preset === 'story'
  return createPortal(
    <div className="fixed inset-0 z-[75] flex flex-col bg-ink" role="dialog" aria-modal="true" aria-label="Vista previa">
      <div className="flex items-center justify-between px-5 py-3">
        <div className="font-cond text-sm font-bold tracking-[0.2em] text-muted uppercase">
          Vista previa · {String(i + 1).padStart(2, '0')} / {String(n).padStart(2, '0')}
        </div>
        <div className="flex items-center gap-2">
          <button type="button" className="btn" data-active={real} aria-pressed={real} title="Muestra la diapositiva a ≈390 px de ancho, el tamaño real en un móvil" onClick={() => setReal(!real)}>
            {real ? <Smartphone size={14} /> : <Monitor size={14} />} {real ? 'Tamaño real (móvil)' : 'Ajustar a pantalla'}
          </button>
          <button type="button" className="btn" data-active={guides} aria-pressed={guides} title="Zonas que tapa la interfaz de TikTok / Instagram (no se exporta)" onClick={() => setGuides(!guides)}>
            <ScanLine size={14} /> Zonas seguras
          </button>
          <button type="button" className="btn" data-active={phone} aria-pressed={phone} onClick={() => setPhone(!phone)}>
            <Smartphone size={14} /> {phone ? 'Ocultar interfaz' : 'Simular interfaz'}
          </button>
          <button type="button" className="icon-btn" aria-label="Cerrar vista previa" onClick={close}>
            <X size={18} />
          </button>
        </div>
      </div>
      <div className="relative flex min-h-0 flex-1 items-center justify-center gap-6 px-6 pb-6">
        <button type="button" className="icon-btn h-12 w-12 rounded-full border border-line" aria-label="Anterior" disabled={i === 0} onClick={() => setI(i - 1)}>
          <ChevronLeft size={22} />
        </button>
        <div
          className={real ? 'relative shrink-0 overflow-hidden rounded-[30px] bg-ink shadow-2xl ring-[9px] ring-[#1b1b1d]' : 'relative h-full max-h-[86vh] overflow-hidden rounded-[18px] bg-ink shadow-2xl ring-1 ring-white/10'}
          style={real ? { width: 390, height: 390 / ratio, maxHeight: '84vh', aspectRatio: `${ratio}` } : { aspectRatio: `${ratio}` }}
          data-testid="preview-frame"
        >
          {url ? <img src={url} alt={`Diapositiva ${i + 1}`} className="h-full w-full object-contain" /> : <div className="flex h-full w-full items-center justify-center"><Spinner size={28} /></div>}
          {guides && (
            <div className="pointer-events-none absolute inset-0">
              {platformZones(project.format).map((z, k) => (
                <div
                  key={k}
                  className="absolute flex items-start bg-[rgba(255,64,85,0.18)] p-1 text-[9px] font-semibold tracking-wide text-[#ffc4cb] uppercase outline outline-1 outline-[rgba(255,64,85,0.55)]"
                  style={{ left: `${(z.x / project.format.width) * 100}%`, top: `${(z.y / project.format.height) * 100}%`, width: `${(z.w / project.format.width) * 100}%`, height: `${(z.h / project.format.height) * 100}%` }}
                >
                  {z.label}
                </div>
              ))}
            </div>
          )}
          {phone && (
            <div className="pointer-events-none absolute inset-0 text-white">
              <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-black/50 to-transparent" />
              <div className="absolute top-4 flex w-full justify-center gap-5 text-[13px] font-semibold">
                <span className="opacity-60">Siguiendo</span>
                <span className="border-b-2 border-white pb-1">Para ti</span>
              </div>
              <div className="absolute right-3 bottom-[22%] flex flex-col items-center gap-5">
                {[Heart, MessageCircle, Share2].map((Icon, k) => (
                  <div key={k} className="flex flex-col items-center gap-1 text-[10px]">
                    <Icon size={26} fill="white" />
                    <span>{['12,4 K', '318', 'Compartir'][k]}</span>
                  </div>
                ))}
              </div>
              <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-black/70 to-transparent" />
              <div className="absolute bottom-6 left-4 right-20 space-y-1 text-[12px]">
                <div className="font-bold">{brand.handle}</div>
                <div className="opacity-85">Análisis {project.match.home.name} vs {project.match.away.name} ⚽️ #football</div>
                <div className="flex items-center gap-1 opacity-80">
                  <Music2 size={12} /> sonido original
                </div>
              </div>
              <div className="absolute top-12 left-3 rounded bg-black/60 px-2 py-0.5 text-[10px]">{story ? 'Simulación TikTok' : 'Simulación'} · no se exporta</div>
            </div>
          )}
        </div>
        <button type="button" className="icon-btn h-12 w-12 rounded-full border border-line" aria-label="Siguiente" disabled={i === n - 1} onClick={() => setI(i + 1)}>
          <ChevronRight size={22} />
        </button>
      </div>
      {real && <p className="-mt-3 pb-2 text-center text-[11px] text-dim">Tamaño real de un móvil (≈390 px de ancho). Si se lee aquí en 2 segundos, funciona en el feed.</p>}
      <div className="flex justify-center gap-1.5 pb-5">
        {project.slides.map((s, k) => (
          <button key={s.id} type="button" aria-label={`Ir a diapositiva ${k + 1}`} onClick={() => setI(k)} className={`h-1.5 rounded-full transition-all ${k === i ? 'w-6 bg-gold' : 'w-1.5 bg-white/30'}`} />
        ))}
      </div>
    </div>,
    document.body,
  )
}
