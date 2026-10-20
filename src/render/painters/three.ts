import type { Model3DElement, Stadium3DElement } from '../../model/types'
import { withAlpha } from '../../model/tokens'
import type { RenderCtx } from '../context'
import { roundRect, type Ctx } from '../paint/canvas'
import { drawLabel } from '../text/draw'
import { paintTacticsBoard } from './tactics'

export function paint3D(ctx: Ctx, el: Stadium3DElement | Model3DElement, rc: RenderCtx) {
  const img = rc.render3d(el)
  const { width: w, height: h } = el
  if (img) {
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
  const label = el.type === 'model3d' && !el.assetId ? 'SUBE UN MODELO GLB/GLTF' : 'RENDERIZANDO 3D…'
  drawLabel(ctx, label, w / 2, h / 2, { family: rc.font('$label'), size: Math.min(34, w * 0.05), weight: 700, color: rc.color('$text'), align: 'center', letterSpacing: 3 })
}
