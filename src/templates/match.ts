import * as E from '../model/elements'
import type { TemplateDef } from './types'
import { BG, atmosphere, crestPair, footer, fx, glow, hairline, header, headline, kicker, pill, teamNames, text, zone } from './kit'

export const matchdayElite: TemplateDef = {
  id: 'matchday-elite',
  number: 1,
  name: 'Matchday Elite',
  category: 'match',
  description: 'Portada de partido con escudos, competición, fecha y titular.',
  build: (t) => {
    const crestSize = Math.min(t.cw * 0.33, t.ch * 0.22)
    const gap = t.cw * 0.2
    const cz = zone(t, 0.1, 0.42)
    const cy = cz.y + (cz.h - crestSize) / 2 - t.ch * 0.02
    const hz = zone(t, 0.5, 0.79)
    return {
      background: BG.noir(),
      elements: [
        ...atmosphere(t, 'stadium'),
        E.mascot({ name: 'Mascota fondo', variant: 'background', x: t.cx - t.cw * 0.55, y: t.contentTop - t.ch * 0.08, width: t.cw * 1.1, height: t.ch * 0.7, opacity: 0.1, baseColor: '#3A3F47', rimColor: '$primary', rimIntensity: 0.5, eyeGlow: 0.4, fog: 0, backlight: 0, fadeBottom: 0.45, locked: true }),
        fx(t, 'pitchLines', { color: '$text', intensity: 0.1, spread: 0.2, y: t.H * 0.55, height: t.H * 0.45 }),
        ...header(t),
        kicker(t, '{competition}  ·  {stage}', zone(t, 0.0, 0.05).y, { fontSize: 32 }),
        ...crestPair(t, cy, crestSize, gap),
        text(t, 'vs', { x: t.cx - gap / 2, y: cy + crestSize * 0.28, w: gap, h: crestSize * 0.44 }, { name: 'VS', fontFamily: '$serif', fontSize: 120 * t.s, italic: true, uppercase: false, fill: { kind: 'solid', color: '$primary' }, minFontSize: 30 }),
        ...teamNames(t, cy + crestSize + t.ch * 0.03, 44 * t.s, crestSize, gap),
        hairline(t, hz.y - t.ch * 0.035, t.cw * 0.5),
        headline(t, '{headline}', { y: hz.y, h: hz.h }, 190 * t.s),
        pill(t, '{weekday}  ·  {date}  ·  {time}', zone(t, 0.83, 0.9).y, 30, { name: 'Fecha y hora' }),
        kicker(t, '{venue}', zone(t, 0.93, 0.98).y, { fontSize: 24, fill: { kind: 'solid', color: '$muted' }, name: 'Estadio' }),
        ...footer(t, '{handle}', true),
      ],
    }
  },
}

export const bigStatement: TemplateDef = {
  id: 'big-statement',
  number: 2,
  name: 'The Big Statement',
  category: 'match',
  description: 'Un titular enorme y rotundo con escudos y fondo cinematográfico.',
  build: (t) => {
    const cs = Math.min(150 * t.s, t.ch * 0.11)
    const top = zone(t, 0.02, 0.14)
    const hz = zone(t, 0.2, 0.76)
    return {
      background: BG.burgundy(),
      elements: [
        ...atmosphere(t, 'burgundy'),
        E.mascot({ name: 'Mascota fondo', variant: 'background', x: t.cx - t.cw * 0.62, y: hz.y - t.ch * 0.1, width: t.cw * 1.24, height: hz.h * 1.25, opacity: 0.16, rimColor: '$negative', rimIntensity: 0.8, backlight: 0.5, eyeGlow: 0.7, fog: 0.3, fadeBottom: 0.35, locked: true }),
        fx(t, 'spotlight', { color: '#FFFFFF', intensity: 0.12, spread: 0.7, height: t.H * 0.8 }),
        ...header(t),
        E.crest({ name: 'Escudo local', side: 'home', x: t.cx - cs - 70 * t.s, y: top.y, width: cs, height: cs, aura: 0.4 }),
        text(t, 'vs', { x: t.cx - 60 * t.s, y: top.y + cs * 0.2, w: 120 * t.s, h: cs * 0.6 }, { name: 'VS', fontFamily: '$serif', fontSize: 70 * t.s, italic: true, uppercase: false, fill: { kind: 'solid', color: '$muted' } }),
        E.crest({ name: 'Escudo visitante', side: 'away', x: t.cx + 70 * t.s, y: top.y, width: cs, height: cs, aura: 0.4 }),
        headline(t, '{headline}', { y: hz.y, h: hz.h }, 250 * t.s, { lineHeight: 0.88, accentColor: '$primary', fx: { shadow: { enabled: true, color: '#000000', blur: 40, offsetX: 0, offsetY: 18, opacity: 0.6 } } }),
        hairline(t, zone(t, 0.8, 0.8).y, t.cw * 0.35),
        text(t, '{subheadline}', { y: zone(t, 0.83, 0.93).y, h: zone(t, 0.83, 0.93).h }, { name: 'Subtítulo', fontFamily: '$serif', fontSize: 64 * t.s, italic: true, uppercase: false, lineHeight: 1.05, fill: { kind: 'solid', color: '$text' }, minFontSize: 22 }),
        ...footer(t, '{competition}  ·  {date}  ·  {time}', true),
      ],
    }
  },
}

