// Safe SVG handling: strip scripts, event handlers, foreignObject and external
// references; ensure intrinsic size so the image draws correctly on canvas.
const FORBIDDEN_TAGS = ['script', 'foreignobject', 'iframe', 'object', 'embed', 'audio', 'video', 'link', 'meta', 'style']

export function sanitizeSvg(source: string): string | null {
  if (typeof DOMParser === 'undefined') return null
  const doc = new DOMParser().parseFromString(source, 'image/svg+xml')
  const root = doc.documentElement
  if (!root || root.nodeName.toLowerCase() !== 'svg' || doc.getElementsByTagName('parsererror').length) return null
  const walk = (node: Element) => {
    for (const child of Array.from(node.children)) {
      if (FORBIDDEN_TAGS.includes(child.nodeName.toLowerCase())) {
        child.remove()
        continue
      }
      walk(child)
    }
    for (const attr of Array.from(node.attributes)) {
      const name = attr.name.toLowerCase()
      const value = attr.value.trim().toLowerCase()
      if (name.startsWith('on')) node.removeAttribute(attr.name)
      else if ((name === 'href' || name === 'xlink:href') && !value.startsWith('#') && !value.startsWith('data:image/')) node.removeAttribute(attr.name)
      else if (value.includes('javascript:')) node.removeAttribute(attr.name)
    }
  }
  walk(root)
  // Ensure intrinsic dimensions (needed for drawImage).
  const vb = root.getAttribute('viewBox')?.split(/[\s,]+/).map(Number)
  if (!root.getAttribute('width') || root.getAttribute('width')?.includes('%')) root.setAttribute('width', String(vb && vb[2] ? vb[2] : 512))
  if (!root.getAttribute('height') || root.getAttribute('height')?.includes('%')) root.setAttribute('height', String(vb && vb[3] ? vb[3] : 512))
  if (!root.getAttribute('xmlns')) root.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
  return new XMLSerializer().serializeToString(root)
}
