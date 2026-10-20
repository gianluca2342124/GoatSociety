import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react'
import type {
  FormRowElement,
  MatchListElement,
  PlayerListElement,
  PredictionElement,
  ProbabilityElement,
  ProgressRingElement,
  RankingElement,
  ResultsListElement,
  StatBarsElement,
  StatNumberElement,
  TableElement,
} from '../../model/types'
import { useEditor } from '../../store/editor'
import { useLibrary } from '../../store/library'
import { useUI } from '../../store/ui'
import { resolveColor } from '../../model/tokens'
import { ColorField, EmptyHint, FontSelect, NumberField, Row, Section, Segmented, Select, Slider, TextField, Toggle } from '../../ui/controls'
import { useElementSetter } from './common'
import { uid } from '../../model/ids'
import { FormEditor, StatRowsEditor, TableEditor } from '../data/editors'

function GoToData({ tab, label }: { tab: 'stats' | 'teams' | 'match'; label: string }) {
  return (
    <button type="button" className="btn w-full text-[12px]" onClick={() => useUI.getState().set({ leftTab: tab, panelOpen: true })}>
      {label}
    </button>
  )
}

export function StatBarsProps({ el }: { el: StatBarsElement }) {
  const set = useElementSetter(el)
  const match = useEditor((s) => s.project!.match)
  const brand = useLibrary((s) => s.brand)
  const c = (v: string) => resolveColor(v, { match, brand })
  return (
    <>
      <Section title="Datos">
        <Row label="Origen">
          <Segmented
            value={el.source}
            onChange={(v) => set({ source: v, rows: v === 'custom' && el.rows.length === 0 ? structuredClone(match.stats.slice(0, 4)) : el.rows })}
            options={[
              { value: 'match', label: 'Datos del partido (vinculados)' },
              { value: 'custom', label: 'Propios' },
            ]}
          />
        </Row>
        {el.source === 'match' ? (
          <>
            <Row label="Métricas mostradas">
              <div className="space-y-1 rounded-lg border border-line bg-ink-2 p-2">
                {match.stats.map((s) => {
                  const on = el.statIds.length === 0 || el.statIds.includes(s.id)
                  return (
                    <label key={s.id} className="flex items-center gap-2 text-[12px]">
                      <input
                        type="checkbox"
                        checked={on}
                        onChange={(e) => {
                          const current = el.statIds.length ? el.statIds : match.stats.map((x) => x.id)
                          const next = e.target.checked ? match.stats.map((x) => x.id).filter((id) => current.includes(id) || id === s.id) : current.filter((id) => id !== s.id)
                          set({ statIds: next.length === match.stats.length ? [] : next })
                        }}
                      />
                      <span className="truncate">{s.label}</span>
                    </label>
                  )
                })}
                {match.stats.length === 0 && <span className="text-[11px] text-muted">Aún no hay métricas.</span>}
              </div>
            </Row>
            <GoToData tab="stats" label="Editar valores en Estadísticas →" />
          </>
        ) : (
          <StatRowsEditor rows={el.rows} onChange={(rows) => set({ rows }, `rows-${el.id}`)} homeLabel={match.home.shortName || match.home.name} awayLabel={match.away.shortName || match.away.name} homeColor={c(el.homeColor)} awayColor={c(el.awayColor)} />
        )}
        <NumberField label="Filas máximas" value={el.maxRows} min={1} max={12} onChange={(v) => set({ maxRows: Math.round(v ?? 5) })} />
      </Section>
      <Section title="Estilo de barras">
        <Select
          label="Estilo"
          value={el.style}
          onChange={(v) => set({ style: v })}
          options={[
            { value: 'editorial', label: 'Editorial · cifras enormes + barra proporcional' },
            { value: 'dual', label: 'Enfrentadas' },
            { value: 'split', label: 'Proporción' },
            { value: 'stacked', label: 'Apiladas' },
          ]}
        />
        {el.style === 'editorial' && (
          <>
            <Row label="Color de barras">
              <Segmented
                value={el.colorMode ?? 'leader'}
                onChange={(v) => set({ colorMode: v })}
                options={[
                  { value: 'leader', label: 'Líder en acento' },
                  { value: 'teams', label: 'Colores de equipo' },
                ]}
              />
            </Row>
            {(el.colorMode ?? 'leader') === 'leader' && <ColorField label="Acento del líder" value={el.accentColor ?? '$accent'} onChange={(v) => set({ accentColor: v })} />}
            <p className="text-[11px] leading-snug text-dim">La barra se reparte en proporción exacta a los dos valores. El líder respeta «menos es mejor».</p>
          </>
        )}
        {el.style !== 'split' && el.style !== 'editorial' && (
          <Select
            label="Escala"
            value={el.scaleMode}
            onChange={(v) => set({ scaleMode: v })}
            options={[
              { value: 'pair', label: 'Relativa a cada fila (máximo del par)' },
              { value: 'global', label: 'Relativa a todas las filas' },
              { value: 'fixed', label: 'Máximo fijo' },
            ]}
          />
        )}
        {el.scaleMode === 'fixed' && el.style !== 'split' && el.style !== 'editorial' && <NumberField label="Valor máximo" value={el.fixedMax} min={0.0001} onChange={(v) => set({ fixedMax: v ?? 100 })} />}
        {(el.style !== 'editorial' || el.colorMode === 'teams') && (
          <div className="grid grid-cols-2 gap-2">
            <ColorField label="Local" value={el.homeColor} onChange={(v) => set({ homeColor: v })} />
            <ColorField label="Visitante" value={el.awayColor} onChange={(v) => set({ awayColor: v })} />
          </div>
        )}
        <Toggle label="Mostrar escudos y nombres" checked={el.showCrests} onChange={(v) => set({ showCrests: v })} />
        <Toggle label="Destacar al mejor de cada métrica" checked={el.highlightLeader} onChange={(v) => set({ highlightLeader: v })} />
        <Row label="Separador decimal">
          <Segmented value={el.decimalSeparator} onChange={(v) => set({ decimalSeparator: v })} options={[{ value: ',', label: '5,43' }, { value: '.', label: '5.43' }]} />
        </Row>
      </Section>
      <Section title="Tipografía y medidas" defaultOpen={false}>
        <FontSelect label="Fuente de valores" value={el.valueFont} onChange={(v) => set({ valueFont: v })} />
        <FontSelect label="Fuente de etiquetas" value={el.labelFont} onChange={(v) => set({ labelFont: v })} />
        <Slider label="Tamaño de valores" min={16} max={280} step={1} value={el.valueSize} onChange={(v) => set({ valueSize: v })} />
        <Slider label="Tamaño de etiquetas" min={10} max={60} step={1} value={el.labelSize} onChange={(v) => set({ labelSize: v })} />
        <Slider label="Grosor de barra" min={2} max={60} step={1} value={el.barHeight} onChange={(v) => set({ barHeight: v })} />
        <Slider label="Separación entre filas" min={0} max={120} step={1} value={el.rowGap} onChange={(v) => set({ rowGap: v })} />
        <ColorField label="Color de valores" value={el.valueColor} onChange={(v) => set({ valueColor: v })} />
        <ColorField label="Color de etiquetas" value={el.labelColor} onChange={(v) => set({ labelColor: v })} />
        <ColorField label="Pista" value={el.trackColor} onChange={(v) => set({ trackColor: v })} />
      </Section>
    </>
  )
}

