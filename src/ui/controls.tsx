import { useEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { HexColorPicker } from 'react-colorful'
import { ChevronDown, X } from 'lucide-react'
import { PALETTE_TOKENS, FONT_TOKENS } from '../model/brand'
import { FONTS } from '../fonts/fonts'
import { applyOverrides, resolveColor, slideAccent } from '../model/tokens'
import { useLibrary } from '../store/library'
import { activeSlideOf, beginGesture, endGesture, useEditor } from '../store/editor'

export function Section({ title, children, right, defaultOpen = true }: { title: string; children: ReactNode; right?: ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="panel-section">
      <div className="mb-3 flex items-center justify-between">
        <button type="button" className="label-xs flex items-center gap-1 hover:text-ivory" onClick={() => setOpen(!open)} aria-expanded={open}>
          <ChevronDown size={12} className={open ? '' : '-rotate-90'} />
          {title}
        </button>
        {right}
      </div>
      {open && <div className="space-y-3">{children}</div>}
    </div>
  )
}

export function Row({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="block">
      <span className="mb-1 flex items-center justify-between text-[11px] font-medium text-muted">
        {label}
        {hint && <span className="text-dim">{hint}</span>}
      </span>
      {children}
    </label>
  )
}

export function TextField({ value, onChange, placeholder, label, multiline, rows = 3, ariaLabel }: { value: string; onChange: (v: string) => void; placeholder?: string; label?: string; multiline?: boolean; rows?: number; ariaLabel?: string }) {
  const input = multiline ? (
    <textarea className="field resize-y leading-snug" rows={rows} value={value} placeholder={placeholder} aria-label={ariaLabel ?? label} onChange={(e) => onChange(e.target.value)} />
  ) : (
    <input className="field" value={value} placeholder={placeholder} aria-label={ariaLabel ?? label} onChange={(e) => onChange(e.target.value)} />
  )
  return label ? <Row label={label}>{input}</Row> : input
}

/** Number input that tolerates partial typing ("-", "1,") and commits valid numbers. */
export function NumberField({ value, onChange, label, min, max, step = 1, suffix, allowEmpty, ariaLabel }: { value: number | null; onChange: (v: number | null) => void; label?: string; min?: number; max?: number; step?: number; suffix?: string; allowEmpty?: boolean; ariaLabel?: string }) {
  const [draft, setDraft] = useState<string>(value == null ? '' : String(value))
  const focused = useRef(false)
  useEffect(() => {
    if (!focused.current) setDraft(value == null || Number.isNaN(value) ? '' : String(+value.toFixed(4)))
  }, [value])
  const commit = (s: string) => {
    const t = s.replace(',', '.').trim()
    if (t === '') {
      if (allowEmpty) onChange(null)
      return
    }
    const n = Number(t)
    if (!Number.isFinite(n)) return
    let v = n
    if (min != null) v = Math.max(min, v)
    if (max != null) v = Math.min(max, v)
    onChange(v)
  }
  const input = (
    <div className="relative">
      <input
        className="field pr-7 tabular-nums"
        inputMode="decimal"
        value={draft}
        aria-label={ariaLabel ?? label}
        onFocus={() => (focused.current = true)}
        onBlur={() => {
          focused.current = false
          setDraft(value == null ? '' : String(+(value ?? 0).toFixed(4)))
        }}
        onChange={(e) => {
          setDraft(e.target.value)
          commit(e.target.value)
        }}
        onKeyDown={(e) => {
          if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
            e.preventDefault()
            const base = value ?? 0
            const d = (e.shiftKey ? 10 : 1) * step * (e.key === 'ArrowUp' ? 1 : -1)
            const v = +(base + d).toFixed(4)
            setDraft(String(v))
            commit(String(v))
          }
        }}
      />
      {suffix && <span className="pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2 text-[11px] text-dim">{suffix}</span>}
    </div>
  )
  return label ? <Row label={label}>{input}</Row> : input
}

