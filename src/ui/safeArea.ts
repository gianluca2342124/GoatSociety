// Safe areas when a host already pads the page. The claude.ai artifact viewer
// pads its root for the notch and the home bar; in a plain browser nothing
// does. In-flow chrome adds only the part of the inset the host left
// uncovered (--in-*), and fixed overlays, laid out against the viewport,
// keep out of the larger of the two (--edge-*).
import { useEffect } from 'react'

const SIDES = ['top', 'right', 'bottom', 'left'] as const

export function useSafeAreas() {
  useEffect(() => {
    const root = document.documentElement
    const probe = document.createElement('div')
    probe.setAttribute('aria-hidden', 'true')
    probe.style.cssText = 'position:fixed;top:0;left:0;width:0;height:0;visibility:hidden;pointer-events:none;padding:env(safe-area-inset-top,0px) env(safe-area-inset-right,0px) env(safe-area-inset-bottom,0px) env(safe-area-inset-left,0px)'
    document.body.appendChild(probe)
    const apply = () => {
      const env = getComputedStyle(probe)
      const host = getComputedStyle(root)
      for (const side of SIDES) {
        const key = `padding${side[0].toUpperCase()}${side.slice(1)}` as 'paddingTop'
        const inset = parseFloat(env[key]) || 0
        const pad = parseFloat(host[key]) || 0
        root.style.setProperty(`--in-${side}`, `${Math.max(0, inset - pad)}px`)
        root.style.setProperty(`--edge-${side}`, `${Math.max(inset, pad)}px`)
      }
    }
    apply()
    const vv = window.visualViewport
    window.addEventListener('resize', apply)
    window.addEventListener('orientationchange', apply)
    vv?.addEventListener('resize', apply)
    return () => {
      window.removeEventListener('resize', apply)
      window.removeEventListener('orientationchange', apply)
      vv?.removeEventListener('resize', apply)
      probe.remove()
    }
  }, [])
}
