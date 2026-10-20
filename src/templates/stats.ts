import * as E from '../model/elements'
import type { TemplateDef } from './types'
import { BG, atmosphere, body, footer, glow, hairline, header, headline, kicker, text, zone } from './kit'

export const statisticalDominance: TemplateDef = {
  id: 'statistical-dominance',
  number: 5,
  name: 'Statistical Dominance',
  category: 'stats',
  description: 'Comparativa con barras horizontales calculadas automáticamente.',
  build: (t) => {
    const bz = zone(t, 0.2, 0.93)
    return {
      background: BG.noir(),
      elements: [
        ...atmosphere(t, 'noir'),
        glow(t, t.left, bz.y + bz.h * 0.3, t.cw * 0.5, '$home', 0.16),
        glow(t, t.left + t.cw, bz.y + bz.h * 0.6, t.cw * 0.5, '$away', 0.16),
        ...header(t),
        kicker(t, '{home}  vs  {away}', zone(t, 0, 0.04).y),
        headline(t, 'Dominio [[estadístico]]', zone(t, 0.05, 0.16), 160 * t.s),
        E.statBars({ name: 'Comparativa', x: t.left, y: bz.y, width: t.cw, height: bz.h, showCrests: true, maxRows: 5, valueSize: 70 * t.s, labelSize: 26 * t.s, barHeight: 14 * t.s, rowGap: 30 * t.v }),
        body(t, 'Promedios por partido · Temporada actual', { y: zone(t, 0.95, 1).y, h: 44 }, 22 * t.s, { align: 'center', name: 'Fuente' }),
        ...footer(t),
      ],
    }
  },
}

export const theNumbers: TemplateDef = {
  id: 'the-numbers',
  number: 6,
  name: 'The Numbers',
  category: 'stats',
  description: 'Tres cifras enormes apiladas con explicación breve.',
  build: (t) => {
    const items = [
      { v: '3 de 3', l: 'Partidos en casa', d: 'En los que {home} ha encajado al menos un gol.' },
      { v: '0', l: 'Victorias', d: 'Ante rivales del top 4 en sus últimos cinco duelos.' },
      { v: '72%', l: 'De sus goles', d: 'Llegan en la segunda parte de los partidos.' },
    ]
    const start = 0.14
    const each = (1 - start) / items.length
    const els = items.flatMap((it, i) => {
      const z = zone(t, start + each * i + 0.02, start + each * (i + 1) - 0.02)
      return [
        ...(i > 0 ? [hairline(t, z.y - t.ch * 0.02, t.cw, '$text', 0.18, t.left)] : []),
        E.statNumber({ name: `Cifra ${i + 1}`, x: t.left, y: z.y, width: t.cw, height: z.h, value: it.v, label: it.l, description: it.d, valueSize: 220 * t.s, layout: 'stacked', align: 'left', valueColor: i === 0 ? '$primary' : '$text' }),
      ]
    })
    return {
      background: BG.burgundy(),
      elements: [...atmosphere(t, 'burgundy'), ...header(t), kicker(t, 'Los números de {home}', zone(t, 0, 0.04).y, { align: 'left' }), headline(t, 'Datos que [[no mienten]]', zone(t, 0.04, 0.12), 110 * t.s, { align: 'left' }), ...els, ...footer(t)],
    }
  },
}

