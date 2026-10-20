import { useRef } from 'react'
import { Circle, MousePointer2, Move, Plus, Spline, Square, Sparkles, Trash2, Zap, ArrowUpRight, Waypoints, Volleyball } from 'lucide-react'
import type { AnnotationKind, Stadium3DElement, TacticalPlayer, TacticsData, TacticsElement } from '../../model/types'
import { useEditor } from '../../store/editor'
import { useUI } from '../../store/ui'
import { useLibrary } from '../../store/library'
import { resolveColor } from '../../model/tokens'
import { ColorField, NumberField, Row, Section, Segmented, Select, Slider, TextField, Toggle } from '../../ui/controls'
import { useElementSetter } from './common'
import { FORMATIONS, PITCH_LENGTH, PITCH_WIDTH, applyFormation } from '../../tactics/formations'
import { TACTICAL_PRESETS } from '../../tactics/presets'
import { pitchMarkings } from '../../tactics/pitch'
import { uid } from '../../model/ids'

export const TOOLS: { value: 'select' | AnnotationKind; label: string; icon: typeof Circle }[] = [
  { value: 'select', label: 'Mover jugadores y puntos', icon: MousePointer2 },
  { value: 'arrow', label: 'Flecha', icon: ArrowUpRight },
  { value: 'curve', label: 'Flecha curva', icon: Spline },
  { value: 'pass', label: 'Pase (discontinua)', icon: Waypoints },
  { value: 'run', label: 'Carrera', icon: Move },
  { value: 'press', label: 'Presión', icon: Zap },
  { value: 'circle', label: 'Círculo destacado', icon: Circle },
  { value: 'zone', label: 'Zona', icon: Square },
  { value: 'spotlight', label: 'Foco', icon: Sparkles },
  { value: 'ball', label: 'Balón', icon: Volleyball },
]

const KIND_LABEL: Record<AnnotationKind, string> = {
  arrow: 'Flecha',
  curve: 'Flecha curva',
  pass: 'Pase',
  run: 'Carrera',
  press: 'Presión',
  circle: 'Círculo',
  zone: 'Zona',
  spotlight: 'Foco',
  ball: 'Balón',
}

function useTacticsSetter(el: TacticsElement | Stadium3DElement) {
  const updateElement = useEditor((s) => s.updateElement)
  return (fn: (t: TacticsData) => void, key = `tac-${el.id}`) =>
    updateElement(
      el.id,
      (d) => {
        if (d.type === 'tactics' || d.type === 'stadium3d') fn(d.tactics)
      },
      { key },
    )
}