export function StatNumberProps({ el }: { el: StatNumberElement }) {
  const set = useElementSetter(el)
  return (
    <Section title="Dato destacado">
      <div className="grid grid-cols-[1fr_2fr_1fr] gap-1.5">
        <TextField label="Prefijo" value={el.prefix} onChange={(v) => set({ prefix: v })} />
        <TextField label="Valor" value={el.value} onChange={(v) => set({ value: v })} />
        <TextField label="Sufijo" value={el.suffix} onChange={(v) => set({ suffix: v })} />
      </div>
      <TextField label="Etiqueta" value={el.label} onChange={(v) => set({ label: v })} />
      <TextField label="Explicación" multiline rows={2} value={el.description} onChange={(v) => set({ description: v })} />
      <Select
        label="Diseño"
        value={el.layout}
        onChange={(v) => set({ layout: v })}
        options={[
          { value: 'hero', label: 'Héroe · cifra gigante (editorial)' },
          { value: 'stacked', label: 'Apilado' },
          { value: 'inline', label: 'En línea' },
          { value: 'card', label: 'Tarjeta' },
        ]}
      />
      <Row label="Alineación">
        <Segmented
          value={el.align}
          onChange={(v) => set({ align: v })}
          options={[
            { value: 'left', label: 'Izquierda' },
            { value: 'center', label: 'Centro' },
            ...(el.layout === 'hero' ? [{ value: 'right' as const, label: 'Derecha' }] : []),
          ]}
        />
      </Row>
      <FontSelect label="Fuente del valor" value={el.valueFont} onChange={(v) => set({ valueFont: v })} />
      <Slider label="Tamaño del valor" min={40} max={420} step={1} value={el.valueSize} onChange={(v) => set({ valueSize: v })} />
      <ColorField label="Color del valor" value={el.valueColor} onChange={(v) => set({ valueColor: v })} />
      <ColorField label="Etiqueta" value={el.labelColor} onChange={(v) => set({ labelColor: v })} />
      <ColorField label="Texto" value={el.textColor} onChange={(v) => set({ textColor: v })} />
      <ColorField label="Acento" value={el.accentColor} onChange={(v) => set({ accentColor: v })} />
      {el.layout === 'card' && (
        <>
          <ColorField label="Fondo de tarjeta" value={el.cardFill} onChange={(v) => set({ cardFill: v })} />
          <Slider label="Opacidad de tarjeta" value={el.cardOpacity} onChange={(v) => set({ cardOpacity: v })} />
        </>
      )}
    </Section>
  )
}

