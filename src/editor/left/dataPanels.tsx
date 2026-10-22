import { useState } from 'react'
import { AlertTriangle, BookmarkPlus, RotateCcw, Search } from 'lucide-react'
import type { MatchOverrides, TeamData, TeamLibraryEntry } from '../../model/types'
import { useActiveSlide, useEditor } from '../../store/editor'
import { useLibrary } from '../../store/library'
import { useUI } from '../../store/ui'
import { Row, Section, Segmented, Select, TextField } from '../../ui/controls'
import { AgendaEditor, FormEditor, PlayersEditor, PredictionsEditor, ResultsEditor, StatRowsEditor } from '../data/editors'
import { AssetPicker } from '../props/common'
import { ScoreFields } from '../props/dataProps'
import { PanelTitle } from './contentPanels'
import { FORMATIONS } from '../../tactics/formations'
import { abbrOf, resolveColor, visibleOnDark } from '../../model/tokens'
import { uid } from '../../model/ids'

function SampleBanner() {
  const isSample = useEditor((s) => s.project?.match.isSample)
  const update = useEditor((s) => s.update)
  if (!isSample) return null
  return (
    <div className="mx-4 mb-2 flex gap-2 rounded-lg border border-[#F2B33D]/40 bg-[#F2B33D]/10 p-2.5 text-[11px] leading-snug text-[#F5CF7A]">
      <AlertTriangle size={14} className="mt-0.5 shrink-0" />
      <div>
        <b>Datos de ejemplo ilustrativos.</b> Jugadores, cifras y pronósticos son ficticios. Sustitúyelos antes de publicar.
        <button type="button" className="mt-1 block font-semibold underline" onClick={() => update((d) => void (d.match.isSample = false))}>
          Ya he introducido mis datos reales
        </button>
      </div>
    </div>
  )
}

type OverrideKey = keyof MatchOverrides

