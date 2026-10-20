import type {
  BrandMarkElement,
  CrestElement,
  EffectElement,
  GlassElement,
  IconElement,
  ImageElement,
  MascotElement,
  Model3DElement,
  ShapeElement,
  TextElement,
} from '../../model/types'
import { fontDef } from '../../fonts/fonts'
import { resolveFont, TEXT_TOKENS } from '../../model/tokens'
import { useLibrary } from '../../store/library'
import { useEditor } from '../../store/editor'
import { ColorField, FontSelect, NumberField, Row, Section, Segmented, Select, Slider, TextField, Toggle } from '../../ui/controls'
import { AssetPicker, FillEditor, useElementSetter } from './common'
import { ICONS } from '../../render/icons'
import { AlignCenter, AlignLeft, AlignRight } from 'lucide-react'

export function TextProps({ el }: { el: TextElement }) {
  const set = useElementSetter(el)
  const brand = useLibrary((s) => s.brand)
  const fam = resolveFont(el.fontFamily, brand)
  const weights = fontDef(fam)?.weights ?? [400]
  return (
    <>
      <Section title="Texto">
        <TextField multiline rows={4} value={el.text} onChange={(v) => set({ text: v }, `text-${el.id}`)} ariaLabel="Contenido del texto" />
        <div className="flex flex-wrap gap-1">
          <select
            className="field w-auto flex-1 py-1 text-[11px]"
            aria-label="Insertar dato del partido"
            value=""
            onChange={(e) => {
              if (e.target.value) set({ text: `${el.text}${el.text.endsWith(' ') || !el.text ? '' : ' '}${e.target.value}` }, `text-${el.id}`)
            }}
          >
            <option value="">+ Insertar dato vinculado…</option>
            {TEXT_TOKENS.map((t) => (
              <option key={t.token} value={t.token}>
                {t.label} {t.token}
              </option>
            ))}
          </select>
        </div>
        <p className="text-[11px] leading-snug text-dim">
          Envuelve palabras en <b className="text-gold">[[ ]]</b> para resaltarlas con el color de acento. Los datos entre llaves se actualizan desde «Partido».
        </p>
      </Section>
      <Section title="Tipografía">
        <FontSelect value={el.fontFamily} onChange={(v) => set({ fontFamily: v })} />
        <div className="grid grid-cols-2 gap-2">
          <NumberField label="Tamaño" value={Math.round(el.fontSize)} min={6} max={600} onChange={(v) => set({ fontSize: Math.max(6, v ?? 12) })} />
          <Select label="Peso" value={String(el.fontWeight)} options={weights.map((w) => ({ value: String(w), label: String(w) }))} onChange={(v) => set({ fontWeight: Number(v) })} />
        </div>
        <Segmented
          value={el.align}
          onChange={(v) => set({ align: v })}
          ariaLabel="Alineación"
          options={[
            { value: 'left', label: <AlignLeft size={14} />, title: 'Izquierda' },
            { value: 'center', label: <AlignCenter size={14} />, title: 'Centro' },
            { value: 'right', label: <AlignRight size={14} />, title: 'Derecha' },
          ]}
        />
        <Segmented
          value={el.verticalAlign}
          onChange={(v) => set({ verticalAlign: v })}
          ariaLabel="Alineación vertical"
          options={[
            { value: 'top', label: 'Arriba' },
            { value: 'middle', label: 'Centro' },
            { value: 'bottom', label: 'Abajo' },
          ]}
        />
        <Slider label="Interlineado" min={0.7} max={2} value={el.lineHeight} onChange={(v) => set({ lineHeight: v })} />
        <Slider label="Espaciado de letras" min={-5} max={40} step={0.5} value={el.letterSpacing} onChange={(v) => set({ letterSpacing: v })} />
        <Toggle label="MAYÚSCULAS" checked={el.uppercase} onChange={(v) => set({ uppercase: v })} />
        {fontDef(fam)?.italic && <Toggle label="Cursiva" checked={el.italic} onChange={(v) => set({ italic: v })} />}
        <Toggle label="Ajustar al cuadro (evita cortes)" checked={el.autoFit} onChange={(v) => set({ autoFit: v })} />
        {el.autoFit && <NumberField label="Tamaño mínimo" value={el.minFontSize} min={4} onChange={(v) => set({ minFontSize: v ?? 12 })} />}
      </Section>
      <Section title="Color">
        <FillEditor fill={el.fill} onChange={(f) => set({ fill: f })} allowNone={false} />
        <ColorField label="Acento [[ ]]" value={el.accentColor} onChange={(c) => set({ accentColor: c })} />
        <Toggle label="Contorno" checked={!!el.stroke && el.stroke.width > 0} onChange={(v) => set({ stroke: v ? { color: '#000000', width: 3 } : undefined })} />
        {el.stroke && el.stroke.width > 0 && (
          <div className="grid grid-cols-2 gap-2">
            <ColorField label="Color contorno" value={el.stroke.color} onChange={(c) => set({ stroke: { ...el.stroke!, color: c } })} />
            <NumberField label="Grosor" value={el.stroke.width} min={0} onChange={(v) => set({ stroke: { ...el.stroke!, width: v ?? 0 } })} />
          </div>
        )}
        <Toggle label="Fondo (píldora / etiqueta)" checked={!!el.background} onChange={(v) => set({ background: v ? { color: '$surface', opacity: 0.85, paddingX: 30, paddingY: 14, radius: 40 } : undefined })} />
        {el.background && (
          <div className="space-y-2.5 rounded-lg bg-ink-2 p-2.5">
            <ColorField label="Color de fondo" value={el.background.color} onChange={(c) => set({ background: { ...el.background!, color: c } })} />
            <Slider label="Opacidad" value={el.background.opacity} onChange={(v) => set({ background: { ...el.background!, opacity: v } })} />
            <div className="grid grid-cols-3 gap-2">
              <NumberField label="Margen X" value={el.background.paddingX} onChange={(v) => set({ background: { ...el.background!, paddingX: v ?? 0 } })} />
              <NumberField label="Margen Y" value={el.background.paddingY} onChange={(v) => set({ background: { ...el.background!, paddingY: v ?? 0 } })} />
              <NumberField label="Radio" value={el.background.radius} onChange={(v) => set({ background: { ...el.background!, radius: v ?? 0 } })} />
            </div>
          </div>
        )}
      </Section>
    </>
  )
}

