import { create } from 'zustand'
import type { AnnotationKind } from '../model/types'

export type LeftTab =
  | 'templates'
  | 'slides'
  | 'elements'
  | 'match'
  | 'teams'
  | 'stats'
  | 'text'
  | 'shapes'
  | 'charts'
  | 'tactics'
  | 'mascot'
  | 'assets'
  | 'effects'
  | 'brand'

export type Modal = null | 'export' | 'preview' | 'newProject' | 'canvasSize' | 'shortcuts' | 'replaceTemplate'

export interface Toast {
  id: number
  kind: 'info' | 'success' | 'error'
  text: string
  /** Optional one-tap action (e.g. «Deshacer»). */
  action?: { label: string; run: () => void }
}

interface UIState {
  view: 'home' | 'editor'
  leftTab: LeftTab
  panelOpen: boolean
  rightOpen: boolean
  zoom: number
  autoFit: boolean
  pan: { x: number; y: number }
  showGrid: boolean
  snapToGrid: boolean
  gridSize: number
  snapGuides: boolean
  showSafeArea: boolean
  modal: Modal
  newProjectMode: 'carousel' | 'post' | 'empty'
  editingTextId: string | null
  /** Phone: taps add/remove elements to the selection instead of replacing it. */
  multiSelect: boolean
  /** An element is being dragged or transformed on the canvas. */
  canvasBusy: boolean
  tacticsEditId: string | null
  tacticsTool: 'select' | AnnotationKind
  /** Selected player/annotation id inside the tactics element being edited. */
  tacticsSel: string | null
  saveState: 'idle' | 'saving' | 'saved' | 'error'
  toasts: Toast[]
  set: (p: Partial<Omit<UIState, 'set' | 'toast' | 'dismiss'>>) => void
  toast: (text: string, kind?: Toast['kind'], action?: Toast['action']) => void
  dismiss: (id: number) => void
}

let toastId = 0

export const useUI = create<UIState>((set) => ({
  view: 'home',
  leftTab: 'templates',
  // Small laptop screens start with collapsed side panels to give the canvas room.
  panelOpen: typeof window === 'undefined' || window.innerWidth >= 1240,
  rightOpen: typeof window === 'undefined' || window.innerWidth >= 1060,
  zoom: 0.4,
  autoFit: true,
  pan: { x: 0, y: 0 },
  showGrid: false,
  snapToGrid: false,
  gridSize: 20,
  snapGuides: true,
  showSafeArea: false,
  modal: null,
  newProjectMode: 'carousel',
  editingTextId: null,
  multiSelect: false,
  canvasBusy: false,
  tacticsEditId: null,
  tacticsTool: 'select',
  tacticsSel: null,
  saveState: 'idle',
  toasts: [],
  set: (p) => set(p),
  toast: (text, kind = 'info', action) => {
    const id = ++toastId
    // One undo-style toast at a time keeps the screen calm.
    set((s) => ({ toasts: [...s.toasts.filter((t) => !(action && t.action)), { id, kind, text, action }].slice(-3) }))
    setTimeout(() => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })), action ? 5200 : kind === 'error' ? 6000 : 3200)
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}))