/** Shared tactical data controls (formations, presets, teams, selection). */
function TacticsCore({ el }: { el: TacticsElement | Stadium3DElement }) {
  const t = el.tactics
  const setT = useTacticsSetter(el)
  const match = useEditor((s) => s.project!.match)
  const sel = useUI((s) => s.tacticsSel)
  const selPlayer = t.players.find((p) => p.id === sel)
  const selAnn = t.annotations.find((a) => a.id === sel)
  return (
    <>
      <Section title="Preajustes tácticos">
        <div className="grid grid-cols-2 gap-1.5">
          {TACTICAL_PRESETS.map((p) => (
            <button
              key={p.id}
              type="button"
              title={p.description}
              className="btn px-2 py-1.5 text-[11px]"
              onClick={() =>
                setT((tt) => {
                  const r = p.build()
                  tt.players = r.players
                  tt.annotations = r.annotations
                  if (r.view && el.type === 'tactics') tt.view = r.view
                }, `preset-${el.id}-${p.id}`)
              }
            >
              {p.label}
            </button>
          ))}
        </div>
      </Section>
      <Section title="Equipos y formaciones">
        <div className="grid grid-cols-2 gap-2">
          <Select label={`Local (${match.home.shortName})`} value={t.homeFormation} options={FORMATIONS.map((f) => ({ value: f, label: f }))} onChange={(v) => setT((tt) => void ((tt.homeFormation = v), (tt.players = applyFormation(tt.players, v, 'home'))), `form-h-${el.id}`)} />
          <Select label={`Visitante (${match.away.shortName})`} value={t.awayFormation} options={FORMATIONS.map((f) => ({ value: f, label: f }))} onChange={(v) => setT((tt) => void ((tt.awayFormation = v), (tt.players = applyFormation(tt.players, v, 'away'))), `form-a-${el.id}`)} />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Toggle label="Local visible" checked={t.showHome} onChange={(v) => setT((tt) => void (tt.showHome = v))} />
          <Toggle label="Visitante visible" checked={t.showAway} onChange={(v) => setT((tt) => void (tt.showAway = v))} />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <ColorField label="Color local" value={t.homeColor} onChange={(c) => setT((tt) => void (tt.homeColor = c))} />
          <ColorField label="Color visitante" value={t.awayColor} onChange={(c) => setT((tt) => void (tt.awayColor = c))} />
        </div>
        <div className="flex gap-1.5">
          <button type="button" className="btn flex-1 text-[11px]" onClick={() => setT((tt) => void (tt.annotations = []), `clear-ann-${el.id}`)}>
            Borrar anotaciones
          </button>
          <button
            type="button"
            className="btn flex-1 text-[11px]"
            onClick={() =>
              setT((tt) => {
                const p: TacticalPlayer = { id: uid('tp'), team: 'home', number: 12, label: '', x: 52.5, y: 34, highlight: false }
                tt.players.push(p)
              }, `add-pl-${el.id}`)
            }
          >
            <Plus size={12} /> Jugador
          </button>
        </div>
      </Section>
      {selPlayer && (
        <Section title={`Jugador seleccionado · ${selPlayer.number}`}>
          <div className="grid grid-cols-[64px_1fr] gap-2">
            <NumberField label="Dorsal" value={selPlayer.number} min={0} max={99} onChange={(v) => setT((tt) => void (tt.players.find((p) => p.id === selPlayer.id)!.number = Math.round(v ?? 0)))} />
            <TextField label="Etiqueta (nombre)" value={selPlayer.label} onChange={(v) => setT((tt) => void (tt.players.find((p) => p.id === selPlayer.id)!.label = v), `pl-label-${selPlayer.id}`)} />
          </div>
          <Row label="Equipo">
            <Segmented value={selPlayer.team} onChange={(v) => setT((tt) => void (tt.players.find((p) => p.id === selPlayer.id)!.team = v))} options={[{ value: 'home', label: 'Local' }, { value: 'away', label: 'Visitante' }]} />
          </Row>
          <Toggle label="Destacar (foco dorado)" checked={selPlayer.highlight} onChange={(v) => setT((tt) => void (tt.players.find((p) => p.id === selPlayer.id)!.highlight = v))} />
          <button type="button" className="btn btn-danger w-full text-[11px]" onClick={() => (setT((tt) => void (tt.players = tt.players.filter((p) => p.id !== selPlayer.id))), useUI.getState().set({ tacticsSel: null }))}>
            <Trash2 size={12} /> Eliminar jugador
          </button>
        </Section>
      )}
      {selAnn && (
        <Section title={`Anotación · ${KIND_LABEL[selAnn.kind]}`}>
          <Select label="Tipo" value={selAnn.kind} options={(Object.keys(KIND_LABEL) as AnnotationKind[]).map((k) => ({ value: k, label: KIND_LABEL[k] }))} onChange={(v) => setT((tt) => void (tt.annotations.find((a) => a.id === selAnn.id)!.kind = v))} />
          <ColorField label="Color" value={selAnn.color} onChange={(c) => setT((tt) => void (tt.annotations.find((a) => a.id === selAnn.id)!.color = c))} />
          <TextField label="Etiqueta" value={selAnn.label} onChange={(v) => setT((tt) => void (tt.annotations.find((a) => a.id === selAnn.id)!.label = v), `ann-label-${selAnn.id}`)} />
          <Slider label="Grosor" min={0.15} max={1.4} value={selAnn.width} onChange={(v) => setT((tt) => void (tt.annotations.find((a) => a.id === selAnn.id)!.width = v))} />
          <Slider label="Opacidad" value={selAnn.opacity} onChange={(v) => setT((tt) => void (tt.annotations.find((a) => a.id === selAnn.id)!.opacity = v))} />
          {(selAnn.kind === 'arrow' || selAnn.kind === 'pass' || selAnn.kind === 'run' || selAnn.kind === 'curve' || selAnn.kind === 'press') && (
            <Toggle
              label="Trayectoria curva"
              checked={selAnn.points.length >= 3}
              onChange={(v) =>
                setT((tt) => {
                  const a = tt.annotations.find((x) => x.id === selAnn.id)!
                  if (v && a.points.length === 2) {
                    const [p, q] = a.points
                    a.points = [p, { x: (p.x + q.x) / 2 - (q.y - p.y) * 0.25, y: (p.y + q.y) / 2 + (q.x - p.x) * 0.25 }, q]
                  } else if (!v && a.points.length >= 3) a.points = [a.points[0], a.points[a.points.length - 1]]
                })
              }
            />
          )}
          <button type="button" className="btn btn-danger w-full text-[11px]" onClick={() => (setT((tt) => void (tt.annotations = tt.annotations.filter((a) => a.id !== selAnn.id))), useUI.getState().set({ tacticsSel: null }))}>
            <Trash2 size={12} /> Eliminar anotación
          </button>
        </Section>
      )}
    </>
  )
}