export function ShapeProps({ el }: { el: ShapeElement }) {
  const set = useElementSetter(el)
  return (
    <Section title="Forma">
      <Select
        label="Tipo"
        value={el.shape}
        onChange={(v) => set({ shape: v })}
        options={[
          { value: 'rect', label: 'Rectángulo' },
          { value: 'ellipse', label: 'Elipse' },
          { value: 'line', label: 'Línea' },
          { value: 'triangle', label: 'Triángulo' },
          { value: 'diamond', label: 'Rombo' },
          { value: 'hexagon', label: 'Hexágono' },
          { value: 'star', label: 'Estrella' },
          { value: 'parallelogram', label: 'Paralelogramo' },
        ]}
      />
      {el.shape === 'rect' && <Slider label="Radio de esquinas" min={0} max={300} step={1} value={el.cornerRadius} onChange={(v) => set({ cornerRadius: v })} />}
      <FillEditor fill={el.fill} onChange={(f) => set({ fill: f })} />
      <Toggle label="Borde" checked={!!el.stroke && el.stroke.width > 0} onChange={(v) => set({ stroke: v ? { color: '$primary', width: 3, opacity: 1 } : undefined })} />
      {el.stroke && el.stroke.width > 0 && (
        <div className="space-y-2.5 rounded-lg bg-ink-2 p-2.5">
          <ColorField label="Color del borde" value={el.stroke.color} onChange={(c) => set({ stroke: { ...el.stroke!, color: c } })} />
          <div className="grid grid-cols-2 gap-2">
            <NumberField label="Grosor" value={el.stroke.width} min={0} onChange={(v) => set({ stroke: { ...el.stroke!, width: v ?? 0 } })} />
            <Select label="Estilo" value={el.stroke.dash?.length ? 'dash' : 'solid'} options={[{ value: 'solid', label: 'Continuo' }, { value: 'dash', label: 'Discontinuo' }]} onChange={(v) => set({ stroke: { ...el.stroke!, dash: v === 'dash' ? [16, 10] : undefined } })} />
          </div>
          <Slider label="Opacidad del borde" value={el.stroke.opacity ?? 1} onChange={(v) => set({ stroke: { ...el.stroke!, opacity: v } })} />
        </div>
      )}
    </Section>
  )
}

