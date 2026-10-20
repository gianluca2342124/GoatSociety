import { BarChart3, Crown, Images, LayoutTemplate, Layers3, Palette, Shapes, Shield, Sparkles, Swords, Trophy, Type, Users, PanelLeftClose } from 'lucide-react'
import { useUI, type LeftTab } from '../../store/ui'
import { ChartsPanel, EffectsPanel, MascotPanel, ShapesPanel, SlidesPanel, TacticsPanel, TemplatesPanel, TextPanel } from './contentPanels'
import { MatchPanel, StatsPanel, TeamsPanel } from './dataPanels'
import { AssetsPanel, BrandPanel } from './libraryPanels'

export const TABS: { id: LeftTab; label: string; icon: typeof Type }[] = [
  { id: 'templates', label: 'Plantillas', icon: LayoutTemplate },
  { id: 'slides', label: 'Páginas', icon: Layers3 },
  { id: 'match', label: 'Partido', icon: Trophy },
  { id: 'teams', label: 'Equipos', icon: Shield },
  { id: 'stats', label: 'Estadísticas', icon: Users },
  { id: 'text', label: 'Texto', icon: Type },
  { id: 'shapes', label: 'Formas', icon: Shapes },
  { id: 'charts', label: 'Gráficos', icon: BarChart3 },
  { id: 'tactics', label: 'Táctica', icon: Swords },
  { id: 'mascot', label: 'Mascota', icon: Crown },
  { id: 'assets', label: 'Imágenes', icon: Images },
  { id: 'effects', label: 'Efectos', icon: Sparkles },
  { id: 'brand', label: 'Marca', icon: Palette },
]

function Panel({ tab }: { tab: LeftTab }) {
  switch (tab) {
    case 'templates':
      return <TemplatesPanel />
    case 'slides':
      return <SlidesPanel />
    case 'match':
      return <MatchPanel />
    case 'teams':
      return <TeamsPanel />
    case 'stats':
      return <StatsPanel />
    case 'text':
      return <TextPanel />
    case 'shapes':
      return <ShapesPanel />
    case 'charts':
      return <ChartsPanel />
    case 'tactics':
      return <TacticsPanel />
    case 'mascot':
      return <MascotPanel />
    case 'assets':
      return <AssetsPanel />
    case 'effects':
      return <EffectsPanel />
    case 'brand':
      return <BrandPanel />
  }
}

export function LeftSidebar() {
  const tab = useUI((s) => s.leftTab)
  const open = useUI((s) => s.panelOpen)
  return (
    <div className="flex h-full shrink-0">
      <nav className="flex w-[68px] shrink-0 flex-col items-center gap-0.5 overflow-y-auto border-r border-line bg-ink-2 py-2" aria-label="Herramientas">
        {TABS.map((t) => {
          const active = tab === t.id && open
          return (
            <button
              key={t.id}
              type="button"
              data-testid={`tab-${t.id}`}
              aria-pressed={active}
              onClick={() => useUI.getState().set({ leftTab: t.id, panelOpen: tab === t.id ? !open : true })}
              className={`flex w-[60px] flex-col items-center gap-1 rounded-lg px-1 py-2 text-[9.5px] font-semibold tracking-wide transition ${active ? 'bg-gold/12 text-gold' : 'text-muted hover:bg-white/4 hover:text-ivory'}`}
            >
              <t.icon size={18} strokeWidth={1.8} />
              {t.label}
            </button>
          )
        })}
      </nav>
      {open && (
        <div className="relative flex w-[296px] flex-col border-r border-line bg-panel" aria-label={TABS.find((t) => t.id === tab)?.label}>
          <button type="button" className="icon-btn absolute top-3 right-2 z-10" aria-label="Cerrar panel" onClick={() => useUI.getState().set({ panelOpen: false })}>
            <PanelLeftClose size={15} />
          </button>
          <div className="min-h-0 flex-1 overflow-y-auto">
            <Panel tab={tab} />
          </div>
        </div>
      )}
    </div>
  )
}
