import { deleteSelection } from '../actions'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Stage, Layer, Group, Shape, Rect, Transformer, Line } from 'react-konva'
import type Konva from 'konva'
import type { KonvaEventObject } from 'konva/lib/Node'
import { activeSlideOf, useActiveSlide, useEditor } from '../../store/editor'
import { useUI } from '../../store/ui'
import { useLibrary } from '../../store/library'
import { useAssetVersion } from '../../render/assetCache'
import { makeRenderCtx, type RenderCtx } from '../../render/context'
import { paintBackground, paintElementLocal, paintWatermark } from '../../render/painters'
import type { SlideElement } from '../../model/types'
import { platformZones, safeArea } from '../../model/formats'
import { TacticsOverlay } from './TacticsOverlay'
import { TextEditOverlay } from './TextEditOverlay'

interface GuideLine {
  points: number[]
}

const RATIO_TYPES = new Set(['crest', 'mascot', 'image', 'icon', 'brandMark', 'progressRing', 'model3d'])

function ElementNode({
  el,
  rc,
  onSelect,
  onDragStart,
  onDragMove,
  onDragEnd,
  onTransform,
  onDblClick,
  hidden,
}: {
  el: SlideElement
  rc: RenderCtx
  onSelect: (e: KonvaEventObject<MouseEvent | TouchEvent>, el: SlideElement) => void
  onDragStart: (e: KonvaEventObject<DragEvent>, el: SlideElement) => void
  onDragMove: (e: KonvaEventObject<DragEvent>, el: SlideElement) => void
  onDragEnd: (e: KonvaEventObject<DragEvent>, el: SlideElement) => void
  onTransform: (e: KonvaEventObject<Event>, el: SlideElement) => void
  onDblClick: (el: SlideElement) => void
  hidden: boolean
}) {
  const sceneFunc = useCallback(
    (ctx: Konva.Context) => {
      paintElementLocal(ctx._context, el, rc)
    },
    [el, rc],
  )
  const hitFunc = useCallback(
    (ctx: Konva.Context, shape: Konva.Shape) => {
      ctx.beginPath()
      ctx.rect(0, 0, el.width, el.height)
      ctx.closePath()
      ctx.fillStrokeShape(shape)
    },
    [el.width, el.height],
  )
  return (
    <Group
      id={el.id}
      name="element"
      x={el.x}
      y={el.y}
      rotation={el.rotation}
      visible={el.visible && rc.shown(el)}
      listening={!el.locked && el.visible && rc.shown(el)}
      draggable={!el.locked}
      onMouseDown={(e) => onSelect(e, el)}
      onTouchStart={(e) => onSelect(e, el)}
      onDragStart={(e) => onDragStart(e, el)}
      onDragMove={(e) => onDragMove(e, el)}
      onDragEnd={(e) => onDragEnd(e, el)}
      onTransform={(e) => onTransform(e, el)}
      onDblClick={() => onDblClick(el)}
      onDblTap={() => onDblClick(el)}
    >
      <Shape
        width={el.width}
        height={el.height}
        opacity={hidden ? 0.25 : el.opacity}
        globalCompositeOperation={(el.fx?.blend ?? 'source-over') as GlobalCompositeOperation}
        sceneFunc={sceneFunc}
        hitFunc={hitFunc}
        perfectDrawEnabled={false}
      />
    </Group>
  )
}