export function ImageProps({ el }: { el: ImageElement }) {
  const set = useElementSetter(el)
  return (
    <Section title="Imagen">
      <AssetPicker value={el.assetId} onChange={(id) => set({ assetId: id })} uploadKind="other" />
      <Row label="Ajuste">
        <Segmented
          value={el.fit}
          onChange={(v) => set({ fit: v })}
          options={[
            { value: 'contain', label: 'Contener' },
            { value: 'cover', label: 'Cubrir (recortar)' },
            { value: 'fill', label: 'Estirar' },
          ]}
        />
      </Row>
      {el.fit === 'cover' && (
        <div className="grid grid-cols-2 gap-2">
          <Slider label="Encuadre X" value={el.focusX} onChange={(v) => set({ focusX: v })} />
          <Slider label="Encuadre Y" value={el.focusY} onChange={(v) => set({ focusY: v })} />
        </div>
      )}
      <Slider label="Radio de esquinas" min={0} max={400} step={1} value={el.cornerRadius} onChange={(v) => set({ cornerRadius: v })} />
      <Slider label="Fundido inferior" value={el.fadeBottom} onChange={(v) => set({ fadeBottom: v })} />
      <Toggle label="Voltear horizontalmente" checked={el.flipX} onChange={(v) => set({ flipX: v })} />
      <Toggle label="Blanco y negro" checked={el.grayscale} onChange={(v) => set({ grayscale: v })} />
      <Toggle label="Tinte de color" checked={!!el.tint} onChange={(v) => set({ tint: v ? { color: '$secondary', opacity: 0.45, blend: 'source-over' } : undefined })} />
      {el.tint && (
        <div className="grid grid-cols-2 gap-2">
          <ColorField label="Color" value={el.tint.color} onChange={(c) => set({ tint: { ...el.tint!, color: c } })} />
          <Slider label="Intensidad" value={el.tint.opacity} onChange={(v) => set({ tint: { ...el.tint!, opacity: v } })} />
        </div>
      )}
    </Section>
  )
}

export function CrestProps({ el }: { el: CrestElement }) {
  const set = useElementSetter(el)
  const update = useEditor((s) => s.update)
  const match = useEditor((s) => s.project!.match)
  const team = el.side === 'home' ? match.home : el.side === 'away' ? match.away : null
  return (
    <Section title="Escudo">
      <Row label="Equipo">
        <Segmented
          value={el.side}
          onChange={(v) => set({ side: v })}
          options={[
            { value: 'home', label: 'Local' },
            { value: 'away', label: 'Visitante' },
            { value: 'custom', label: 'Otro' },
          ]}
        />
      </Row>
      {team && (
        <>
          <AssetPicker
            label={`Escudo de ${team.name} (todo el proyecto)`}
            value={team.crestAssetId}
            uploadKind="crest"
            kinds={['crest', 'logo', 'other']}
            onChange={(id) =>
              update((d) => {
                const t = el.side === 'home' ? d.match.home : d.match.away
                t.crestAssetId = id
              })
            }
          />
          <p className="text-[11px] leading-snug text-dim">Sin imagen se usa un escudo genérico original con los colores del equipo.</p>
        </>
      )}
      {el.side === 'custom' && (
        <>
          <TextField label="Nombre" value={el.customName} onChange={(v) => set({ customName: v })} />
          <AssetPicker value={el.customAssetId} onChange={(id) => set({ customAssetId: id })} uploadKind="crest" />
        </>
      )}
      <Slider label="Aura de color" value={el.aura} onChange={(v) => set({ aura: v })} />
      <Toggle label="Anillo" checked={el.ring.enabled} onChange={(v) => set({ ring: { ...el.ring, enabled: v } })} />
      {el.ring.enabled && (
        <div className="space-y-2.5 rounded-lg bg-ink-2 p-2.5">
          <ColorField label="Color del anillo" value={el.ring.color} onChange={(c) => set({ ring: { ...el.ring, color: c } })} />
          <Slider label="Grosor" min={1} max={20} step={0.5} value={el.ring.width} onChange={(v) => set({ ring: { ...el.ring, width: v } })} />
          <Slider label="Brillo" min={0} max={60} step={1} value={el.ring.glow} onChange={(v) => set({ ring: { ...el.ring, glow: v } })} />
        </div>
      )}
    </Section>
  )
}

