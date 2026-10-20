// Developer gallery: renders every template through the export pipeline.
// Open with ?debug=templates (&format=story|portrait|square|landscape).
import { useEffect, useRef, useState } from 'react'
import { TEMPLATES, buildTemplateSlide } from '../templates'
import { newProject } from '../model/defaults'
import { DEFAULT_BRAND } from '../model/brand'
import { formatOf } from '../model/formats'
import type { FormatPreset } from '../model/types'
import { renderSlideCanvas } from '../render/exporter'

export function TemplateGallery() {
  const params = new URLSearchParams(location.search)
  const preset = (params.get('format') as FormatPreset) || 'story'
  const only = params.get('only')
  const scale = Number(params.get('scale') || '0.4')
  const ref = useRef<HTMLDivElement>(null)
  const [done, setDone] = useState(false)
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const project = newProject({ preset })
      project.format = formatOf(preset)
      const list = TEMPLATES.filter((t) => !only || only.split(',').includes(String(t.number)))
      project.slides = list.map((t) => buildTemplateSlide(t, project.format, project.match))
      for (let i = 0; i < project.slides.length; i++) {
        if (cancelled) return
        const canvas = await renderSlideCanvas(project, project.slides[i], DEFAULT_BRAND, { scale, transparent: false, format: 'png' })
        const wrap = document.createElement('figure')
        wrap.style.cssText = 'margin:0;display:flex;flex-direction:column;gap:6px;color:#aaa;font:12px sans-serif'
        canvas.style.cssText = `width:${canvas.width}px;height:${canvas.height}px`
        const cap = document.createElement('figcaption')
        cap.textContent = `${list[i].number}. ${list[i].name}`
        wrap.append(canvas, cap)
        ref.current?.appendChild(wrap)
      }
      setDone(true)
    })()
    return () => {
      cancelled = true
    }
  }, [preset, only, scale])
  return <div ref={ref} data-done={done ? 'yes' : 'no'} id="gallery" style={{ display: 'flex', flexWrap: 'wrap', gap: 16, padding: 16, background: '#202226' }} />
}
