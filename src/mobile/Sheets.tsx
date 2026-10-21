// Bottom sheets of the mobile editor. Each one does one job with big, labeled targets.
import { useRef, useState } from 'react'
import {
  BoxSelect,
  ListChecks,
  ArrowLeftRight,
  ChevronLeft,
  ChevronRight,
  ClipboardPaste,
  Copy,
  Download,
  Eye,
  EyeOff,
  FilePlus2,
  FolderOpen,
  Focus,
  Frame,
  ImagePlus,
  Layers,
  LayoutTemplate,
  Lock,
  PenLine,
  Save,
  SlidersHorizontal,
  Square,
  Trash2,
  Unlock,
  Upload,
} from 'lucide-react'
import { activeSlideOf, useActiveSlide, useEditor } from '../store/editor'
import { useLibrary } from '../store/library'
import { useUI } from '../store/ui'
import { TEMPLATES, type TemplateDef } from '../templates'
import { CATEGORY_LABELS, type TemplateCategory } from '../templates/types'
import { useTemplateThumb } from '../editor/thumbs'
import { CatalogGlyph } from '../editor/CatalogGlyph'
import { CATALOG, CATALOG_CATEGORIES, type CatalogCategory, type CatalogItem } from '../editor/elementCatalog'
import { FORMATS } from '../model/formats'
import type { FormatPreset, ImageElement } from '../model/types'
import { assetUrl, useAssetVersion } from '../render/assetCache'
import { MatchPanel, StatsPanel, TeamsPanel } from '../editor/left/dataPanels'
import { BrandPanel } from '../editor/left/libraryPanels'
import { SlideStyleSection } from '../editor/StylePanel'
import { ExportPanel } from '../editor/ExportPanel'
import { ElementSpecific, LayersPanel } from '../editor/RightPanel'
import { AppearanceSection, FillEditor, TransformSection } from '../editor/props/common'
import { exportProjectFile, goHome } from '../store/projectService'
import { exportSlideBlob, downloadBlob, canShareFiles, shareFiles } from '../render/exporter'
import {
  activeIndex,
  addBlankPage,
  addTemplatePage,
  changeFormat,
  copySelection,
  deletePage,
  deleteSelection,
  duplicatePage,
  duplicateSelection,
  hideSelection,
  movePage,
  pasteClipboard,
  renamePage,
  replacePageTemplate,
  toggleLockSelection,
  selectAllOnPage,
  setMultiSelect,
} from '../editor/actions'
import { useMobile } from './store'
import { ActionRow, Chips, SectionLabel, Sheet } from './ui'
import { ELEMENT_LABELS } from '../model/elements'

const close = () => useMobile.getState().set({ sheet: null })

// ── Templates ──────────────────────────────────────────────────────────────

function TemplateTile({ def }: { def: TemplateDef }) {
  const project = useEditor((s) => s.project)!
  const brand = useLibrary((s) => s.brand)
  const url = useTemplateThumb(def, project, brand, 220)
  const mode = useMobile((s) => s.templateMode)
  const ratio = project.format.width / project.format.height
  return (
    <button
      type="button"
      className="text-left active:scale-[0.98]"
      data-testid={`m-template-${def.id}`}
      onClick={() => {
        if (mode === 'replace') replacePageTemplate(def)
        else addTemplatePage(def)
        close()
      }}
    >
      <div className="overflow-hidden rounded-xl bg-ink-2 ring-1 ring-white/8" style={{ aspectRatio: `${ratio}` }}>
        {url ? <img src={url} alt="" className="h-full w-full object-cover" /> : <div className="h-full w-full animate-pulse bg-panel-3" />}
      </div>
      <div className="mt-1.5 truncate text-[12px] font-semibold">{def.name}</div>
    </button>
  )
}

