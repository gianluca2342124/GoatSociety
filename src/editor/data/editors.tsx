import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react'
import type { AgendaMatch, FormResult, Player, Prediction, ResultEntry, StatRow } from '../../model/types'
import { computeBars, formatNumber, globalMaxOf, parseNumberInput } from '../../model/stats'
import { uid } from '../../model/ids'
import { NumberField, Select, Slider, TextField, Toggle } from '../../ui/controls'
import { useState } from 'react'

function move<T>(list: T[], i: number, d: number): T[] {
  const j = i + d
  if (j < 0 || j >= list.length) return list
  const out = [...list]
  ;[out[i], out[j]] = [out[j], out[i]]
  return out
}

function RowTools({ onUp, onDown, onDelete }: { onUp: () => void; onDown: () => void; onDelete: () => void }) {
  return (
    <div className="flex shrink-0 items-center">
      <button type="button" className="icon-btn h-6 w-6" aria-label="Subir" onClick={onUp}>
        <ArrowUp size={12} />
      </button>
      <button type="button" className="icon-btn h-6 w-6" aria-label="Bajar" onClick={onDown}>
        <ArrowDown size={12} />
      </button>
      <button type="button" className="icon-btn h-6 w-6 hover:!text-loss" aria-label="Eliminar" onClick={onDelete}>
        <Trash2 size={12} />
      </button>
    </div>
  )
}

/** Value input accepting "5,43", "62%", empty → null. */
function StatValue({ value, onChange, label }: { value: number | null; onChange: (v: number | null) => void; label: string }) {
  const [draft, setDraft] = useState<string | null>(null)
  return (
    <input
      className="field px-2 text-center tabular-nums"
      aria-label={label}
      inputMode="decimal"
      value={draft ?? (value == null ? '' : String(value).replace('.', ','))}
      placeholder="—"
      onChange={(e) => {
        setDraft(e.target.value)
        onChange(parseNumberInput(e.target.value))
      }}
      onBlur={() => setDraft(null)}
    />
  )
}

export function StatRowsEditor({ rows, onChange, homeLabel, awayLabel, homeColor, awayColor }: { rows: StatRow[]; onChange: (rows: StatRow[]) => void; homeLabel: string; awayLabel: string; homeColor: string; awayColor: string }) {
  const gmax = globalMaxOf(rows)
  const set = (i: number, patch: Partial<StatRow>) => onChange(rows.map((r, k) => (k === i ? { ...r, ...patch } : r)))
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-[1fr_64px_64px] gap-1.5 px-1 text-[10px] font-bold tracking-wider text-muted uppercase">
        <span>Métrica</span>
        <span className="truncate text-center">{homeLabel}</span>
        <span className="truncate text-center">{awayLabel}</span>
      </div>
      {rows.map((r, i) => {
        const b = computeBars(r, 'pair', 100, gmax)
        return (
          <div key={r.id} className="rounded-lg border border-line bg-ink-2 p-2" data-testid="stat-row">
            <div className="grid grid-cols-[1fr_64px_64px] gap-1.5">
              <input className="field" aria-label="Nombre de la métrica" value={r.label} onChange={(e) => set(i, { label: e.target.value })} />
              <StatValue label={`${homeLabel} ${r.label}`} value={r.home} onChange={(v) => set(i, { home: v })} />
              <StatValue label={`${awayLabel} ${r.label}`} value={r.away} onChange={(v) => set(i, { away: v })} />
            </div>
            {/* Live bar preview */}
            <div className="mt-2 flex items-center gap-1" aria-hidden>
              <span className="w-12 text-right text-[11px] tabular-nums text-ivory/80">{formatNumber(r.home, r.decimals, ',', r.unit)}</span>
              <div className="flex h-1.5 flex-1 justify-end overflow-hidden rounded-full bg-white/8">
                <div className="h-full rounded-full transition-all" style={{ width: `${b.home * 100}%`, background: homeColor }} />
              </div>
              <div className="flex h-1.5 flex-1 overflow-hidden rounded-full bg-white/8">
                <div className="h-full rounded-full transition-all" style={{ width: `${b.away * 100}%`, background: awayColor }} />
              </div>
              <span className="w-12 text-[11px] tabular-nums text-ivory/80">{formatNumber(r.away, r.decimals, ',', r.unit)}</span>
            </div>
            <div className="mt-2 flex items-center gap-1.5">
              <input className="field w-16 px-2 py-1 text-[11px]" aria-label="Unidad" placeholder="unidad" value={r.unit} onChange={(e) => set(i, { unit: e.target.value })} />
              <select className="field w-auto px-2 py-1 text-[11px]" aria-label="Decimales" value={r.decimals} onChange={(e) => set(i, { decimals: Number(e.target.value) })}>
                {[0, 1, 2, 3].map((d) => (
                  <option key={d} value={d}>
                    {d} dec.
                  </option>
                ))}
              </select>
              <label className="flex items-center gap-1 text-[10px] text-muted" title="Un valor menor es mejor (p. ej. goles encajados)">
                <input type="checkbox" checked={!!r.lowerIsBetter} onChange={(e) => set(i, { lowerIsBetter: e.target.checked })} /> menor = mejor
              </label>
              <div className="ml-auto">
                <RowTools onUp={() => onChange(move(rows, i, -1))} onDown={() => onChange(move(rows, i, 1))} onDelete={() => onChange(rows.filter((_, k) => k !== i))} />
              </div>
            </div>
          </div>
        )
      })}
      <button type="button" className="btn w-full" onClick={() => onChange([...rows, { id: uid('s'), label: 'Nueva métrica', home: 0, away: 0, unit: '', decimals: 1 }])}>
        <Plus size={14} /> Añadir métrica
      </button>
    </div>
  )
}