export function ProgressRingProps({ el }: { el: ProgressRingElement }) {
  const set = useElementSetter(el)
  return (
    <Section title="Anillo de progreso">
      <div className="grid grid-cols-2 gap-2">
        <NumberField label="Valor" value={el.value} onChange={(v) => set({ value: v ?? 0 })} />
        <NumberField label="Máximo" value={el.max} min={0.0001} onChange={(v) => set({ max: v ?? 100 })} />
      </div>
      <TextField label="Etiqueta" value={el.label} onChange={(v) => set({ label: v })} />
      <TextField label="Subetiqueta" value={el.sublabel} onChange={(v) => set({ sublabel: v })} />
      <Toggle label="Mostrar como porcentaje" checked={el.showPercent} onChange={(v) => set({ showPercent: v })} />
      <NumberField label="Decimales" value={el.decimals} min={0} max={3} onChange={(v) => set({ decimals: Math.round(v ?? 0) })} />
      <ColorField label="Color" value={el.color} onChange={(v) => set({ color: v })} />
      <ColorField label="Pista" value={el.trackColor} onChange={(v) => set({ trackColor: v })} />
      <ColorField label="Texto" value={el.textColor} onChange={(v) => set({ textColor: v })} />
      <Slider label="Grosor" min={2} max={80} step={1} value={el.thickness} onChange={(v) => set({ thickness: v })} />
    </Section>
  )
}

