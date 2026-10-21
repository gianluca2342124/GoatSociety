// Desktop elements library: the same ready-made building blocks as the phone
// «Elementos» sheet (badges, scoreboards, data widgets, photo frames…).
import { useState } from 'react'
import { useEditor } from '../../store/editor'
import { useUI } from '../../store/ui'
import { CATALOG, CATALOG_CATEGORIES, type CatalogCategory, type CatalogItem } from '../elementCatalog'
import { PanelTitle } from './contentPanels'

function insert(item: CatalogItem) {
  const p = useEditor.getState().project
  if (!p) return
  const el = item.make(p.format)
  useEditor.getState().addElement(el, { select: true })
  if (item.editText) useUI.getState().set({ editingTextId: el.id })
}

export function ElementsPanel() {
  const [cat, setCat] = useState<CatalogCategory>('etiquetas')
  const items = CATALOG.filter((i) => i.category === cat)
  return (
    <div>
      <PanelTitle title="Elementos" sub="Piezas listas para combinar: se colocan centradas en la página actual." />
      <div className="px-4 pb-3">
        <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Tipo de elemento">
          {CATALOG_CATEGORIES.map((c) => (
            <button key={c.id} type="button" role="tab" aria-selected={cat === c.id} onClick={() => setCat(c.id)} className={`rounded-full px-2.5 py-1 text-[11px] font-semibold transition ${cat === c.id ? 'bg-ivory text-ink' : 'bg-white/6 text-muted hover:text-ivory'}`}>
              {c.label}
            </button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2 px-4 pb-6">
        {items.map((i) => (
          <button key={i.id} type="button" onClick={() => insert(i)} data-testid={`el-${i.id}`} className="flex aspect-square flex-col items-center justify-center gap-1.5 rounded-xl border border-line bg-panel-2 p-1.5 text-center transition hover:border-gold/50 hover:bg-panel-3">
            <span className={`flex h-8 items-center justify-center font-cond font-bold text-ivory ${i.glyph.length > 6 ? 'text-[11px] leading-tight' : 'text-[20px]'}`}>{i.glyph}</span>
            <span className="text-[10.5px] leading-tight font-semibold text-muted">{i.label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
