import type { BrandKit, MatchData, Project, Slide, SlideElement } from '../model/types'
import { applyOverrides, resolveColor, resolveFont, resolveText } from '../model/tokens'
import { getImage } from './assetCache'
import { EDITOR_3D_SCALE, get3DError, get3DRender } from './three/render3dCache'

export interface RenderCtx {
  match: MatchData
  brand: BrandKit
  project: Project
  slide: Slide
  page: number
  pages: number
  mode: 'editor' | 'export'
  image: (id: string | null | undefined) => HTMLImageElement | HTMLCanvasElement | null
  render3d: (el: SlideElement) => HTMLCanvasElement | null
  error3d: (el: SlideElement) => string | null
  color: (v: string | undefined) => string
  font: (v: string) => string
  text: (s: string) => string
}

export function makeRenderCtx(project: Project, slide: Slide, brand: BrandKit, mode: RenderCtx['mode'], scale3d = EDITOR_3D_SCALE): RenderCtx {
  const match = applyOverrides(project.match, slide.overrides)
  const index = project.slides.findIndex((s) => s.id === slide.id)
  const page = index >= 0 ? index + 1 : 1
  const pages = Math.max(1, project.slides.length)
  const cctx = { match, brand }
  return {
    match,
    brand,
    project,
    slide,
    page,
    pages,
    mode,
    image: (id) => (id ? getImage(id) : null),
    render3d: (el) => get3DRender(el, project, slide, brand, scale3d),
    error3d: (el) => get3DError(el, project, slide, brand, scale3d),
    color: (v) => resolveColor(v, cctx),
    font: (v) => resolveFont(v, brand),
    text: (s) => resolveText(s, { match, brand, page, pages }),
  }
}