export function FormRowProps({ el }: { el: FormRowElement }) {
  const set = useElementSetter(el)
  const update = useEditor((s) => s.update)
  const match = useEditor((s) => s.project!.match)
  return (
    <Section title="Racha / forma reciente">
      <Row label="Datos">
        <Segmented value={el.source} onChange={(v) => set({ source: v })} options={[{ value: 'home', label: 'Local' }, { value: 'away', label: 'Visitante' }, { value: 'custom', label: 'Propios' }]} />
      </Row>
      {el.source === 'custom' ? (
        <FormEditor value={el.results} onChange={(r) => set({ results: r })} />
      ) : (
        <FormEditor
          value={el.source === 'home' ? match.home.form : match.away.form}
          onChange={(r) =>
            update((d) => {
              if (el.source === 'home') d.match.home.form = r
              else d.match.away.form = r
            })
          }
        />
      )}
      <p className="text-[11px] text-dim">V = victoria, E = empate, D = derrota. Clic para cambiar.</p>
      <Select
        label="Forma"
        value={el.shape}
        onChange={(v) => set({ shape: v })}
        options={[
          { value: 'letter', label: 'Letras (editorial)' },
          { value: 'dot', label: 'Puntos planos' },
          { value: 'square', label: 'Cuadrado' },
          { value: 'circle', label: 'Círculo' },
          { value: 'pill', label: 'Píldora' },
        ]}
      />
      <Toggle label="Mostrar letras" checked={el.showLetters} onChange={(v) => set({ showLetters: v })} />
      <Toggle label="Más reciente a la izquierda" checked={el.newestFirst} onChange={(v) => set({ newestFirst: v })} />
      <Slider label="Separación" min={0} max={60} step={1} value={el.gap} onChange={(v) => set({ gap: v })} />
      <div className="grid grid-cols-3 gap-1.5">
        <ColorField label="Victoria" value={el.winColor} onChange={(v) => set({ winColor: v })} />
        <ColorField label="Empate" value={el.drawColor} onChange={(v) => set({ drawColor: v })} />
        <ColorField label="Derrota" value={el.lossColor} onChange={(v) => set({ lossColor: v })} />
      </div>
    </Section>
  )
}

export function TableProps({ el }: { el: TableElement }) {
  const set = useElementSetter(el)
  return (
    <>
      <Section title="Contenido de la tabla">
        <TableEditor columns={el.columns} rows={el.rows} onChange={(columns, rows) => set({ columns, rows }, `table-${el.id}`)} />
      </Section>
      <Section title="Estilo">
        <NumberField label="Columna destacada (1 = primera)" value={el.accentColumn + 1} min={0} max={el.columns.length} onChange={(v) => set({ accentColumn: Math.round((v ?? 1) - 1) })} />
        <Slider label="Alto de fila" min={30} max={200} step={1} value={el.rowHeight} onChange={(v) => set({ rowHeight: v })} />
        <Slider label="Tamaño de texto" min={12} max={80} step={1} value={el.fontSize} onChange={(v) => set({ fontSize: v })} />
        <Toggle label="Filas alternas" checked={el.zebra} onChange={(v) => set({ zebra: v })} />
        <ColorField label="Cabecera" value={el.headerColor} onChange={(v) => set({ headerColor: v })} />
        <ColorField label="Texto" value={el.textColor} onChange={(v) => set({ textColor: v })} />
        <ColorField label="Destacado" value={el.accentColor} onChange={(v) => set({ accentColor: v })} />
      </Section>
    </>
  )
}