export function TacticsToolbar() {
  const tool = useUI((s) => s.tacticsTool)
  return (
    <div className="grid grid-cols-5 gap-1" role="toolbar" aria-label="Herramientas tácticas">
      {TOOLS.map((t) => (
        <button key={t.value} type="button" title={t.label} aria-label={t.label} data-active={tool === t.value} className="icon-btn h-9 w-full border border-line" onClick={() => useUI.getState().set({ tacticsTool: t.value })}>
          <t.icon size={15} />
        </button>
      ))}
    </div>
  )
}

export function TacticsProps({ el }: { el: TacticsElement }) {
  const t = el.tactics
  const setT = useTacticsSetter(el)
  const editing = useUI((s) => s.tacticsEditId === el.id)
  return (
    <>
      <Section title="Edición en el lienzo">
        {editing ? (
          <>
            <TacticsToolbar />
            <p className="text-[11px] leading-snug text-dim">Arrastra jugadores y rombos dorados. Con una herramienta de dibujo, arrastra sobre el campo para crear la anotación.</p>
            <button type="button" className="btn w-full" onClick={() => useUI.getState().set({ tacticsEditId: null, tacticsSel: null, tacticsTool: 'select' })}>
              Terminar edición táctica
            </button>
          </>
        ) : (
          <button type="button" className="btn btn-gold w-full" onClick={() => useUI.getState().set({ tacticsEditId: el.id, tacticsSel: null, tacticsTool: 'select' })}>
            Editar jugadores y flechas
          </button>
        )}
      </Section>
      <Section title="Campo y cámara">
        <Select label="Vista" value={t.view} onChange={(v) => setT((tt) => void (tt.view = v))} options={[{ value: 'full', label: 'Campo completo' }, { value: 'half', label: 'Medio campo' }, { value: 'attackingThird', label: 'Último tercio' }, { value: 'defensiveThird', label: 'Tercio defensivo' }]} />
        <Row label="Cámara">
          <Segmented value={t.camera} onChange={(v) => setT((tt) => void (tt.camera = v))} options={[{ value: 'top', label: 'Cenital' }, { value: 'perspective', label: 'Perspectiva' }, { value: 'isometric', label: 'Isométrica' }]} />
        </Row>
        {t.camera === 'perspective' && <Slider label="Inclinación" value={t.tilt} onChange={(v) => setT((tt) => void (tt.tilt = v))} />}
        <Toggle label="Campo vertical (ataque hacia arriba)" checked={t.vertical} onChange={(v) => setT((tt) => void (tt.vertical = v))} />
        <ColorField label="Césped" value={t.pitchColor} onChange={(c) => setT((tt) => void (tt.pitchColor = c))} />
        <ColorField label="Exterior" value={t.pitchColor2} onChange={(c) => setT((tt) => void (tt.pitchColor2 = c))} />
        <Toggle label="Franjas de corte" checked={t.stripes} onChange={(v) => setT((tt) => void (tt.stripes = v))} />
        <ColorField label="Líneas" value={t.lineColor} onChange={(c) => setT((tt) => void (tt.lineColor = c))} />
        <Slider label="Opacidad de líneas" value={t.lineOpacity} onChange={(v) => setT((tt) => void (tt.lineOpacity = v))} />
      </Section>
      <Section title="Jugadores">
        <Row label="Estilo">
          <Segmented value={t.playerStyle} onChange={(v) => setT((tt) => void (tt.playerStyle = v))} options={[{ value: 'disc', label: 'Disco' }, { value: 'shirt', label: 'Camiseta' }, { value: 'ring', label: 'Anillo' }]} />
        </Row>
        <Slider label="Tamaño" min={8} max={60} step={1} value={t.playerSize} onChange={(v) => setT((tt) => void (tt.playerSize = v))} />
        <Toggle label="Dorsales" checked={t.showNumbers} onChange={(v) => setT((tt) => void (tt.showNumbers = v))} />
        <Toggle label="Etiquetas con nombre" checked={t.showLabels} onChange={(v) => setT((tt) => void (tt.showLabels = v))} />
        <Slider label="Brillo de flechas y destacados" value={t.glow} onChange={(v) => setT((tt) => void (tt.glow = v))} />
      </Section>
      <TacticsCore el={el} />
    </>
  )
}

