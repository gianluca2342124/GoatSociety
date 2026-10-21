// UI state that only exists in the mobile editor (open sheet, active tool…).
import { create } from 'zustand'

export type MobileSheet = null | 'templates' | 'elements' | 'photos' | 'data' | 'style' | 'export' | 'page' | 'newPage' | 'more' | 'layers' | 'props' | 'menu'

export type PhotoMode = 'add' | 'replace' | 'background' | 'crest-home' | 'crest-away' | 'model'

interface MobileState {
  sheet: MobileSheet
  /** Inline property tool shown above the contextual bar (color, size…). */
  tool: string | null
  templateMode: 'add' | 'replace'
  photoMode: PhotoMode
  /** Focus mode hides pages and navigation: just the design. */
  focus: boolean
  set: (p: Partial<Omit<MobileState, 'set' | 'open'>>) => void
  open: (sheet: MobileSheet, extra?: Partial<Omit<MobileState, 'set' | 'open' | 'sheet'>>) => void
}

export const useMobile = create<MobileState>((set) => ({
  sheet: null,
  tool: null,
  templateMode: 'add',
  photoMode: 'add',
  focus: false,
  set: (p) => set(p),
  open: (sheet, extra = {}) => set({ sheet, tool: null, ...extra }),
}))