// One drag of a slider is one undo step, even with pauses while holding it.
export function sliderGesture() {
  beginGesture()
  const end = () => {
    endGesture()
    window.removeEventListener('pointerup', end)
    window.removeEventListener('pointercancel', end)
    window.removeEventListener('blur', end)
  }
  window.addEventListener('pointerup', end)
  window.addEventListener('pointercancel', end)
  window.addEventListener('blur', end)
}

export function Slider({ value, onChange, min = 0, max = 1, step = 0.01, label, format }: { value: number; onChange: (v: number) => void; min?: number; max?: number; step?: number; label: string; format?: (v: number) => string }) {
  const pct = ((value - min) / (max - min)) * 100
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between text-[11px] font-medium text-muted">
        <span>{label}</span>
        <span className="tabular-nums text-ivory/80">{format ? format(value) : step >= 1 ? Math.round(value) : value.toFixed(2)}</span>
      </div>
      <input
        type="range"
        className="w-full"
        aria-label={label}
        min={min}
        max={max}
        step={step}
        value={value}
        style={{ ['--fill' as string]: `${Math.max(0, Math.min(100, pct))}%` }}
        onPointerDown={sliderGesture}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </div>
  )
}

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button type="button" role="switch" aria-checked={checked} className="flex w-full items-center justify-between gap-3 py-0.5 text-left text-[12px] text-ivory/85" onClick={() => onChange(!checked)}>
      <span>{label}</span>
      <span className={`relative h-[18px] w-8 shrink-0 rounded-full transition ${checked ? 'bg-gold' : 'bg-line-2'}`}>
        <span className={`absolute top-[2px] h-[14px] w-[14px] rounded-full bg-ink transition-all ${checked ? 'left-[16px]' : 'left-[2px]'}`} />
      </span>
    </button>
  )
}

export function Select<T extends string>({ value, onChange, options, label, ariaLabel }: { value: T; onChange: (v: T) => void; options: { value: T; label: string }[]; label?: string; ariaLabel?: string }) {
  const sel = (
    <select className="field" value={value} aria-label={ariaLabel ?? label} onChange={(e) => onChange(e.target.value as T)}>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  )
  return label ? <Row label={label}>{sel}</Row> : sel
}

