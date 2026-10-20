import type { Project, TeamLibraryEntry } from '../model/types'
import { db, type ProjectMeta } from './db'
import { migrateProject } from './serialize'

export function metaOf(p: Project, thumbnail: string | null = null): ProjectMeta {
  return {
    id: p.id,
    name: p.name,
    kind: p.kind,
    updatedAt: p.updatedAt,
    createdAt: p.createdAt,
    slideCount: p.slides.length,
    thumbnail,
    format: p.format,
    home: p.match.home.name,
    away: p.match.away.name,
  }
}

export async function saveProject(p: Project, thumbnail?: string | null): Promise<void> {
  const d = await db()
  const prevMeta = await d.get('projectMeta', p.id)
  const tx = d.transaction(['projects', 'projectMeta'], 'readwrite')
  await tx.objectStore('projects').put(p)
  await tx.objectStore('projectMeta').put(metaOf(p, thumbnail === undefined ? (prevMeta?.thumbnail ?? null) : thumbnail))
  await tx.done
}

export async function loadProject(id: string): Promise<Project | null> {
  const p = await (await db()).get('projects', id)
  return p ? migrateProject(p) : null
}

export async function listProjects(): Promise<ProjectMeta[]> {
  const all = await (await db()).getAll('projectMeta')
  return all.sort((a, b) => b.updatedAt - a.updatedAt)
}

export async function deleteProject(id: string): Promise<void> {
  const d = await db()
  const tx = d.transaction(['projects', 'projectMeta'], 'readwrite')
  await tx.objectStore('projects').delete(id)
  await tx.objectStore('projectMeta').delete(id)
  await tx.done
}

export async function setProjectThumbnail(id: string, thumbnail: string): Promise<void> {
  const d = await db()
  const meta = await d.get('projectMeta', id)
  if (meta) await d.put('projectMeta', { ...meta, thumbnail })
}

export async function listTeams(): Promise<TeamLibraryEntry[]> {
  return (await (await db()).getAll('teams')).sort((a, b) => a.name.localeCompare(b.name, 'es'))
}

export async function saveTeam(t: TeamLibraryEntry): Promise<void> {
  await (await db()).put('teams', t)
}

export async function deleteTeam(id: string): Promise<void> {
  await (await db()).delete('teams', id)
}
