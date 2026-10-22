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
// idb remembers the IndexedDB classes it meets first, so once it has opened the
// browser's database the in-memory one can no longer replace it.
let persistentUsed = false

/** True when the browser refused IndexedDB and work is only kept in memory for this session. */
export function isMemoryOnly() {
  return memoryOnly
}

function open(onLost?: () => void) {
  return openDB<GoatDB>('goat-society-studio', 1, {
    // The browser closed the connection (storage cleared, the app's storage
    // process restarted in the background…): the next call opens a new one.
    terminated: onLost,
    upgrade(d) {
      // idb has now met the browser's classes (see persistentUsed).
      if (!memoryOnly) persistentUsed = true
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

/**
 * Swap in fake-indexeddb's classes as the IndexedDB globals (idb checks
 * instanceof against them). Uses the side-effect-free entry on purpose: the
 * `/auto` entry patches globals on load, and bundlers may evaluate it eagerly.
 */
async function installMemoryIndexedDB() {
  const fake = await import('fake-indexeddb')
  const globals: Record<string, unknown> = {
    indexedDB: fake.indexedDB,
    IDBCursor: fake.IDBCursor,
    IDBCursorWithValue: fake.IDBCursorWithValue,
    IDBDatabase: fake.IDBDatabase,
    IDBFactory: fake.IDBFactory,
    IDBIndex: fake.IDBIndex,
    IDBKeyRange: fake.IDBKeyRange,
    IDBObjectStore: fake.IDBObjectStore,
    IDBOpenDBRequest: fake.IDBOpenDBRequest,
    IDBRequest: fake.IDBRequest,
    IDBTransaction: fake.IDBTransaction,
    IDBVersionChangeEvent: fake.IDBVersionChangeEvent,
  }
  for (const [name, value] of Object.entries(globals)) Object.defineProperty(globalThis, name, { value, configurable: true, writable: true })
}

/** How long to wait for the browser's storage before giving up on it. */
const OPEN_TIMEOUT = 5000

/**
 * Checks the browser's storage with the raw API, before idb ever sees it: it
 * must answer in time (some WebViews leave the request pending forever) and
 * accept a write (a full or blocked storage opens fine and then refuses
 * every save).
 */
function checkStorage(): Promise<void> {
  return new Promise((resolve, reject) => {
    let done = false
    const finish = (err?: unknown) => {
      if (done) return
      done = true
      clearTimeout(timer)
      if (err) reject(err)
      else resolve()
    }
    const timer = setTimeout(() => finish(new Error('IndexedDB no responde')), OPEN_TIMEOUT)
    let req: IDBOpenDBRequest
    try {
      if (typeof indexedDB === 'undefined') throw new Error('IndexedDB no disponible')
      req = indexedDB.open('goat-society-studio-check', 1)
    } catch (e) {
      finish(e)
      return
    }
    req.onupgradeneeded = () => req.result.createObjectStore('kv')
    req.onerror = () => finish(req.error ?? new Error('IndexedDB'))
    req.onsuccess = () => {
      const d = req.result
      if (done) return d.close()
      try {
        const tx = d.transaction('kv', 'readwrite')
        tx.objectStore('kv').put(Date.now(), 'write')
        tx.oncomplete = () => (d.close(), finish())
        tx.onerror = tx.onabort = () => (d.close(), finish(tx.error ?? new Error('IndexedDB')))
      } catch (e) {
        d.close()
        finish(e)
      }
    }
  })
}

async function openPersistent(): Promise<IDBPDatabase<GoatDB>> {
  await checkStorage()
  const d = await open(() => {
    dbPromise = null
  })
  // Only an open that succeeded has shown idb the browser's classes.
  persistentUsed = true
  return d
}

export function db(): Promise<IDBPDatabase<GoatDB>> {
  if (!dbPromise) {
    const opening = (async () => {
      if (memoryOnly) return open()
      try {
        return await openPersistent()
      } catch (e) {
        // A connection that worked and then went away can't be swapped for memory (see above).
        if (persistentUsed) throw e
        // Private windows, blocked or full site data, embedded previews: keep
        // the studio usable with an in-memory database for this session.
        await installMemoryIndexedDB()
        memoryOnly = true
        return open()
      }
    })()
    dbPromise = opening
    // A failed open is not remembered: the next call tries again.
    opening.catch(() => {
      if (dbPromise === opening) dbPromise = null
    })
  }
  return dbPromise
}

/** Give up on the browser's storage for this session and keep working in memory. */
export async function fallBackToMemory() {
  if (memoryOnly) return
  if (persistentUsed) throw new Error('El almacenamiento de este navegador ha fallado. Recarga la página.')
  const prev = dbPromise
  dbPromise = null
  prev?.then((d) => d.close(), () => undefined)
  await installMemoryIndexedDB()
  memoryOnly = true
  dbPromise = open()
  await dbPromise
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