export function FormEditor({ value, onChange }: { value: FormResult[]; onChange: (v: FormResult[]) => void }) {
  const cycle: Record<FormResult, FormResult> = { W: 'D', D: 'L', L: 'W' }
  const label: Record<FormResult, string> = { W: 'V', D: 'E', L: 'D' }
  const color: Record<FormResult, string> = { W: 'bg-win text-ink', D: 'bg-[#B8BBC2] text-ink', L: 'bg-loss text-ivory' }
  return (
    <div className="flex items-center gap-1.5">
      {value.map((r, i) => (
        <button key={i} type="button" title="Clic para cambiar (V/E/D)" aria-label={`Resultado ${i + 1}: ${label[r]}`} className={`h-7 w-7 rounded-md text-[12px] font-bold ${color[r]}`} onClick={() => onChange(value.map((x, k) => (k === i ? cycle[x] : x)))}>
          {label[r]}
        </button>
      ))}
      {value.length < 10 && (
        <button type="button" className="icon-btn h-7 w-7 border border-dashed border-line-2" aria-label="Añadir resultado" onClick={() => onChange([...value, 'W'])}>
          <Plus size={12} />
        </button>
      )}
      {value.length > 0 && (
        <button type="button" className="icon-btn h-7 w-7" aria-label="Quitar último" onClick={() => onChange(value.slice(0, -1))}>
          <Trash2 size={12} />
        </button>
      )}
    </div>
  )
}