/** Top-down SVG mini-map to move players of a 3D stadium scene. */
function MiniMap({ el }: { el: Stadium3DElement }) {
  const t = el.tactics
  const setT = useTacticsSetter(el)
  const svg = useRef<SVGSVGElement>(null)
  const drag = useRef<string | null>(null)
  const match = useEditor((s) => s.project!.match)
  const brand = useLibrary((s) => s.brand)
  const sel = useUI((s) => s.tacticsSel)
  const c = (v: string) => resolveColor(v, { match, brand })
  const { lines } = pitchMarkings()
  const toPitch = (e: React.PointerEvent) => {
    const r = svg.current!.getBoundingClientRect()
    return { x: Math.max(-3, Math.min(108, ((e.clientX - r.left) / r.width) * (PITCH_LENGTH + 6) - 3)), y: Math.max(-3, Math.min(71, ((e.clientY - r.top) / r.height) * (PITCH_WIDTH + 6) - 3)) }
  }
  return (
    <svg
      ref={svg}
      viewBox={`-3 -3 ${PITCH_LENGTH + 6} ${PITCH_WIDTH + 6}`}
      className="w-full touch-none rounded-lg border border-line"
      style={{ background: '#0E2A22' }}
      onPointerMove={(e) => {
        if (!drag.current) return
        const p = toPitch(e)
        const id = drag.current
        setT((tt) => {
          const pl = tt.players.find((x) => x.id === id)
          if (pl) {
            pl.x = +p.x.toFixed(2)
            pl.y = +p.y.toFixed(2)
          }
        }, `mm-${id}`)
      }}
      onPointerUp={() => (drag.current = null)}
      onPointerLeave={() => (drag.current = null)}
      role="img"
      aria-label="Mapa táctico: arrastra jugadores"
    >
      {lines.map((l, i) => (
        <polyline key={i} points={l.map((p) => `${p.x},${p.y}`).join(' ')} fill="none" stroke="rgba(243,240,232,0.45)" strokeWidth={0.3} />
      ))}
      {t.players.map((p) => (
        <g
          key={p.id}
          transform={`translate(${p.x},${p.y})`}
          style={{ cursor: 'grab' }}
          onPointerDown={(e) => {
            ;(e.target as Element).setPointerCapture?.(e.pointerId)
            drag.current = p.id
            useUI.getState().set({ tacticsSel: p.id })
          }}
        >
          <circle r={2} fill={c(p.team === 'home' ? t.homeColor : t.awayColor)} stroke={sel === p.id || p.highlight ? '#CBAA62' : '#F3F0E8'} strokeWidth={sel === p.id ? 0.6 : 0.3} />
          <text y={0.8} textAnchor="middle" fontSize={2.2} fontWeight={700} fill="#fff" style={{ pointerEvents: 'none' }}>
            {p.number}
          </text>
        </g>
      ))}
    </svg>
  )
}