export const keyPlayers: TemplateDef = {
  id: 'key-players',
  number: 7,
  name: 'Key Players',
  category: 'stats',
  description: 'Jugadores clave, estadísticas, lesiones y bajas de ambos equipos.',
  build: (t) => {
    const colW = (t.cw - 40 * t.s) / 2
    const cs = Math.min(90 * t.s, t.ch * 0.07)
    const hz = zone(t, 0.13, 0.2)
    const kz = zone(t, 0.21, 0.6)
    const az = zone(t, 0.7, 0.98)
    const rx = t.left + colW + 40 * t.s
    return {
      background: BG.graphite(),
      elements: [
        ...atmosphere(t, 'noir'),
        glow(t, t.left, kz.y + kz.h / 2, colW, '$home', 0.15),
        glow(t, t.left + t.cw, kz.y + kz.h / 2, colW, '$away', 0.15),
        ...header(t),
        kicker(t, 'Claves del partido', zone(t, 0, 0.04).y),
        headline(t, 'Jugadores [[clave]]', zone(t, 0.04, 0.12), 130 * t.s),
        E.crest({ name: 'Escudo local', side: 'home', x: t.left, y: hz.y, width: cs, height: cs, aura: 0 }),
        text(t, '{home.short}', { x: t.left + cs + 18, y: hz.y, w: colW - cs - 18, h: cs }, { name: 'Nombre local', fontFamily: '$label', fontSize: 44 * t.s, fontWeight: 700, align: 'left', letterSpacing: 2 }),
        E.crest({ name: 'Escudo visitante', side: 'away', x: t.left + t.cw - cs, y: hz.y, width: cs, height: cs, aura: 0 }),
        text(t, '{away.short}', { x: rx, y: hz.y, w: colW - cs - 18, h: cs }, { name: 'Nombre visitante', fontFamily: '$label', fontSize: 44 * t.s, fontWeight: 700, align: 'right', letterSpacing: 2 }),
        E.playerList({ name: 'Clave local', side: 'home', filter: 'key', x: t.left, y: kz.y, width: colW, height: kz.h, maxItems: 3, nameSize: 38 * t.s, align: 'left' }),
        E.playerList({ name: 'Clave visitante', side: 'away', filter: 'key', x: rx, y: kz.y, width: colW, height: kz.h, maxItems: 3, nameSize: 38 * t.s, align: 'right' }),
        hairline(t, zone(t, 0.63, 0.63).y),
        kicker(t, 'Bajas y dudas', zone(t, 0.645, 0.68).y, { fill: { kind: 'solid', color: '$negative' }, fontSize: 26 }),
        E.playerList({ name: 'Bajas local', side: 'home', filter: 'absences', x: t.left, y: az.y, width: colW, height: az.h, maxItems: 3, nameSize: 30 * t.s, showStat: false, showNumber: false, align: 'left' }),
        E.playerList({ name: 'Bajas visitante', side: 'away', filter: 'absences', x: rx, y: az.y, width: colW, height: az.h, maxItems: 3, nameSize: 30 * t.s, showStat: false, showNumber: false, align: 'right' }),
        ...footer(t),
      ],
    }
  },
}

export const performanceComparison: TemplateDef = {
  id: 'performance-comparison',
  number: 8,
  name: 'Performance Comparison',
  category: 'stats',
  description: 'Tarjetas comparativas de métricas: goles, posesión, tiros, córners…',
  build: (t, match) => {
    const cols = t.landscape ? 3 : 2
    const stats = match.stats.slice(0, 6)
    const rows = Math.ceil(Math.max(1, stats.length) / cols)
    const gz = zone(t, 0.18, 0.97)
    const gap = 24 * t.s
    const cw = (t.cw - gap * (cols - 1)) / cols
    const chh = (gz.h - gap * (rows - 1)) / rows
    const cards = stats.flatMap((st, i) => {
      const c = i % cols
      const r = Math.floor(i / cols)
      const x = t.left + c * (cw + gap)
      const y = gz.y + r * (chh + gap)
      const pad = 30 * t.s
      return [
        E.shape({ name: `Tarjeta ${i + 1}`, x, y, width: cw, height: chh, cornerRadius: 28 * t.s, fill: { kind: 'linear', angle: 160, stops: [{ offset: 0, color: '#1C2026' }, { offset: 1, color: '#101216' }] }, stroke: { color: '$text', width: 1.5, opacity: 0.1 } }),
        E.statBars({ name: `Métrica ${i + 1}`, x: x + pad, y: y + pad, width: cw - pad * 2, height: chh - pad * 2, statIds: [st.id], maxRows: 1, style: 'split', valueSize: 74 * t.s, labelSize: 22 * t.s, barHeight: 12 * t.s }),
      ]
    })
    return {
      background: BG.noir(),
      elements: [
        ...atmosphere(t, 'emerald'),
        ...header(t),
        kicker(t, '{home}  vs  {away}', zone(t, 0, 0.04).y),
        headline(t, 'Cara a cara [[en cifras]]', zone(t, 0.05, 0.15), 140 * t.s),
        ...cards,
        ...footer(t),
      ],
    }
  },
}