export function PlayersEditor({ players, onChange }: { players: Player[]; onChange: (p: Player[]) => void }) {
  const set = (i: number, patch: Partial<Player>) => onChange(players.map((p, k) => (k === i ? { ...p, ...patch } : p)))
  return (
    <div className="space-y-2">
      {players.map((p, i) => (
        <div key={p.id} className="space-y-1.5 rounded-lg border border-line bg-ink-2 p-2">
          <div className="grid grid-cols-[44px_1fr_52px] gap-1.5">
            <input className="field px-1.5 text-center" aria-label="Dorsal" inputMode="numeric" value={p.number} onChange={(e) => set(i, { number: Number(e.target.value.replace(/\D/g, '')) || 0 })} />
            <input className="field" aria-label="Nombre del jugador" value={p.name} onChange={(e) => set(i, { name: e.target.value })} />
            <input className="field px-1.5 text-center" aria-label="Posición" value={p.position} onChange={(e) => set(i, { position: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            <select className="field py-1 text-[11px]" aria-label="Estado" value={p.status} onChange={(e) => set(i, { status: e.target.value as Player['status'] })}>
              <option value="available">Disponible</option>
              <option value="injured">Lesionado</option>
              <option value="doubt">Duda</option>
              <option value="suspended">Sancionado</option>
              <option value="out">Baja</option>
            </select>
            <input className="field py-1 text-[11px]" aria-label="Nota" placeholder="Nota (p. ej. lesión muscular)" value={p.note} onChange={(e) => set(i, { note: e.target.value })} />
            <input className="field py-1 text-[11px]" aria-label="Dato" placeholder="Dato (7)" value={p.stat} onChange={(e) => set(i, { stat: e.target.value })} />
            <input className="field py-1 text-[11px]" aria-label="Etiqueta del dato" placeholder="Etiqueta (GOLES)" value={p.statLabel} onChange={(e) => set(i, { statLabel: e.target.value })} />
          </div>
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-1.5 text-[11px] text-muted">
              <input type="checkbox" checked={p.key} onChange={(e) => set(i, { key: e.target.checked })} /> Jugador clave
            </label>
            <RowTools onUp={() => onChange(move(players, i, -1))} onDown={() => onChange(move(players, i, 1))} onDelete={() => onChange(players.filter((_, k) => k !== i))} />
          </div>
        </div>
      ))}
      <button
        type="button"
        className="btn w-full"
        onClick={() => onChange([...players, { id: uid('p'), name: 'Jugador', number: players.length + 1, position: '', status: 'available', note: '', stat: '', statLabel: '', key: true }])}
      >
        <Plus size={14} /> Añadir jugador
      </button>
    </div>
  )
}

export function PredictionsEditor({ items, onChange }: { items: Prediction[]; onChange: (p: Prediction[]) => void }) {
  const set = (i: number, patch: Partial<Prediction>) => onChange(items.map((p, k) => (k === i ? { ...p, ...patch } : p)))
  return (
    <div className="space-y-2">
      {items.map((p, i) => (
        <div key={p.id} className="space-y-2 rounded-lg border border-line bg-ink-2 p-2.5">
          <div className="flex items-center justify-between">
            <span className="label-xs text-gold">Pronóstico {i + 1}</span>
            <RowTools onUp={() => onChange(move(items, i, -1))} onDown={() => onChange(move(items, i, 1))} onDelete={() => onChange(items.filter((_, k) => k !== i))} />
          </div>
          <TextField label="Mercado" value={p.market} onChange={(v) => set(i, { market: v })} />
          <TextField label="Pronóstico" value={p.pick} onChange={(v) => set(i, { pick: v })} />
          <div className="grid grid-cols-2 gap-2">
            <TextField label="Cuota" value={p.odds} onChange={(v) => set(i, { odds: v })} />
            <NumberField label="Confianza" suffix="%" min={0} max={100} value={p.confidence} onChange={(v) => set(i, { confidence: v ?? 0 })} />
          </div>
          <TextField label="Argumento" multiline rows={2} value={p.note} onChange={(v) => set(i, { note: v })} />
        </div>
      ))}
      <button type="button" className="btn w-full" onClick={() => onChange([...items, { id: uid('pr'), market: 'Mercado', pick: 'Pronóstico', odds: '', confidence: 60, note: '' }])}>
        <Plus size={14} /> Añadir pronóstico
      </button>
      <p className="text-[11px] leading-snug text-dim">Ningún pronóstico se presenta como garantizado. Añade siempre el aviso legal de tu marca.</p>
    </div>
  )
}

export function ResultsEditor({ items, onChange }: { items: ResultEntry[]; onChange: (r: ResultEntry[]) => void }) {
  const set = (i: number, patch: Partial<ResultEntry>) => onChange(items.map((p, k) => (k === i ? { ...p, ...patch } : p)))
  return (
    <div className="space-y-2">
      {items.map((r, i) => (
        <div key={r.id} className="space-y-1.5 rounded-lg border border-line bg-ink-2 p-2">
          <input className="field" aria-label="Partido" value={r.match} onChange={(e) => set(i, { match: e.target.value })} />
          <div className="grid grid-cols-[1fr_64px] gap-1.5">
            <input className="field py-1 text-[11px]" aria-label="Pronóstico" placeholder="Pronóstico" value={r.pick} onChange={(e) => set(i, { pick: e.target.value })} />
            <input className="field py-1 text-[11px]" aria-label="Cuota" placeholder="Cuota" value={r.odds} onChange={(e) => set(i, { odds: e.target.value })} />
          </div>
          <div className="flex items-center gap-1.5">
            <input type="date" className="field w-auto py-1 text-[11px]" aria-label="Fecha" value={r.date} onChange={(e) => set(i, { date: e.target.value })} />
            <select className="field flex-1 py-1 text-[11px]" aria-label="Resultado" value={r.outcome} onChange={(e) => set(i, { outcome: e.target.value as ResultEntry['outcome'] })}>
              <option value="pending">Pendiente</option>
              <option value="won">Acertado</option>
              <option value="lost">Fallado</option>
              <option value="void">Nulo</option>
            </select>
            <RowTools onUp={() => onChange(move(items, i, -1))} onDown={() => onChange(move(items, i, 1))} onDelete={() => onChange(items.filter((_, k) => k !== i))} />
          </div>
        </div>
      ))}
      <button type="button" className="btn w-full" onClick={() => onChange([{ id: uid('r'), match: 'Local vs Visitante', pick: '', odds: '', date: new Date().toISOString().slice(0, 10), outcome: 'pending' }, ...items])}>
        <Plus size={14} /> Añadir resultado
      </button>
      <p className="text-[11px] leading-snug text-dim">Los resultados se introducen manualmente. La aplicación nunca marca un pronóstico como acertado por sí sola.</p>
    </div>
  )
}

export function AgendaEditor({ items, onChange }: { items: AgendaMatch[]; onChange: (a: AgendaMatch[]) => void }) {
  const set = (i: number, patch: Partial<AgendaMatch>) => onChange(items.map((p, k) => (k === i ? { ...p, ...patch } : p)))
  return (
    <div className="space-y-2">
      {items.map((m, i) => (
        <div key={m.id} className="space-y-1.5 rounded-lg border border-line bg-ink-2 p-2">
          <div className="grid grid-cols-[1fr_28px_1fr_28px] items-center gap-1.5">
            <input className="field" aria-label="Local" value={m.home} onChange={(e) => set(i, { home: e.target.value })} />
            <input type="color" className="h-7 w-7 cursor-pointer rounded border border-line bg-transparent" aria-label="Color local" value={m.homeColor.slice(0, 7)} onChange={(e) => set(i, { homeColor: e.target.value })} />
            <input className="field" aria-label="Visitante" value={m.away} onChange={(e) => set(i, { away: e.target.value })} />
            <input type="color" className="h-7 w-7 cursor-pointer rounded border border-line bg-transparent" aria-label="Color visitante" value={m.awayColor.slice(0, 7)} onChange={(e) => set(i, { awayColor: e.target.value })} />
          </div>
          <div className="flex items-center gap-1.5">
            <input className="field w-20 py-1 text-[11px]" aria-label="Hora" value={m.time} onChange={(e) => set(i, { time: e.target.value })} />
            <input className="field flex-1 py-1 text-[11px]" aria-label="Competición" value={m.competition} onChange={(e) => set(i, { competition: e.target.value })} />
            <label className="flex items-center gap-1 text-[10px] text-muted">
              <input type="checkbox" checked={m.highlight} onChange={(e) => set(i, { highlight: e.target.checked })} /> Destacar
            </label>
            <RowTools onUp={() => onChange(move(items, i, -1))} onDown={() => onChange(move(items, i, 1))} onDelete={() => onChange(items.filter((_, k) => k !== i))} />
          </div>
        </div>
      ))}
      <button
        type="button"
        className="btn w-full"
        onClick={() => onChange([...items, { id: uid('ag'), home: 'Local', away: 'Visitante', homeColor: '#1E3A8A', awayColor: '#B91C1C', homeCrestAssetId: null, awayCrestAssetId: null, time: '21:00', competition: '', highlight: false }])}
      >
        <Plus size={14} /> Añadir partido
      </button>
    </div>
  )
}

export function TableEditor({ columns, rows, onChange }: { columns: string[]; rows: string[][]; onChange: (c: string[], r: string[][]) => void }) {
  return (
    <div className="space-y-1.5 overflow-x-auto">
      <div className="flex gap-1">
        {columns.map((c, i) => (
          <input key={i} className="field min-w-0 flex-1 px-1.5 text-[11px] font-bold" aria-label={`Columna ${i + 1}`} value={c} onChange={(e) => onChange(columns.map((x, k) => (k === i ? e.target.value : x)), rows)} />
        ))}
      </div>
      {rows.map((r, ri) => (
        <div key={ri} className="flex items-center gap-1">
          {columns.map((_, ci) => (
            <input key={ci} className="field min-w-0 flex-1 px-1.5 py-1 text-[11px]" aria-label={`Fila ${ri + 1} columna ${ci + 1}`} value={r[ci] ?? ''} onChange={(e) => onChange(columns, rows.map((row, k) => (k === ri ? columns.map((__, c2) => (c2 === ci ? e.target.value : (row[c2] ?? ''))) : row)))} />
          ))}
          <button type="button" className="icon-btn h-6 w-6 shrink-0" aria-label="Eliminar fila" onClick={() => onChange(columns, rows.filter((_, k) => k !== ri))}>
            <Trash2 size={12} />
          </button>
        </div>
      ))}
      <div className="flex gap-1.5">
        <button type="button" className="btn flex-1 py-1 text-[11px]" onClick={() => onChange(columns, [...rows, columns.map(() => '')])}>
          <Plus size={12} /> Fila
        </button>
        <button type="button" className="btn flex-1 py-1 text-[11px]" onClick={() => onChange([...columns, 'Col'], rows.map((r) => [...r, '']))}>
          <Plus size={12} /> Columna
        </button>
        {columns.length > 1 && (
          <button type="button" className="btn flex-1 py-1 text-[11px]" onClick={() => onChange(columns.slice(0, -1), rows.map((r) => r.slice(0, columns.length - 1)))}>
            − Columna
          </button>
        )}
      </div>
    </div>
  )
}

export { Select, Slider, Toggle }
