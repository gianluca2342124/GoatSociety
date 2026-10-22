import type { AssetKind, AssetRecord, BrandKit, Project, SlideElement } from '../model/types'
import { SCHEMA_VERSION, defaultBackground, sampleAgenda } from '../model/defaults'
import { uid } from '../model/ids'
import { blobToArrayBuffer } from './assets'

export const BUNDLE_FORMAT = 'goat-society-studio/project'

export interface BundleAsset {
  id: string
  name: string
  kind: AssetKind
  mime: string
  width: number
  height: number
  data: string // base64 (no data: prefix)
}

export interface ProjectBundle {
  format: typeof BUNDLE_FORMAT
  version: number
  exportedAt: string
  project: Project
  brand?: BrandKit
  assets: BundleAsset[]
}

/** Every local asset a project (and optionally the brand kit) references. */
export function collectAssetIds(project: Project, brand?: BrandKit): string[] {
  const ids = new Set<string>()
  const add = (id: string | null | undefined) => {
    if (id) ids.add(id)
  }
  add(project.match.home.crestAssetId)
  add(project.match.away.crestAssetId)
  for (const a of project.agenda) {
    add(a.homeCrestAssetId)
    add(a.awayCrestAssetId)
  }
  for (const s of project.slides) {
    add(s.background.imageAssetId)
    for (const el of s.elements) {
      if (el.type === 'image') add(el.assetId)
      if (el.type === 'crest') add(el.customAssetId)
      if (el.type === 'model3d') add(el.assetId)
    }
  }
  if (brand) add(brand.logoAssetId)
  return [...ids]
}

export function bytesToBase64(bytes: Uint8Array): string {
  let bin = ''
  const chunk = 0x8000
  for (let i = 0; i < bytes.length; i += chunk) bin += String.fromCharCode(...bytes.subarray(i, i + chunk))
  return btoa(bin)
}

export function base64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64)
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}

async function blobBytes(blob: Blob): Promise<Uint8Array> {
  return new Uint8Array(await blobToArrayBuffer(blob))
}

export async function buildBundle(project: Project, getAsset: (id: string) => Promise<AssetRecord | undefined>, brand?: BrandKit): Promise<ProjectBundle> {
  const assets: BundleAsset[] = []
  for (const id of collectAssetIds(project, brand)) {
    const rec = await getAsset(id)
    if (!rec) continue
    assets.push({ id: rec.id, name: rec.name, kind: rec.kind, mime: rec.mime, width: rec.width, height: rec.height, data: bytesToBase64(await blobBytes(rec.blob)) })
  }
  return { format: BUNDLE_FORMAT, version: SCHEMA_VERSION, exportedAt: new Date().toISOString(), project, brand, assets }
}

export class BundleError extends Error {}

export function parseBundle(text: string): ProjectBundle {
  let data: unknown
  try {
    data = JSON.parse(text)
  } catch {
    throw new BundleError('El archivo no es un JSON válido.')
  }
  const b = data as Partial<ProjectBundle>
  if (!b || typeof b !== 'object') throw new BundleError('Archivo de proyecto no reconocido.')
  // Accept a bare Project as well (older/manual exports).
  if (b.format !== BUNDLE_FORMAT) {
    const maybe = data as Partial<Project>
    if (maybe && Array.isArray(maybe.slides) && maybe.match) return { format: BUNDLE_FORMAT, version: 1, exportedAt: '', project: maybe as Project, assets: [] }
    throw new BundleError('Este archivo no es un proyecto de GOAT SOCIETY STUDIO.')
  }
  if (!b.project || !Array.isArray(b.project.slides)) throw new BundleError('El proyecto está incompleto o dañado.')
  return { ...b, assets: Array.isArray(b.assets) ? b.assets : [] } as ProjectBundle
}

export function bundleAssetToRecord(a: BundleAsset): AssetRecord {
  const bytes = base64ToBytes(a.data)
  const blob = new Blob([bytes as BlobPart], { type: a.mime })
  return { id: a.id, name: a.name, kind: a.kind, mime: a.mime, blob, width: a.width, height: a.height, size: blob.size, createdAt: Date.now() }
}

/**
 * Schema 2 (GOAT EDITORIAL): exported content must not mention external
 * messaging platforms. Old built-in texts that printed the community link
 * become a neutral profile CTA. Everything else is left untouched.
 */
function migrateElementV2(el: SlideElement): SlideElement {
  if (el.type !== 'text') return el
  let text = el.text
  if (/\{telegram(\.label)?\}/.test(text)) {
    text = text
      .replace(/\{telegram\.label\}\s*·\s*\{telegram\}/g, 'Link en la bio ↗')
      .replace(/\{telegram\.label\}/g, 'Link en la bio')
      .replace(/\{telegram\}/g, 'Link en la bio')
  }
  const name = el.name === 'Botón Telegram' ? 'Llamada a la acción' : el.name === 'Enlace Telegram' ? 'Llamada al perfil' : el.name
  return text === el.text && name === el.name ? el : { ...el, text, name }
}

/** Fill in fields added in later versions so old files keep working. */
// Betting odds are no longer part of the app: older projects lose the values,
// the switches that showed them and any {odds} token (with a «Cuota» label
// right before it) in their texts.
const ODDS_TOKEN = /(?:\s*\bcuotas?\b\s*[:@]?)?\s*\{odds\}/gi

function withoutOdds(el: SlideElement): SlideElement {
  const x = { ...el } as SlideElement & { showOdds?: boolean }
  delete x.showOdds
  if (x.type === 'prediction' && (x.hiddenPosition as string) === 'pickAndOdds') x.hiddenPosition = 'pick'
  if ((x.type === 'text' || x.type === 'badge') && /\{odds\}/i.test(x.text)) x.text = x.text.replace(ODDS_TOKEN, '')
  return x
}

function dropKey<T extends object>(o: T, key: string): T {
  if (!(key in o)) return o
  const c = { ...o } as Record<string, unknown>
  delete c[key]
  return c as T
}

export function migrateProject(p: Project): Project {
  const from = p.schemaVersion ?? 1
  const out: Project = {
    ...p,
    kind: p.kind ?? 'carousel',
    schemaVersion: SCHEMA_VERSION,
    agenda: Array.isArray(p.agenda) ? p.agenda : sampleAgenda(),
    results: Array.isArray(p.results) ? p.results.map((r) => dropKey(r, 'odds')) : [],
    pageNumbers: p.pageNumbers ?? true,
    slides: (p.slides ?? []).map((s) => ({
      ...s,
      id: s.id ?? uid('sl'),
      name: s.name ?? 'Diapositiva',
      templateId: s.templateId ?? null,
      background: { ...defaultBackground(), ...(s.background ?? {}) },
      overrides: s.overrides ?? {},
      elements: (s.elements ?? []).filter((e) => e && typeof e === 'object' && 'type' in e).map((e) => withoutOdds(from < 2 ? migrateElementV2(e) : e)),
    })),
  }
  out.match = {
    ...p.match,
    stats: p.match?.stats ?? [],
    predictions: (p.match?.predictions ?? []).map((x) => dropKey(x, 'odds')),
    score: p.match?.score ?? { home: '', away: '', note: '' },
    isSample: p.match?.isSample ?? false,
  }
  return out
}

export function bundleFileName(project: Project): string {
  const safe = project.name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase()
  return `${safe || 'proyecto'}.goat.json`
}