export function PlayerListProps({ el }: { el: PlayerListElement }) {
  const set = useElementSetter(el)
  return (
    <Section title="Lista de jugadores">
      <Row label="Diseño">
        <Segmented value={el.variant ?? 'card'} onChange={(v) => set({ variant: v })} options={[{ value: 'editorial', label: 'Editorial (filas abiertas)' }, { value: 'card', label: 'Tarjetas' }]} />
      </Row>
      <Row label="Equipo">
        <Segmented value={el.side} onChange={(v) => set({ side: v })} options={[{ value: 'home', label: 'Local' }, { value: 'away', label: 'Visitante' }]} />
      </Row>
      <Row label="Mostrar">
        <Segmented value={el.filter} onChange={(v) => set({ filter: v })} options={[{ value: 'key', label: 'Clave' }, { value: 'absences', label: 'Bajas' }, { value: 'all', label: 'Todos' }]} />
      </Row>
      <GoToData tab="teams" label="Editar jugadores en Equipos →" />
      <NumberField label="Máximo de jugadores" value={el.maxItems} min={1} max={11} onChange={(v) => set({ maxItems: Math.round(v ?? 3) })} />
      <TextField label="Título (opcional)" value={el.title} onChange={(v) => set({ title: v })} />
      <Row label="Alineación">
        <Segmented value={el.align} onChange={(v) => set({ align: v })} options={[{ value: 'left', label: 'Izquierda' }, { value: 'right', label: 'Derecha' }]} />
      </Row>
      <Toggle label="Dorsal" checked={el.showNumber} onChange={(v) => set({ showNumber: v })} />
      <Toggle label="Dato estadístico" checked={el.showStat} onChange={(v) => set({ showStat: v })} />
      <Toggle label="Estado (lesión, duda…)" checked={el.showStatus} onChange={(v) => set({ showStatus: v })} />
      <Slider label="Tamaño del nombre" min={14} max={80} step={1} value={el.nameSize} onChange={(v) => set({ nameSize: v })} />
      <Slider label="Separación" min={0} max={60} step={1} value={el.rowGap} onChange={(v) => set({ rowGap: v })} />
      <ColorField label="Acento" value={el.accentColor} onChange={(v) => set({ accentColor: v })} />
    </Section>
  )
}

export function MatchListProps({ el }: { el: MatchListElement }) {
  const set = useElementSetter(el)
  return (
    <Section title="Agenda de partidos">
      <Row label="Diseño">
        <Segmented value={el.variant ?? 'card'} onChange={(v) => set({ variant: v })} options={[{ value: 'editorial', label: 'Editorial (filas abiertas)' }, { value: 'card', label: 'Tarjetas' }]} />
      </Row>
      <GoToData tab="stats" label="Editar partidos de la agenda →" />
      <NumberField label="Partidos máximos" value={el.maxItems} min={1} max={10} onChange={(v) => set({ maxItems: Math.round(v ?? 5) })} />
      <Slider label="Alto de fila" min={60} max={260} step={1} value={el.rowHeight} onChange={(v) => set({ rowHeight: v })} />
      <Toggle label="Mostrar competición" checked={el.showCompetition} onChange={(v) => set({ showCompetition: v })} />
      <ColorField label="Acento" value={el.accentColor} onChange={(v) => set({ accentColor: v })} />
      {el.variant !== 'editorial' && (
        <>
          <ColorField label="Tarjeta" value={el.cardColor} onChange={(v) => set({ cardColor: v })} />
          <Slider label="Opacidad de tarjeta" value={el.cardOpacity} onChange={(v) => set({ cardOpacity: v })} />
        </>
      )}
    </Section>
  )
}

