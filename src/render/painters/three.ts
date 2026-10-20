import type { Model3DElement, Stadium3DElement } from '../../model/types'
import { withAlpha } from '../../model/tokens'
import type { RenderCtx } from '../context'
import { deviceScale, makeCanvas, roundRect, type Ctx } from '../paint/canvas'
import { drawLabel } from '../text/draw'
import { paintTacticsBoard } from './tactics'

export function paint3D(ctx: Ctx, el: Stadium3DElement | Model3DElement, rc: RenderCtx) {
  const img = rc.render3d(el)
  const { width: w, height: h } = el
  if (img) {
    if (el.type === 'stadium3d') {
      // Feather the top and bottom so the scene melts into the slide.
      const s = deviceScale(ctx)
      const off = makeCanvas(w * s, h * s)
      const o = off.getContext('2d')!
      o.drawImage(img, 0, 0, off.width, off.height)
      o.globalCompositeOperation = 'destination-in'
      const g = o.createLinearGradient(0, 0, 0, off.height)
      g.addColorStop(0, 'rgba(0,0,0,0)')
      g.addColorStop(0.14, 'rgba(0,0,0,1)')
      g.addColorStop(0.86, 'rgba(0,0,0,1)')
      g.addColorStop(1, 'rgba(0,0,0,0)')
      o.fillStyle = g
      o.fillRect(0, 0, off.width, off.height)
      ctx.drawImage(off, 0, 0, w, h)
      return
    }
    ctx.drawImage(img, 0, 0, w, h)
    return
  }
  if (rc.mode === 'export') return
  // Editor placeholder while the lazy 3D engine renders.
  if (el.type === 'stadium3d') {
    ctx.save()
    ctx.globalAlpha *= 0.55
    paintTacticsBoard(ctx, { ...el.tactics, camera: 'perspective', tilt: 0.8 }, w, h, rc)
    ctx.restore()
  } else {
    roundRect(ctx, 0, 0, w, h, 16)
    ctx.fillStyle = withAlpha(rc.color('$surface'), 0.7)
    ctx.fill()
  }
  const error = rc.error3d(el)
  const label = el.type === 'model3d' && !el.assetId ? 'SUBE UN MODELO GLB/GLTF' : error ? 'NO SE PUDO RENDERIZAR EL 3D' : 'RENDERIZANDO 3D…'
  drawLabel(ctx, label, w / 2, h / 2, { family: rc.font('$label'), size: Math.min(34, w * 0.05), weight: 700, color: error ? rc.color('$negative') : rc.color('$text'), align: 'center', letterSpacing: 3, maxWidth: w * 0.9 })
  if (error) drawLabel(ctx, error.slice(0, 90), w / 2, h / 2 + Math.min(44, w * 0.06), { family: rc.font('$body'), size: Math.min(22, w * 0.032), weight: 500, color: rc.color('$muted'), align: 'center', maxWidth: w * 0.9 })
}