export function MatchPanel() {
  const project = useEditor((s) => s.project)!
  const slide = useActiveSlide()!
  const update = useEditor((s) => s.update)
  const [scope, setScope] = useState<'project' | 'slide'>('project')
  const m = project.match
  const o = slide.overrides

  const field = (key: OverrideKey, label: string, get: () => string, setProject: (v: string) => void, opts: { type?: 'date' | 'time'; multiline?: boolean } = {}) => {
    const overridden = o[key] !== undefined
    const value = scope === 'slide' ? (o[key] ?? get()) : get()
    const onChange = (v: string) => {
      if (scope === 'slide')
        update(
          (d) => {
            const s = d.slides.find((x) => x.id === slide.id)
            if (s) s.overrides[key] = v
          },
          { key: `ov-${slide.id}-${key}` },
        )
      else setProject(v)
    }
    return (
      <div className="relative">
        <Row label={label} hint={overridden ? (scope === 'slide' ? 'sobrescrito aquí' : 'esta diapositiva lo sobrescribe') : undefined}>
          {opts.type ? (
            <input type={opts.type} className="field" aria-label={label} value={value} onChange={(e) => onChange(e.target.value)} />
          ) : opts.multiline ? (
            <textarea className="field resize-y" rows={2} aria-label={label} value={value} onChange={(e) => onChange(e.target.value)} />
          ) : (
            <input className="field" aria-label={label} value={value} onChange={(e) => onChange(e.target.value)} />
          )}
        </Row>
        {overridden && scope === 'slide' && (
          <button
            type="button"
            className="absolute top-0 right-0 flex items-center gap-1 text-[10px] text-gold"
            onClick={() =>
              update((d) => {
                const s = d.slides.find((x) => x.id === slide.id)
                if (s) delete s.overrides[key]
              })
            }
          >
            <RotateCcw size={10} /> usar global
          </button>
        )}
      </div>
    )
  }
  const setM = (fn: (d: typeof m) => void, key: string) => update((d) => fn(d.match as typeof m), { key })
  return (
    <div>
      <PanelTitle title="Partido" sub="Defínelo una vez: todas las diapositivas vinculadas se actualizan." />
      <SampleBanner />
      <div className="px-4 pb-2">
        <Segmented
          value={scope}
          onChange={setScope}
          ariaLabel="Ámbito de edición"
          options={[
            { value: 'project', label: 'Todo el proyecto' },
            { value: 'slide', label: 'Solo esta diapositiva' },
          ]}
        />
      </div>
      <Section title="Enfrentamiento">
        {field('homeName', 'Equipo local', () => m.home.name, (v) => setM((d) => void ((d.home.name = v), (d.home.abbr = abbrOf(v))), 'm-home'))}
        {field('homeShort', 'Local (nombre corto)', () => m.home.shortName, (v) => setM((d) => void (d.home.shortName = v), 'm-homeshort'))}
        {field('awayName', 'Equipo visitante', () => m.away.name, (v) => setM((d) => void ((d.away.name = v), (d.away.abbr = abbrOf(v))), 'm-away'))}
        {field('awayShort', 'Visitante (nombre corto)', () => m.away.shortName, (v) => setM((d) => void (d.away.shortName = v), 'm-awayshort'))}
        <button type="button" className="btn w-full text-[12px]" onClick={() => useUI.getState().set({ leftTab: 'teams' })}>
          Escudos, colores y jugadores →
        </button>
      </Section>
      <Section title="Competición y horario">
        {field('competition', 'Competición', () => m.competition, (v) => setM((d) => void (d.competition = v), 'm-comp'))}
        {field('stage', 'Jornada / fase', () => m.stage, (v) => setM((d) => void (d.stage = v), 'm-stage'))}
        <div className="grid grid-cols-2 gap-2">
          {field('date', 'Fecha', () => m.date, (v) => setM((d) => void (d.date = v), 'm-date'), { type: 'date' })}
          {field('time', 'Hora', () => m.time, (v) => setM((d) => void (d.time = v), 'm-time'), { type: 'time' })}
        </div>
        {field('venue', 'Estadio', () => m.venue, (v) => setM((d) => void (d.venue = v), 'm-venue'))}
      </Section>
      <Section title="Resultado">
        <ScoreFields />
        <p className="-mt-1 text-[11px] text-dim">Rellénalo cuando termine el partido: lo usan los marcadores y las plantillas de resultado.</p>
      </Section>
      <Section title="Titulares">
        {field('headline', 'Titular principal', () => m.headline, (v) => setM((d) => void (d.headline = v), 'm-headline'), { multiline: true })}
        <p className="-mt-1 text-[11px] text-dim">Usa [[palabra]] para resaltar en color de acento.</p>
        {field('subheadline', 'Subtítulo', () => m.subheadline, (v) => setM((d) => void (d.subheadline = v), 'm-sub'))}
      </Section>
      <Section title="Notas" defaultOpen={false}>
        <TextField multiline rows={4} value={m.notes} onChange={(v) => setM((d) => void (d.notes = v), 'm-notes')} ariaLabel="Notas del partido" placeholder="Notas internas o fuente de los datos" />
      </Section>
    </div>
  )
}