function ContextMenu({ x, y, onClose }: { x: number; y: number; onClose: () => void }) {
  const ed = useEditor.getState()
  const sel = useEditor((s) => s.selection)
  const hasClip = useEditor((s) => !!s.clipboard?.length)
  const slide = activeSlideOf(useEditor.getState())
  const els = slide?.elements.filter((e) => sel.includes(e.id)) ?? []
  const allLocked = els.length > 0 && els.every((e) => e.locked)
  const items: { label: string; kbd?: string; run: () => void; disabled?: boolean; danger?: boolean }[] = [
    { label: 'Copiar', kbd: 'Ctrl+C', run: ed.copySelection, disabled: !els.length },
    { label: 'Pegar', kbd: 'Ctrl+V', run: ed.paste, disabled: !hasClip },
    { label: 'Duplicar', kbd: 'Ctrl+D', run: ed.duplicateSelection, disabled: !els.length },
    { label: 'Traer al frente', kbd: 'Ctrl+⇧+]', run: () => ed.reorderSelection('top'), disabled: !els.length },
    { label: 'Enviar al fondo', kbd: 'Ctrl+⇧+[', run: () => ed.reorderSelection('bottom'), disabled: !els.length },
    { label: allLocked ? 'Desbloquear' : 'Bloquear', run: () => ed.updateElements(sel, (e) => void (e.locked = !allLocked)), disabled: !els.length },
    { label: 'Eliminar', kbd: 'Supr', run: deleteSelection, disabled: !els.length, danger: true },
  ]
  return (
    <div className="animate-in absolute z-30 w-52 rounded-lg border border-line-2 bg-panel-2 p-1 shadow-2xl" style={{ left: x, top: y }} role="menu" onMouseLeave={onClose}>
      {items.map((it) => (
        <button
          key={it.label}
          type="button"
          role="menuitem"
          disabled={it.disabled}
          className={`flex w-full items-center justify-between rounded-md px-2.5 py-1.5 text-left text-[12px] hover:bg-white/6 disabled:opacity-35 ${it.danger ? 'text-loss' : ''}`}
          onClick={() => {
            it.run()
            onClose()
          }}
        >
          {it.label}
          {it.kbd && <span className="text-[10px] text-dim">{it.kbd}</span>}
        </button>
      ))}
    </div>
  )
}

