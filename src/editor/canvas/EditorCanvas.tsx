import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Stage, Layer, Group, Shape, Rect, Transformer, Line } from 'react-konva'
import type Konva from 'konva'
import type { KonvaEventObject } from 'konva/lib/Node'
import { useActiveSlide, useEditor } from '../../store/editor'
import { useUI } from '../../store/ui'
import { useLibrary } from '../../store/library'
import { useAssetVersion } from '../../render/assetCache'
import { makeRenderCtx, type RenderCtx } from '../../render/context'
import { paintBackground, paintElementLocal, paintWatermark } from '../../render/painters'
import type { SlideElement } from '../../model/types'
import { safeArea } from '../../model/formats'
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
      visible={el.visible}
      listening={!el.locked && el.visible}
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

export function EditorCanvas() {
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
    const z = Math.max(0.05, Math.min((size.w - 96) / W, (size.h - 96) / H))
    useUI.getState().set({ zoom: z, pan: { x: (size.w - W * z) / 2, y: (size.h - H * z) / 2 } })
  }, [autoFit, size.w, size.h, W, H])

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

  const others = useMemo(() => slide.elements.filter((e) => e.visible && !selection.includes(e.id) && !(e.type === 'effect' && e.width >= W * 0.95)), [slide.elements, selection, W])

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
      select([])
      if (tacticsEditId) useUI.getState().set({ tacticsEditId: null, tacticsSel: null })
    }
  }
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
      c.fillStyle = 'rgba(239,70,85,0.12)'
      c.fillRect(0, 0, W, safe.top)
      c.fillRect(0, H - safe.bottom, W, safe.bottom)
      c.fillRect(W - safe.right, safe.top, safe.right, H - safe.top - safe.bottom)
      c.setLineDash([12 / zoom, 8 / zoom])
      c.strokeStyle = 'rgba(239,70,85,0.8)'
      c.lineWidth = 1.5 / zoom
      c.strokeRect(safe.left, safe.top, W - safe.left - safe.right, H - safe.top - safe.bottom)
      c.setLineDash([])
      c.fillStyle = 'rgba(255,190,190,0.85)'
      c.font = `600 ${12 / zoom}px "Inter Variable"`
      c.fillText('ZONA DE INTERFAZ DE LA PLATAFORMA (solo guía, no se exporta)', safe.left, safe.top - 8 / zoom)
    },
    [W, H, safe, zoom],
  )

  const editingEl = slide.elements.find((e) => e.id === editingTextId)
  const tacticsEl = slide.elements.find((e) => e.id === tacticsEditId)

  return (
    <div ref={containerRef} className="relative h-full w-full overflow-hidden" style={{ cursor: spaceDown ? (panning.current ? 'grabbing' : 'grab') : 'default', background: 'radial-gradient(ellipse at 50% 40%, #15181d 0%, #0b0c0f 70%)' }} data-testid="canvas-workspace">
      <Stage ref={stageRef} width={size.w} height={size.h} onMouseDown={onStageMouseDown} onWheel={onWheel} onTouchStart={(e) => e.target === stageRef.current && select([])}>
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
            anchorSize={9}
            anchorCornerRadius={2}
            anchorStroke="#CBAA62"
            anchorFill="#0B0C0F"
            borderStroke="#CBAA62"
            borderStrokeWidth={1.2}
            rotateAnchorOffset={26}
            padding={0}
            ignoreStroke
            flipEnabled={false}
            boundBoxFunc={(oldBox, newBox) => (Math.abs(newBox.width) < 8 || Math.abs(newBox.height) < 8 ? oldBox : newBox)}
          />
        </Layer>
      </Stage>
      {editingEl && editingEl.type === 'text' && <TextEditOverlay el={editingEl} zoom={zoom} pan={pan} />}
    </div>
  )
}