export function IconProps({ el }: { el: IconElement }) {
  const set = useElementSetter(el)
  return (
    <Section title="Icono">
      <div className="grid max-h-48 grid-cols-6 gap-1 overflow-y-auto rounded-lg bg-ink-2 p-1.5">
        {Object.entries(ICONS).map(([k, v]) => (
          <button key={k} type="button" title={v.label} aria-label={v.label} className={`flex aspect-square items-center justify-center rounded-md border text-[9px] ${el.icon === k ? 'border-gold bg-gold/10' : 'border-transparent hover:bg-white/5'}`} onClick={() => set({ icon: k })}>
            <IconPreview name={k} />
          </button>
        ))}
      </div>
      <ColorField label="Color" value={el.color} onChange={(c) => set({ color: c })} />
      <Slider label="Grosor de trazo" min={0.5} max={4} step={0.1} value={el.strokeWidth} onChange={(v) => set({ strokeWidth: v })} />
      <Toggle label="Fondo" checked={!!el.background} onChange={(v) => set({ background: v ? { color: '$surface', opacity: 0.9, shape: 'circle' } : undefined })} />
      {el.background && (
        <div className="grid grid-cols-2 gap-2">
          <ColorField label="Color fondo" value={el.background.color} onChange={(c) => set({ background: { ...el.background!, color: c } })} />
          <Select label="Forma" value={el.background.shape} options={[{ value: 'circle', label: 'Círculo' }, { value: 'square', label: 'Cuadrado' }]} onChange={(v) => set({ background: { ...el.background!, shape: v } })} />
        </div>
      )}
    </Section>
  )
}

export function IconPreview({ name, size = 18 }: { name: string; size?: number }) {
  const node = ICONS[name]?.node
  if (!node) return null
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      {node.map(([tag, attrs], i) => {
        const Tag = tag as 'path'
        return <Tag key={i} {...(attrs as Record<string, string>)} />
      })}
    </svg>
  )
}

export const EFFECT_OPTIONS: { value: EffectElement['effect']; label: string }[] = [
  { value: 'vignette', label: 'Viñeta cinematográfica' },
  { value: 'spotlight', label: 'Foco de estadio' },
  { value: 'stadiumLights', label: 'Torres de focos' },
  { value: 'lightRays', label: 'Rayos de luz' },
  { value: 'fog', label: 'Niebla atmosférica' },
  { value: 'glow', label: 'Iluminación radial suave' },
  { value: 'gradient', label: 'Máscara degradada' },
  { value: 'noiseGradient', label: 'Aurora de color' },
  { value: 'grain', label: 'Grano de película' },
  { value: 'bokeh', label: 'Bokeh de luces' },
  { value: 'pitchLines', label: 'Líneas de campo' },
  { value: 'grid', label: 'Retícula técnica' },
  { value: 'scanlines', label: 'Líneas de escaneo' },
]