export function PredictionProps({ el }: { el: PredictionElement }) {
  const set = useElementSetter(el)
  const match = useEditor((s) => s.project!.match)
  return (
    <>
      <Section title="Pronóstico">
        {match.predictions.length === 0 ? (
          <EmptyHint>No hay pronósticos. Añádelos en Estadísticas → Pronósticos.</EmptyHint>
        ) : (
          <Select label="Pronóstico vinculado" value={String(el.predictionIndex)} options={match.predictions.map((p, i) => ({ value: String(i), label: `${i + 1}. ${p.market} — ${p.pick}` }))} onChange={(v) => set({ predictionIndex: Number(v) })} />
        )}
        <GoToData tab="stats" label="Editar pronósticos →" />
        <Row label="Modo">
          <Segmented value={el.mode} onChange={(v) => set({ mode: v })} options={[{ value: 'plain', label: 'Normal' }, { value: 'locked', label: 'Bloqueado' }, { value: 'revealed', label: 'Revelado' }]} />
        </Row>
        <Row label="Diseño">
          <Segmented value={el.chrome ?? 'card'} onChange={(v) => set({ chrome: v })} options={[{ value: 'none', label: 'Editorial (sin tarjeta)' }, { value: 'card', label: 'Tarjeta' }]} />
        </Row>
      </Section>
      {el.mode === 'locked' && (
        <Section title="Bloqueo (teaser)">
          <Slider label="Intensidad del desenfoque" min={2} max={60} step={1} value={el.blurIntensity} onChange={(v) => set({ blurIntensity: v })} />
          <Slider label="Opacidad del velo" value={el.overlayOpacity} onChange={(v) => set({ overlayOpacity: v })} />
          <Select label="Contenido oculto" value={el.hiddenPosition} onChange={(v) => set({ hiddenPosition: v })} options={[{ value: 'pick', label: 'Solo el pronóstico' }, { value: 'pickAndOdds', label: 'Pronóstico y cuota' }, { value: 'all', label: 'Todo el contenido' }]} />
          <Select label="Estilo del candado" value={el.lockStyle} onChange={(v) => set({ lockStyle: v })} options={[{ value: 'padlock', label: 'Candado' }, { value: 'shield', label: 'Escudo' }, { value: 'keyhole', label: 'Llave' }, { value: 'none', label: 'Sin icono' }]} />
          <TextField label="Texto teaser" value={el.teaser} onChange={(v) => set({ teaser: v })} />
          <p className="text-[11px] leading-snug text-dim">El texto oculto se sustituye por caracteres aleatorios antes de difuminarse: la imagen exportada nunca revela el pronóstico real.</p>
        </Section>
      )}
      {el.mode === 'revealed' && (
        <Section title="Revelado">
          <TextField label="Sello" value={el.revealStamp} onChange={(v) => set({ revealStamp: v })} />
        </Section>
      )}
      <Section title="Contenido y estilo">
        <Toggle label="Mostrar partido" checked={el.showMatch} onChange={(v) => set({ showMatch: v })} />
        <Toggle label="Mostrar cuota" checked={el.showOdds} onChange={(v) => set({ showOdds: v })} />
        <Toggle label="Mostrar confianza" checked={el.showConfidence} onChange={(v) => set({ showConfidence: v })} />
        <Toggle label="Mostrar argumento" checked={el.showNote} onChange={(v) => set({ showNote: v })} />
        <ColorField label="Acento" value={el.accentColor} onChange={(v) => set({ accentColor: v })} />
        {el.chrome !== 'none' && <ColorField label="Tarjeta" value={el.cardColor} onChange={(v) => set({ cardColor: v })} />}
        <ColorField label="Texto" value={el.textColor} onChange={(v) => set({ textColor: v })} />
        <FontSelect label="Fuente del pronóstico" value={el.headlineFont} onChange={(v) => set({ headlineFont: v })} />
        {el.chrome !== 'none' && <Slider label="Radio de esquinas" min={0} max={120} step={1} value={el.cornerRadius} onChange={(v) => set({ cornerRadius: v })} />}
      </Section>
    </>
  )
}

export function ResultsListProps({ el }: { el: ResultsListElement }) {
  const set = useElementSetter(el)
  return (
    <Section title="Resultados verificados">
      <Row label="Diseño">
        <Segmented value={el.variant ?? 'card'} onChange={(v) => set({ variant: v })} options={[{ value: 'editorial', label: 'Editorial (filas abiertas)' }, { value: 'card', label: 'Tarjetas' }]} />
      </Row>
      <GoToData tab="stats" label="Editar historial de resultados →" />
      <NumberField label="Entradas máximas" value={el.maxItems} min={1} max={12} onChange={(v) => set({ maxItems: Math.round(v ?? 5) })} />
      <Toggle label="Resumen (aciertos, fallos, %)" checked={el.showSummary} onChange={(v) => set({ showSummary: v })} />
      <Toggle label="Mostrar cuota" checked={el.showOdds} onChange={(v) => set({ showOdds: v })} />
      <Slider label="Separación" min={0} max={60} step={1} value={el.rowGap} onChange={(v) => set({ rowGap: v })} />
      <div className="grid grid-cols-3 gap-1.5">
        <ColorField label="Acierto" value={el.winColor} onChange={(v) => set({ winColor: v })} />
        <ColorField label="Fallo" value={el.lossColor} onChange={(v) => set({ lossColor: v })} />
        <ColorField label="Pendiente" value={el.pendingColor} onChange={(v) => set({ pendingColor: v })} />
      </div>
    </Section>
  )
}

