import { useRef, useState } from 'react'
import { Copy, Download, FileUp, LayoutTemplate, MoreHorizontal, Plus, Sparkles, Square, Trash2, WifiOff } from 'lucide-react'
import { useLibrary } from '../store/library'
import { useUI } from '../store/ui'
import { duplicateProject, exportProjectFile, importProjectFile, openProjectById, removeProject } from '../store/projectService'
import { loadProject } from '../db/projects'
import { GoatCanvas } from '../ui/GoatGlyph'
import { NewProjectDialog } from '../editor/dialogs/NewProjectDialog'
import { FORMATS } from '../model/formats'
import type { ProjectMeta } from '../db/db'

function timeAgo(ts: number): string {
  const d = (Date.now() - ts) / 1000
  if (d < 60) return 'hace un momento'
  if (d < 3600) return `hace ${Math.round(d / 60)} min`
  if (d < 86400) return `hace ${Math.round(d / 3600)} h`
  return new Date(ts).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })
}

function ProjectCard({ p }: { p: ProjectMeta }) {
  const [menu, setMenu] = useState(false)
  const ratio = p.format.width / p.format.height
  return (
    <div className="group relative" data-testid="project-card">
      <button type="button" onClick={() => void openProjectById(p.id)} className="block w-full overflow-hidden rounded-xl border border-line bg-panel transition hover:-translate-y-0.5 hover:border-gold/60 hover:shadow-[0_10px_40px_-10px_rgba(203,170,98,0.25)]" aria-label={`Abrir ${p.name}`}>
        <div className="flex aspect-[4/5] items-center justify-center bg-ink-2">
          {p.thumbnail ? <img src={p.thumbnail} alt="" className="max-h-full max-w-full object-contain" style={{ aspectRatio: `${ratio}` }} /> : <div className="text-[11px] text-dim">Sin miniatura</div>}
        </div>
      </button>
      <div className="mt-2 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="truncate text-[13px] font-semibold">{p.name}</div>
          <div className="text-[11px] text-muted">
            {p.slideCount} diap. · {FORMATS[p.format.preset]?.label ?? ''} · {timeAgo(p.updatedAt)}
          </div>
        </div>
        <button type="button" className="icon-btn h-7 w-7 shrink-0" aria-label="Más opciones" onClick={() => setMenu(!menu)}>
          <MoreHorizontal size={15} />
        </button>
      </div>
      {menu && (
        <div className="animate-in absolute right-0 z-20 mt-1 w-44 rounded-lg border border-line-2 bg-panel-2 p-1 shadow-2xl" onMouseLeave={() => setMenu(false)}>
          <button type="button" className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-[12px] hover:bg-white/5" onClick={() => (setMenu(false), void duplicateProject(p.id))}>
            <Copy size={13} /> Duplicar
          </button>
          <button
            type="button"
            className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-[12px] hover:bg-white/5"
            onClick={async () => {
              setMenu(false)
              const full = await loadProject(p.id)
              if (full) await exportProjectFile(full)
            }}
          >
            <Download size={13} /> Exportar .goat.json
          </button>
          <button type="button" className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-[12px] text-loss hover:bg-white/5" onClick={() => (setMenu(false), confirm(`¿Eliminar «${p.name}»? Esta acción no se puede deshacer.`) && void removeProject(p.id))}>
            <Trash2 size={13} /> Eliminar
          </button>
        </div>
      )}
    </div>
  )
}

