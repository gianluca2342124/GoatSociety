import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
import type { AssetRecord, Project, TeamLibraryEntry } from '../model/types'

/** Assets are persisted as raw bytes (most portable across browsers). */
export type StoredAsset = Omit<AssetRecord, 'blob'> & { data: ArrayBuffer; blob?: Blob }

export interface ProjectMeta {
  id: string
  name: string
  kind: Project['kind']
  updatedAt: number
  createdAt: number
  slideCount: number
  thumbnail: string | null
  format: Project['format']
  home: string
  away: string
}

interface GoatDB extends DBSchema {
  projects: { key: string; value: Project }
  projectMeta: { key: string; value: ProjectMeta; indexes: { updatedAt: number } }
  assets: { key: string; value: StoredAsset; indexes: { kind: string; createdAt: number } }
  teams: { key: string; value: TeamLibraryEntry }
  kv: { key: string; value: unknown }
}

let dbPromise: Promise<IDBPDatabase<GoatDB>> | null = null
let memoryOnly = false

/** True when the browser refused IndexedDB and work is only kept in memory for this session. */
export function isMemoryOnly() {
  return memoryOnly
}

function open() {
  return openDB<GoatDB>('goat-society-studio', 1, {
    upgrade(d) {
      d.createObjectStore('projects', { keyPath: 'id' })
      const meta = d.createObjectStore('projectMeta', { keyPath: 'id' })
      meta.createIndex('updatedAt', 'updatedAt')
      const assets = d.createObjectStore('assets', { keyPath: 'id' })
      assets.createIndex('kind', 'kind')
      assets.createIndex('createdAt', 'createdAt')
      d.createObjectStore('teams', { keyPath: 'id' })
      d.createObjectStore('kv')
    },
  })
}

export function db(): Promise<IDBPDatabase<GoatDB>> {
  if (!dbPromise) {
    dbPromise = (async () => {
      try {
        if (typeof indexedDB === 'undefined') throw new Error('IndexedDB no disponible')
        return await open()
      } catch {
        // Private windows, blocked site data or embedded previews: keep the
        // studio usable with an in-memory database for this session.
        await import('fake-indexeddb/auto')
        memoryOnly = true
        return open()
      }
    })()
  }
  return dbPromise
}

/** For tests: drop the cached connection. */
export function resetDbConnection() {
  dbPromise = null
}

export async function kvGet<T>(key: string): Promise<T | undefined> {
  return (await (await db()).get('kv', key)) as T | undefined
}

export async function kvSet(key: string, value: unknown): Promise<void> {
  await (await db()).put('kv', value, key)
}