export function TemplatesSheet() {
  const mode = useMobile((s) => s.templateMode)
  const [cat, setCat] = useState<TemplateCategory | 'all'>('all')
  const cats = Object.keys(CATEGORY_LABELS) as TemplateCategory[]
  const list = TEMPLATES.filter((t) => cat === 'all' || t.category === cat)
  return (
    <Sheet title={mode === 'replace' ? 'Cambiar plantilla' : 'Plantillas'} onClose={close} height="tall" testId="sheet-templates">
      <p className="mb-3 text-[13px] text-muted">{mode === 'replace' ? 'Toca una plantilla para aplicarla a esta página.' : 'Toca una plantilla para añadirla como página nueva.'}</p>
      <Chips ariaLabel="Categorías" value={cat} onChange={setCat} options={[{ value: 'all', label: 'Todas' }, ...cats.map((c) => ({ value: c, label: CATEGORY_LABELS[c] }))]} />
      <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-4 min-[480px]:grid-cols-3">
        {list.map((def) => (
          <TemplateTile key={def.id} def={def} />
        ))}
      </div>
    </Sheet>
  )
}

// ── Elements ───────────────────────────────────────────────────────────────

function insertItem(item: CatalogItem) {
  const p = useEditor.getState().project
  if (!p) return
  const el = item.make(p.format)
  useEditor.getState().addElement(el, { select: true })
  close()
  if (item.editText) useUI.getState().set({ editingTextId: el.id })
}

export function ElementsSheet() {
  const [cat, setCat] = useState<CatalogCategory>('texto')
  const items = CATALOG.filter((i) => i.category === cat)
  return (
    <Sheet title="Elementos" onClose={close} height="half" testId="sheet-elements">
      <Chips ariaLabel="Tipo de elemento" value={cat} onChange={setCat} options={CATALOG_CATEGORIES.map((c) => ({ value: c.id, label: c.label }))} />
      <div className="mt-3 grid grid-cols-3 gap-2.5">
        {items.map((i) => (
          <button key={i.id} type="button" onClick={() => insertItem(i)} data-testid={`m-el-${i.id}`} className="flex aspect-square flex-col items-center justify-center gap-2 rounded-2xl bg-white/6 p-2 text-center active:scale-95 active:bg-white/10">
            <span className="flex h-10 max-w-full items-center justify-center">
              <CatalogGlyph item={i} />
            </span>
            <span className="text-[12px] leading-tight font-semibold text-ivory/85">{i.label}</span>
          </button>
        ))}
      </div>
    </Sheet>
  )
}

// ── Photos ─────────────────────────────────────────────────────────────────

function AssetTile({ id, onPick }: { id: string; onPick: () => void }) {
  useAssetVersion((s) => s.version)
  const url = assetUrl(id)
  return (
    <button type="button" onClick={onPick} className="aspect-square overflow-hidden rounded-xl bg-ink-2 ring-1 ring-white/8 active:scale-95">
      {url ? <img src={url} alt="" className="h-full w-full object-cover" /> : <div className="h-full w-full animate-pulse bg-panel-3" />}
    </button>
  )
}