export function Segmented<T extends string>({ value, onChange, options, ariaLabel }: { value: T; onChange: (v: T) => void; options: { value: T; label: ReactNode; title?: string }[]; ariaLabel?: string }) {
  return (
    <div role="radiogroup" aria-label={ariaLabel} className="flex rounded-lg border border-line bg-ink-2 p-0.5">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          title={o.title}
          onClick={() => onChange(o.value)}
          className={`flex flex-1 items-center justify-center gap-1 rounded-md px-2 py-1.5 text-[11px] font-semibold transition ${value === o.value ? 'bg-panel-3 text-gold shadow' : 'text-muted hover:text-ivory'}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function FontSelect({ value, onChange, label = 'Fuente' }: { value: string; onChange: (v: string) => void; label?: string }) {
  return (
    <Row label={label}>
      <select className="field" value={value} aria-label={label} onChange={(e) => onChange(e.target.value)}>
        <optgroup label="Fuentes de marca">
          {FONT_TOKENS.map((f) => (
            <option key={f.token} value={f.token}>
              {f.label}
            </option>
          ))}
        </optgroup>
        <optgroup label="Fuentes incluidas">
          {FONTS.map((f) => (
            <option key={f.family} value={f.family}>
              {f.label}
            </option>
          ))}
        </optgroup>
      </select>
    </Row>
  )
}

/** Color input supporting brand tokens ($primary, $home…) and any hex value. */
export function ColorField({ value, onChange, label }: { value: string; onChange: (v: string) => void; label: string }) {
  const brand = useLibrary((s) => s.brand)
  const project = useEditor((s) => s.project)
  const slide = useEditor((s) => activeSlideOf(s))
  const match = project ? (slide ? applyOverrides(project.match, slide.overrides) : project.match) : undefined
  const resolved = match ? resolveColor(value, { match, brand, accent: slide ? slideAccent(project, slide) : undefined }) : value.startsWith('$') ? brand.palette.primary : value
  const [open, setOpen] = useState(false)
  const btn = useRef<HTMLButtonElement>(null)
  const [pos, setPos] = useState({ x: 0, y: 0 })
  const token = PALETTE_TOKENS.find((t) => t.token === value)
  const hex = resolved.startsWith('#') ? resolved.slice(0, 7) : '#ffffff'
  return (
    <Row label={label}>
      <button
        ref={btn}
        type="button"
        aria-label={`${label}: ${token ? token.label : value}`}
        className="field flex items-center gap-2 text-left"
        onClick={() => {
          const r = btn.current!.getBoundingClientRect()
          setPos({ x: Math.min(window.innerWidth - 250, r.left), y: Math.min(window.innerHeight - 380, r.bottom + 6) })
          setOpen(true)
        }}
      >
        <span className="checker h-4 w-4 shrink-0 overflow-hidden rounded border border-white/15">
          <span className="block h-full w-full" style={{ background: resolved }} />
        </span>
        <span className="truncate text-[12px]">{token ? token.label : value.toUpperCase()}</span>
        {token && <span className="ml-auto rounded bg-gold/15 px-1 text-[9px] font-bold tracking-wider text-gold">MARCA</span>}
      </button>
      {open &&
        createPortal(
          <div className="fixed inset-0 z-[80]" onMouseDown={() => setOpen(false)}>
            <div className="animate-in absolute w-[236px] rounded-xl border border-line-2 bg-panel-2 p-3 shadow-2xl" style={{ left: pos.x, top: pos.y }} onMouseDown={(e) => e.stopPropagation()}>
              <div className="mb-2 flex items-center justify-between">
                <span className="label-xs">{label}</span>
                <button type="button" className="icon-btn h-6 w-6" aria-label="Cerrar" onClick={() => setOpen(false)}>
                  <X size={13} />
                </button>
              </div>
              <HexColorPicker color={hex} onChange={(c) => onChange(c.toUpperCase())} style={{ width: '100%', height: 150 }} />
              <input className="field mt-2" value={value} aria-label="Valor de color" onChange={(e) => onChange(e.target.value)} />
              <div className="label-xs mt-3 mb-1.5">Colores de marca y equipos</div>
              <div className="grid grid-cols-7 gap-1.5">
                {PALETTE_TOKENS.map((t) => {
                  const c = match ? resolveColor(t.token, { match, brand }) : '#000'
                  return (
                    <button
                      key={t.token}
                      type="button"
                      title={t.label}
                      aria-label={t.label}
                      onClick={() => onChange(t.token)}
                      className={`h-6 w-6 rounded-md border ${value === t.token ? 'border-gold ring-2 ring-gold/40' : 'border-white/15'}`}
                      style={{ background: c }}
                    />
                  )
                })}
              </div>
            </div>
          </div>,
          document.body,
        )}
    </Row>
  )
}

export function Modal({ title, onClose, children, width = 560, footer }: { title: string; onClose: () => void; children: ReactNode; width?: number; footer?: ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])
  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center sm:p-4" onMouseDown={onClose} role="presentation">
      <div role="dialog" aria-modal="true" aria-label={title} className="animate-in flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-2xl border border-line-2 bg-panel pb-[var(--edge-bottom)] shadow-2xl sm:rounded-2xl sm:pb-0" style={{ maxWidth: width }} onMouseDown={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-line px-5 py-3.5">
          <h2 className="font-cond text-lg font-bold tracking-wide uppercase">{title}</h2>
          <button type="button" className="icon-btn" aria-label="Cerrar" onClick={onClose}>
            <X size={16} />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer && <div className="flex items-center justify-end gap-2 border-t border-line px-5 py-3">{footer}</div>}
      </div>
    </div>,
    document.body,
  )
}

export function Spinner({ size = 16 }: { size?: number }) {
  return <span className="spin inline-block rounded-full border-2 border-gold/30 border-t-gold" style={{ width: size, height: size }} />
}

export function EmptyHint({ children }: { children: ReactNode }) {
  return <p className="rounded-lg border border-dashed border-line-2 px-3 py-4 text-center text-[12px] leading-relaxed text-muted">{children}</p>
}
