// Touch-first building blocks for the mobile editor.
import type { ComponentType, ReactNode } from 'react'
import { X } from 'lucide-react'

type IconT = ComponentType<{ size?: number; className?: string; strokeWidth?: number }>

/** In-flow bottom panel: the canvas above shrinks so the page stays fully visible. */
export function Sheet({ title, onClose, children, height = 'half', right, testId }: { title: string; onClose: () => void; children: ReactNode; height?: 'auto' | 'half' | 'tall'; right?: ReactNode; testId?: string }) {
  const h = height === 'tall' ? 'h-[72%]' : height === 'half' ? 'h-[54%]' : 'max-h-[70%]'
  return (
    <section className={`m-sheet flex ${h} shrink-0 flex-col rounded-t-[22px] border-t border-line-2 bg-panel shadow-[0_-12px_40px_rgba(0,0,0,0.5)]`} aria-label={title} data-testid={testId}>
      <div className="flex justify-center pt-2">
        <span className="h-1 w-10 rounded-full bg-white/20" aria-hidden />
      </div>
      <header className="flex items-center gap-2 px-4 pt-1 pb-2">
        <h2 className="flex-1 truncate font-cond text-[19px] font-bold tracking-wide uppercase">{title}</h2>
        {right}
        <button type="button" className="flex h-10 w-10 items-center justify-center rounded-full bg-white/6 text-ivory active:scale-95" aria-label="Cerrar" onClick={onClose}>
          <X size={18} />
        </button>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-[calc(16px+env(safe-area-inset-bottom))]">{children}</div>
    </section>
  )
}

/** Icon + label button for horizontal tool bars (≥ 56 px touch target). */
export function ToolButton({ icon: Icon, label, onClick, active, danger, testId, disabled }: { icon: IconT; label: string; onClick: () => void; active?: boolean; danger?: boolean; testId?: string; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      data-testid={testId}
      aria-pressed={active}
      className={`flex min-w-[64px] shrink-0 flex-col items-center justify-center gap-1 rounded-xl px-2 py-1.5 text-[11px] font-semibold transition active:scale-95 disabled:opacity-35 ${active ? 'bg-gold/15 text-gold' : danger ? 'text-loss' : 'text-ivory/90'}`}
    >
      <Icon size={21} strokeWidth={1.9} />
      <span className="whitespace-nowrap">{label}</span>
    </button>
  )
}

/** Big tappable row used in action sheets. */
export function ActionRow({ icon: Icon, label, hint, onClick, danger, testId, disabled }: { icon: IconT; label: string; hint?: string; onClick: () => void; danger?: boolean; testId?: string; disabled?: boolean }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} data-testid={testId} className={`flex w-full items-center gap-3.5 rounded-xl px-3 py-3 text-left transition active:scale-[0.99] active:bg-white/6 disabled:opacity-35 ${danger ? 'text-loss' : 'text-ivory'}`}>
      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${danger ? 'bg-loss/12' : 'bg-white/7'}`}>
        <Icon size={19} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] font-semibold">{label}</span>
        {hint && <span className="block truncate text-[12px] text-muted">{hint}</span>}
      </span>
    </button>
  )
}

/** Pill chips for categories and quick choices. */
export function Chips<T extends string>({ value, onChange, options, ariaLabel }: { value: T; onChange: (v: T) => void; options: { value: T; label: string }[]; ariaLabel: string }) {
  return (
    <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1" role="tablist" aria-label={ariaLabel}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="tab"
          aria-selected={value === o.value}
          onClick={() => onChange(o.value)}
          className={`h-9 shrink-0 rounded-full px-4 text-[13px] font-semibold transition ${value === o.value ? 'bg-ivory text-ink' : 'bg-white/7 text-ivory/80'}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function SectionLabel({ children }: { children: ReactNode }) {
  return <div className="mt-4 mb-2 text-[12px] font-semibold tracking-wide text-muted uppercase">{children}</div>
}
