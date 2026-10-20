import { Sparkles, Wand2 } from 'lucide-react'
import type { ColorValue, Intensity } from '../model/types'
import { ACCENTS, INTENSITIES } from '../model/brand'
import { applyEditorial } from '../model/editorial'
import { resolveColor, slideAccent, slideIntensity } from '../model/tokens'
import { useActiveSlide, useEditor } from '../store/editor'
import { useLibrary } from '../store/library'
import { useUI } from '../store/ui'
import { Section, Segmented } from '../ui/controls'

function Swatch({ color, label, active, onClick }: { color: string; label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      title={label}
      aria-label={`Acento ${label}`}
      aria-pressed={active}
      onClick={onClick}
      className={`flex h-9 flex-1 items-center justify-center rounded-lg border transition ${active ? 'border-ivory' : 'border-line hover:border-line-2'}`}
    >
      <span className="h-4 w-4 rounded-full" style={{ background: color }} />
    </button>
  )
}

/** Accent + visual intensity + "Aplicar GOAT EDITORIAL" for the active slide (and project). */
export function SlideStyleSection() {
  const slide = useActiveSlide()!
  const project = useEditor((s) => s.project)!
  const update = useEditor((s) => s.update)
  const brand = useLibrary((s) => s.brand)
  const own = slide.accent
  const effective = resolveColor('$accent', { match: project.match, brand, accent: slideAccent(project, slide) })
  const intensity = slideIntensity(project, slide)
  const setSlide = (patch: { accent?: ColorValue | null; intensity?: Intensity }) =>
    update((d) => {
      const s = d.slides.find((x) => x.id === slide.id)
      if (!s) return
      if (patch.accent !== undefined) {
        if (patch.accent === null) delete s.accent
        else s.accent = patch.accent
      }
      if (patch.intensity) s.intensity = patch.intensity
    })
  const applyToAll = () =>
    update((d) => {
      d.style = { ...(d.style ?? {}), accent: slide.accent ?? d.style?.accent, intensity }
      for (const s of d.slides) {
        delete s.accent
        delete s.intensity
      }
    })
  return (
    <Section title="Estilo GOAT EDITORIAL">
      <div>
        <div className="mb-1.5 flex items-center justify-between text-[11px] text-muted">
          <span>Acento de la diapositiva</span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: effective }} />
            {own ? 'Propio' : project.style?.accent ? 'Del proyecto' : 'De la marca'}
          </span>
        </div>
        <div className="flex gap-1.5" role="group" aria-label="Acento de la diapositiva">
          {ACCENTS.map((a) => (
            <Swatch key={a.id} color={a.color} label={a.label} active={own === a.token} onClick={() => setSlide({ accent: a.token })} />
          ))}
          <button type="button" className={`btn h-9 flex-1 px-1 text-[11px] ${!own ? 'border-ivory' : ''}`} title="Usar el acento del proyecto o de la marca" aria-pressed={!own} onClick={() => setSlide({ accent: null })}>
            Auto
          </button>
        </div>
      </div>
      <div>
        <div className="mb-1.5 text-[11px] text-muted">Intensidad visual</div>
        <Segmented<Intensity> ariaLabel="Intensidad visual" value={intensity} onChange={(v) => setSlide({ intensity: v })} options={INTENSITIES.map((i) => ({ value: i.id, label: i.label, title: i.hint }))} />
        <p className="mt-1.5 text-[11px] leading-snug text-dim">Mínimo deja solo el mensaje. Cinemático muestra la atmósfera (focos, grano). Nada se borra.</p>
      </div>
      <button
        type="button"
        className="btn btn-gold w-full text-[12px]"
        data-testid="apply-editorial"
        onClick={() => {
          update((d) => {
            const i = d.slides.findIndex((x) => x.id === slide.id)
            if (i >= 0) d.slides[i] = applyEditorial(d.slides[i] as typeof slide) as never
          })
          useUI.getState().toast('GOAT EDITORIAL aplicado a la diapositiva (puedes deshacer)', 'success')
        }}
      >
        <Wand2 size={14} /> Aplicar GOAT EDITORIAL
      </button>
      <div className="grid grid-cols-2 gap-1.5">
        <button
          type="button"
          className="btn text-[11px]"
          title="Aplica GOAT EDITORIAL a todas las diapositivas del proyecto"
          onClick={() => {
            if (!confirm('¿Aplicar GOAT EDITORIAL a todas las diapositivas? Puedes deshacerlo.')) return
            update((d) => {
              d.slides = d.slides.map((s) => applyEditorial(s as typeof slide)) as never
              d.style = { ...(d.style ?? {}), intensity: 'editorial' }
            })
            useUI.getState().toast('GOAT EDITORIAL aplicado a todo el proyecto', 'success')
          }}
        >
          <Sparkles size={13} /> Todo el proyecto
        </button>
        <button type="button" className="btn text-[11px]" title="Usa este acento e intensidad en todas las diapositivas" onClick={applyToAll}>
          Igualar todas
        </button>
      </div>
    </Section>
  )
}