export function EditorCanvas({ mobile = false }: { mobile?: boolean } = {}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const stageRef = useRef<Konva.Stage>(null)
  const contentRef = useRef<Konva.Group>(null)
  const trRef = useRef<Konva.Transformer>(null)
  const [size, setSize] = useState({ w: 800, h: 600 })
  const project = useEditor((s) => s.project)!
  const slide = useActiveSlide()!
  const selection = useEditor((s) => s.selection)
  const select = useEditor((s) => s.select)
  const toggleSelect = useEditor((s) => s.toggleSelect)
  const update = useEditor((s) => s.update)
  const brand = useLibrary((s) => s.brand)
  const assetVersion = useAssetVersion((s) => s.version)
  const ui = useUI()
  const { zoom, pan, autoFit, showGrid, snapToGrid, gridSize, showSafeArea, snapGuides, editingTextId, tacticsEditId } = ui
  const W = project.format.width
  const H = project.format.height
  const [guides, setGuides] = useState<GuideLine[]>([])
  const dragStart = useRef<Map<string, { x: number; y: number }>>(new Map())
  const [spaceDown, setSpaceDown] = useState(false)
  const panning = useRef<{ x: number; y: number; px: number; py: number } | null>(null)
  const [marquee, setMarquee] = useState<{ x0: number; y0: number; x1: number; y1: number; add: boolean } | null>(null)
  const marqueeRef = useRef(marquee)
  marqueeRef.current = marquee
  const [menu, setMenu] = useState<{ x: number; y: number } | null>(null)

  // Resize observer
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const ro = new ResizeObserver(() => setSize({ w: el.clientWidth, h: el.clientHeight }))
    ro.observe(el)
    setSize({ w: el.clientWidth, h: el.clientHeight })
    return () => ro.disconnect()
  }, [])

  // Fit to screen
  useEffect(() => {
    if (!autoFit || size.w < 50) return
    // Phones give the page almost all the space.
    const pad = mobile ? 24 : 96
    const z = Math.max(0.05, Math.min((size.w - pad) / W, (size.h - pad) / H))
    useUI.getState().set({ zoom: z, pan: { x: (size.w - W * z) / 2, y: (size.h - H * z) / 2 } })
  }, [autoFit, size.w, size.h, W, H, mobile])

  const rc = useMemo(() => {
    void assetVersion
    return makeRenderCtx(project, slide, brand, 'editor')
  }, [project, slide, brand, assetVersion])

  // Attach transformer to selected nodes
  useEffect(() => {
    const tr = trRef.current
    const stage = stageRef.current
    if (!tr || !stage) return
    const nodes = selection
      .filter((id) => id !== editingTextId && id !== tacticsEditId)
      .map((id) => stage.findOne(`#${id}`))
      .filter((n): n is Konva.Node => !!n && n.listening())
    tr.nodes(nodes)
    const els = slide.elements.filter((e) => selection.includes(e.id))
    tr.keepRatio(els.length > 0 && els.every((e) => RATIO_TYPES.has(e.type)))
    tr.getLayer()?.batchDraw()
  }, [selection, slide, editingTextId, tacticsEditId])

  const others = useMemo(() => slide.elements.filter((e) => e.visible && rc.shown(e) && !selection.includes(e.id) && !(e.type === 'effect' && e.width >= W * 0.95)), [slide.elements, selection, W, rc])

  const onSelect = useCallback(
    (e: KonvaEventObject<MouseEvent | TouchEvent>, el: SlideElement) => {
      if (spaceDown) return
      e.cancelBubble = true
      const shift = 'shiftKey' in e.evt && (e.evt.shiftKey || e.evt.metaKey || e.evt.ctrlKey)
      if (tacticsEditId && tacticsEditId !== el.id) useUI.getState().set({ tacticsEditId: null, tacticsSel: null })
      if (shift) toggleSelect(el.id)
      else if (!useEditor.getState().selection.includes(el.id)) select([el.id])
    },
    [select, toggleSelect, tacticsEditId, spaceDown],
  )

  const onDragStart = useCallback(
    (e: KonvaEventObject<DragEvent>, el: SlideElement) => {
      if (spaceDown) {
        e.target.stopDrag()
        return
      }
      const sel = useEditor.getState().selection
      const ids = sel.includes(el.id) ? sel : [el.id]
      if (!sel.includes(el.id)) select([el.id])
      dragStart.current = new Map()
      const stage = stageRef.current!
      for (const id of ids) {
        const n = stage.findOne(`#${id}`)
        if (n) dragStart.current.set(id, { x: n.x(), y: n.y() })
      }
    },
    [select, spaceDown],
  )

  const onDragMove = useCallback(
    (e: KonvaEventObject<DragEvent>, el: SlideElement) => {
      const node = e.target
      if (node.id() !== el.id) return
      const start = dragStart.current.get(el.id)
      const content = contentRef.current
      if (!start || !content) return
      const lines: GuideLine[] = []
      if (snapGuides || snapToGrid) {
        const box = node.getClientRect({ relativeTo: content as unknown as Konva.Container, skipShadow: true })
        const threshold = 7 / zoom
        const vx = [0, W / 2, W, ...others.flatMap((o) => [o.x, o.x + o.width / 2, o.x + o.width])]
        const hy = [0, H / 2, H, ...others.flatMap((o) => [o.y, o.y + o.height / 2, o.y + o.height])]
        const edgesX = [box.x, box.x + box.width / 2, box.x + box.width]
        const edgesY = [box.y, box.y + box.height / 2, box.y + box.height]
        let bestX: { d: number; t: number } | null = null
        let bestY: { d: number; t: number } | null = null
        if (snapGuides) {
          for (const t of vx) for (const ex of edgesX) if (Math.abs(t - ex) < threshold && (!bestX || Math.abs(t - ex) < Math.abs(bestX.d))) bestX = { d: t - ex, t }
          for (const t of hy) for (const ey of edgesY) if (Math.abs(t - ey) < threshold && (!bestY || Math.abs(t - ey) < Math.abs(bestY.d))) bestY = { d: t - ey, t }
        }
        if (bestX) {
          node.x(node.x() + bestX.d)
          lines.push({ points: [bestX.t, -4000, bestX.t, H + 4000] })
        } else if (snapToGrid) node.x(Math.round(node.x() / gridSize) * gridSize)
        if (bestY) {
          node.y(node.y() + bestY.d)
          lines.push({ points: [-4000, bestY.t, W + 4000, bestY.t] })
        } else if (snapToGrid) node.y(Math.round(node.y() / gridSize) * gridSize)
      }
      setGuides(lines)
      // Move the rest of the selection by the same delta.
      const dx = node.x() - start.x
      const dy = node.y() - start.y
      const stage = stageRef.current!
      for (const [id, p] of dragStart.current) {
        if (id === el.id) continue
        stage.findOne(`#${id}`)?.position({ x: p.x + dx, y: p.y + dy })
      }
    },
    [W, H, others, zoom, snapGuides, snapToGrid, gridSize],
  )

  const onDragEnd = useCallback(() => {
    setGuides([])
    const stage = stageRef.current!
    const moved = [...dragStart.current.keys()]
    const pos = new Map(moved.map((id) => [id, stage.findOne(`#${id}`)?.position()]))
    update((d) => {
      const s = d.slides.find((x) => x.id === slide.id)
      if (!s) return
      for (const el of s.elements) {
        const p = pos.get(el.id)
        if (p) {
          el.x = Math.round(p.x * 10) / 10
          el.y = Math.round(p.y * 10) / 10
        }
      }
    })
    dragStart.current = new Map()
  }, [update, slide.id])

  const onTransform = useCallback(
    (e: KonvaEventObject<Event>, el: SlideElement) => {
      const node = e.target
      if (node.id() !== el.id) return
      const sx = node.scaleX()
      const sy = node.scaleY()
      node.scaleX(1)
      node.scaleY(1)
      const anchor = trRef.current?.getActiveAnchor() ?? ''
      const corner = anchor.includes('-') && !anchor.startsWith('rotater')
      update(
        (d) => {
          const s = d.slides.find((x) => x.id === slide.id)
          const t = s?.elements.find((x) => x.id === el.id)
          if (!t) return
          t.x = node.x()
          t.y = node.y()
          t.rotation = Math.round(node.rotation() * 100) / 100
          t.width = Math.max(4, t.width * sx)
          t.height = Math.max(4, t.height * sy)
          if (t.type === 'text' && corner) {
            const k = Math.sqrt(Math.abs(sx * sy))
            t.fontSize = Math.max(6, t.fontSize * k)
            t.minFontSize = Math.max(6, t.minFontSize * k)
            t.letterSpacing = t.letterSpacing * k
          }
        },
        { key: 'transform' },
      )
    },
    [update, slide.id],
  )

  const onDblClick = useCallback((el: SlideElement) => {
    if (el.type === 'text') useUI.getState().set({ editingTextId: el.id })
    else if (el.type === 'tactics') useUI.getState().set({ tacticsEditId: el.id, tacticsSel: null })
  }, [])

  // Stage-level interactions: deselect, pan, zoom
  const onStageMouseDown = (e: KonvaEventObject<MouseEvent>) => {
    const isPan = spaceDown || e.evt.button === 1
    if (isPan) {
      panning.current = { x: e.evt.clientX, y: e.evt.clientY, px: pan.x, py: pan.y }
      e.evt.preventDefault()
      return
    }
    const t = e.target
    if (t === stageRef.current || t.name() === 'background' || t.name() === 'pasteboard') {
      const add = e.evt.shiftKey || e.evt.metaKey || e.evt.ctrlKey
      if (!add) select([])
      if (tacticsEditId) useUI.getState().set({ tacticsEditId: null, tacticsSel: null })
      // Start a rubber-band selection in slide coordinates.
      const ptr = stageRef.current!.getPointerPosition()
      if (ptr && e.evt.button === 0) {
        const x = (ptr.x - pan.x) / zoom
        const y = (ptr.y - pan.y) / zoom
        setMarquee({ x0: x, y0: y, x1: x, y1: y, add })
      }
    }
  }
  useEffect(() => {
    if (!marquee) return
    const move = (ev: MouseEvent) => {
      const rect = containerRef.current?.getBoundingClientRect()
      if (!rect || !marqueeRef.current) return
      const { zoom: z, pan: p } = useUI.getState()
      setMarquee({ ...marqueeRef.current, x1: (ev.clientX - rect.left - p.x) / z, y1: (ev.clientY - rect.top - p.y) / z })
    }
    const up = () => {
      const m = marqueeRef.current
      setMarquee(null)
      if (!m) return
      const x0 = Math.min(m.x0, m.x1)
      const x1 = Math.max(m.x0, m.x1)
      const y0 = Math.min(m.y0, m.y1)
      const y1 = Math.max(m.y0, m.y1)
      if (x1 - x0 < 4 && y1 - y0 < 4) return
      const s = activeSlideOf(useEditor.getState())
      if (!s) return
      const hits = s.elements.filter((el) => el.visible && rc.shown(el) && !el.locked && el.x < x1 && el.x + el.width > x0 && el.y < y1 && el.y + el.height > y0).map((el) => el.id)
      const cur = useEditor.getState().selection
      useEditor.getState().select(m.add ? [...new Set([...cur, ...hits])] : hits)
    }
    window.addEventListener('mousemove', move)
    window.addEventListener('mouseup', up)
    return () => {
      window.removeEventListener('mousemove', move)
      window.removeEventListener('mouseup', up)
    }
  }, [marquee !== null])
  useEffect(() => {
    const move = (e: MouseEvent) => {
      const p = panning.current
      if (!p) return
      useUI.getState().set({ autoFit: false, pan: { x: p.px + e.clientX - p.x, y: p.py + e.clientY - p.y } })
    }
    const up = () => (panning.current = null)
    window.addEventListener('mousemove', move)
    window.addEventListener('mouseup', up)
    return () => {
      window.removeEventListener('mousemove', move)
      window.removeEventListener('mouseup', up)
    }
  }, [])
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName
      if (e.code === 'Space' && tag !== 'INPUT' && tag !== 'TEXTAREA' && tag !== 'SELECT') {
        setSpaceDown(true)
        e.preventDefault()
      }
    }
    const up = (e: KeyboardEvent) => e.code === 'Space' && setSpaceDown(false)
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
    }
  }, [])

  const onWheel = (e: KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault()
    const stage = stageRef.current!
    if (e.evt.ctrlKey || e.evt.metaKey) {
      const pointer = stage.getPointerPosition() ?? { x: size.w / 2, y: size.h / 2 }
      const factor = Math.exp(-e.evt.deltaY * 0.0022)
      const nz = Math.max(0.05, Math.min(4, zoom * factor))
      const wx = (pointer.x - pan.x) / zoom
      const wy = (pointer.y - pan.y) / zoom
      useUI.getState().set({ autoFit: false, zoom: nz, pan: { x: pointer.x - wx * nz, y: pointer.y - wy * nz } })
    } else {
      useUI.getState().set({ autoFit: false, pan: { x: pan.x - e.evt.deltaX, y: pan.y - e.evt.deltaY } })
    }
  }

  const bgScene = useCallback((ctx: Konva.Context) => paintBackground(ctx._context, slide, rc, W, H), [slide, rc, W, H])
  const wmScene = useCallback((ctx: Konva.Context) => paintWatermark(ctx._context, rc, W, H), [rc, W, H])
  const safe = safeArea(project.format)

  const gridScene = useCallback(
    (ctx: Konva.Context) => {
      const c = ctx._context
      c.strokeStyle = 'rgba(203,170,98,0.16)'
      c.lineWidth = 1 / zoom
      c.beginPath()
      for (let x = 0; x <= W; x += gridSize) {
        c.moveTo(x, 0)
        c.lineTo(x, H)
      }
      for (let y = 0; y <= H; y += gridSize) {
        c.moveTo(0, y)
        c.lineTo(W, y)
      }
      c.stroke()
      c.strokeStyle = 'rgba(203,170,98,0.4)'
      c.beginPath()
      c.moveTo(W / 2, 0)
      c.lineTo(W / 2, H)
      c.moveTo(0, H / 2)
      c.lineTo(W, H / 2)
      c.stroke()
    },
    [W, H, gridSize, zoom],
  )

  const safeScene = useCallback(
    (ctx: Konva.Context) => {
      const c = ctx._context
      c.fillStyle = 'rgba(255,64,85,0.13)'
      c.font = `600 ${12 / zoom}px "Inter Variable"`
      for (const z of platformZones(project.format)) {
        c.fillStyle = 'rgba(255,64,85,0.13)'
        c.fillRect(z.x, z.y, z.w, z.h)
        c.fillStyle = 'rgba(255,190,190,0.8)'
        c.fillText(z.label.toUpperCase(), z.x + 8 / zoom, z.y + 18 / zoom)
      }
      c.setLineDash([12 / zoom, 8 / zoom])
      c.strokeStyle = 'rgba(239,70,85,0.8)'
      c.lineWidth = 1.5 / zoom
      c.strokeRect(safe.left, safe.top, W - safe.left - safe.right, H - safe.top - safe.bottom)
      c.setLineDash([])
      c.fillStyle = 'rgba(255,190,190,0.85)'
      c.font = `600 ${12 / zoom}px "Inter Variable"`
      c.fillText('ZONA DE INTERFAZ DE LA PLATAFORMA (solo guía, no se exporta)', safe.left, safe.top - 8 / zoom)
    },
    [W, H, safe, zoom, project.format],
  )

  const editingEl = slide.elements.find((e) => e.id === editingTextId)
  const tacticsEl = slide.elements.find((e) => e.id === tacticsEditId)

  return (
    <div ref={containerRef} className="relative h-full w-full overflow-hidden" style={{ cursor: spaceDown ? (panning.current ? 'grabbing' : 'grab') : 'default', background: mobile ? '#0d0d0f' : 'radial-gradient(ellipse at 50% 40%, #15181d 0%, #0b0c0f 70%)', touchAction: 'none' }} data-testid="canvas-workspace">
      <Stage
        ref={stageRef}
        width={size.w}
        height={size.h}
        onContextMenu={(e) => {
          e.evt.preventDefault()
          let n: Konva.Node | null = e.target
          while (n && n.name() !== 'element') n = n.getParent()
          if (n && !useEditor.getState().selection.includes(n.id())) select([n.id()])
          const rect = containerRef.current!.getBoundingClientRect()
          setMenu({ x: e.evt.clientX - rect.left, y: e.evt.clientY - rect.top })
        }}
        onMouseDown={(e) => {
          setMenu(null)
          onStageMouseDown(e)
        }} onWheel={onWheel} onTouchStart={(e) => {
          const t = e.target
          if (t === stageRef.current || t.name() === 'background' || t.name() === 'pasteboard') {
            select([])
            if (tacticsEditId) useUI.getState().set({ tacticsEditId: null, tacticsSel: null })
          }
        }}>
        <Layer>
          <Group x={pan.x} y={pan.y} scaleX={zoom} scaleY={zoom}>
            <Rect name="pasteboard" x={-20000} y={-20000} width={40000} height={40000} fill="rgba(0,0,0,0)" />
            <Rect x={0} y={0} width={W} height={H} fill="#000" shadowColor="#000" shadowBlur={60} shadowOpacity={0.7} shadowOffsetY={18} listening={false} />
            <Group ref={contentRef} clipX={0} clipY={0} clipWidth={W} clipHeight={H}>
              <Shape name="background" width={W} height={H} sceneFunc={bgScene} hitFunc={(ctx, shape) => { ctx.beginPath(); ctx.rect(0, 0, W, H); ctx.closePath(); ctx.fillStrokeShape(shape) }} />
              {slide.elements.map((el) => (
                <ElementNode
                  key={el.id}
                  el={el}
                  rc={rc}
                  hidden={el.id === editingTextId}
                  onSelect={onSelect}
                  onDragStart={onDragStart}
                  onDragMove={onDragMove}
                  onDragEnd={onDragEnd}
                  onTransform={onTransform}
                  onDblClick={onDblClick}
                />
              ))}
              <Shape listening={false} width={W} height={H} sceneFunc={wmScene} />
            </Group>
          </Group>
        </Layer>
        <Layer>
          <Group x={pan.x} y={pan.y} scaleX={zoom} scaleY={zoom}>
            {showGrid && <Shape listening={false} sceneFunc={gridScene} />}
            {showSafeArea && <Shape listening={false} sceneFunc={safeScene} />}
            {marquee && (
              <Rect
                x={Math.min(marquee.x0, marquee.x1)}
                y={Math.min(marquee.y0, marquee.y1)}
                width={Math.abs(marquee.x1 - marquee.x0)}
                height={Math.abs(marquee.y1 - marquee.y0)}
                fill="rgba(203,170,98,0.08)"
                stroke="#CBAA62"
                strokeWidth={1 / zoom}
                dash={[5 / zoom, 4 / zoom]}
                listening={false}
              />
            )}
            {guides.map((g, i) => (
              <Line key={i} points={g.points} stroke="#CBAA62" strokeWidth={1 / zoom} dash={[6 / zoom, 4 / zoom]} listening={false} />
            ))}
            {tacticsEl && tacticsEl.type === 'tactics' && <TacticsOverlay el={tacticsEl} zoom={zoom} />}
          </Group>
          <Transformer
            ref={trRef}
            rotateEnabled
            rotationSnaps={[0, 45, 90, 135, 180, 225, 270, 315]}
            rotationSnapTolerance={4}
            anchorSize={mobile ? 18 : 9}
            anchorCornerRadius={mobile ? 9 : 2}
            enabledAnchors={mobile ? ['top-left', 'top-right', 'bottom-left', 'bottom-right'] : undefined}
            anchorStroke="#CBAA62"
            anchorFill="#0B0C0F"
            borderStroke="#CBAA62"
            borderStrokeWidth={1.2}
            rotateAnchorOffset={mobile ? 36 : 26}
            padding={0}
            ignoreStroke
            flipEnabled={false}
            boundBoxFunc={(oldBox, newBox) => (Math.abs(newBox.width) < 8 || Math.abs(newBox.height) < 8 ? oldBox : newBox)}
          />
        </Layer>
      </Stage>
      {!mobile && editingEl && editingEl.type === 'text' && <TextEditOverlay el={editingEl} zoom={zoom} pan={pan} />}
      {!mobile && menu && <ContextMenu x={menu.x} y={menu.y} onClose={() => setMenu(null)} />}
    </div>
  )
}