export function EffectProps({ el }: { el: EffectElement }) {
  const set = useElementSetter(el)
  const twoColors = el.effect === 'gradient' || el.effect === 'noiseGradient' || el.effect === 'bokeh'
  const hasAngle = el.effect === 'gradient' || el.effect === 'spotlight' || el.effect === 'lightRays'
  return (
    <Section title="Efecto">
      <Select label="Tipo" value={el.effect} options={EFFECT_OPTIONS} onChange={(v) => set({ effect: v })} />
      <ColorField label="Color" value={el.color} onChange={(c) => set({ color: c })} />
      {twoColors && <ColorField label="Color secundario" value={el.color2} onChange={(c) => set({ color2: c })} />}
      <Slider label="Intensidad" min={0} max={1.5} value={el.intensity} onChange={(v) => set({ intensity: v })} />
      <Slider label={el.effect === 'gradient' ? 'Inicio del degradado' : 'Extensión'} value={el.spread} onChange={(v) => set({ spread: v })} />
      {hasAngle && <Slider label="Ángulo" min={el.effect === 'gradient' ? 0 : -45} max={el.effect === 'gradient' ? 360 : 45} step={1} value={el.angle} onChange={(v) => set({ angle: v })} />}
      {(el.effect === 'fog' || el.effect === 'bokeh' || el.effect === 'lightRays' || el.effect === 'noiseGradient' || el.effect === 'grain') && (
        <NumberField label="Variación (semilla)" value={el.seed} min={1} max={999} onChange={(v) => set({ seed: Math.round(v ?? 1) })} />
      )}
    </Section>
  )
}

export function GlassProps({ el }: { el: GlassElement }) {
  const set = useElementSetter(el)
  return (
    <Section title="Cristal esmerilado">
      <Slider label="Desenfoque del fondo" min={0} max={80} step={1} value={el.backdropBlur} onChange={(v) => set({ backdropBlur: v })} />
      <ColorField label="Tinte" value={el.tint} onChange={(c) => set({ tint: c })} />
      <Slider label="Opacidad del tinte" value={el.tintOpacity} onChange={(v) => set({ tintOpacity: v })} />
      <Slider label="Radio" min={0} max={200} step={1} value={el.cornerRadius} onChange={(v) => set({ cornerRadius: v })} />
      <ColorField label="Borde" value={el.borderColor} onChange={(c) => set({ borderColor: c })} />
      <Slider label="Opacidad del borde" value={el.borderOpacity} onChange={(v) => set({ borderOpacity: v })} />
      <Slider label="Brillo superior" value={el.highlight} onChange={(v) => set({ highlight: v })} />
      <Slider label="Textura" value={el.noise} onChange={(v) => set({ noise: v })} />
    </Section>
  )
}

export function BrandMarkProps({ el }: { el: BrandMarkElement }) {
  const set = useElementSetter(el)
  const brand = useLibrary((s) => s.brand)
  return (
    <Section title="Marca GOAT SOCIETY">
      <Select
        label="Variante"
        value={el.variant}
        onChange={(v) => set({ variant: v })}
        options={[
          { value: 'header', label: 'Cabecera (icono + nombre)' },
          { value: 'signature', label: 'Firma de pie' },
          { value: 'badge', label: 'Insignia circular' },
          { value: 'watermark', label: 'Marca de agua' },
          { value: 'wordmark', label: 'Logotipo apilado' },
        ]}
      />
      {el.variant === 'header' && (
        <Segmented
          value={el.align ?? 'center'}
          onChange={(v) => set({ align: v })}
          options={[
            { value: 'left', label: 'Izquierda' },
            { value: 'center', label: 'Centro' },
            { value: 'right', label: 'Derecha' },
          ]}
        />
      )}
      <TextField label="Texto" value={el.text} onChange={(v) => set({ text: v })} />
      <ColorField label="Color del texto" value={el.color} onChange={(c) => set({ color: c })} />
      <ColorField label="Color del icono / acento" value={el.accentColor} onChange={(c) => set({ accentColor: c })} />
      <Toggle label="Usar mi logo subido (si existe)" checked={el.useLogo} onChange={(v) => set({ useLogo: v })} />
      {!brand.logoAssetId && <p className="text-[11px] text-dim">Sube tu logo en «Kit de marca» para reemplazar el icono provisional en todas las diapositivas.</p>}
    </Section>
  )
}

