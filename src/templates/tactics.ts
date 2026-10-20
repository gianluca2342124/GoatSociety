import * as E from '../model/elements'
import { TACTICAL_PRESETS, defaultTactics } from '../tactics/presets'
import type { TemplateDef } from './types'
import { BG, atmosphere, body, footer, glow, header, headline, kicker, text, zone } from './kit'

function preset(id: string) {
  const p = TACTICAL_PRESETS.find((x) => x.id === id)!
  return p.build()
}

export const tacticalBoard: TemplateDef = {
  id: 'tactical-board',
  number: 10,
  name: 'Tactical Board',
  category: 'tactics',
  description: 'Pizarra táctica realista con jugadores y flechas editables.',
  build: (t, match) => {
    const pz = zone(t, 0.15, 0.94)
    const p = preset('buildup')
    return {
      background: BG.noir(),
      elements: [
        ...atmosphere(t, 'pitch'),
        ...header(t),
        kicker(t, 'Pizarra táctica  ·  {home.formation}', zone(t, 0, 0.04).y),
        headline(t, 'Así construye [[{home.short}]]', zone(t, 0.04, 0.13), 120 * t.s),
        E.tactics({
          name: 'Pizarra',
          x: t.left - 20,
          y: pz.y,
          width: t.cw + 40,
          height: pz.h,
          tactics: defaultTactics({ ...p, homeFormation: match.home.formation, awayFormation: match.away.formation, camera: 'top', vertical: !t.landscape, playerSize: 26 * t.s }),
        }),
        body(t, 'Salida de tres con el pivote incrustado entre centrales.', { y: zone(t, 0.95, 1).y, h: 50 }, 28 * t.s, { align: 'center', name: 'Explicación' }),
        ...footer(t),
      ],
    }
  },
}

export const formationBattle: TemplateDef = {
  id: 'formation-battle',
  number: 11,
  name: 'Formation Battle',
  category: 'tactics',
  description: 'Las dos alineaciones enfrentadas sobre un campo en perspectiva.',
  build: (t, match) => {
    const pz = zone(t, 0.15, 0.9)
    return {
      background: BG.emerald(),
      elements: [
        ...atmosphere(t, 'emerald'),
        glow(t, t.cx, pz.y + pz.h * 0.55, t.cw * 0.7, '$secondary', 0.5, 0.7),
        ...header(t),
        kicker(t, 'Duelo de sistemas', zone(t, 0, 0.04).y),
        text(t, '{away.short}  [[{away.formation}]]', zone(t, 0.05, 0.13), { name: 'Sistema visitante', fontFamily: '$headline', fontSize: 110 * t.s, accentColor: '$awayLight', lineHeight: 1 }),
        E.tactics({
          name: 'Duelo de sistemas',
          x: t.left - 40,
          y: pz.y,
          width: t.cw + 80,
          height: pz.h,
          tactics: defaultTactics({ homeFormation: match.home.formation, awayFormation: match.away.formation, camera: 'perspective', tilt: 0.75, vertical: !t.landscape, playerSize: 21 * t.s, showLabels: false }),
        }),
        text(t, '{home.short}  [[{home.formation}]]', zone(t, 0.91, 0.99), { name: 'Sistema local', fontFamily: '$headline', fontSize: 110 * t.s, accentColor: '$homeLight', lineHeight: 1 }),
        ...footer(t),
      ],
    }
  },
}

export const keyMovement: TemplateDef = {
  id: 'key-movement',
  number: 12,
  name: 'Key Tactical Movement',
  category: 'tactics',
  description: 'Un movimiento concreto: recepción, conducción y ataque al espacio.',
  build: (t) => {
    const pz = zone(t, 0.13, 0.68)
    const p = preset('cutinside')
    const steps = [
      { n: '1', txt: 'Recibe [[abierto]] pegado a la línea de banda.' },
      { n: '2', txt: 'Conduce [[hacia dentro]] arrastrando al lateral.' },
      { n: '3', txt: 'Ataca la [[espalda del lateral]] con el pase filtrado.' },
    ]
    const sz = zone(t, 0.72, 0.98)
    const rowH = sz.h / steps.length
    const stepEls = steps.flatMap((s, i) => {
      const y = sz.y + i * rowH
      const bs = Math.min(64 * t.s, rowH * 0.7)
      return [
        E.shape({ name: `Paso ${s.n}`, shape: 'ellipse', x: t.left, y: y + (rowH - bs) / 2, width: bs, height: bs, fill: { kind: 'solid', color: '$primary' } }),
        text(t, s.n, { x: t.left, y: y + (rowH - bs) / 2, w: bs, h: bs }, { name: `Nº ${s.n}`, fontFamily: '$label', fontSize: bs * 0.6, fontWeight: 800, fill: { kind: 'solid', color: '#08090B' }, autoFit: false }),
        text(t, s.txt, { x: t.left + bs + 28 * t.s, y, w: t.cw - bs - 28 * t.s, h: rowH }, { name: `Texto paso ${s.n}`, fontFamily: '$body', fontSize: 36 * t.s, fontWeight: 600, uppercase: false, align: 'left', lineHeight: 1.2, accentColor: '$primary', minFontSize: 16 }),
      ]
    })
    return {
      background: BG.noir(),
      elements: [
        ...atmosphere(t, 'pitch'),
        ...header(t),
        kicker(t, 'Movimiento clave', zone(t, 0, 0.04).y),
        headline(t, 'La diagonal que [[rompe]] el partido', zone(t, 0.04, 0.125), 110 * t.s),
        E.tactics({
          name: 'Movimiento',
          x: t.left - 60,
          y: pz.y,
          width: t.cw + 120,
          height: pz.h,
          tactics: defaultTactics({ ...p, view: 'half', camera: 'perspective', tilt: 0.45, vertical: true, playerSize: 28 * t.s, homeColor: '$home', awayColor: '$away' }),
        }),
        ...stepEls,
        ...footer(t),
      ],
    }
  },
}

export const stadium3D: TemplateDef = {
  id: 'stadium-3d',
  number: 19,
  name: 'Estadio 3D',
  category: 'tactics',
  description: 'Escena 3D real (Three.js) con jugadores, focos y flechas tácticas.',
  build: (t) => {
    const pz = zone(t, 0.14, 0.86)
    const p = preset('counter')
    return {
      background: BG.noir(),
      elements: [
        ...atmosphere(t, 'noir'),
        ...header(t),
        kicker(t, 'Escenario 3D  ·  {competition}', zone(t, 0, 0.04).y),
        headline(t, 'El contragolpe [[letal]]', zone(t, 0.04, 0.13), 120 * t.s),
        E.stadium3d({
          name: 'Estadio 3D',
          x: 0,
          y: pz.y,
          width: t.W,
          height: pz.h,
          tactics: defaultTactics({ ...p, playerSize: 18 }),
          camera: { azimuth: 205, elevation: 38, distance: t.landscape ? 62 : 74, fov: 36, targetX: 70, targetY: 34 },
        }),
        body(t, 'Robo en tres cuartos y ataque vertical a la espalda de la defensa.', { y: zone(t, 0.89, 0.97).y, h: zone(t, 0.89, 0.97).h }, 32 * t.s, { align: 'center', fill: { kind: 'solid', color: '$text' } }),
        ...footer(t),
      ],
    }
  },
}

export const TACTICS_TEMPLATES = [tacticalBoard, formationBattle, keyMovement, stadium3D]
