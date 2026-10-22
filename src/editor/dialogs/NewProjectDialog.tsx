import { useState } from 'react'
import { LayoutTemplate, Sparkles, Square } from 'lucide-react'
import type { FormatPreset, MatchData, TeamLibraryEntry } from '../../model/types'
import { FORMATS } from '../../model/formats'
import { sampleMatch, stat, team } from '../../model/defaults'
import { uid } from '../../model/ids'
import { useLibrary } from '../../store/library'
import { useUI } from '../../store/ui'
import { createProject } from '../../store/projectService'
import { TEMPLATES } from '../../templates'
import { Modal, Row, Select, Spinner, Toggle } from '../../ui/controls'

function TeamInput({ label, value, onChange, onPick }: { label: string; value: string; onChange: (v: string) => void; onPick: (t: TeamLibraryEntry) => void }) {
  const teams = useLibrary((s) => s.teams)
  const [open, setOpen] = useState(false)
  const list = teams.filter((t) => t.name.toLowerCase().includes(value.toLowerCase())).slice(0, 8)
  return (
    <Row label={label}>
      <div className="relative">
        <input className="field" aria-label={label} value={value} onFocus={() => setOpen(true)} onBlur={() => setTimeout(() => setOpen(false), 150)} onChange={(e) => (onChange(e.target.value), setOpen(true))} placeholder="Escribe o elige de la biblioteca" />
        {open && list.length > 0 && (
          <div className="absolute z-30 mt-1 max-h-52 w-full overflow-y-auto rounded-lg border border-line-2 bg-panel-2 p-1 shadow-2xl">
            {list.map((t) => (
              <button key={t.id} type="button" className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[12px] hover:bg-white/5" onMouseDown={(e) => e.preventDefault()} onClick={() => (onPick(t), setOpen(false))}>
                <span className="h-3.5 w-3.5 rounded-sm border border-white/20" style={{ background: `linear-gradient(135deg, ${t.primary} 50%, ${t.secondary} 50%)` }} />
                {t.name}
              </button>
            ))}
          </div>
        )}
      </div>
    </Row>
  )
}

const FORMAT_ORDER: FormatPreset[] = ['vertical', 'story', 'portrait', 'square', 'landscape']