export const MASCOT_PRESETS: { label: string; patch: Partial<MascotElement> }[] = [
  { label: 'Aura roja', patch: { variant: 'cinematic', baseColor: '#4A4F57', shadowColor: '#050506', rimColor: '$negative', backlightColor: '$tertiary', eyeColor: '$primary', rimIntensity: 0.85, backlight: 0.9, eyeGlow: 0.9, fog: 0.5 } },
  { label: 'Aura verde', patch: { variant: 'cinematic', baseColor: '#3D434B', shadowColor: '#060708', rimColor: '$positive', backlightColor: '$secondary', eyeColor: '$positive', rimIntensity: 0.8, backlight: 1, eyeGlow: 1, fog: 0.4 } },
  { label: 'Oro', patch: { variant: 'cinematic', baseColor: '$primary', shadowColor: '#2A1D08', rimColor: '#FFF3D0', backlightColor: '$primary', eyeColor: '#08090B', rimIntensity: 0.5, backlight: 0.5, eyeGlow: 0, fog: 0.2, contrast: 0.8 } },
  { label: 'Obsidiana', patch: { variant: 'cinematic', baseColor: '#22252B', shadowColor: '#000000', rimColor: '$text', backlightColor: '#2B3038', eyeColor: '$text', rimIntensity: 0.6, backlight: 0.6, eyeGlow: 0.5, fog: 0.6 } },
  { label: 'Icono oro', patch: { variant: 'icon', baseColor: '$primary', eyeColor: '#08090B', eyeGlow: 0, facetGap: 0 } },
  { label: 'Icono marfil', patch: { variant: 'icon', baseColor: '$text', eyeColor: '#08090B', eyeGlow: 0, facetGap: 1.6 } },
  { label: 'Contorno', patch: { variant: 'outline', baseColor: '$text', eyeColor: '$primary', eyeGlow: 0.6 } },
  { label: 'Fondo', patch: { variant: 'background', opacity: 0.14, fadeBottom: 0.45, rimIntensity: 0.6, eyeGlow: 0.5, fog: 0 } },
]

export function MascotProps({ el }: { el: MascotElement }) {
  const set = useElementSetter(el)
  const cinematic = el.variant === 'cinematic' || el.variant === 'background'
  return (
    <>
      <Section title="Mascota GOAT">
        <div className="grid grid-cols-2 gap-1.5">
          {MASCOT_PRESETS.map((p) => (
            <button key={p.label} type="button" className="btn px-2 py-1.5 text-[11px]" onClick={() => set(p.patch, `mascot-preset-${el.id}`)}>
              {p.label}
            </button>
          ))}
        </div>
        <Select
          label="Tratamiento"
          value={el.variant}
          onChange={(v) => set({ variant: v })}
          options={[
            { value: 'cinematic', label: 'Cinemático (luz real por faceta)' },
            { value: 'background', label: 'Fondo parcialmente oculto' },
            { value: 'icon', label: 'Icono plano (insignias, marcas de agua)' },
            { value: 'outline', label: 'Contorno geométrico' },
          ]}
        />
        <ColorField label="Color base" value={el.baseColor} onChange={(c) => set({ baseColor: c })} />
        {cinematic && <ColorField label="Sombras" value={el.shadowColor} onChange={(c) => set({ shadowColor: c })} />}
        <ColorField label="Ojos" value={el.eyeColor} onChange={(c) => set({ eyeColor: c })} />
        <Slider label="Brillo de ojos" value={el.eyeGlow} onChange={(v) => set({ eyeGlow: v })} />
        {el.variant === 'icon' && <Slider label="Separación de facetas" min={0} max={6} step={0.1} value={el.facetGap} onChange={(v) => set({ facetGap: v })} />}
      </Section>
      {cinematic && (
        <Section title="Iluminación y atmósfera">
          <Slider label="Dirección de la luz" min={0} max={180} step={1} value={el.lightAngle} format={(v) => `${Math.round(v)}°`} onChange={(v) => set({ lightAngle: v })} />
          <Slider label="Contraste" value={el.contrast} onChange={(v) => set({ contrast: v })} />
          <ColorField label="Luz de contorno (rim)" value={el.rimColor} onChange={(c) => set({ rimColor: c })} />
          <Slider label="Intensidad rim" min={0} max={1.5} value={el.rimIntensity} onChange={(v) => set({ rimIntensity: v })} />
          <ColorField label="Contraluz" value={el.backlightColor} onChange={(c) => set({ backlightColor: c })} />
          <Slider label="Intensidad contraluz" min={0} max={1.5} value={el.backlight} onChange={(v) => set({ backlight: v })} />
          <Slider label="Niebla" value={el.fog} onChange={(v) => set({ fog: v })} />
          <Slider label="Fundido inferior" value={el.fadeBottom} onChange={(v) => set({ fadeBottom: v })} />
        </Section>
      )}
    </>
  )
}