export const headToHead: TemplateDef = {
  id: 'head-to-head',
  number: 3,
  name: 'Head to Head',
  category: 'match',
  description: 'Cara a cara histórico: victorias, empates y últimos enfrentamientos.',
  build: (t) => {
    const cs = Math.min(200 * t.s, t.ch * 0.15)
    const cz = zone(t, 0.06, 0.26)
    const nz = zone(t, 0.32, 0.56)
    const colW = t.cw / 3
    const num = (i: number, value: string, label: string, color: string) =>
      E.statNumber({
        name: `Dato ${i + 1}`,
        x: t.left + colW * i,
        y: nz.y,
        width: colW,
        height: nz.h,
        value,
        label,
        description: '',
        align: 'center',
        valueSize: 210 * t.s,
        valueColor: color,
        labelColor: '$muted',
        layout: 'stacked',
      })
    const tz = zone(t, 0.62, 0.97)
    return {
      background: BG.emerald(),
      elements: [
        ...atmosphere(t, 'emerald'),
        ...header(t),
        kicker(t, 'Cara a cara  ·  Últimos 9 duelos', zone(t, 0.0, 0.04).y, { fontSize: 30 }),
        ...crestPair(t, cz.y, cs, t.cw * 0.38),
        headline(t, 'H2H', { x: t.cx - t.cw * 0.16, y: cz.y + cs * 0.2, w: t.cw * 0.32, h: cs * 0.6 }, 120 * t.s, { fill: { kind: 'linear', angle: 180, stops: [{ offset: 0, color: '#F3E3B5' }, { offset: 0.5, color: '$primary' }, { offset: 1, color: '#8E7438' }] } }),
        ...teamNames(t, cz.y + cs + 16 * t.s, 34 * t.s, cs, t.cw * 0.38),
        hairline(t, nz.y - t.ch * 0.02),
        num(0, '4', 'Victorias {home.short}', '$text'),
        num(1, '3', 'Empates', '$muted'),
        num(2, '2', 'Victorias {away.short}', '$text'),
        hairline(t, tz.y - t.ch * 0.015),
        E.table({ name: 'Últimos duelos', x: t.left, y: tz.y, width: t.cw, height: tz.h, rowHeight: Math.min(90, tz.h / 4.2), fontSize: 32 * t.s }),
        ...footer(t),
      ],
    }
  },
}

export const matchdayAgenda: TemplateDef = {
  id: 'matchday-agenda',
  number: 4,
  name: 'Matchday Agenda',
  category: 'match',
  description: 'Lista elegante de los partidos del día con escudos y horarios.',
  build: (t) => {
    const lz = zone(t, 0.2, 1)
    return {
      background: BG.graphite(),
      elements: [
        ...atmosphere(t, 'noir'),
        glow(t, t.cx, t.contentTop, t.cw * 0.7, '$primary', 0.12, 0.6),
        ...header(t),
        kicker(t, '{weekday}  ·  {date}', zone(t, 0, 0.04).y, { fontSize: 30 }),
        headline(t, 'Agenda [[del día]]', zone(t, 0.05, 0.16), 170 * t.s),
        E.matchList({ name: 'Agenda', x: t.left, y: lz.y, width: t.cw, height: lz.h, rowHeight: Math.min(170, lz.h / 5.4) }),
        ...footer(t),
      ],
    }
  },
}

export const MATCH_TEMPLATES = [matchdayElite, bigStatement, headToHead, matchdayAgenda]