export function PhotosSheet() {
  const mode = useMobile((s) => s.photoMode)
  const assets = useLibrary((s) => s.assets).filter((a) => a.kind !== 'model3d')
  const fileRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const title = mode === 'replace' ? 'Reemplazar foto' : mode === 'background' ? 'Foto de fondo' : mode === 'crest-home' || mode === 'crest-away' ? 'Cambiar escudo' : 'Fotos'

  const apply = (assetId: string) => {
    const s = useEditor.getState()
    const p = s.project
    const slide = activeSlideOf(s)
    if (!p || !slide) return
    if (mode === 'replace') {
      const id = s.selection[0]
      if (id) s.updateElement(id, { assetId } as Partial<ImageElement>)
      useUI.getState().toast('Foto reemplazada', 'success')
    } else if (mode === 'background') {
      s.update((d) => {
        const sl = d.slides.find((x) => x.id === slide.id)
        if (sl) sl.background.imageAssetId = assetId
      })
      useUI.getState().toast('Fondo cambiado', 'success')
    } else if (mode === 'crest-home' || mode === 'crest-away') {
      const side = mode === 'crest-home' ? 'home' : 'away'
      s.update((d) => void (d.match[side].crestAssetId = assetId))
      useUI.getState().toast('Escudo cambiado en todas las páginas', 'success')
    } else if (slide.elements.some((e) => e.type === 'image' && !e.assetId && e.visible)) {
      // The page has an empty photo slot (photo templates): fill it instead of stacking a new image.
      const slot = slide.elements.find((e) => e.type === 'image' && !e.assetId && e.visible)!
      s.updateElement(slot.id, { assetId } as Partial<ImageElement>)
      s.select([slot.id])
      useUI.getState().toast('Foto colocada · toca «Encuadre» para ajustarla', 'success')
    } else {
      const meta = useLibrary.getState().assets.find((a) => a.id === assetId)
      const w = p.format.width - 144
      const ratio = meta && meta.width && meta.height ? meta.height / meta.width : 0.75
      const h = Math.min(p.format.height - 200, Math.round(w * ratio))
      s.addElementOfType('image', { name: 'Foto', assetId, fit: 'cover', x: 72, y: Math.round((p.format.height - h) / 2), width: w, height: h } as Partial<ImageElement>)
    }
    close()
  }

  const upload = async (files: FileList | null) => {
    if (!files?.length) return
    setBusy(true)
    try {
      const kind = mode === 'background' ? 'background' : mode.startsWith('crest') ? 'crest' : 'player'
      let last = ''
      for (const f of Array.from(files)) last = (await useLibrary.getState().uploadAsset(f, kind)).id
      if (last) apply(last)
    } catch (e) {
      useUI.getState().toast(e instanceof Error ? e.message : 'No se pudo subir la imagen', 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Sheet title={title} onClose={close} height="half" testId="sheet-photos">
      <button type="button" className="btn btn-gold mb-3 h-12 w-full text-[15px]" disabled={busy} onClick={() => fileRef.current?.click()} data-testid="m-upload-photo">
        <Upload size={17} /> {busy ? 'Subiendo…' : 'Subir desde el móvil'}
      </button>
      <input ref={fileRef} type="file" accept="image/*" hidden multiple={mode === 'add'} onChange={(e) => (void upload(e.target.files), (e.target.value = ''))} data-testid="m-photo-input" />
      {assets.length === 0 ? (
        <p className="py-6 text-center text-[13px] text-muted">Aún no hay fotos. Sube tus fotos, escudos o fondos: se guardan en este dispositivo.</p>
      ) : (
        <>
          <SectionLabel>Tu biblioteca</SectionLabel>
          <div className="grid grid-cols-3 gap-2 min-[480px]:grid-cols-4">
            {assets.map((a) => (
              <AssetTile key={a.id} id={a.id} onPick={() => apply(a.id)} />
            ))}
          </div>
        </>
      )}
    </Sheet>
  )
}

// ── Data ───────────────────────────────────────────────────────────────────

export function DataSheet() {
  const [tab, setTab] = useState<'match' | 'teams' | 'stats'>('match')
  return (
    <Sheet title="Datos del partido" onClose={close} height="tall" testId="sheet-data">
      <Chips
        ariaLabel="Datos"
        value={tab}
        onChange={setTab}
        options={[
          { value: 'match', label: 'Partido' },
          { value: 'teams', label: 'Equipos' },
          { value: 'stats', label: 'Estadísticas' },
        ]}
      />
      <div className="m-panel -mx-4 mt-2">{tab === 'match' ? <MatchPanel /> : tab === 'teams' ? <TeamsPanel /> : <StatsPanel />}</div>
    </Sheet>
  )
}

// ── Style ──────────────────────────────────────────────────────────────────

const FORMAT_ORDER: FormatPreset[] = ['vertical', 'story', 'portrait', 'square', 'landscape']

export function StyleSheet() {
  const [tab, setTab] = useState<'page' | 'brand'>('page')
  const project = useEditor((s) => s.project)!
  const slide = useActiveSlide()
  const update = useEditor((s) => s.update)
  return (
    <Sheet title="Estilo" onClose={close} height="tall" testId="sheet-style">
      <Chips
        ariaLabel="Estilo"
        value={tab}
        onChange={setTab}
        options={[
          { value: 'page', label: 'Esta página' },
          { value: 'brand', label: 'Marca' },
        ]}
      />
      {tab === 'page' && slide ? (
        <div className="m-panel -mx-4">
          <SlideStyleSection />
          <div className="px-4">
            <SectionLabel>Fondo</SectionLabel>
            <FillEditor
              fill={slide.background.fill}
              allowNone={false}
              label="Color de fondo"
              onChange={(f) =>
                update(
                  (d) => {
                    const s = d.slides.find((x) => x.id === slide.id)
                    if (s) s.background.fill = f
                  },
                  { key: `bg-${slide.id}` },
                )
              }
            />
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button type="button" className="btn h-11" onClick={() => useMobile.getState().open('photos', { photoMode: 'background' })}>
                <ImagePlus size={16} /> Foto de fondo
              </button>
              <button
                type="button"
                className="btn h-11"
                disabled={!slide.background.imageAssetId}
                onClick={() =>
                  update((d) => {
                    const s = d.slides.find((x) => x.id === slide.id)
                    if (s) s.background.imageAssetId = null
                  })
                }
              >
                Quitar foto
              </button>
            </div>
            <SectionLabel>Formato del proyecto</SectionLabel>
            <div className="grid grid-cols-2 gap-2">
              {FORMAT_ORDER.map((p) => (
                <button key={p} type="button" onClick={() => changeFormat(p)} aria-pressed={project.format.preset === p} className={`flex h-14 flex-col items-start justify-center rounded-xl px-3 ${project.format.preset === p ? 'bg-gold/15 text-gold ring-1 ring-gold/50' : 'bg-white/6'}`}>
                  <span className="text-[13px] font-semibold">{FORMATS[p].label}</span>
                  <span className="text-[11px] text-muted">{FORMATS[p].hint}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="m-panel -mx-4">
          <BrandPanel />
        </div>
      )}
    </Sheet>
  )
}

// ── Export ─────────────────────────────────────────────────────────────────

export function ExportSheet() {
  return (
    <Sheet title="Descargar" onClose={close} height="tall" testId="sheet-export">
      <ExportPanel onDone={close} compact />
    </Sheet>
  )
}

// ── Page actions ───────────────────────────────────────────────────────────

async function downloadCurrentPage() {
  const s = useEditor.getState()
  const p = s.project
  if (!p) return
  const { blob, name } = await exportSlideBlob(p, activeIndex(), useLibrary.getState().brand, { format: 'png', quality: 0.92, scale: 1, transparent: false })
  if (canShareFiles() && (await shareFiles([new File([blob], name, { type: blob.type })], name))) return
  try {
    if (await downloadBlob(blob, name)) useUI.getState().toast(`Descargada ${name}`, 'success')
  } catch (e) {
    useUI.getState().toast(e instanceof Error ? e.message : 'No se pudo descargar', 'error')
  }
}

export function PageSheet() {
  const project = useEditor((s) => s.project)!
  const slide = useActiveSlide()
  const i = activeIndex()
  const [renaming, setRenaming] = useState(false)
  if (!slide) return null
  return (
    <Sheet title={`Página ${i + 1} de ${project.slides.length}`} onClose={close} height="auto" testId="sheet-page">
      {renaming ? (
        <div className="flex gap-2 pb-2">
          <input autoFocus className="field h-12 flex-1 text-[15px]" aria-label="Nombre de la página" value={slide.name} onChange={(e) => renamePage(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && setRenaming(false)} />
          <button type="button" className="btn btn-gold h-12" onClick={() => setRenaming(false)}>
            Listo
          </button>
        </div>
      ) : (
        <div className="-mx-1">
          <ActionRow icon={Copy} label="Duplicar página" onClick={() => (duplicatePage(), close())} testId="page-duplicate" />
          <div className="grid grid-cols-2 gap-2 px-1 py-1">
            <button type="button" className="btn h-12" disabled={i === 0} onClick={() => movePage(-1)} data-testid="page-left">
              <ChevronLeft size={17} /> Mover antes
            </button>
            <button type="button" className="btn h-12" disabled={i === project.slides.length - 1} onClick={() => movePage(1)} data-testid="page-right">
              Mover después <ChevronRight size={17} />
            </button>
          </div>
          <ActionRow icon={LayoutTemplate} label="Cambiar plantilla" hint="Mantiene los datos del partido" onClick={() => useMobile.getState().open('templates', { templateMode: 'replace' })} testId="page-template" />
          <ActionRow icon={PenLine} label="Renombrar" hint={slide.name} onClick={() => setRenaming(true)} />
          <ActionRow icon={Download} label="Descargar esta página" hint="PNG en alta calidad" onClick={() => void downloadCurrentPage()} testId="page-download" />
          <ActionRow icon={Trash2} label="Eliminar página" hint="Puedes deshacerlo" danger disabled={project.slides.length <= 1} onClick={() => (deletePage(), close())} testId="page-delete" />
        </div>
      )}
    </Sheet>
  )
}

export function NewPageSheet() {
  return (
    <Sheet title="Nueva página" onClose={close} height="auto" testId="sheet-new-page">
      <div className="-mx-1">
        <ActionRow icon={FilePlus2} label="Página en blanco" hint="Con la marca y el número de página" onClick={() => (addBlankPage(), close())} testId="new-blank" />
        <ActionRow icon={LayoutTemplate} label="Desde una plantilla" hint="Previas, noticias, estadísticas, pronósticos…" onClick={() => useMobile.getState().open('templates', { templateMode: 'add' })} testId="new-template" />
        <ActionRow icon={Copy} label="Duplicar la página actual" onClick={() => (duplicatePage(), close())} testId="new-duplicate" />
      </div>
    </Sheet>
  )
}

// ── Element «more» ─────────────────────────────────────────────────────────

export function MoreSheet() {
  const s = useEditor()
  const slide = activeSlideOf(s)
  const el = slide?.elements.find((e) => s.selection.includes(e.id))
  const many = s.selection.length > 1
  const hasClip = !!s.clipboard?.length
  const multi = useUI((u) => u.multiSelect)
  return (
    <Sheet title={many ? `${s.selection.length} elementos` : el ? ELEMENT_LABELS[el.type] : 'Opciones'} onClose={close} height="auto" testId="sheet-more">
      <div className="-mx-1">
        <div className="grid grid-cols-3 gap-2 px-1 pb-2">
          <button type="button" className="btn h-14 flex-col gap-0.5 text-[12px]" onClick={() => (copySelection(), close(), useEditor.getState().select([]), useMobile.getState().set({ pasteChip: true }))} data-testid="more-copy">
            <Copy size={18} /> Copiar
          </button>
          <button type="button" className="btn h-14 flex-col gap-0.5 text-[12px]" disabled={!hasClip} onClick={() => (pasteClipboard(), close())} data-testid="more-paste">
            <ClipboardPaste size={18} /> Pegar
          </button>
          <button type="button" className="btn h-14 flex-col gap-0.5 text-[12px]" onClick={() => (duplicateSelection(), close())}>
            <Copy size={18} /> Duplicar
          </button>
        </div>
        <div className="grid grid-cols-2 gap-2 px-1 pb-1">
          <button type="button" className="btn h-12" onClick={() => s.reorderSelection('up')}>
            Traer adelante
          </button>
          <button type="button" className="btn h-12" onClick={() => s.reorderSelection('down')}>
            Enviar atrás
          </button>
        </div>
        {!multi && <ActionRow icon={BoxSelect} label="Seleccionar varios" hint="Toca otros elementos para moverlos o escalarlos juntos" onClick={() => (close(), setMultiSelect(true))} testId="more-multi" />}
        <ActionRow icon={ListChecks} label="Seleccionar todo" hint="Todos los elementos de esta página" onClick={() => (close(), selectAllOnPage(), setMultiSelect(true))} testId="more-select-all" />
        <ActionRow icon={el?.locked ? Unlock : Lock} label={el?.locked ? 'Desbloquear' : 'Bloquear'} hint="Evita moverlo por accidente" onClick={() => toggleLockSelection()} />
        <ActionRow icon={EyeOff} label="Ocultar" hint="Lo recuperas desde Capas" onClick={() => (hideSelection(), close())} />
        <ActionRow icon={SlidersHorizontal} label="Todos los ajustes" onClick={() => useMobile.getState().open('props')} />
        <ActionRow icon={Trash2} label="Eliminar" danger onClick={() => (deleteSelection(), close())} testId="more-delete" />
      </div>
    </Sheet>
  )
}

// ── Layers / advanced properties / app menu ───────────────────────────────

export function LayersSheet() {
  return (
    <Sheet title="Capas" onClose={close} height="tall" testId="sheet-layers">
      <p className="mb-1 text-[12px] text-muted">Toca una capa para seleccionarla. El ojo la muestra u oculta y el candado la protege.</p>
      <div className="m-panel -mx-4">
        <LayersPanel />
      </div>
    </Sheet>
  )
}

export function PropsSheet() {
  const s = useEditor()
  const slide = activeSlideOf(s)
  const el = slide?.elements.find((e) => s.selection.includes(e.id))
  return (
    <Sheet title={el ? `Ajustes · ${ELEMENT_LABELS[el.type]}` : 'Ajustes'} onClose={close} height="tall" testId="sheet-props">
      {el ? (
        <div className="m-panel -mx-4">
          <ElementSpecific el={el} />
          <AppearanceSection el={el} />
          <TransformSection el={el} />
        </div>
      ) : (
        <p className="py-6 text-center text-[13px] text-muted">Selecciona un elemento en la página.</p>
      )}
    </Sheet>
  )
}

export function MenuSheet() {
  const project = useEditor((s) => s.project)!
  const hasClip = useEditor((s) => !!s.clipboard?.length)
  return (
    <Sheet title={project.name} onClose={close} height="auto" testId="sheet-menu">
      <div className="-mx-1">
        <ActionRow icon={Focus} label="Modo enfoque" hint="Solo el diseño, sin paneles" onClick={() => (useMobile.getState().set({ focus: true, sheet: null }), useEditor.getState().select([]))} testId="menu-focus" />
        <ActionRow icon={Eye} label="Vista previa a pantalla completa" onClick={() => (close(), useUI.getState().set({ modal: 'preview' }))} />
        <ActionRow icon={Layers} label="Capas de esta página" onClick={() => useMobile.getState().open('layers')} />
        <ActionRow icon={Frame} label="Formato y fondo" onClick={() => useMobile.getState().open('style')} />
        <ActionRow icon={ArrowLeftRight} label="Zonas seguras de TikTok" hint="Guía en pantalla, no se exporta" onClick={() => (useUI.getState().set({ showSafeArea: !useUI.getState().showSafeArea }), close())} />
        <ActionRow icon={Save} label="Guardar copia (.goat.json)" onClick={() => (void exportProjectFile(), close())} />
        <ActionRow icon={FolderOpen} label="Mis proyectos" onClick={() => (close(), void goHome())} />
        <ActionRow icon={BoxSelect} label="Seleccionar varios elementos" hint="Para moverlos, escalarlos o alinearlos juntos" onClick={() => (close(), setMultiSelect(true))} testId="menu-multi" />
        <ActionRow icon={ListChecks} label="Seleccionar todo" hint="Todos los elementos de esta página" onClick={() => (close(), selectAllOnPage(), setMultiSelect(true))} testId="menu-select-all" />
        <ActionRow icon={Square} label="Página en blanco" onClick={() => (addBlankPage(), close())} />
        {hasClip && <ActionRow icon={ClipboardPaste} label="Pegar en esta página" hint="Lo último que copiaste" onClick={() => (pasteClipboard(), close())} testId="menu-paste" />}
      </div>
    </Sheet>
  )
}
