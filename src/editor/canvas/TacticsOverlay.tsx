import { useRef, useState } from 'react'
import { Group, Circle, Rect, Line, RegularPolygon } from 'react-konva'
import type Konva from 'konva'
import type { KonvaEventObject } from 'konva/lib/Node'
import type { TacticalAnnotation, TacticsElement } from '../../model/types'
import { useEditor } from '../../store/editor'
import { useUI } from '../../store/ui'
import { playerRadius, tacticsProjection } from '../../render/painters/tactics'
import { uid } from '../../model/ids'
import type { Pt } from '../../tactics/projection'

const clampPitch = (p: Pt): Pt => ({ x: Math.max(-4, Math.min(109, +p.x.toFixed(2))), y: Math.max(-4, Math.min(72, +p.y.toFixed(2))) })

/**
 * Direct manipulation of a tactical board: drag players and annotation
 * handles, or draw new annotations with the active tool. Handles live in the
 * element's local space, so rotation/position are handled by Konva.
 */
export function TacticsOverlay({ el, zoom }: { el: TacticsElement; zoom: number }) {
  const t = el.tactics
  const proj = tacticsProjection(t, el.width, el.height)
  const updateElement = useEditor((s) => s.updateElement)
  const tool = useUI((s) => s.tacticsTool)
  const sel = useUI((s) => s.tacticsSel)
  const groupRef = useRef<Konva.Group>(null)
  const [draft, setDraft] = useState<{ a: Pt; b: Pt } | null>(null)

  const updateTactics = (fn: (tt: TacticsElement['tactics']) => void, key: string) =>
    updateElement(
      el.id,
      (d) => {
        if (d.type === 'tactics') fn(d.tactics)
      },
      { key },
    )

  const local = (): Pt | null => {
    const g = groupRef.current
    if (!g) return null
    return g.getRelativePointerPosition()
  }

  const finishDraw = () => {
    if (!draft || tool === 'select') return
    const a = clampPitch(proj.toPitch(draft.a))
    const b = clampPitch(proj.toPitch(draft.b))
    const len = Math.hypot(b.x - a.x, b.y - a.y)
    setDraft(null)
    let points: Pt[]
    if (tool === 'ball') points = [b]
    else if (len < 1.2) return
    else if (tool === 'zone') points = [a, { x: b.x, y: a.y }, b, { x: a.x, y: b.y }]
    else if (tool === 'circle' || tool === 'spotlight') points = [a, b]
    else if (tool === 'curve' || tool === 'run') {
      const mx = (a.x + b.x) / 2
      const my = (a.y + b.y) / 2
      const nx = -(b.y - a.y) * 0.25
      const ny = (b.x - a.x) * 0.25
      points = tool === 'curve' ? [a, { x: mx + nx, y: my + ny }, b] : [a, b]
    } else points = [a, b]
    const ann: TacticalAnnotation = {
      id: uid('ta'),
      kind: tool,
      points,
      color: tool === 'pass' ? '$text' : '$accent',
      width: 0.45,
      label: '',
      opacity: 1,
    }
    updateTactics((tt) => {
      tt.annotations.push(ann)
    }, `tac-add-${ann.id}`)
    useUI.getState().set({ tacticsSel: ann.id })
  }

  const hs = 7 / zoom
  return (
    <Group ref={groupRef} x={el.x} y={el.y} rotation={el.rotation}>
      <Rect width={el.width} height={el.height} stroke="#CBAA62" strokeWidth={1.5 / zoom} dash={[8 / zoom, 6 / zoom]} listening={false} />
      {/* Drawing surface (only listens while a drawing tool is active) */}
      <Rect
        width={el.width}
        height={el.height}
        fill="rgba(0,0,0,0.001)"
        listening={tool !== 'select'}
        onMouseDown={(e) => {
          e.cancelBubble = true
          const p = local()
          if (p) setDraft({ a: p, b: p })
        }}
        onMouseMove={() => {
          if (!draft) return
          const p = local()
          if (p) setDraft({ a: draft.a, b: p })
        }}
        onMouseUp={finishDraw}
        onMouseLeave={() => draft && finishDraw()}
        onTouchStart={(e) => {
          e.cancelBubble = true
          const p = local()
          if (p) setDraft({ a: p, b: p })
        }}
        onTouchMove={() => {
          if (!draft) return
          const p = local()
          if (p) setDraft({ a: draft.a, b: p })
        }}
        onTouchEnd={finishDraw}
      />
      {draft && tool !== 'select' && (
        <Line points={[draft.a.x, draft.a.y, draft.b.x, draft.b.y]} stroke="#CBAA62" strokeWidth={3 / zoom} dash={tool === 'pass' ? [10 / zoom, 8 / zoom] : undefined} listening={false} />
      )}
      {/* Annotation handles */}
      {t.annotations.map((a) =>
        a.points.map((p, i) => {
          const s = proj.toScreen(p)
          const active = sel === a.id
          return (
            <RegularPolygon
              key={`${a.id}-${i}`}
              x={s.x}
              y={s.y}
              sides={4}
              radius={(active ? 8 : 6) / zoom}
              rotation={45}
              fill={active ? '#CBAA62' : '#0B0C0F'}
              stroke="#CBAA62"
              strokeWidth={1.5 / zoom}
              draggable={tool === 'select'}
              listening={tool === 'select'}
              onMouseDown={(e: KonvaEventObject<MouseEvent>) => {
                e.cancelBubble = true
                useUI.getState().set({ tacticsSel: a.id })
              }}
              onTouchStart={(e: KonvaEventObject<TouchEvent>) => {
                e.cancelBubble = true
                useUI.getState().set({ tacticsSel: a.id })
              }}
              onDragMove={(e) => {
                const np = clampPitch(proj.toPitch({ x: e.target.x(), y: e.target.y() }))
                updateTactics((tt) => {
                  const ann = tt.annotations.find((x) => x.id === a.id)
                  if (ann && ann.points[i]) ann.points[i] = np
                }, `tac-ann-${a.id}-${i}`)
              }}
            />
          )
        }),
      )}
      {/* Player handles */}
      {t.players
        .filter((p) => (p.team === 'home' ? t.showHome : t.showAway) && p.x >= proj.region.x0 - 1 && p.x <= proj.region.x1 + 1 && p.y >= proj.region.y0 - 1 && p.y <= proj.region.y1 + 1)
        .map((p) => {
          const s = proj.toScreen(p)
          const r = playerRadius(t, proj, p)
          const lift = t.camera !== 'top' ? r * 0.55 : 0
          const active = sel === p.id
          return (
            <Circle
              key={p.id}
              x={s.x}
              y={s.y - lift}
              radius={Math.max(r * 1.15, hs * 1.4)}
              stroke={active ? '#CBAA62' : 'rgba(203,170,98,0.55)'}
              strokeWidth={(active ? 2.5 : 1.2) / zoom}
              dash={active ? undefined : [4 / zoom, 3 / zoom]}
              fill="rgba(0,0,0,0.001)"
              draggable={tool === 'select'}
              listening={tool === 'select'}
              onMouseDown={(e: KonvaEventObject<MouseEvent>) => {
                e.cancelBubble = true
                useUI.getState().set({ tacticsSel: p.id })
              }}
              onTouchStart={(e: KonvaEventObject<TouchEvent>) => {
                e.cancelBubble = true
                useUI.getState().set({ tacticsSel: p.id })
              }}
              onDragMove={(e) => {
                const np = clampPitch(proj.toPitch({ x: e.target.x(), y: e.target.y() + lift }))
                updateTactics((tt) => {
                  const pl = tt.players.find((x) => x.id === p.id)
                  if (pl) {
                    pl.x = np.x
                    pl.y = np.y
                  }
                }, `tac-player-${p.id}`)
              }}
            />
          )
        })}
    </Group>
  )
}
