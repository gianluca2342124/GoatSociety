import { useEffect, useState } from 'react'
import type { BrandKit, MatchData, Project, Slide } from '../model/types'
import { renderThumbnail } from '../render/exporter'
import { useAssetVersion } from '../render/assetCache'
import { buildTemplateSlide, type TemplateDef } from '../templates'
import { hashKey } from '../render/paint/bitmapCache'

// Sequential render queue so thumbnails never block the editor.
type Job = { key: string; run: () => Promise<string> }
const queue: Job[] = []
const waiters = new Map<string, ((v: string) => void)[]>()
let running = false
const done = new Map<string, string>()

async function pump() {
  if (running) return
  running = true
  while (queue.length) {
    const job = queue.shift()!
    let url = ''
    try {
      url = await job.run()
      done.set(job.key, url)
      if (done.size > 300) done.delete(done.keys().next().value as string)
    } catch {
      url = ''
    }
    const ws = waiters.get(job.key) ?? []
    waiters.delete(job.key)
    ws.forEach((w) => w(url))
    await new Promise((r) => setTimeout(r, 0))
  }
  running = false
}

function enqueue(key: string, run: () => Promise<string>, priority = false): Promise<string> {
  const hit = done.get(key)
  if (hit) return Promise.resolve(hit)
  return new Promise((resolve) => {
    const list = waiters.get(key)
    if (list) {
      list.push(resolve)
      return
    }
    waiters.set(key, [resolve])
    const job = { key, run }
    if (priority) queue.unshift(job)
    else queue.push(job)
    void pump()
  })
}

const ids = new WeakMap<object, number>()
let idc = 0
function idOf(o: object): number {
  let v = ids.get(o)
  if (!v) {
    v = ++idc
    ids.set(o, v)
  }
  return v
}

export function useSlideThumb(project: Project, slide: Slide, brand: BrandKit, width = 220): string {
  const version = useAssetVersion((s) => s.version)
  const index = project.slides.indexOf(slide)
  const key = `s:${idOf(slide)}:${idOf(project.match)}:${idOf(brand)}:${index}:${project.slides.length}:${version}:${project.format.preset}:${width}:${idOf(project.agenda)}:${idOf(project.results)}`
  const [url, setUrl] = useState(() => done.get(key) ?? '')
  useEffect(() => {
    let alive = true
    const hit = done.get(key)
    if (hit) {
      setUrl(hit)
      return
    }
    const t = setTimeout(() => {
      void enqueue(key, () => renderThumbnail(project, slide, brand, width), true).then((u) => alive && u && setUrl(u))
    }, 350)
    return () => {
      alive = false
      clearTimeout(t)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])
  return url
}

export function useTemplateThumb(def: TemplateDef, project: Project, brand: BrandKit, width = 200): string {
  const version = useAssetVersion((s) => s.version)
  const matchKey = hashKey([matchCore(project.match), project.agenda.length])
  const key = `t:${def.id}:${project.format.preset}:${matchKey}:${idOf(brand)}:${version}:${width}`
  const [url, setUrl] = useState(() => done.get(key) ?? '')
  useEffect(() => {
    let alive = true
    const hit = done.get(key)
    if (hit) {
      setUrl(hit)
      return
    }
    void enqueue(key, async () => {
      const slide = buildTemplateSlide(def, project.format, project.match)
      const p = { ...project, slides: [slide] }
      return renderThumbnail(p, slide, brand, width)
    }).then((u) => alive && u && setUrl(u))
    return () => {
      alive = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])
  return url
}

function matchCore(m: MatchData) {
  const t = (x: MatchData['home']) => [x.name, x.shortName, x.abbr, x.primary, x.secondary, x.crestAssetId, x.crestStyle]
  return { h: t(m.home), a: t(m.away), c: m.competition, st: m.stage, hl: m.headline, sh: m.subheadline, d: m.date, tm: m.time, v: m.venue, sc: m.score }
}
