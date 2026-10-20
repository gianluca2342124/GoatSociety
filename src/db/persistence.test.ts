import { beforeEach, describe, expect, it } from 'vitest'
import 'fake-indexeddb/auto'
import { IDBFactory } from 'fake-indexeddb'
import { resetDbConnection } from './db'
import { deleteProject, listProjects, loadProject, saveProject } from './projects'
import { addAsset, blobToArrayBuffer, deleteAsset, getAsset, listAssets } from './assets'

const readText = async (b: Blob) => new TextDecoder().decode(await blobToArrayBuffer(b))
import { BUNDLE_FORMAT, BundleError, buildBundle, bundleAssetToRecord, collectAssetIds, migrateProject, parseBundle } from './serialize'
import { sanitizeSvg } from './svg'
import { newProject } from '../model/defaults'
import { buildMatchCarousel } from '../templates'
import { DEFAULT_BRAND } from '../model/brand'
import { image } from '../model/elements'

beforeEach(() => {
  globalThis.indexedDB = new IDBFactory()
  resetDbConnection()
})

function carousel() {
  const p = newProject({ name: 'PSG vs Barcelona', preset: 'story' })
  p.slides = buildMatchCarousel(p)
  return p
}

describe('IndexedDB persistence', () => {
  it('saves, lists, reloads and deletes a project intact', async () => {
    const p = carousel()
    await saveProject(p)
    const list = await listProjects()
    expect(list).toHaveLength(1)
    expect(list[0]).toMatchObject({ id: p.id, name: 'PSG vs Barcelona', slideCount: 7, home: 'PSG', away: 'Barcelona' })
    const loaded = await loadProject(p.id)
    expect(loaded).toEqual(migrateProject(p))
    await deleteProject(p.id)
    expect(await listProjects()).toHaveLength(0)
    expect(await loadProject(p.id)).toBeNull()
  })

  it('stores sanitized SVG assets locally', async () => {
    const svg = new File(['<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10" onload="alert(1)"><script>alert(1)</script><rect width="10" height="10"/></svg>'], 'crest.svg', { type: 'image/svg+xml' })
    const meta = await addAsset(svg, { kind: 'crest' })
    expect(meta.kind).toBe('crest')
    const rec = await getAsset(meta.id)
    const text = await readText(rec!.blob)
    expect(text).not.toContain('script')
    expect(text).not.toContain('onload')
    expect((await listAssets()).map((a) => a.id)).toContain(meta.id)
    await deleteAsset(meta.id)
    expect(await getAsset(meta.id)).toBeUndefined()
  })

  it('rejects unsupported files with a clear error', async () => {
    const bad = new File(['hello'], 'notes.txt', { type: 'text/plain' })
    await expect(addAsset(bad, { kind: 'other' })).rejects.toThrow(/Formato no compatible/)
  })
})

describe('project bundles (.goat.json)', () => {
  it('round-trips a project with its local assets', async () => {
    const p = carousel()
    const svg = new File(['<svg xmlns="http://www.w3.org/2000/svg" width="4" height="4"><rect width="4" height="4" fill="red"/></svg>'], 'logo.svg', { type: 'image/svg+xml' })
    const meta = await addAsset(svg, { kind: 'crest' })
    p.match.home.crestAssetId = meta.id
    p.slides[0].elements.push(image({ assetId: meta.id }))
    expect(collectAssetIds(p)).toEqual([meta.id])
    const bundle = await buildBundle(p, getAsset, DEFAULT_BRAND)
    expect(bundle.format).toBe(BUNDLE_FORMAT)
    expect(bundle.assets).toHaveLength(1)
    const parsed = parseBundle(JSON.stringify(bundle))
    expect(parsed.project).toEqual(p)
    const rec = bundleAssetToRecord(parsed.assets[0])
    expect(await readText(rec.blob)).toContain('fill="red"')
    expect(parsed.brand?.name).toBe('GOAT SOCIETY')
  })

  it('rejects invalid files and accepts bare projects', () => {
    expect(() => parseBundle('{nope')).toThrow(BundleError)
    expect(() => parseBundle('{"hello":1}')).toThrow(/GOAT SOCIETY STUDIO/)
    const p = carousel()
    expect(parseBundle(JSON.stringify(p)).project.id).toBe(p.id)
  })

  it('migrates older or partial projects with safe defaults', () => {
    const p = carousel() as unknown as Record<string, unknown>
    delete p.agenda
    delete p.results
    delete p.pageNumbers
    const m = migrateProject(p as never)
    expect(Array.isArray(m.agenda)).toBe(true)
    expect(m.results).toEqual([])
    expect(m.pageNumbers).toBe(true)
  })
})

describe('svg sanitizer', () => {
  it('removes scripts, handlers and external references and sets a size', () => {
    const out = sanitizeSvg('<svg viewBox="0 0 100 50"><a href="https://evil.example"><circle onclick="x()" r="4"/></a><foreignObject><div/></foreignObject></svg>')!
    expect(out).not.toContain('evil')
    expect(out).not.toContain('onclick')
    expect(out).not.toContain('foreignObject')
    expect(out).toContain('width="100"')
    expect(out).toContain('height="50"')
    expect(sanitizeSvg('<html></html>')).toBeNull()
  })
})