export function RankingProps({ el }: { el: RankingElement }) {
  const set = useElementSetter(el)
  const rows = el.rows
  const setRows = (next: RankingElement['rows']) => set({ rows: next }, `rank-rows-${el.id}`)
  const patchRow = (i: number, patch: Partial<RankingElement['rows'][number]>) => setRows(rows.map((r, k) => (k === i ? { ...r, ...patch } : r)))
  const move = (i: number, d: number) => {
    const j = i + d
    if (j < 0 || j >= rows.length) return
    const next = [...rows]
    ;[next[i], next[j]] = [next[j], next[i]]
    setRows(next)
  }
  return (
    <>
      <Section title="Filas del ranking">
        <div className="space-y-2">
          {rows.map((r, i) => (
            <div key={r.id} className="space-y-1.5 rounded-lg border border-line bg-ink-2 p-2" data-testid="ranking-row">
              <div className="flex items-center gap-1">
                <span className="w-5 text-center text-[11px] font-bold text-muted">{i + 1}</span>
                <input className="field flex-1" aria-label={`Nombre fila ${i + 1}`} value={r.label} onChange={(e) => patchRow(i, { label: e.target.value })} />
                <button type="button" className="icon-btn h-7 w-7" aria-label="Subir fila" onClick={() => move(i, -1)}>
                  <ArrowUp size={13} />
                </button>
                <button type="button" className="icon-btn h-7 w-7" aria-label="Bajar fila" onClick={() => move(i, 1)}>
                  <ArrowDown size={13} />
                </button>
                <button type="button" className="icon-btn h-7 w-7 hover:!text-loss" aria-label="Eliminar fila" onClick={() => setRows(rows.filter((_, k) => k !== i))}>
                  <Trash2 size={13} />
                </button>
              </div>
              <div className="grid grid-cols-[2fr_1fr_1fr] gap-1.5">
                <input className="field" aria-label={`Subtítulo fila ${i + 1}`} placeholder="Equipo / detalle" value={r.sub} onChange={(e) => patchRow(i, { sub: e.target.value })} />
                <NumberField ariaLabel={`Valor fila ${i + 1}`} value={r.value} allowEmpty onChange={(v) => patchRow(i, { value: v })} />
                <input className="field" aria-label={`Texto alternativo fila ${i + 1}`} placeholder="Texto" value={r.display} onChange={(e) => patchRow(i, { display: e.target.value })} />
              </div>
            </div>
          ))}
        </div>
        <button type="button" className="btn w-full text-[12px]" onClick={() => setRows([...rows, { id: uid('rk'), label: 'Nuevo', sub: '', value: 0, display: '' }])}>
          <Plus size={13} /> Añadir fila
        </button>
        <p className="text-[11px] leading-snug text-dim">Las barras se calculan en proporción al valor más alto. «Texto» sustituye al número mostrado (opcional).</p>
      </Section>
      <Section title="Estilo">
        <Select label="Fila destacada" value={String(el.highlightIndex)} onChange={(v) => set({ highlightIndex: Number(v) })} options={[{ value: '-1', label: 'Ninguna' }, ...rows.map((r, i) => ({ value: String(i), label: `${i + 1}. ${r.label}` }))]} />
        <NumberField label="Filas máximas" value={el.maxRows} min={1} max={12} onChange={(v) => set({ maxRows: Math.round(v ?? 5) })} />
        <div className="grid grid-cols-2 gap-2">
          <TextField label="Unidad" value={el.unit} onChange={(v) => set({ unit: v })} />
          <NumberField label="Decimales" value={el.decimals} min={0} max={3} onChange={(v) => set({ decimals: Math.round(v ?? 0) })} />
        </div>
        <Toggle label="Mostrar posición" checked={el.showRank} onChange={(v) => set({ showRank: v })} />
        <Toggle label="Barras proporcionales" checked={el.showBars} onChange={(v) => set({ showBars: v })} />
        <ColorField label="Acento" value={el.accentColor} onChange={(v) => set({ accentColor: v })} />
        <ColorField label="Barras" value={el.barColor} onChange={(v) => set({ barColor: v })} />
        <Slider label="Tamaño del nombre" min={20} max={120} step={1} value={el.nameSize} onChange={(v) => set({ nameSize: v })} />
        <Slider label="Tamaño del valor" min={30} max={200} step={1} value={el.valueSize} onChange={(v) => set({ valueSize: v })} />
      </Section>
    </>
  )
}