export const formTrends: TemplateDef = {
  id: 'form-trends',
  number: 9,
  name: 'Form & Trends',
  category: 'stats',
  description: 'Racha reciente de ambos equipos y tendencias en porcentajes.',
  build: (t) => {
    const cs = Math.min(110 * t.s, t.ch * 0.08)
    const rowH = cs
    const r1 = zone(t, 0.16, 0.25)
    const r2 = zone(t, 0.29, 0.38)
    const formRowFor = (side: 'home' | 'away', y: number) => [
      E.crest({ name: side === 'home' ? 'Escudo local' : 'Escudo visitante', side, x: t.left, y, width: cs, height: cs, aura: 0 }),
      text(t, side === 'home' ? '{home.short}' : '{away.short}', { x: t.left + cs + 24, y: y, w: t.cw * 0.32, h: rowH }, { name: 'Nombre', fontFamily: '$label', fontSize: 44 * t.s, fontWeight: 700, align: 'left', letterSpacing: 1.5 }),
      E.formRow({ name: side === 'home' ? 'Racha local' : 'Racha visitante', source: side, x: t.left + t.cw * 0.45, y: y + rowH * 0.1, width: t.cw * 0.55, height: rowH * 0.8, gap: 12 * t.s }),
    ]
    const ringZ = zone(t, 0.45, 0.74)
    const ringW = t.cw / 3
    const rings = [
      { v: 70, l: 'Ambos marcan', s: 'últimos 10', c: '$positive' },
      { v: 60, l: 'Más de 2.5', s: 'últimos 10', c: '$primary' },
      { v: 30, l: 'Portería a cero', s: 'últimos 10', c: '$negative' },
    ].map((r, i) => E.progressRing({ name: `Tendencia ${i + 1}`, x: t.left + ringW * i + ringW * 0.08, y: ringZ.y, width: ringW * 0.84, height: ringZ.h, value: r.v, label: r.l, sublabel: r.s, color: r.c, thickness: 18 * t.s }))
    const bz = zone(t, 0.8, 0.98)
    return {
      background: BG.graphite(),
      elements: [
        ...atmosphere(t, 'noir'),
        ...header(t),
        kicker(t, 'Últimos 5 partidos', zone(t, 0, 0.04).y),
        headline(t, 'Forma y [[tendencias]]', zone(t, 0.04, 0.13), 130 * t.s),
        ...formRowFor('home', r1.y),
        hairline(t, (r1.y + r1.h + r2.y) / 2, t.cw, '$text', 0.12),
        ...formRowFor('away', r2.y),
        ...rings,
        E.icon({ name: 'Icono tendencia', icon: 'flame', x: t.left, y: bz.y + 6, width: 46 * t.s, height: 46 * t.s, color: '$primary' }),
        body(t, '{home} ha marcado en 8 de sus últimos 9 partidos como local.\n{away} llega con cuatro victorias en sus cinco últimos encuentros.', { x: t.left + 70 * t.s, y: bz.y, w: t.cw - 70 * t.s, h: bz.h }, 32 * t.s, { align: 'left', verticalAlign: 'top', fill: { kind: 'solid', color: '$text' } }),
        ...footer(t),
      ],
    }
  },
}

export const STATS_TEMPLATES = [statisticalDominance, theNumbers, keyPlayers, performanceComparison, formTrends]
