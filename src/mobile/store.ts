// UI state that only exists in the mobile editor (open sheet, active tool…).
import { create } from 'zustand'
import { useUI } from '../store/ui'

export type MobileSheet = null | 'templates' | 'elements' | 'photos' | 'data' | 'style' | 'export' | 'page' | 'newPage' | 'more' | 'layers' | 'props' | 'menu'

export type PhotoMode = 'add' | 'replace' | 'background' | 'crest-home' | 'crest-away' | 'crest-custom' | 'model'

interface MobileState {
  sheet: MobileSheet
  /** Inline property tool shown above the contextual bar (color, size…). */
  tool: string | null
  templateMode: 'add' | 'replace'
  photoMode: PhotoMode
  /** Element a «replace» or custom-crest photo goes to (fixed when the sheet opens). */
  photoTarget: string | null
  /** Tab the Datos sheet opens on. */
  dataTab: 'match' | 'teams' | 'stats'
  /** Focus mode hides pages and navigation: just the design. */
  focus: boolean
  /** «Pegar aquí» chip: shown right after copying, gone after pasting. */
  pasteChip: boolean
  set: (p: Partial<Omit<MobileState, 'set' | 'open'>>) => void
  open: (sheet: MobileSheet, extra?: Partial<Omit<MobileState, 'set' | 'open' | 'sheet'>>) => void
}

export const useMobile = create<MobileState>((set) => ({
  sheet: null,
  tool: null,
  templateMode: 'add',
  photoMode: 'add',
  photoTarget: null,
  dataTab: 'match',
  focus: false,
  pasteChip: false,
  set: (p) => set(p),
  open: (sheet, extra = {}) => {
    // A sheet replaces the text keyboard and the tactics bar: finish those edits so it shows.
    if (sheet) {
      const ui = useUI.getState()
      if (ui.editingTextId || ui.tacticsEditId) ui.set({ editingTextId: null, tacticsEditId: null, tacticsSel: null, tacticsTool: 'select' })
    }
    set({ sheet, tool: null, ...extra })
  },
}))
