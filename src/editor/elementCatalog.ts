// Standalone building blocks the user can drop onto any page.
// Every item creates a fully editable element sized for the current format.
import * as E from '../model/elements'
import { defaultTactics } from '../tactics/presets'
import type { CanvasFormat, SlideElement } from '../model/types'

export type CatalogCategory = 'texto' | 'etiquetas' | 'datos' | 'equipos' | 'fotos' | 'pronostico' | 'tactica' | 'marca'

export const CATALOG_CATEGORIES: { id: CatalogCategory; label: string }[] = [
  { id: 'texto', label: 'Texto' },
  { id: 'etiquetas', label: 'Etiquetas' },
  { id: 'datos', label: 'Datos' },
  { id: 'equipos', label: 'Equipos' },
  { id: 'fotos', label: 'Fotos y formas' },
  { id: 'pronostico', label: 'Pronósticos' },
  { id: 'tactica', label: 'Táctica' },
  { id: 'marca', label: 'Marca' },
]

export interface CatalogItem {
  id: string
  label: string
  category: CatalogCategory
  /** Short visual hint shown on the tile. */
  glyph: string
  /** Badges: drawn as a small styled pill in the library instead of a glyph. */
  badge?: { text: string; style: 'solid' | 'outline' | 'glow' | 'text'; color: string }
  /** Open the text editor right after inserting. */
  editText?: boolean
  make: (f: CanvasFormat) => SlideElement
}

const M = 72
const cw = (f: CanvasFormat) => f.width - M * 2
const midY = (f: CanvasFormat, h: number) => Math.round((f.height - h) / 2)
const box = (f: CanvasFormat, h: number, w = cw(f)) => ({ x: Math.round((f.width - w) / 2), y: midY(f, h), width: w, height: h })

const badge = (id: string, label: string, text: string, style: 'solid' | 'outline' | 'glow' | 'text', icon: E.BadgeIcon, color = '$accent'): CatalogItem => ({
  id,
  label,
  category: 'etiquetas',
  glyph: text,
  badge: { text, style, color },
  make: (f) => E.badge({ name: label, text, style, icon, color, ...box(f, 96, Math.min(cw(f), 620)) }),
})