export function Home() {
  const projects = useLibrary((s) => s.projects)
  const modal = useUI((s) => s.modal)
  const file = useRef<HTMLInputElement>(null)
  return (
    <div className="h-full overflow-y-auto">
      <section className="goat-grain relative overflow-hidden border-b border-line">
        <div className="pointer-events-none absolute inset-0" style={{ background: 'radial-gradient(ellipse 70% 90% at 78% 40%, rgba(100,28,42,0.55), transparent 60%), radial-gradient(ellipse 60% 80% at 20% 100%, rgba(16,62,52,0.5), transparent 60%), #08090B' }} />
        <div className="relative mx-auto flex max-w-[1240px] items-center gap-10 px-8 py-12 lg:py-16">
          <div className="max-w-[620px] flex-1">
            <div className="font-cond text-[13px] font-bold tracking-[0.5em] text-gold">GOAT SOCIETY</div>
            <h1 className="mt-3 font-display text-[64px] leading-[0.9] tracking-tight lg:text-[84px]">
              STUDIO<span className="text-gold">.</span>
            </h1>
            <p className="mt-5 max-w-[520px] text-[16px] leading-relaxed text-ivory/75">Tu sistema privado de producción de gráficos de fútbol. Carruseles de partido, estadísticas, pizarras tácticas y pronósticos con acabado premium en minutos.</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <button type="button" className="btn btn-gold px-5 py-3 text-[14px]" onClick={() => useUI.getState().set({ modal: 'newProject' })} data-testid="new-project">
                <Sparkles size={17} /> Nuevo carrusel de partido
              </button>
              <button type="button" className="btn px-5 py-3 text-[14px]" onClick={() => useUI.getState().set({ modal: 'newProject' })}>
                <LayoutTemplate size={16} /> Post único
              </button>
              <button type="button" className="btn px-5 py-3 text-[14px]" onClick={() => file.current?.click()}>
                <FileUp size={16} /> Importar proyecto
              </button>
              <input ref={file} type="file" hidden accept=".json,application/json" onChange={(e) => (e.target.files?.[0] && void importProjectFile(e.target.files[0], { applyBrand: false }), (e.target.value = ''))} />
            </div>
            <div className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-[12px] text-muted">
              <span className="flex items-center gap-1.5">
                <WifiOff size={13} className="text-gold" /> 100 % local · funciona sin conexión
              </span>
              <span className="flex items-center gap-1.5">
                <Square size={13} className="text-gold" /> Sin cuentas, sin suscripciones, sin marcas de agua
              </span>
            </div>
          </div>
          <div className="relative hidden shrink-0 md:block">
            <GoatCanvas width={340} height={430} options={{ variant: 'cinematic', base: '#4A4F57', shadow: '#050506', rim: '#EF4655', rimIntensity: 0.9, backlight: '#641C2A', backlightAmount: 1, eye: '#CBAA62', eyeGlow: 1, fog: 0.5, lightAngle: 75, fadeBottom: 0.15 }} />
          </div>
        </div>
      </section>
      <section className="mx-auto max-w-[1240px] px-8 py-10">
        <div className="mb-5 flex items-end justify-between">
          <div>
            <h2 className="font-cond text-[22px] font-bold tracking-wide uppercase">Mis proyectos</h2>
            <p className="text-[13px] text-muted">Guardados en este navegador. Exporta un .goat.json para hacer copia de seguridad o moverlos a otro equipo.</p>
          </div>
        </div>
        {projects.length === 0 ? (
          <div className="flex flex-col items-center rounded-2xl border border-dashed border-line-2 px-6 py-14 text-center">
            <GoatCanvas width={64} height={82} options={{ variant: 'icon', base: '#CBAA62' }} />
            <div className="mt-4 font-cond text-lg font-bold tracking-wide uppercase">Empieza tu primer carrusel</div>
            <p className="mt-1 max-w-[440px] text-[13px] text-muted">Elige dos equipos y GOAT SOCIETY STUDIO crea 7 diapositivas enlazadas: portada, cifras, táctica, jugadores, estadísticas, pronóstico bloqueado y comunidad.</p>
            <button type="button" className="btn btn-gold mt-6 px-5 py-2.5" onClick={() => useUI.getState().set({ modal: 'newProject' })}>
              <Plus size={16} /> Crear proyecto
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-5">
            <button type="button" className="flex aspect-[4/5] flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-line-2 text-muted transition hover:border-gold/60 hover:text-gold" onClick={() => useUI.getState().set({ modal: 'newProject' })}>
              <Plus size={26} />
              <span className="text-[13px] font-semibold">Nuevo proyecto</span>
            </button>
            {projects.map((p) => (
              <ProjectCard key={p.id} p={p} />
            ))}
          </div>
        )}
      </section>
      {modal === 'newProject' && <NewProjectDialog />}
    </div>
  )
}