function TeamPicker({ onPick }: { onPick: (t: TeamLibraryEntry) => void }) {
  const teams = useLibrary((s) => s.teams)
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)
  const list = teams.filter((t) => t.name.toLowerCase().includes(q.toLowerCase()) || t.abbr.toLowerCase().includes(q.toLowerCase())).slice(0, 40)
  return (
    <div className="relative">
      <div className="relative">
        <Search size={13} className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-dim" />
        <input className="field pl-8" placeholder="Buscar en la biblioteca de equipos…" aria-label="Buscar equipo" value={q} onFocus={() => setOpen(true)} onBlur={() => setTimeout(() => setOpen(false), 150)} onChange={(e) => setQ(e.target.value)} />
      </div>
      {open && list.length > 0 && (
        <div className="absolute z-30 mt-1 max-h-60 w-full overflow-y-auto rounded-lg border border-line-2 bg-panel-2 p-1 shadow-2xl">
          {list.map((t) => (
            <button
              key={t.id}
              type="button"
              className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[12px] hover:bg-white/5"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                onPick(t)
                setQ('')
                setOpen(false)
              }}
            >
              <span className="h-3.5 w-3.5 rounded-sm border border-white/20" style={{ background: `linear-gradient(135deg, ${t.primary} 50%, ${t.secondary} 50%)` }} />
              <span className="flex-1 truncate">{t.name}</span>
              <span className="text-[10px] text-dim">{t.abbr}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function TeamEditor({ side }: { side: 'home' | 'away' }) {
  const project = useEditor((s) => s.project)!
  const update = useEditor((s) => s.update)
  const upsertTeam = useLibrary((s) => s.upsertTeam)
  const teams = useLibrary((s) => s.teams)
  const toast = useUI((s) => s.toast)
  const team = project.match[side]
  const setT = (fn: (t: TeamData) => void, key: string) => update((d) => fn(d.match[side] as TeamData), { key: `${side}-${key}` })
  return (
    <>
      <Section title={side === 'home' ? 'Equipo local' : 'Equipo visitante'}>
        <TeamPicker
          onPick={(t) =>
            setT((d) => {
              d.name = t.name
              d.shortName = t.shortName
              d.abbr = t.abbr
              d.primary = t.primary
              d.secondary = t.secondary
              d.crestAssetId = t.crestAssetId
              d.crestStyle = { ...t.crestStyle }
            }, `pick-${t.id}`)
          }
        />
        <TextField label="Nombre" value={team.name} onChange={(v) => setT((d) => void (d.name = v), 'name')} />
        <div className="grid grid-cols-[1fr_80px] gap-2">
          <TextField label="Nombre corto" value={team.shortName} onChange={(v) => setT((d) => void (d.shortName = v), 'short')} />
          <TextField label="Siglas" value={team.abbr} onChange={(v) => setT((d) => void (d.abbr = v.toUpperCase().slice(0, 4)), 'abbr')} />
        </div>
        <div className="grid grid-cols-2 gap-2">
          {(['primary', 'secondary'] as const).map((k) => (
            <Row key={k} label={k === 'primary' ? 'Color principal' : 'Color secundario'}>
              <div className="flex items-center gap-1.5">
                <input type="color" className="h-8 w-9 cursor-pointer rounded-md border border-line bg-transparent" aria-label={k === 'primary' ? 'Color principal' : 'Color secundario'} value={team[k].slice(0, 7)} onChange={(e) => setT((d) => void (d[k] = e.target.value.toUpperCase()), k)} />
                <input className="field px-2 text-[11px]" aria-label={`${k} hex`} value={team[k]} onChange={(e) => setT((d) => void (d[k] = e.target.value), k)} />
              </div>
            </Row>
          ))}
        </div>
        <AssetPicker label="Escudo (se reemplaza en todas las diapositivas)" value={team.crestAssetId} uploadKind="crest" kinds={['crest', 'logo', 'other']} onChange={(id) => setT((d) => void (d.crestAssetId = id), 'crest')} />
        {!team.crestAssetId && (
          <div className="grid grid-cols-2 gap-2">
            <Select label="Escudo genérico: forma" value={team.crestStyle.shape} options={[{ value: 'shield', label: 'Escudo' }, { value: 'classic', label: 'Clásico' }, { value: 'round', label: 'Redondo' }, { value: 'hex', label: 'Hexágono' }, { value: 'diamond', label: 'Rombo' }]} onChange={(v) => setT((d) => void (d.crestStyle.shape = v), 'cshape')} />
            <Select label="Patrón" value={team.crestStyle.pattern} options={[{ value: 'solid', label: 'Liso' }, { value: 'stripes', label: 'Rayas' }, { value: 'halves', label: 'Mitades' }, { value: 'hoops', label: 'Aros' }, { value: 'sash', label: 'Banda' }, { value: 'chevron', label: 'Galón' }]} onChange={(v) => setT((d) => void (d.crestStyle.pattern = v), 'cpattern')} />
          </div>
        )}
        <div className="grid grid-cols-2 gap-2">
          <Select label="Formación" value={team.formation} options={FORMATIONS.map((f) => ({ value: f, label: f }))} onChange={(v) => setT((d) => void (d.formation = v), 'formation')} />
          <TextField label="Entrenador" value={team.coach} onChange={(v) => setT((d) => void (d.coach = v), 'coach')} />
        </div>
        <Row label="Forma reciente (más reciente primero)">
          <FormEditor value={team.form} onChange={(f) => setT((d) => void (d.form = f), 'form')} />
        </Row>
        <button
          type="button"
          className="btn w-full text-[12px]"
          onClick={async () => {
            const existing = teams.find((t) => t.name.toLowerCase() === team.name.toLowerCase())
            await upsertTeam({ id: existing?.id ?? uid('tm'), name: team.name, shortName: team.shortName, abbr: team.abbr, primary: team.primary, secondary: team.secondary, crestAssetId: team.crestAssetId, crestStyle: team.crestStyle })
            toast(`${team.name} guardado en la biblioteca de equipos`, 'success')
          }}
        >
          <BookmarkPlus size={13} /> Guardar en la biblioteca
        </button>
      </Section>
      <Section title={`Jugadores · ${team.shortName || team.name}`} defaultOpen={false}>
        <PlayersEditor players={team.players} onChange={(p) => setT((d) => void (d.players = p), 'players')} />
      </Section>
    </>
  )
}

export function TeamsPanel() {
  const [side, setSide] = useState<'home' | 'away'>('home')
  const match = useEditor((s) => s.project!.match)
  return (
    <div>
      <PanelTitle title="Equipos" sub="Escudos, colores, forma y jugadores. Elige de tu biblioteca o escribe libremente." />
      <SampleBanner />
      <div className="px-4 pb-2">
        <Segmented value={side} onChange={setSide} options={[{ value: 'home', label: match.home.shortName || 'Local' }, { value: 'away', label: match.away.shortName || 'Visitante' }]} />
      </div>
      <TeamEditor key={side} side={side} />
    </div>
  )
}

export function StatsPanel() {
  const project = useEditor((s) => s.project)!
  const update = useEditor((s) => s.update)
  const brand = useLibrary((s) => s.brand)
  const m = project.match
  const hc = visibleOnDark(resolveColor('$home', { match: m, brand }))
  const ac = visibleOnDark(resolveColor('$away', { match: m, brand }))
  return (
    <div>
      <PanelTitle title="Estadísticas" sub="Introduce tus datos. Las barras se recalculan al instante en todas las diapositivas." />
      <SampleBanner />
      <Section title="Comparativa del partido">
        <StatRowsEditor rows={m.stats} onChange={(rows) => update((d) => void (d.match.stats = rows), { key: 'stats' })} homeLabel={m.home.shortName || m.home.name} awayLabel={m.away.shortName || m.away.name} homeColor={hc} awayColor={ac} />
      </Section>
      <Section title="Pronósticos" defaultOpen={false}>
        <PredictionsEditor items={m.predictions} onChange={(p) => update((d) => void (d.match.predictions = p), { key: 'predictions' })} />
      </Section>
      <Section title="Historial de resultados" defaultOpen={false}>
        <ResultsEditor items={project.results} onChange={(r) => update((d) => void (d.results = r), { key: 'results' })} />
      </Section>
      <Section title="Agenda de partidos" defaultOpen={false}>
        <AgendaEditor items={project.agenda} onChange={(a) => update((d) => void (d.agenda = a), { key: 'agenda' })} />
      </Section>
      <Section title="Ayuda rápida" defaultOpen={false}>
        <p className="text-[12px] leading-relaxed text-muted">
          Ejemplo: Barcelona <b>5,43</b> · Getafe <b>1,57</b>. La barra mayor ocupa el ancho completo y la otra se escala en proporción. Valores vacíos se muestran como «—»; negativos o no numéricos no dibujan barra.
        </p>
      </Section>
    </div>
  )
}
