// Project lifecycle: create, open, autosave, import and export.
import { useEditor } from './editor'
import { migrateBrand } from '../model/brand'
import { useLibrary } from './library'
import { useUI } from './ui'
import type { FormatPreset, MatchData, Project } from '../model/types'
import { newProject } from '../model/defaults'
import { uid } from '../model/ids'
import { buildMatchCarousel, buildTemplateSlide, templateById } from '../templates'
import { deleteProject, loadProject, saveProject, setProjectThumbnail } from '../db/projects'
import { getAsset, putAssetRecord } from '../db/assets'
import { buildBundle, bundleAssetToRecord, bundleFileName, migrateProject, parseBundle } from '../db/serialize'
import { downloadBlob, renderThumbnail } from '../render/exporter'
import { kvSet } from '../db/db'

let saveTimer: ReturnType<typeof setTimeout> | null = null
let thumbTimer: ReturnType<typeof setTimeout> | null = null
let pending = false

async function doSave(p: Project) {
  const ui = useUI.getState()
  ui.set({ saveState: 'saving' })
  try {
    await saveProject(p)
    pending = false
    useUI.getState().set({ saveState: 'saved' })
  } catch (e) {
    console.error(e)
    useUI.getState().set({ saveState: 'error' })
    useUI.getState().toast('No se pudo guardar el proyecto en este navegador. Exporta una copia JSON por seguridad.', 'error')
  }
}

async function updateThumb(p: Project) {
  if (!p.slides[0]) return
  try {
    const url = await renderThumbnail(p, p.slides[0], useLibrary.getState().brand, 300)
    await setProjectThumbnail(p.id, url)
  } catch {
    /* thumbnails are best-effort */
  }
}

/** Debounced autosave whenever the open project changes. */
export function startAutosave() {
  let last = useEditor.getState().project
  return useEditor.subscribe((s) => {
    if (!s.project || s.project === last) {
      last = s.project
      return
    }
    const changedProject = last?.id !== s.project.id
    last = s.project
    if (changedProject) return
    pending = true
    useUI.getState().set({ saveState: 'saving' })
    if (saveTimer) clearTimeout(saveTimer)
    saveTimer = setTimeout(() => {
      const p = useEditor.getState().project
      if (p) void doSave(p)
    }, 650)
    if (thumbTimer) clearTimeout(thumbTimer)
    thumbTimer = setTimeout(() => {
      const p = useEditor.getState().project
      if (p) void updateThumb(p)
    }, 3500)
  })
}

export function hasPendingSave() {
  return pending
}

export async function saveNow() {
  const p = useEditor.getState().project
  if (!p) return
  if (saveTimer) clearTimeout(saveTimer)
  await doSave(p)
  await updateThumb(p)
  useUI.getState().toast('Proyecto guardado en este equipo', 'success')
}

export async function openProject(project: Project) {
  useEditor.getState().open(project)
  useUI.getState().set({ view: 'editor', saveState: 'saved', modal: null, tacticsEditId: null, editingTextId: null, autoFit: true })
  await kvSet('lastProjectId', project.id)
}

export async function openProjectById(id: string) {
  const p = await loadProject(id)
  if (!p) {
    useUI.getState().toast('No se encontró el proyecto', 'error')
    return
  }
  await openProject(p)
}

export interface CreateOptions {
  name: string
  preset: FormatPreset
  mode: 'carousel' | 'post' | 'empty'
  templateId?: string
  match: MatchData
}

export async function createProject(opts: CreateOptions) {
  const p = newProject({ name: opts.name, preset: opts.preset, kind: opts.mode === 'carousel' ? 'carousel' : 'post', match: opts.match })
  if (opts.mode === 'carousel') p.slides = buildMatchCarousel(p)
  else if (opts.mode === 'post') {
    const def = templateById(opts.templateId) ?? templateById('matchday-elite')!
    p.slides = [buildTemplateSlide(def, p.format, p.match)]
  } else {
    p.slides = [buildTemplateSlide(templateById('final-slide')!, p.format, p.match)]
    p.slides[0].elements = p.slides[0].elements.filter((e) => e.type === 'effect')
    p.slides[0].name = 'Diapositiva 1'
    p.slides[0].templateId = null
  }
  await saveProject(p)
  await openProject(p)
  void updateThumb(p)
  void useLibrary.getState().refreshProjects()
}

export async function exportProjectFile(project?: Project) {
  const p = project ?? useEditor.getState().project
  if (!p) return
  const bundle = await buildBundle(p, getAsset, useLibrary.getState().brand)
  const blob = new Blob([JSON.stringify(bundle)], { type: 'application/json' })
  try {
    if (!(await downloadBlob(blob, bundleFileName(p)))) return
    useUI.getState().toast('Proyecto exportado (.goat.json con recursos incluidos)', 'success')
  } catch (e) {
    useUI.getState().toast(e instanceof Error ? e.message : 'No se pudo guardar el archivo', 'error')
  }
}

export async function importProjectFile(file: File, opts: { applyBrand?: boolean } = {}) {
  try {
    const bundle = parseBundle(await file.text())
    for (const a of bundle.assets) {
      const existing = await getAsset(a.id)
      if (!existing) await putAssetRecord(bundleAssetToRecord(a))
    }
    const project = migrateProject(structuredClone(bundle.project))
    project.id = uid('prj')
    project.updatedAt = Date.now()
    if (opts.applyBrand && bundle.brand) useLibrary.getState().setBrand(migrateBrand(bundle.brand))
    await saveProject(project)
    await useLibrary.getState().refreshAssets()
    await useLibrary.getState().refreshProjects()
    await openProject(project)
    useUI.getState().toast(`Proyecto «${project.name}» importado`, 'success')
  } catch (e) {
    useUI.getState().toast(e instanceof Error ? e.message : 'No se pudo importar el archivo', 'error')
  }
}

export async function removeProject(id: string) {
  await deleteProject(id)
  await useLibrary.getState().refreshProjects()
}

export async function duplicateProject(id: string) {
  const p = await loadProject(id)
  if (!p) return
  const copy: Project = { ...structuredClone(p), id: uid('prj'), name: `${p.name} (copia)`, createdAt: Date.now(), updatedAt: Date.now() }
  await saveProject(copy)
  await updateThumb(copy)
  await useLibrary.getState().refreshProjects()
}

export async function goHome() {
  if (pending) {
    const p = useEditor.getState().project
    if (p) await doSave(p)
  }
  const p = useEditor.getState().project
  if (p) await updateThumb(p)
  useEditor.getState().close()
  useUI.getState().set({ view: 'home', modal: null })
  await useLibrary.getState().refreshProjects()
}