export const CATALOG: CatalogItem[] = [
  // Texto
  { id: 'headline', label: 'Titular', category: 'texto', glyph: 'Aa', editText: true, make: (f) => E.text({ name: 'Titular', text: 'Tu titular [[aquí]]', fontFamily: '$headline', fontSize: 140, lineHeight: 1.04, effect: 'metallic', accentColor: '$accent', ...box(f, 320) }) },
  { id: 'subtitle', label: 'Subtítulo', category: 'texto', glyph: 'Aa', editText: true, make: (f) => E.text({ name: 'Subtítulo', text: 'Subtítulo', fontFamily: '$label', fontSize: 64, fontWeight: 700, lineHeight: 1.05, ...box(f, 140) }) },
  { id: 'body', label: 'Texto', category: 'texto', glyph: 'Aa', editText: true, make: (f) => E.text({ name: 'Texto', text: 'Escribe aquí una frase de apoyo.', fontFamily: '$body', fontSize: 44, fontWeight: 500, uppercase: false, lineHeight: 1.25, fill: { kind: 'solid', color: '$muted' }, ...box(f, 180) }) },
  { id: 'quote', label: 'Cita', category: 'texto', glyph: '“”', editText: true, make: (f) => E.text({ name: 'Cita', text: '[[“]]Una frase que todo el mundo va a compartir[[”]]', fontFamily: '$headline', fontSize: 104, lineHeight: 1.06, effect: 'metallic', ...box(f, 420) }) },
  { id: 'label', label: 'Etiqueta de texto', category: 'texto', glyph: 'ABC', editText: true, make: (f) => E.text({ name: 'Etiqueta', text: 'Champions League', fontFamily: '$label', fontSize: 40, fontWeight: 600, letterSpacing: 1.5, fill: { kind: 'solid', color: '$muted' }, ...box(f, 64) }) },
  { id: 'cta', label: 'Link en la bio', category: 'texto', glyph: '↗', editText: true, make: (f) => E.text({ name: 'Llamada a la acción', text: 'Link en la bio  [[↗]]', fontFamily: '$label', fontSize: 56, fontWeight: 700, ...box(f, 90) }) },
  // Etiquetas
  badge('badge-hit', 'Acertado', 'Acertado', 'solid', 'check'),
  badge('badge-community', 'Solo en mi comunidad', 'Solo en mi comunidad', 'glow', 'lock'),
  badge('badge-final', 'Resultado final', 'Resultado final', 'outline', 'none'),
  badge('badge-won', 'Ganado', 'Ganado', 'solid', 'trophy'),
  badge('badge-bio', 'Link en bio', 'Link en la bio', 'text', 'arrow'),
  badge('badge-breaking', 'Última hora', 'Última hora', 'solid', 'bolt', '$red'),
  badge('badge-live', 'En directo', 'En directo', 'glow', 'none', '$red'),
  badge('badge-official', 'Oficial', 'Oficial', 'solid', 'check', '$blue'),
  badge('badge-exclusive', 'Exclusiva', 'Exclusiva', 'outline', 'star', '$yellow'),
  // Datos
  { id: 'compare', label: 'Comparativa', category: 'datos', glyph: '▬▭', make: (f) => E.statBars({ name: 'Comparativa', style: 'editorial', showCrests: true, maxRows: 3, ...box(f, Math.min(820, f.height * 0.55)) }) },
  { id: 'split-bar', label: 'Barra de proporción', category: 'datos', glyph: '▬', make: (f) => E.statBars({ name: 'Barra de proporción', style: 'editorial', maxRows: 1, showCrests: false, ...box(f, 300) }) },
  { id: 'big-number', label: 'Cifra gigante', category: 'datos', glyph: '72', make: (f) => E.statNumber({ name: 'Cifra gigante', layout: 'hero', align: 'center', value: '72%', label: 'De sus goles', description: 'Llegan tras el descanso.', valueSize: 300, ...box(f, 560) }) },
  { id: 'ring', label: 'Porcentaje', category: 'datos', glyph: '%', make: (f) => E.progressRing({ name: 'Porcentaje', ...box(f, 460, 400) }) },
  { id: 'ranking', label: 'Ranking', category: 'datos', glyph: '1·2·3', make: (f) => E.ranking({ name: 'Ranking', ...box(f, Math.min(900, f.height * 0.6)) }) },
  { id: 'probability', label: 'Probabilidad 1X2', category: 'datos', glyph: '1X2', make: (f) => E.probability({ name: 'Probabilidad 1X2', ...box(f, 420) }) },
  { id: 'form', label: 'Racha', category: 'datos', glyph: 'VVE', make: (f) => E.formRow({ name: 'Racha', ...box(f, 120, Math.min(cw(f), 700)) }) },
  { id: 'score', label: 'Marcador', category: 'datos', glyph: '2-1', make: (f) => E.scoreboard({ name: 'Marcador', ...box(f, 320) }) },
  { id: 'score-pill', label: 'Marcador compacto', category: 'datos', glyph: '2-1', make: (f) => E.scoreboard({ name: 'Marcador compacto', layout: 'compact', ...box(f, 110, Math.min(cw(f), 620)) }) },
  { id: 'agenda', label: 'Agenda', category: 'datos', glyph: '21:00', make: (f) => E.matchList({ name: 'Agenda', ...box(f, Math.min(900, f.height * 0.6)) }) },
  { id: 'players', label: 'Jugadores clave', category: 'datos', glyph: '10', make: (f) => E.playerList({ name: 'Jugadores clave', filter: 'key', ...box(f, 520) }) },
  { id: 'absences', label: 'Bajas y dudas', category: 'datos', glyph: '✚', make: (f) => E.playerList({ name: 'Bajas y dudas', filter: 'absences', showStat: false, ...box(f, 420) }) },
  // Equipos
  { id: 'crest-home', label: 'Escudo local', category: 'equipos', glyph: 'L', make: (f) => E.crest({ name: 'Escudo local', side: 'home', ...box(f, 360, 360) }) },
  { id: 'crest-away', label: 'Escudo visitante', category: 'equipos', glyph: 'V', make: (f) => E.crest({ name: 'Escudo visitante', side: 'away', ...box(f, 360, 360) }) },
  { id: 'match-name', label: 'Nombre del partido', category: 'equipos', glyph: 'vs', editText: true, make: (f) => E.text({ name: 'Partido', text: '{home.short} [[vs]] {away.short}', fontFamily: '$headline', fontSize: 96, effect: 'metallic', ...box(f, 130) }) },
  // Fotos y formas
  { id: 'photo-frame', label: 'Marco de foto', category: 'fotos', glyph: '▢', make: (f) => E.image({ name: 'Foto', fit: 'cover', cornerRadius: 28, ...box(f, Math.round(cw(f) * 0.75)) }) },
  { id: 'photo-full', label: 'Foto a sangre', category: 'fotos', glyph: '▣', make: (f) => E.image({ name: 'Foto', fit: 'cover', fadeBottom: 0.35, x: 0, y: 0, width: f.width, height: Math.round(f.height * 0.72) }) },
  { id: 'shadow', label: 'Sombra inferior', category: 'fotos', glyph: '▤', make: (f) => E.shape({ name: 'Sombra inferior', shape: 'rect', cornerRadius: 0, x: 0, y: Math.round(f.height * 0.45), width: f.width, height: Math.round(f.height * 0.55), fill: { kind: 'linear', angle: 180, stops: [{ offset: 0, color: '#000000', opacity: 0 }, { offset: 0.55, color: '#000000', opacity: 0.8 }, { offset: 1, color: '#000000', opacity: 0.95 }] } }) },
  { id: 'rect', label: 'Rectángulo', category: 'fotos', glyph: '■', make: (f) => E.shape({ name: 'Rectángulo', cornerRadius: 24, ...box(f, 240, 480) }) },
  { id: 'circle', label: 'Círculo', category: 'fotos', glyph: '●', make: (f) => E.shape({ name: 'Círculo', shape: 'ellipse', fill: { kind: 'solid', color: '$accent' }, ...box(f, 240, 240) }) },
  { id: 'line', label: 'Separador', category: 'fotos', glyph: '—', make: (f) => E.shape({ name: 'Separador', shape: 'rect', cornerRadius: 0, fill: { kind: 'solid', color: '$line' }, ...box(f, 4) }) },
  // Pronósticos
  { id: 'pick', label: 'Pronóstico', category: 'pronostico', glyph: '2.45', make: (f) => E.prediction({ name: 'Pronóstico', mode: 'plain', ...box(f, Math.min(760, f.height * 0.55)) }) },
  { id: 'pick-locked', label: 'Pronóstico bloqueado', category: 'pronostico', glyph: '🔒', make: (f) => E.prediction({ name: 'Pronóstico bloqueado', mode: 'locked', showNote: false, ...box(f, Math.min(600, f.height * 0.45)) }) },
  { id: 'pick-revealed', label: 'Pronóstico revelado', category: 'pronostico', glyph: '✓', make: (f) => E.prediction({ name: 'Pronóstico revelado', mode: 'revealed', ...box(f, Math.min(760, f.height * 0.55)) }) },
  { id: 'results', label: 'Resultados verificados', category: 'pronostico', glyph: '75%', make: (f) => E.resultsList({ name: 'Resultados', ...box(f, Math.min(1000, f.height * 0.68)) }) },
  // Táctica
  { id: 'pitch-full', label: 'Pizarra completa', category: 'tactica', glyph: '⚽', make: (f) => E.tactics({ name: 'Pizarra', tactics: defaultTactics({ vertical: f.height >= f.width }), ...box(f, Math.round(Math.min(f.height * 0.7, cw(f) * 1.4)), cw(f)) }) },
  { id: 'pitch-half', label: 'Medio campo', category: 'tactica', glyph: '◐', make: (f) => E.tactics({ name: 'Medio campo', tactics: defaultTactics({ view: 'half', vertical: f.height >= f.width }), ...box(f, Math.round(cw(f) * 0.8)) }) },
  { id: 'stadium', label: 'Estadio 3D', category: 'tactica', glyph: '3D', make: (f) => E.stadium3d({ name: 'Estadio 3D', x: 0, y: midY(f, Math.round(Math.min(f.height * 0.55, f.width))), width: f.width, height: Math.round(Math.min(f.height * 0.55, f.width)) }) },
  // Marca
  { id: 'signature', label: 'Firma GOAT SOCIETY', category: 'marca', glyph: 'GS', make: () => E.brandMark({ name: 'Firma', variant: 'editorial', align: 'left', x: M, y: 64, width: 460, height: 44 }) },
  { id: 'logo', label: 'Logo pequeño', category: 'marca', glyph: '🐐', make: (f) => E.brandMark({ name: 'Logo', variant: 'icon', ...box(f, 120, 120) }) },
  { id: 'page-number', label: 'Número de página', category: 'marca', glyph: '1/7', make: (f) => E.text({ name: 'Nº de página', text: '{pageof}', fontFamily: '$label', fontSize: 34, fontWeight: 600, align: 'right', autoFit: false, fill: { kind: 'solid', color: '$muted' }, x: f.width - M - 240, y: 64, width: 240, height: 44 }) },
  { id: 'mascot', label: 'Mascota', category: 'marca', glyph: '🐐', make: (f) => E.mascot({ name: 'Mascota', ...box(f, Math.round(cw(f) * 0.9), Math.round(cw(f) * 0.7)) }) },
]
