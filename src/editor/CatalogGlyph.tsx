// Library tile artwork: a glyph, or a mini version of the badge itself.
import { useEditor } from '../store/editor'
import { useLibrary } from '../store/library'
import { contrastText, resolveColor, withAlpha } from '../model/tokens'
import type { CatalogItem } from './elementCatalog'

export function CatalogGlyph({ item, size = 'md' }: { item: CatalogItem; size?: 'sm' | 'md' }) {
  const match = useEditor((s) => s.project?.match)
  const accent = useEditor((s) => s.project?.style?.accent)
  const brand = useLibrary((s) => s.brand)
  const b = item.badge
  if (b && match) {
    const c = resolveColor(b.color, { match, brand, accent })
    const style =
      b.style === 'solid'
        ? { background: c, color: contrastText(c) }
        : b.style === 'glow'
          ? { background: withAlpha(c, 0.14), color: c, boxShadow: `0 0 14px ${withAlpha(c, 0.55)}`, border: `1px solid ${withAlpha(c, 0.7)}` }
          : b.style === 'outline'
            ? { border: `1.5px solid ${c}`, color: c }
            : { color: c }
    return (
      <span className={`max-w-full truncate rounded-md px-1.5 py-1 font-cond font-bold tracking-wide uppercase ${size === 'sm' ? 'text-[10px]' : 'text-[11px]'}`} style={style}>
        {b.text}
      </span>
    )
  }
  return <span className={`flex items-center justify-center font-cond font-bold text-ivory ${item.glyph.length > 6 ? (size === 'sm' ? 'text-[11px] leading-tight' : 'text-[13px] leading-tight') : size === 'sm' ? 'text-[20px]' : 'text-[24px]'}`}>{item.glyph}</span>
}