export function Stadium3DProps({ el }: { el: Stadium3DElement }) {
  const set = useElementSetter(el)
  const cam = el.camera
  const lig = el.lighting
  return (
    <>
      <Section title="Escena 3D (Three.js)">
        <p className="text-[11px] leading-snug text-dim">Renderizado 3D real, local y sin coste. Se integra en la exportación a la resolución elegida.</p>
        <MiniMap el={el} />
        <p className="text-[11px] text-dim">Arrastra los jugadores en el mapa. El render se actualiza al soltar.</p>
      </Section>
      <Section title="Cámara">
        <Slider label="Ángulo (azimut)" min={0} max={360} step={1} value={cam.azimuth} format={(v) => `${Math.round(v)}°`} onChange={(v) => set({ camera: { ...cam, azimuth: v } })} />
        <Slider label="Elevación" min={6} max={88} step={1} value={cam.elevation} format={(v) => `${Math.round(v)}°`} onChange={(v) => set({ camera: { ...cam, elevation: v } })} />
        <Slider label="Distancia" min={20} max={200} step={1} value={cam.distance} onChange={(v) => set({ camera: { ...cam, distance: v } })} />
        <Slider label="Campo de visión" min={15} max={75} step={1} value={cam.fov} onChange={(v) => set({ camera: { ...cam, fov: v } })} />
        <div className="grid grid-cols-2 gap-2">
          <Slider label="Objetivo X" min={0} max={105} step={0.5} value={cam.targetX} onChange={(v) => set({ camera: { ...cam, targetX: v } })} />
          <Slider label="Objetivo Y" min={0} max={68} step={0.5} value={cam.targetY} onChange={(v) => set({ camera: { ...cam, targetY: v } })} />
        </div>
      </Section>
      <Section title="Iluminación">
        <Slider label="Exposición" min={0.3} max={2.5} value={lig.exposure} onChange={(v) => set({ lighting: { ...lig, exposure: v } })} />
        <Slider label="Focos del estadio" min={0} max={2} value={lig.floodlights} onChange={(v) => set({ lighting: { ...lig, floodlights: v } })} />
        <Slider label="Niebla" value={lig.fog} onChange={(v) => set({ lighting: { ...lig, fog: v } })} />
        <ColorField label="Luz de acento" value={lig.accent} onChange={(c) => set({ lighting: { ...lig, accent: c } })} />
        <Slider label="Intensidad de acento" min={0} max={2} value={lig.rim} onChange={(v) => set({ lighting: { ...lig, rim: v } })} />
        <Row label="Fondo">
          <Segmented value={el.background} onChange={(v) => set({ background: v })} options={[{ value: 'transparent', label: 'Transparente' }, { value: 'night', label: 'Noche' }]} />
        </Row>
        <Toggle label="Gradas" checked={el.showStands} onChange={(v) => set({ showStands: v })} />
        <Toggle label="Dorsales" checked={el.tactics.showNumbers} onChange={(v) => set((d) => void (d.tactics.showNumbers = v))} />
      </Section>
      <TacticsCore el={el} />
    </>
  )
}