export function NewProjectDialog() {
  const close = () => useUI.getState().set({ modal: null })
  const teams = useLibrary((s) => s.teams)
  const [mode, setMode] = useState<'carousel' | 'post' | 'empty'>(() => useUI.getState().newProjectMode)
  const [preset, setPreset] = useState<FormatPreset>('vertical')
  const [templateId, setTemplateId] = useState('matchday-elite')
  const [home, setHome] = useState('PSG')
  const [away, setAway] = useState('Barcelona')
  const [homeT, setHomeT] = useState<TeamLibraryEntry | null>(teams.find((t) => t.name === 'PSG') ?? null)
  const [awayT, setAwayT] = useState<TeamLibraryEntry | null>(teams.find((t) => t.name === 'Barcelona') ?? null)
  const [competition, setCompetition] = useState('Champions League')
  // Local calendar day (toISOString would give yesterday after local midnight in Europe).
  const [date, setDate] = useState(() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  })
  const [time, setTime] = useState('21:00')
  const [venue, setVenue] = useState('')
  const [sample, setSample] = useState(true)
  const [busy, setBusy] = useState(false)

  const buildMatch = (): MatchData => {
    const base = sampleMatch()
    const apply = (side: 'home' | 'away', name: string, t: TeamLibraryEntry | null) => {
      const cur = base[side]
      const lib = t && t.name === name ? t : null
      base[side] = {
        ...cur,
        ...team({ name }),
        players: sample ? cur.players : [],
        form: sample ? cur.form : [],
        formation: cur.formation,
        ...(lib ? { name: lib.name, shortName: lib.shortName, abbr: lib.abbr, primary: lib.primary, secondary: lib.secondary, crestAssetId: lib.crestAssetId, crestStyle: lib.crestStyle } : { shortName: name, primary: side === 'home' ? '#1E3A8A' : '#B91C1C', secondary: '#F3F0E8' }),
      }
    }
    apply('home', home.trim() || 'Local', homeT)
    apply('away', away.trim() || 'Visitante', awayT)
    base.competition = competition
    base.date = date
    base.time = time
    base.venue = venue
    // Linked to the team names, so renaming a team later updates the headline too.
    base.headline = '{home.short} vs [[{away.short}]]'
    // The sample pick names the away side of the sample data: point it at the chosen team.
    if (sample) base.predictions = base.predictions.map((p) => ({ ...p, pick: p.pick.replace('Barcelona', base.away.shortName) }))
    base.subheadline = 'Análisis y claves del partido'
    if (!sample) {
      base.stats = ['Goles por partido', 'Posesión', 'Tiros a puerta', 'xG por partido', 'Goles encajados'].map((l, i) => stat(l, null, null, i === 1 ? '%' : '', i === 1 ? 0 : 1, i === 4))
      base.predictions = [{ id: uid('pr'), market: 'Mercado', pick: 'Tu pronóstico', odds: '', confidence: 60, note: '' }]
      base.isSample = false
    }
    return base
  }

  const create = async () => {
    setBusy(true)
    try {
      await createProject({ name: `${home || 'Local'} vs ${away || 'Visitante'}`, preset, mode, templateId, match: buildMatch() })
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal
      title="Nuevo proyecto"
      onClose={close}
      width={720}
      footer={
        <>
          <button type="button" className="btn" onClick={close}>
            Cancelar
          </button>
          <button type="button" className="btn btn-gold min-w-[170px]" onClick={() => void create()} disabled={busy} data-testid="create-project">
            {busy ? <Spinner size={14} /> : <Sparkles size={15} />} Crear proyecto
          </button>
        </>
      }
    >
      <div className="space-y-5">
        <div className="grid grid-cols-3 gap-2">
          {(
            [
              ['carousel', 'Carrusel de partido', '7 diapositivas enlazadas listas para editar', Sparkles],
              ['post', 'Post único', 'Una diapositiva desde la plantilla que elijas', LayoutTemplate],
              ['empty', 'Lienzo libre', 'Solo el fondo de marca, diseña desde cero', Square],
            ] as const
          ).map(([k, title, desc, Icon]) => (
            <button key={k} type="button" data-testid={`mode-${k}`} onClick={() => setMode(k)} className={`rounded-xl border p-3 text-left transition ${mode === k ? 'border-gold bg-gold/10' : 'border-line hover:border-line-2'}`}>
              <Icon size={18} className={mode === k ? 'text-gold' : 'text-muted'} />
              <div className="mt-2 text-[13px] font-bold">{title}</div>
              <div className="mt-0.5 text-[11px] leading-snug text-muted">{desc}</div>
            </button>
          ))}
        </div>
        {mode === 'post' && <Select label="Plantilla" value={templateId} onChange={setTemplateId} options={TEMPLATES.map((t) => ({ value: t.id, label: `${String(t.number).padStart(2, '0')} · ${t.name}` }))} />}
        <Row label="Formato">
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
            {FORMAT_ORDER.map((p) => {
              const f = FORMATS[p]
              const r = f.width / f.height
              return (
                <button key={p} type="button" onClick={() => setPreset(p)} className={`flex flex-col items-center gap-2 rounded-xl border p-3 transition ${preset === p ? 'border-gold bg-gold/10' : 'border-line hover:border-line-2'}`} aria-pressed={preset === p}>
                  <div className="flex h-12 items-center">
                    <div className={`rounded-sm border-2 ${preset === p ? 'border-gold' : 'border-muted'}`} style={{ width: r >= 1 ? 44 : 44 * r, height: r >= 1 ? 44 / r : 44 }} />
                  </div>
                  <div className="text-[11px] font-semibold">{f.label}</div>
                  <div className="text-[10px] text-muted">{f.hint}</div>
                </button>
              )
            })}
          </div>
        </Row>
        <div className="grid grid-cols-2 gap-3">
          <TeamInput label="Equipo local" value={home} onChange={(v) => (setHome(v), setHomeT(null))} onPick={(t) => (setHome(t.name), setHomeT(t))} />
          <TeamInput label="Equipo visitante" value={away} onChange={(v) => (setAway(v), setAwayT(null))} onPick={(t) => (setAway(t.name), setAwayT(t))} />
          <Row label="Competición">
            <input className="field" aria-label="Competición" value={competition} onChange={(e) => setCompetition(e.target.value)} />
          </Row>
          <Row label="Estadio">
            <input className="field" aria-label="Estadio" value={venue} onChange={(e) => setVenue(e.target.value)} placeholder="Opcional" />
          </Row>
          <Row label="Fecha">
            <input type="date" className="field" aria-label="Fecha" value={date} onChange={(e) => setDate(e.target.value)} />
          </Row>
          <Row label="Hora">
            <input type="time" className="field" aria-label="Hora" value={time} onChange={(e) => setTime(e.target.value)} />
          </Row>
        </div>
        <Toggle label="Rellenar con datos de ejemplo ficticios (jugadores, cifras, pronósticos) para ver el diseño completo" checked={sample} onChange={setSample} />
      </div>
    </Modal>
  )
}
