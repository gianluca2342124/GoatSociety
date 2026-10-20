// Global local library: brand kit, assets, teams and the project list.
import { create } from 'zustand'
import type { AssetKind, AssetMeta, BrandKit, TeamLibraryEntry } from '../model/types'
import { DEFAULT_BRAND } from '../model/brand'
import { STARTER_TEAMS } from '../model/defaults'
import { uid } from '../model/ids'
import { kvGet, kvSet, type ProjectMeta } from '../db/db'
import { addAsset, deleteAsset, listAssets, renameAsset } from '../db/assets'
import { deleteTeam, listProjects, listTeams, saveTeam } from '../db/projects'
import { invalidateAsset } from '../render/assetCache'
import { clearBitmapCache } from '../render/paint/bitmapCache'

interface LibraryState {
  ready: boolean
  brand: BrandKit
  assets: AssetMeta[]
  teams: TeamLibraryEntry[]
  projects: ProjectMeta[]
  init: () => Promise<void>
  setBrand: (patch: Partial<BrandKit> | ((b: BrandKit) => BrandKit)) => void
  resetBrand: () => void
  refreshAssets: () => Promise<void>
  uploadAsset: (file: File, kind: AssetKind) => Promise<AssetMeta>
  removeAsset: (id: string) => Promise<void>
  renameAsset: (id: string, name: string, kind?: AssetKind) => Promise<void>
  refreshProjects: () => Promise<void>
  upsertTeam: (t: TeamLibraryEntry) => Promise<void>
  removeTeam: (id: string) => Promise<void>
}

let brandSaveTimer: ReturnType<typeof setTimeout> | null = null

function mergeBrand(saved: Partial<BrandKit> | undefined): BrandKit {
  if (!saved) return DEFAULT_BRAND
  return {
    ...DEFAULT_BRAND,
    ...saved,
    palette: { ...DEFAULT_BRAND.palette, ...(saved.palette ?? {}) },
    fonts: { ...DEFAULT_BRAND.fonts, ...(saved.fonts ?? {}) },
    watermark: { ...DEFAULT_BRAND.watermark, ...(saved.watermark ?? {}) },
  }
}

export const useLibrary = create<LibraryState>((set, get) => ({
  ready: false,
  brand: DEFAULT_BRAND,
  assets: [],
  teams: [],
  projects: [],

  init: async () => {
    const [brand, assets, teams, projects, seeded] = await Promise.all([kvGet<Partial<BrandKit>>('brand'), listAssets(), listTeams(), listProjects(), kvGet<boolean>('teamsSeeded')])
    let allTeams = teams
    if (!seeded && teams.length === 0) {
      allTeams = STARTER_TEAMS.map((t) => ({ ...t, id: uid('tm'), builtIn: true }))
      for (const t of allTeams) await saveTeam(t)
      await kvSet('teamsSeeded', true)
      allTeams.sort((a, b) => a.name.localeCompare(b.name, 'es'))
    }
    set({ ready: true, brand: mergeBrand(brand), assets, teams: allTeams, projects })
  },

  setBrand: (patch) => {
    const next = typeof patch === 'function' ? patch(get().brand) : { ...get().brand, ...patch }
    set({ brand: next })
    clearBitmapCache()
    if (brandSaveTimer) clearTimeout(brandSaveTimer)
    brandSaveTimer = setTimeout(() => void kvSet('brand', next), 400)
  },

  resetBrand: () => {
    set({ brand: { ...DEFAULT_BRAND, logoAssetId: get().brand.logoAssetId } })
    clearBitmapCache()
    void kvSet('brand', get().brand)
  },

  refreshAssets: async () => set({ assets: await listAssets() }),

  uploadAsset: async (file, kind) => {
    const meta = await addAsset(file, { kind })
    set({ assets: [meta, ...get().assets] })
    return meta
  },

  removeAsset: async (id) => {
    await deleteAsset(id)
    invalidateAsset(id)
    set({ assets: get().assets.filter((a) => a.id !== id) })
  },

  renameAsset: async (id, name, kind) => {
    await renameAsset(id, name, kind)
    set({ assets: get().assets.map((a) => (a.id === id ? { ...a, name, kind: kind ?? a.kind } : a)) })
  },

  refreshProjects: async () => set({ projects: await listProjects() }),

  upsertTeam: async (t) => {
    await saveTeam(t)
    const rest = get().teams.filter((x) => x.id !== t.id)
    set({ teams: [...rest, t].sort((a, b) => a.name.localeCompare(b.name, 'es')) })
  },

  removeTeam: async (id) => {
    await deleteTeam(id)
    set({ teams: get().teams.filter((t) => t.id !== id) })
  },
}))
