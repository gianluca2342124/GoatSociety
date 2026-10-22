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
import { isConfirmOpen } from '../../ui/confirm'

interface GuideLine {
  points: number[]
}

const RATIO_TYPES = new Set(['crest', 'mascot', 'image', 'icon', 'brandMark', 'progressRing', 'model3d'])
const CORNER_ANCHORS = ['top-left', 'top-right', 'bottom-left', 'bottom-right']
const ALL_ANCHORS = ['top-left', 'top-center', 'top-right', 'middle-right', 'middle-left', 'bottom-left', 'bottom-center', 'bottom-right']
// Each resize/rotate gesture is one undo step, however slow. Module-wide so a
// remounted canvas (desktop ↔ phone layout) never reuses an earlier key.
let transformSeq = 0

function ElementNode({
  el,
  rc,
  onSelect,
  onTap,
  onClickEl,
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
  onTap: (el: SlideElement) => void
  onClickEl: (e: KonvaEventObject<MouseEvent>, el: SlideElement) => void
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
      onTap={() => onTap(el)}
      onClick={(e) => onClickEl(e, el)}
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
  const canvasBusy = useUI((s) => s.canvasBusy)
  useEffect(() => {
    if (!autoFit || size.w < 50 || canvasBusy) return
    // Phones give the page almost all the space.
    const pad = mobile ? 24 : 96
    const z = Math.max(0.01, Math.min((size.w - pad) / W, (size.h - pad) / H))
    useUI.getState().set({ zoom: z, pan: { x: (size.w - W * z) / 2, y: (size.h - H * z) / 2 } })
  }, [autoFit, size.w, size.h, W, H, mobile, canvasBusy])

  const rc = useMemo(() => {
    void assetVersion
    const r = makeRenderCtx(project, slide, brand, 'editor')
    // While elements are dragged, the shade under content follows their nodes live.
    r.live = (id) => (dragLead.current && dragStart.current.has(id) ? (stageRef.current?.findOne(`#${id}`)?.position() ?? null) : null)
    return r
  }, [project, slide, brand, assetVersion])

  // An undo/redo or page change can remove the element being edited: drop the stale edit state.
  useEffect(() => {
    const ui = useUI.getState()
    const has = (id: string | null) => !id || slide.elements.some((e) => e.id === id)
    if (!has(ui.editingTextId) || !has(ui.tacticsEditId)) ui.set({ editingTextId: has(ui.editingTextId) ? ui.editingTextId : null, tacticsEditId: has(ui.tacticsEditId) ? ui.tacticsEditId : null, tacticsSel: null })
  }, [slide])

  // Attach transformer to selected nodes
  useEffect(() => {
    const tr = trRef.current
    const stage = stageRef.current
    if (!tr || !stage) return
    const nodes = selection
      .filter((id) => id !== editingTextId && id !== tacticsEditId)
      .map((id) => stage.findOne(`#${id}`))
      .filter((n): n is Konva.Node => !!n && n.listening())
    // Re-attaching resets the frame of a multi-selection (its rotation), which made
    // group rotation pile up on every store update: only re-attach on a real change.
    const current = tr.nodes()
    const same = current.length === nodes.length && nodes.every((n, i) => n === current[i])
    if (!same) tr.nodes(nodes)
    else if (!tr.isTransforming()) tr.forceUpdate()
    const els = slide.elements.filter((e) => selection.includes(e.id))
    // Groups scale proportionally from the corners, like single crests and images.
    tr.keepRatio(nodes.length > 1 || (els.length > 0 && els.every((e) => RATIO_TYPES.has(e.type))))
    // With no nodes the transformer must disappear now: a deferred redraw after a
    // delete/undo can otherwise leave the old frame painted on the canvas.
    tr.visible(nodes.length > 0)
    if (nodes.length) tr.getLayer()?.batchDraw()
    else tr.getLayer()?.draw()
  }, [selection, slide, editingTextId, tacticsEditId])

  const others = useMemo(() => slide.elements.filter((e) => e.visible && rc.shown(e) && !selection.includes(e.id) && !(e.type === 'effect' && e.width >= W * 0.95)), [slide.elements, selection, W, rc])

  // Phone multi-selection: a press adds an element at once (so it can be dragged
  // with the group); a plain tap on an element that was already selected removes it.
  const pressedSelected = useRef<string | null>(null)
  const onSelect = useCallback(
    (e: KonvaEventObject<MouseEvent | TouchEvent>, el: SlideElement) => {
      if (spaceDown) return
      e.cancelBubble = true
      const shift = 'shiftKey' in e.evt && (e.evt.shiftKey || e.evt.metaKey || e.evt.ctrlKey)
      const multi = useUI.getState().multiSelect
      if (tacticsEditId && tacticsEditId !== el.id) useUI.getState().set({ tacticsEditId: null, tacticsSel: null })
      // Phones: touching another element finishes the text being edited.
      if (mobile && useUI.getState().editingTextId && useUI.getState().editingTextId !== el.id) useUI.getState().set({ editingTextId: null })
      const selected = useEditor.getState().selection.includes(el.id)
      pressedSelected.current = multi && selected ? el.id : null
      if (multi) {
        if (!selected) toggleSelect(el.id)
      } else if (shift) toggleSelect(el.id)
      else if (!selected) select([el.id])
    },
    [select, toggleSelect, tacticsEditId, spaceDown, mobile],
  )

  const onTap = useCallback(
    (el: SlideElement) => {
      const sel = useEditor.getState().selection
      if (useUI.getState().multiSelect) {
        if (pressedSelected.current === el.id) toggleSelect(el.id)
      } else if (sel.length > 1 && sel.includes(el.id)) select([el.id])
      pressedSelected.current = null
    },
    [toggleSelect, select],
  )

  // A plain click (no drag) on one element of a multi-selection selects just that element.
  const onClickEl = useCallback(
    (e: KonvaEventObject<MouseEvent>, el: SlideElement) => {
      if (e.evt.button !== 0 || e.evt.shiftKey || e.evt.metaKey || e.evt.ctrlKey || useUI.getState().multiSelect) return
      const sel = useEditor.getState().selection
      if (sel.length > 1 && sel.includes(el.id)) select([el.id])
    },
    [select],
  )


  // Konva's transformer drags every selected node together (it starts a drag on
  // each of them), so the element under the pointer leads and the others follow.
  const dragLead = useRef<string | null>(null)
  const onDragStart = useCallback(
    (e: KonvaEventObject<DragEvent>, el: SlideElement) => {
      if (spaceDown) {
        e.target.stopDrag()
        return
      }
      // Followers of a group drag start while the leader is still dragging.
      if (dragLead.current && stageRef.current?.findOne(`#${dragLead.current}`)?.isDragging()) return
      const sel = useEditor.getState().selection
      const ids = sel.includes(el.id) ? sel : [el.id]
      if (!sel.includes(el.id)) select([el.id])
      dragLead.current = el.id
      dragStart.current = new Map()
      useUI.getState().set({ canvasBusy: true })
      const stage = stageRef.current!
      for (const id of ids) {
        const n = stage.findOne(`#${id}`)
        // Locked or hidden members never move.
        if (n && n.draggable() && n.isVisible()) dragStart.current.set(id, { x: n.x(), y: n.y() })
      }
    },
    [select, spaceDown],
  )

  const onDragMove = useCallback(
    (e: KonvaEventObject<DragEvent>, el: SlideElement) => {
      const node = e.target
      if (node.id() !== el.id || dragLead.current !== el.id) return
      const start = dragStart.current.get(el.id)
      const content = contentRef.current
      if (!start || !content) return
      const lines: GuideLine[] = []
      // Snap single elements only: the followers of a group drag track the pointer, not the leader.
      if ((snapGuides || snapToGrid) && dragStart.current.size === 1) {
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
    },
    [W, H, others, zoom, snapGuides, snapToGrid, gridSize],
  )

  const onDragEnd = useCallback((_e: KonvaEventObject<DragEvent>, el: SlideElement) => {
    // Every node of a group drag ends; save once, when the leader does.
    if (dragLead.current !== el.id) return
    dragLead.current = null
    useUI.getState().set({ canvasBusy: false })
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
      // A stretched group with mixed rotations can leave a skew the model can't store.
      node.skewX(0)
      node.skewY(0)
      const anchor = trRef.current?.getActiveAnchor() ?? ''
      // Only the four corners scale the type; side handles just reshape the box.
      const corner = /^(top|bottom)-(left|right)$/.test(anchor)
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
        { key: `transform-${transformSeq}`, sticky: true },
      )
    },
    [update, slide.id],
  )

  const onDblClick = useCallback((el: SlideElement) => {
    if (el.type === 'text') useUI.getState().set({ editingTextId: el.id })
    else if (el.type === 'tactics') useUI.getState().set({ tacticsEditId: el.id, tacticsSel: null, tacticsTool: 'select' })
  }, [])

  /** Drawn (rotated) bounding box of an element, in page units. */
  const boxOf = (el: SlideElement) => {
    const node = stageRef.current?.findOne(`#${el.id}`)
    const content = contentRef.current
    if (node && content) return node.getClientRect({ relativeTo: content as unknown as Konva.Container, skipShadow: true })
    return { x: el.x, y: el.y, width: el.width, height: el.height }
  }
  /** Topmost element whose drawn box contains a screen point. */
  const elementAt = (clientX: number, clientY: number, includeLocked: boolean): string | null => {
    const rect = containerRef.current?.getBoundingClientRect()
    const s = activeSlideOf(useEditor.getState())
    if (!rect || !s) return null
    const x = (clientX - rect.left - pan.x) / zoom
    const y = (clientY - rect.top - pan.y) / zoom
    for (const el of [...s.elements].reverse()) {
      if (!el.visible || !rc.shown(el) || (el.locked && !includeLocked)) continue
      if (el.type === 'effect' && el.width >= W * 0.95) continue
      const b = boxOf(el)
      if (x >= b.x && x <= b.x + b.width && y >= b.y && y <= b.y + b.height) return el.id
    }
    return null
  }

  // Stage-level interactions: deselect, pan, zoom
  const onStageMouseDown = (e: KonvaEventObject<MouseEvent>) => {
    if (e.evt.button === 2) return
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
      const hits = s.elements
        .filter((el) => el.visible && rc.shown(el) && !el.locked)
        .filter((el) => {
          const b = boxOf(el)
          return b.x < x1 && b.x + b.width > x0 && b.y < y1 && b.y + b.height > y0
        })
        .map((el) => el.id)
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
    // Controls that got focus from a click or tap (not from Tab).
    let pointerAt = 0
    const clicked = new WeakSet<EventTarget>()
    const pointer = () => (pointerAt = performance.now())
    const focusin = (e: FocusEvent) => {
      if (!e.target) return
      if (performance.now() - pointerAt < 600) clicked.add(e.target)
      else clicked.delete(e.target)
    }
    const down = (e: KeyboardEvent) => {
      if (e.code !== 'Space' || useUI.getState().modal || isConfirmOpen()) return
      const t = e.target as HTMLElement | null
      // Fields keep their Space; so do buttons, switches and tabs reached with the keyboard.
      // A button that merely kept focus after a click must not run again: Space pans.
      if (t?.closest?.('input,textarea,select,[contenteditable=true]')) return
      const control = t?.closest?.('button,a,[role=button],[role=switch],[role=tab],[role=checkbox],[role=menuitem]')
      if (control && !clicked.has(control)) return
      setSpaceDown(true)
      e.preventDefault()
    }
    const up = (e: KeyboardEvent) => e.code === 'Space' && setSpaceDown(false)
    // The key can be released in another window: never stay stuck in pan mode.
    const reset = () => setSpaceDown(false)
    const hidden = () => document.hidden && reset()
    window.addEventListener('pointerdown', pointer, true)
    document.addEventListener('focusin', focusin, true)
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    window.addEventListener('blur', reset)
    document.addEventListener('visibilitychange', hidden)
    return () => {
      window.removeEventListener('pointerdown', pointer, true)
      document.removeEventListener('focusin', focusin, true)
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
      window.removeEventListener('blur', reset)
      document.removeEventListener('visibilitychange', hidden)
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
          // Locked elements don't receive pointer events: find the topmost one under the cursor.
          const id = n?.id() ?? elementAt(e.evt.clientX, e.evt.clientY, true)
          if (id && !useEditor.getState().selection.includes(id)) select([id])
          const rect = containerRef.current!.getBoundingClientRect()
          setMenu({ x: e.evt.clientX - rect.left, y: e.evt.clientY - rect.top })
        }}
        onMouseDown={(e) => {
          setMenu(null)
          onStageMouseDown(e)
        }} onWheel={onWheel} onTouchStart={(e) => {
          const t = e.target
          // In multi-selection a stray tap on empty space must not drop the group being built.
          if ((t === stageRef.current || t.name() === 'background' || t.name() === 'pasteboard') && !useUI.getState().multiSelect) {
            select([])
            if (useUI.getState().editingTextId) useUI.getState().set({ editingTextId: null })
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
                  hidden={!mobile && el.id === editingTextId}
                  onSelect={onSelect}
                  onTap={onTap}
                  onClickEl={onClickEl}
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
            enabledAnchors={mobile || selection.length > 1 ? CORNER_ANCHORS : ALL_ANCHORS}
            onTransformStart={() => {
              transformSeq++
              useUI.getState().set({ canvasBusy: true })
            }}
            onTransformEnd={() => useUI.getState().set({ canvasBusy: false })}
            anchorStroke="#CBAA62"
            anchorFill="#0B0C0F"
            borderStroke="#CBAA62"
            borderStrokeWidth={1.2}
            rotateAnchorOffset={mobile ? 36 : 26}
            padding={0}
            ignoreStroke
            flipEnabled={false}
            // Refuse only a side that shrinks below 8 px, so lines and separators can still grow.
            boundBoxFunc={(o, n) => ((Math.abs(n.width) < 8 && Math.abs(n.width) < Math.abs(o.width)) || (Math.abs(n.height) < 8 && Math.abs(n.height) < Math.abs(o.height)) ? o : n)}
          />
        </Layer>
      </Stage>
      {!mobile && editingEl && editingEl.type === 'text' && <TextEditOverlay el={editingEl} zoom={zoom} pan={pan} />}
      {!mobile && menu && <ContextMenu x={Math.max(4, Math.min(menu.x, size.w - 212))} y={menu.y + 228 > size.h ? Math.max(4, menu.y - 228) : menu.y} onClose={() => setMenu(null)} />}
    </div>
  )
}