export function Model3DProps({ el }: { el: Model3DElement }) {
  const set = useElementSetter(el)
  return (
    <>
      <Section title="Modelo 3D (GLB / GLTF)">
        <AssetPicker label="Modelo" value={el.assetId} onChange={(id) => set({ assetId: id })} uploadKind="model3d" models />
        <p className="text-[11px] leading-snug text-dim">Se renderiza localmente con Three.js y se integra en la exportación. Los .gltf deben llevar texturas incrustadas (o usa .glb).</p>
        <Select
          label="Material"
          value={el.material}
          onChange={(v) => set({ material: v })}
          options={[
            { value: 'original', label: 'Original del modelo' },
            { value: 'obsidian', label: 'Obsidiana' },
            { value: 'gold', label: 'Oro' },
            { value: 'ivory', label: 'Marfil' },
            { value: 'chrome', label: 'Cromo' },
          ]}
        />
      </Section>
      <Section title="Cámara">
        <Slider label="Giro" min={-180} max={180} step={1} value={el.camera.yaw} onChange={(v) => set({ camera: { ...el.camera, yaw: v } })} />
        <Slider label="Inclinación" min={-60} max={80} step={1} value={el.camera.pitch} onChange={(v) => set({ camera: { ...el.camera, pitch: v } })} />
        <Slider label="Distancia" min={1.2} max={10} step={0.05} value={el.camera.distance} onChange={(v) => set({ camera: { ...el.camera, distance: v } })} />
        <Slider label="Campo de visión" min={15} max={80} step={1} value={el.camera.fov} onChange={(v) => set({ camera: { ...el.camera, fov: v } })} />
        <Slider label="Rotación del modelo" min={-180} max={180} step={1} value={el.autoRotate} onChange={(v) => set({ autoRotate: v })} />
      </Section>
      <Section title="Iluminación">
        <Select
          label="Preajuste"
          value={el.lighting.preset}
          onChange={(v) => set({ lighting: { ...el.lighting, preset: v } })}
          options={[
            { value: 'cinematic', label: 'Cinemática' },
            { value: 'studio', label: 'Estudio' },
            { value: 'rimRed', label: 'Contorno rojo' },
            { value: 'rimGreen', label: 'Contorno verde' },
            { value: 'gold', label: 'Dorada' },
          ]}
        />
        <ColorField label="Color de contorno" value={el.lighting.rimColor} onChange={(c) => set({ lighting: { ...el.lighting, rimColor: c } })} />
        <Slider label="Exposición" min={0.3} max={2.5} value={el.lighting.exposure} onChange={(v) => set({ lighting: { ...el.lighting, exposure: v } })} />
        <Slider label="Luz principal" min={0} max={2} value={el.lighting.keyIntensity} onChange={(v) => set({ lighting: { ...el.lighting, keyIntensity: v } })} />
        <Slider label="Luz de contorno" min={0} max={2.5} value={el.lighting.rimIntensity} onChange={(v) => set({ lighting: { ...el.lighting, rimIntensity: v } })} />
      </Section>
    </>
  )
}