export function ProbabilityProps({ el }: { el: ProbabilityElement }) {
  const set = useElementSetter(el)
  const total = (el.home ?? 0) + (el.showDraw ? el.draw ?? 0 : 0) + (el.away ?? 0)
  return (
    <>
      <Section title="Probabilidades (%)">
        <div className={`grid gap-1.5 ${el.showDraw ? 'grid-cols-3' : 'grid-cols-2'}`}>
          <NumberField label="Local" value={el.home} allowEmpty min={0} max={100} onChange={(v) => set({ home: v })} />
          {el.showDraw && <NumberField label="Empate" value={el.draw} allowEmpty min={0} max={100} onChange={(v) => set({ draw: v })} />}
          <NumberField label="Visitante" value={el.away} allowEmpty min={0} max={100} onChange={(v) => set({ away: v })} />
        </div>
        <p className={`text-[11px] ${Math.round(total) === 100 ? 'text-dim' : 'text-amber-300/80'}`}>Suma: {Math.round(total * 10) / 10} %{el.normalize ? ' · la barra se normaliza al 100 %' : ''}</p>
        <Toggle label="Incluir empate" checked={el.showDraw} onChange={(v) => set({ showDraw: v })} />
        <Toggle label="Normalizar la barra al 100 %" checked={el.normalize} onChange={(v) => set({ normalize: v })} />
        <div className={`grid gap-1.5 ${el.showDraw ? 'grid-cols-3' : 'grid-cols-2'}`}>
          <TextField label="Etiqueta local" value={el.homeLabel} onChange={(v) => set({ homeLabel: v })} />
          {el.showDraw && <TextField label="Etiqueta empate" value={el.drawLabel} onChange={(v) => set({ drawLabel: v })} />}
          <TextField label="Etiqueta visitante" value={el.awayLabel} onChange={(v) => set({ awayLabel: v })} />
        </div>
        <p className="text-[11px] leading-snug text-dim">Probabilidades estimadas: opinión, nunca una garantía.</p>
      </Section>
      <Section title="Estilo">
        <Row label="Color">
          <Segmented value={el.colorMode} onChange={(v) => set({ colorMode: v })} options={[{ value: 'leader', label: 'Favorito en acento' }, { value: 'teams', label: 'Colores de equipo' }]} />
        </Row>
        <ColorField label="Acento" value={el.accentColor} onChange={(v) => set({ accentColor: v })} />
        <ColorField label="Resto de barras" value={el.trackColor} onChange={(v) => set({ trackColor: v })} />
        <Slider label="Tamaño de cifras" min={40} max={260} step={1} value={el.valueSize} onChange={(v) => set({ valueSize: v })} />
        <Slider label="Tamaño de etiquetas" min={16} max={80} step={1} value={el.labelSize} onChange={(v) => set({ labelSize: v })} />
        <Slider label="Grosor de barra" min={4} max={80} step={1} value={el.barHeight} onChange={(v) => set({ barHeight: v })} />
      </Section>
    </>
  )
}
