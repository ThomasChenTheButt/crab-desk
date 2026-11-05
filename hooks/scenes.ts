// The Working and Waiting tiles as little pixel-art scenes: one crab per chat, a real place behind them.
// Three directions: a night studio, the ocean, and a building site with a campfire.

import { ACCENT, fontStack } from './art'

// Every scene is drawn on a 3 px grid, the crab's own.
const P = 3

// `away`: its seat is kept but the crab is elsewhere, on its way between the scenes.
// `wave`: seconds since a workmate left for a break, while its send-off lasts.
export type SceneCrab = { asks?: boolean; pinned?: boolean; away?: boolean; wave?: number }
export type Theme = 'studio' | 'ocean' | 'camp'

// A rect; `extra` adds attributes, `inner` its own animations as children.
export const R = (x: number, y: number, w: number, h: number, fill: string, extra = '', inner = '') =>
  `<rect x="${+x.toFixed(2)}" y="${+y.toFixed(2)}" width="${+w.toFixed(2)}" height="${+h.toFixed(2)}" fill="${fill}"${extra}${inner ? `>${inner}</rect>` : '/>'}`
// One cell of the crab's grid, inside a group scaled by P.
const px = (x: number, y: number, w = 1, h = 1) => `<rect x="${x}" y="${y}" width="${w + 0.02}" height="${h + 0.02}"/>`
export const loop = (attr: string, values: string, dur: number, extra = '') =>
  `<animate attributeName="${attr}" values="${values}" dur="${dur.toFixed(2)}s" repeatCount="indefinite"${extra}/>`
export const flick = (dur: number, values: string, extra = '') =>
  `<animate attributeName="opacity" values="${values}" dur="${dur.toFixed(2)}s" calcMode="discrete" repeatCount="indefinite"${extra}/>`
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
// A steady pseudo-random number per seed, so a scene draws the same every time.
export const rand = (seed: number) => {
  const x = Math.sin(seed * 9301 + 49297) * 233280
  return x - Math.floor(x)
}

const BODY = [px(2, 0, 9, 5), px(0, 2, 2, 2), px(11, 2, 2, 2)].join('')
const BODY_NO_RIGHT = [px(2, 0, 9, 5), px(0, 2, 2, 2)].join('')
const LEGS = [px(3, 5, 1, 2), px(5, 5, 1, 2), px(7, 5, 1, 2), px(9, 5, 1, 2)].join('')
const LEGS_SHORT = [px(3, 5), px(5, 5), px(7, 5), px(9, 5)].join('')
const SHINE = `<g fill="#f0a283">${px(3, 0.6, 2, 0.7)}${px(2.6, 1.3, 0.7, 0.7)}</g>`

// `wave`: seconds since a workmate set off for a break; for the first WAVE_S the crab waves it off.
type CrabOpts = { i: number; sit?: boolean; typing?: boolean; hammer?: boolean; hat?: boolean; shades?: boolean; wave?: number }
const WAVE_S = 1.8

// A crab with its feet on y = fy, its left edge at x.
export const crab = (x: number, fy: number, o: CrabOpts) => {
  const tall = o.sit ? 6 : 7
  const beat = 3.4 + (o.i % 4) * 0.9
  const eyes = o.shades
    ? `<g fill="#14141c">${px(3, 1, 3, 1.6)}${px(7, 1, 3, 1.6)}${px(6, 1.3, 1, 0.5)}</g><g fill="#ffffff" opacity="0.7">${px(3.5, 1.3, 0.8, 0.5)}${px(7.5, 1.3, 0.8, 0.5)}</g>`
    : `<g fill="#1a1a1a">${px(4, 1, 1, 2)}${px(8, 1, 1, 2)}${flick(beat, '1;0;1', ' keyTimes="0;0.95;0.98"')}</g>`
  const isWaving = o.wave != null && o.wave < WAVE_S
  const whileWaving = isWaving ? `<set attributeName="opacity" to="0" begin="${(-o.wave!).toFixed(2)}s" dur="${WAVE_S}s"/>` : ''
  const typingArm = o.typing
    ? `<g>${whileWaving}<g>${px(11, 2, 2, 1)}${flick(0.28 + (o.i % 3) * 0.05, '1;0')}</g><g opacity="0">${px(11, 3, 2, 1)}${flick(0.28 + (o.i % 3) * 0.05, '0;1')}</g></g>`
    : ''
  const waveArm = isWaving
    ? `<g opacity="0"><set attributeName="opacity" to="1" begin="${(-o.wave!).toFixed(2)}s" dur="${WAVE_S}s"/><g>${px(11, -0.5, 2, 2.5)}${px(12.5, -1.5, 1, 1.2)}<animateTransform attributeName="transform" type="translate" values="0,0;0.8,-0.3" dur="0.22s" calcMode="discrete" repeatCount="indefinite"/></g></g>`
    : ''
  const arm = typingArm + waveArm
  const hat = o.hat
    ? `<g fill="#ffcc33">${px(4, -2.6, 5, 0.8)}${px(3, -1.9, 7, 1.3)}${px(1.5, -0.7, 10, 0.8)}</g><g fill="#fff3b0">${px(4.3, -2.2, 1.2, 0.5)}</g>`
    : ''
  return `<g transform="translate(${+x.toFixed(2)},${+(fy - tall * P).toFixed(2)}) scale(${P})"><g fill="${ACCENT}">${o.typing || o.hammer || isWaving ? BODY_NO_RIGHT : BODY}${o.sit ? LEGS_SHORT : LEGS}${arm}</g>${SHINE}${eyes}${hat}</g>`
}

// A "?" that pops up over a crab whose chat asked you something.
const ask = (x: number, y: number, i: number) => `<g transform="translate(${x},${y})" shape-rendering="geometricPrecision"><g>
<animateTransform attributeName="transform" type="scale" values="1;1;0.2;1.15;1" keyTimes="0;0.68;0.8;0.92;1" dur="${(2.6 + (i % 3) * 0.3).toFixed(1)}s" repeatCount="indefinite"/>
${R(-7, -6, 14, 11, '#ffffff', ' rx="3"')}<path d="M-3 4.5 L-6 8.5 L1 4.5Z" fill="#ffffff"/>
<text x="0" y="3" text-anchor="middle" font-family="${fontStack()}" font-size="9.5" font-weight="800" fill="${ACCENT}">?</text></g></g>`

// A little red pushpin stuck in beside a crab you pinned.
// Its needle's tip is at (x, y), where it went in.
export const pushpin = (x: number, y: number) => `<g transform="translate(${x},${y}) rotate(32)" shape-rendering="geometricPrecision">
<ellipse cx="-1" cy="0.6" rx="3.4" ry="1.2" fill="#000000" opacity="0.28" transform="rotate(-32)"/>
${R(-0.55, -6, 1.1, 6, '#d5d8df')}${R(-4.6, -8.2, 9.2, 2.4, '#b51f30', ' rx="1.1"')}${R(-2.5, -13.2, 5, 5.4, '#e63946')}${R(-4, -15.6, 8, 2.8, '#ef4b5a', ' rx="1.3"')}
${R(-2.9, -15.1, 2.2, 1.1, '#ffb3ba', ' rx="0.5"')}${R(-1.8, -12.6, 1, 4, '#ff7f8b')}</g>`

export const mug = (x: number, y: number, i: number, color = '#f4f1ea') => {
  const steam = (dx: number, begin: number) =>
    `<rect x="${x + dx}" y="${y - 3}" width="1.2" height="2.4" fill="#ffffff" opacity="0">${loop('y', `${y - 2};${y - 9}`, 2.2, ` begin="${begin.toFixed(1)}s"`)}${loop('opacity', '0;0.7;0', 2.2, ` begin="${begin.toFixed(1)}s"`)}</rect>`
  return `${R(x, y, 6, 6.5, color, ' rx="1"')}${R(x + 0.8, y + 0.8, 4.4, 1.2, '#6b4330')}${R(x + 6, y + 1.5, 1.6, 3, color)}${steam(1.4, (i % 3) * 0.5)}${steam(3.6, 1.1 + (i % 3) * 0.5)}`
}

// Where each crab sits: rows across the scene, each row centred, feet on its floor line.
export const HEAD = 48
export const ROW = 50
const spots = (n: number, W: number, unit: number) => {
  const per = Math.max(1, Math.floor((W - 20) / unit))
  return Array.from({ length: n }, (_, i) => {
    const row = Math.floor(i / per)
    const inRow = Math.min(per, n - row * per)
    return { x: (W - inRow * unit) / 2 + (i % per) * unit, fy: HEAD + 38 + row * ROW, row, col: i % per, inRow }
  })
}
export const UNIT = { studio: [70, 58], ocean: [70, 62], camp: [70, 46] } as const
export const rowsFor = (n: number, W: number, unit: number) => Math.ceil(Math.max(1, n) / Math.max(1, Math.floor((W - 20) / unit)))
export const sceneHeight = (rows: number) => HEAD + 38 + (rows - 1) * ROW + 12

// The frame every scene sits in: rounded, clipped, with its name and count on a dark chip.
// Working and Waiting are one picture in two halves: each rounds only its outer corners, and the
// seam between them stays open so the place runs straight on from one to the other.
const frame = (W: number, H: number, label: string, count: number, isSelected: boolean, defs: string, body: string, side: 'left' | 'right') => {
  const id = `cd-f-${label}-${W}-${H}`
  const x0 = side === 'left' ? 0 : -14
  // The name and count read at the same sizes as the Projects, Chats and Today tiles above.
  const chipW = Math.max(label.length * 6.3, String(count).length * 10.5) + 16
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">
<defs><clipPath id="${id}"><rect x="${x0}" width="${W + 14}" height="${H}" rx="12"/></clipPath>${defs}</defs>
<g clip-path="url(#${id})"><g shape-rendering="crispEdges">${body}</g>
<rect x="6" y="6" width="${chipW}" height="40" rx="9" fill="#0c0c12" fill-opacity="0.55"/>
<text x="14" y="20" fill="#ffffff" fill-opacity="0.75" font-family="${fontStack()}" font-size="10.5">${esc(label)}</text>
<text x="14" y="40" fill="#ffffff" font-family="${fontStack()}" font-size="17" font-weight="700">${count}</text></g>
<rect x="${x0 + 0.5}" y="0.5" width="${W + 13}" height="${H - 1}" rx="12" fill="none" stroke="${isSelected ? ACCENT : '#ffffff'}" stroke-opacity="${isSelected ? 0.85 : 0.08}" stroke-width="${isSelected ? 1.5 : 1}"/>
</svg>`
}

export const grad = (id: string, stops: string[], vertical = true) =>
  `<linearGradient id="${id}" x1="0" y1="0" x2="${vertical ? 0 : 1}" y2="${vertical ? 1 : 0}">${stops
    .map((c, i) => `<stop offset="${i / (stops.length - 1)}" stop-color="${c}"/>`)
    .join('')}</linearGradient>`

export const stars = (W: number, h: number, n: number, seed: number, x0 = 0) =>
  Array.from({ length: n }, (_, k) => {
    const x = x0 + 4 + rand(seed + k) * (W - 8)
    const y = 3 + rand(seed + k + 50) * (h - 6)
    const s = rand(seed + k + 90) > 0.75 ? 2 : 1.2
    return R(x, y, s, s, '#ffffff', ' opacity="0.8"', loop('opacity', '0.9;0.25;0.9', 1.6 + rand(seed + k + 7) * 2.4))
  }).join('')

// ─────────────────────────────── Studio: a cozy office at night, and its break room ───────────────────────────────

const studioDesk = (x: number, fy: number, i: number, isEmpty: boolean) => {
  const dx = x + 40
  const lines = ['#7cd4ff', '#f7c96b', '#9be29b']
    .map((c, k) => R(dx + 4, fy - 33 + k * 3, 6 + k * 2, 1.5, c, '', loop('width', ['4;10;7;4', '9;3;11;9', '6;12;5;6'][k]!, 1.1 + (i % 3) * 0.2 + k * 0.15)))
    .join('')
  return `${isEmpty ? '' : `<circle cx="${dx + 10}" cy="${fy - 29}" r="18" fill="#6fd3ff" opacity="0.1">${loop('opacity', '0.07;0.13;0.07', 2.4)}</circle>`}
${R(dx - 4, fy - 16, 30, 3.5, '#b07a4c')}${R(dx - 4, fy - 12.5, 30, 1.5, '#8a5a36')}${R(dx - 2, fy - 11, 2.5, 11, '#7a4c2e')}${R(dx + 21.5, fy - 11, 2.5, 11, '#7a4c2e')}
${R(dx + 1, fy - 37, 20, 15, '#2a2d3e')}${R(dx + 2.5, fy - 35.5, 17, 12, isEmpty ? '#161826' : '#0b1622')}${isEmpty ? '' : lines}${R(dx + 9.5, fy - 22, 3, 6, '#2a2d3e')}${R(dx + 6, fy - 17, 10, 1.5, '#2a2d3e')}
${R(dx + 22, fy - 21, 4, 5, '#e85d75', ' rx="1"')}`
}

// The office and the break room share a wall, cut away like a doll's house, with a door on the
// first row's floor. Drawn by both halves around the seam at bx; each shows its own side of it.
export const DOOR = { top: HEAD + 6, bottom: HEAD + 44 }
const studioSeam = (bx: number, H: number) =>
  `${R(bx - 5, 0, 10, DOOR.top, '#191321')}${R(bx - 5, DOOR.bottom, 10, H - DOOR.bottom, '#191321')}${R(bx - 5, 0, 1.5, H, '#2c2340')}${R(bx + 3.5, 0, 1.5, H, '#120d18')}
${R(bx - 7, DOOR.top - 3, 14, 3, '#6b4a33')}${R(bx - 4, DOOR.top, 8, DOOR.bottom - DOOR.top, '#9a6740')}${R(bx - 2.5, DOOR.top + 3, 5, 12, '#87582f')}${R(bx - 2.5, DOOR.top + 19, 5, 12, '#87582f')}${R(bx + 1, DOOR.top + 17, 1.8, 1.8, '#f2c66d')}`

const studioWork = (crabs: SceneCrab[], W: number, H: number, isSelected: boolean) => {
  const id = 'cd-w'
  const hz = HEAD + 16
  const at = spots(Math.max(1, crabs.length), W, UNIT.studio[0])
  const wx = W - 80
  const hasWindow = wx >= 74
  const skyline = [16, 24, 12, 20, 28, 14, 22]
    .map((h, k) => {
      const bx = wx + k * 9
      const lit = Array.from({ length: Math.floor(h / 5) }, (_, j) =>
        rand(k * 10 + j) > 0.45 ? R(bx + 2 + (j % 2) * 3, 46 - h + 3 + Math.floor(j / 2) * 4, 1.6, 1.6, '#f7c96b', '', rand(k + j) > 0.8 ? flick(3 + k, '1;0.2;1') : '') : '',
      ).join('')
      return R(bx, 46 - h, 8, h, '#151b3d') + lit
    })
    .join('')
  const body = `${R(0, 0, W, hz, `url(#${id}w)`)}
${Array.from({ length: Math.ceil(W / 14) }, (_, k) => R(k * 14 + 7, 0, 1.5, hz, '#2d3463')).join('')}
${hasWindow ? `${R(wx - 3, 5, 64, 47, '#4a5285')}${R(wx, 8, 58, 41, `url(#${id}n)`)}
${stars(58, 22, 9, 3, wx)}<circle cx="${wx + 44}" cy="18" r="6" fill="#f6e7b0"/><circle cx="${wx + 47}" cy="15.5" r="5.2" fill="#121a3e"/>
${skyline}${R(wx + 28, 8, 2, 41, '#4a5285')}${R(wx, 27, 58, 2, '#4a5285')}${R(wx - 6, 50, 70, 3, '#5d66a0')}
${R(wx + 2, 44, 6, 6, '#c96f4a')}<g fill="#4fb36d">${R(wx + 1, 39, 3, 5, '#4fb36d')}${R(wx + 4.5, 37, 2.5, 7, '#3f9e5f')}${R(wx + 7, 40, 3, 4, '#4fb36d')}</g>` : ''}
${R(0, hz - 4, W, 4, '#141834')}${R(0, hz, W, H - hz, '#5e3d2a')}
${Array.from({ length: Math.ceil((H - hz) / 7) }, (_, k) => R(0, hz + 6 + k * 7, W, 1, '#4b301f') + R(((k * 37) % 50) + 10, hz + k * 7, 1, 6, '#4b301f') + R(((k * 37) % 50) + 70, hz + k * 7, 1, 6, '#4b301f')).join('')}
${R(14, hz + 10, W - 28, H - hz - 18, '#2c3a6b', ' opacity="0.55"')}
${at.map((s, i) => studioDesk(s.x, s.fy, i, crabs.length === 0) + (crabs[i] && !crabs[i]!.away ? crab(s.x, s.fy, { i, typing: true, wave: crabs[i]!.wave }) + (crabs[i]!.asks ? ask(s.x + 30, s.fy - 30, i) : '') : '')).join('')}
${studioSeam(W, H)}`
  return frame(W, H, 'Working', crabs.filter(c => !c.away).length, isSelected, grad(`${id}w`, ['#2a3160', '#1d2245']) + grad(`${id}n`, ['#0a0f2a', '#1f2b62']), body, 'left')
}

const sofa = (x0: number, x1: number, fy: number, colors: [string, string, string], isEmpty = false) => {
  const [back, seat, arm] = colors
  return `<g${isEmpty ? ' opacity="0.55"' : ''}>${R(x0, fy - 27, x1 - x0, 18, back, ' rx="4"')}${R(x0, fy - 11, x1 - x0, 9, seat, ' rx="2"')}
${R(x0 - 7, fy - 19, 9, 18, arm, ' rx="3"')}${R(x1 - 2, fy - 19, 9, 18, arm, ' rx="3"')}${R(x0 + 2, fy - 2, 3, 3, '#20140f')}${R(x1 - 5, fy - 2, 3, 3, '#20140f')}</g>`
}

const studioRest = (crabs: SceneCrab[], W: number, H: number, isSelected: boolean) => {
  const id = 'cd-r'
  const hz = HEAD + 16
  const unit = UNIT.studio[1]
  const at = spots(Math.max(1, crabs.length), W, unit)
  const bulbCount = Math.max(5, Math.floor(W / 16))
  const bulbs = Array.from({ length: bulbCount }, (_, k) => {
    const t = (k + 0.5) / bulbCount
    const x = 4 + t * (W - 8)
    const y = 5 + 4 * 14 * t * (1 - t)
    const c = ['#ffd166', '#ff8fc7', '#7cd4ff', '#9be29b'][k % 4]!
    return `<circle cx="${x}" cy="${y + 3}" r="2.2" fill="${c}">${loop('opacity', k % 2 ? '1;0.35;1' : '0.35;1;0.35', 1.8)}</circle><circle cx="${x}" cy="${y + 3}" r="5" fill="${c}" opacity="0.18"/>`
  }).join('')
  const nx = W >= 150 ? W - 64 : W - 34
  const neon = `<g>${flick(6, '1;1;0.35;1;0.5;1', ' keyTimes="0;0.7;0.72;0.76;0.78;1"')}
<g fill="none" stroke="#ff8fc7" stroke-width="4" opacity="0.22"><rect x="${nx}" y="22" width="15" height="13" rx="2"/><path d="M${nx + 15} 25 h4 v6 h-4"/></g>
<g fill="none" stroke="#ffc2e0" stroke-width="1.6"><rect x="${nx}" y="22" width="15" height="13" rx="2"/><path d="M${nx + 15} 25 h4 v6 h-4"/><path d="M${nx + 4} 19 q2 -3 0 -6 M${nx + 9} 19 q2 -3 0 -6"/></g></g>`
  const rows = [...new Set(at.map(s => s.row))]
  const body = `${R(0, 0, W, hz, `url(#${id}w)`)}
${Array.from({ length: Math.ceil(hz / 8) }, (_, r) => R(0, r * 8, W, 1.2, '#3a2140') + Array.from({ length: Math.ceil(W / 16) + 1 }, (_, c) => R(c * 16 + (r % 2) * 8, r * 8, 1.2, 8, '#3a2140')).join('')).join('')}
<path d="M2 6 Q ${W / 2} ${6 + 28} ${W - 2} 6" fill="none" stroke="#5c3a5e" stroke-width="1"/>${bulbs}${neon}
${W >= 150 ? `<circle cx="${W - 18}" cy="${hz - 22}" r="26" fill="#ffd27a" opacity="0.16"/>${R(W - 27, hz - 34, 18, 10, '#f7c96b')}${R(W - 25, hz - 24, 14, 2, '#d9a54a')}${R(W - 19, hz - 22, 2, H - hz + 18, '#3a2a20')}` : ''}
${R(0, hz - 4, W, 4, '#241320')}${R(0, hz, W, H - hz, '#3a2721')}
${Array.from({ length: Math.ceil((H - hz) / 7) }, (_, k) => R(0, hz + 6 + k * 7, W, 1, '#2f1f1a')).join('')}
${R(12, hz + 8, W - 24, H - hz - 14, '#7a2f5c', ' rx="3"')}${R(15, hz + 11, W - 30, H - hz - 20, 'none', ' stroke="#b0558a" stroke-width="1.2" rx="2"')}
${rows.map(r => {
    const mine = at.filter(s => s.row === r)
    return sofa(mine[0]!.x - 2, mine[mine.length - 1]!.x + unit - 8, mine[0]!.fy, ['#2b8a83', '#36a197', '#237670'], crabs.length === 0)
  }).join('')}
${crabs.map((c, i) => {
    const s = at[i]!
    if (c.away) return ''
    return crab(s.x + 4, s.fy - 7, { i, sit: true }) + (c.asks ? ask(s.x + 36, s.fy - 34, i) : mug(s.x + 42, s.fy - 19, i)) + (c.pinned ? pushpin(s.x + 3, s.fy - 20) : '')
  }).join('')}
${R(14, H - 20, 10, 10, '#c96f4a', ' rx="1"')}${R(12, H - 30, 4, 10, '#4fb36d')}${R(17, H - 34, 3, 14, '#3f9e5f')}${R(21, H - 28, 4, 8, '#4fb36d')}
${studioSeam(0, H)}`
  return frame(W, H, 'Waiting', crabs.filter(c => !c.away).length, isSelected, grad(`${id}w`, ['#43264c', '#2c1833']), body, 'right')
}

// ─────────────────────────────── Ocean: an office on the reef, and the beach ───────────────────────────────

const shellDesk = (x: number, fy: number, i: number, isEmpty: boolean) => {
  const dx = x + 40
  const lines = ['#9ff0ff', '#ffe08a', '#b8f5c8']
    .map((c, k) => R(dx + 7, fy - 32 + k * 3, 5 + k * 2, 1.5, c, '', loop('width', ['3;9;6;3', '8;3;10;8', '5;11;4;5'][k]!, 1.2 + (i % 3) * 0.2 + k * 0.15)))
    .join('')
  return `${isEmpty ? '' : `<circle cx="${dx + 11}" cy="${fy - 29}" r="17" fill="#aaf4ff" opacity="0.13">${loop('opacity', '0.08;0.16;0.08', 2.6)}</circle>`}
${R(dx - 5, fy - 15, 32, 6, '#8d9bb4', ' rx="3"')}${R(dx - 2, fy - 10, 26, 10, '#6c7a93', ' rx="3"')}${R(dx + 2, fy - 13, 6, 2, '#a6b3c9')}
${isEmpty ? R(dx + 1, fy - 20, 20, 5, '#f4cdbb', ' rx="2.5"') : `<g shape-rendering="geometricPrecision"><path d="M${dx + 3} ${fy - 18} L${dx - 1} ${fy - 30} Q${dx} ${fy - 37} ${dx + 4} ${fy - 38} Q${dx + 5.5} ${fy - 42} ${dx + 9} ${fy - 41.5} Q${dx + 11} ${fy - 44} ${dx + 13} ${fy - 41.5} Q${dx + 16.5} ${fy - 42} ${dx + 18} ${fy - 38} Q${dx + 22} ${fy - 37} ${dx + 23} ${fy - 30} L${dx + 19} ${fy - 18} Z" fill="#f6c9b5"/>
${[-9, -4.5, 0, 4.5, 9].map(a => `<path d="M${dx + 11} ${fy - 18} L${dx + 11 + a * 1.25} ${fy - 39}" stroke="#e3a58b" stroke-width="0.9"/>`).join('')}
${R(dx + 5, fy - 35, 12, 14, '#0c2a3d', ' rx="2.5"')}</g>${lines}<g shape-rendering="geometricPrecision"><path d="M${dx - 1} ${fy - 18} Q${dx + 11} ${fy - 13} ${dx + 23} ${fy - 18} Z" fill="#f8dccd"/></g>`}`
}

const fish = (W: number, y: number, dur: number, begin: number, color: string, flip = false) =>
  `<g><animateTransform attributeName="transform" type="translate" values="${flip ? `${W + 10},${y};-20,${y + 4}` : `-20,${y};${W + 10},${y - 4}`}" dur="${dur}s" begin="${begin}s" repeatCount="indefinite"/>
<g transform="${flip ? 'scale(-1,1)' : ''}">${R(0, 0, 9, 5, color, ' rx="2"')}<path d="M0 2.5 L-4 -0.5 L-4 5.5Z" fill="${color}"/>${R(6, 1.2, 1.4, 1.4, '#1a1a1a')}</g></g>`

// The sea's surface on both halves, and the beach's sand line: the reef floor rises to it at the seam.
export const SURF = HEAD - 4
const SAND = HEAD + 6
const skyGrad = (id: string) =>
  `<linearGradient id="${id}" x1="0" y1="0" x2="0" y2="${SAND}" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#5cc6f2"/><stop offset="0.5" stop-color="#a8e4fb"/><stop offset="1" stop-color="#ffe2b8"/></linearGradient>`
const oceanSeam = (bx: number, H: number) => {
  const id = `cd-shore-${bx === 0 ? 'r' : 'l'}`
  return `<linearGradient id="${id}" x1="${bx - 46}" y1="0" x2="${bx + 4}" y2="0" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#d9bb83"/><stop offset="1" stop-color="#f5d9a0"/></linearGradient>
<path d="M${bx - 46} ${HEAD + 22} Q${bx - 22} ${HEAD + 20} ${bx - 6} ${SAND} L${bx + 24} ${SAND} V${H} H${bx - 46} Z" fill="url(#${id})"/>
<path d="M${bx - 40} ${HEAD + 21} Q${bx - 20} ${HEAD + 19} ${bx - 6} ${SAND + 1}" fill="none" stroke="#e9cf9c" stroke-width="2"/>
<g fill="#ffffff" opacity="0.85">${R(bx - 14, SURF - 0.5, 8, 1.5, '#ffffff')}${R(bx + 2, SURF - 0.5, 7, 1.5, '#ffffff')}<animateTransform attributeName="transform" type="translate" values="0,0;-4,0;0,0" dur="2.6s" repeatCount="indefinite"/></g>
<circle cx="${bx - 18}" cy="${HEAD + 22}" r="2.5" fill="#b9a27a"/><circle cx="${bx - 30}" cy="${HEAD + 23}" r="1.8" fill="#f2a7b8"/>`
}

const oceanWork = (crabs: SceneCrab[], W: number, H: number, isSelected: boolean) => {
  const id = 'cd-o'
  const hz = HEAD + 22
  const at = spots(Math.max(1, crabs.length), W, UNIT.ocean[0])
  const rays = [0.15, 0.45, 0.75]
    .map((f, k) => `<path d="M${W * f} ${SURF} h16 L${W * f + 46} ${H} h-26 Z" fill="#ffffff" opacity="0.06">${loop('opacity', '0.03;0.09;0.03', 4 + k)}</path>`)
    .join('')
  const bubbles = Array.from({ length: 7 }, (_, k) => {
    const x = 10 + rand(k + 3) * (W - 20)
    const r = 1.4 + rand(k + 9) * 1.4
    const d = 4 + rand(k + 1) * 4
    return `<circle cx="${x}" cy="${H}" r="${r.toFixed(1)}" fill="#d6f7ff" fill-opacity="0.18" stroke="#d6f7ff" stroke-opacity="0.7" stroke-width="0.8">${loop('cy', `${H};${SURF + 2}`, d, ` begin="${(-rand(k) * d).toFixed(1)}s"`)}</circle>`
  }).join('')
  const weed = (bx: number, n: number, k: number) =>
    `<g><animateTransform attributeName="transform" type="rotate" values="-5 ${bx} ${H};5 ${bx} ${H};-5 ${bx} ${H}" dur="${3 + k}s" repeatCount="indefinite"/>${Array.from({ length: n }, (_, j) => R(bx + (j % 2 ? 1.5 : 0), H - (j + 1) * 4, 3, 4.4, j % 3 ? '#33b37a' : '#279565')).join('')}</g>`
  const body = `${R(0, 0, W, SAND, `url(#${id}k)`)}${R(0, SURF, W, H - SURF, `url(#${id}s)`)}${R(0, SURF, W, 1.5, '#8fd6f2')}${rays}
${fish(W, SURF + 8, 14, 0, '#ffb347')}${fish(W, SURF + 17, 19, -7, '#ff7f9e', true)}
${R(0, hz, W, H - hz, '#d9bb83')}${Array.from({ length: Math.ceil((H - hz) / 6) }, (_, k) => `<path d="M0 ${hz + 4 + k * 6} q 6 -2 12 0 t 12 0 t 12 0" fill="none" stroke="#c6a46b" stroke-width="1" transform="translate(${(k * 17) % 24},0) scale(${W / 36 + 1},1)" opacity="0.5"/>`).join('')}
${R(0, hz - 2, W, 3, '#e9cf9c')}
${weed(8, 12, 0)}${weed(16, 8, 1)}${weed(W - 12, 11, 2)}
<g fill="#ff7f6e">${R(W - 34, H - 16, 3, 12, '#ff7f6e')}${R(W - 40, H - 22, 3, 9, '#ff7f6e')}${R(W - 38, H - 14, 8, 3, '#ff7f6e')}${R(W - 28, H - 20, 3, 8, '#ff9a8a')}</g>
<path d="M${W * 0.3} ${H - 6} l2 -5 l2 5 l5 1 l-4 3 l1 5 l-4 -3 l-4 3 l1 -5 l-4 -3 z" fill="#ff9f43"/>
${oceanSeam(W, H)}
${at.map((s, i) => shellDesk(s.x, s.fy, i, crabs.length === 0) + (crabs[i] && !crabs[i]!.away ? crab(s.x, s.fy, { i, typing: true, wave: crabs[i]!.wave }) + (crabs[i]!.asks ? ask(s.x + 30, s.fy - 30, i) : '') : '')).join('')}
${bubbles}`
  return frame(W, H, 'Working', crabs.filter(c => !c.away).length, isSelected, skyGrad(`${id}k`) + grad(`${id}s`, ['#1784a8', '#0b5577', '#083a56']), body, 'left')
}

const umbrella = (cx: number, top: number, fy: number, k: number) => {
  const [a, b] = ([['#ef476f', '#ffffff'], ['#1fa5a0', '#ffffff'], ['#ffb703', '#ffffff']] as const)[k % 3]!
  const rows = [10, 22, 30, 36]
  return `${R(cx - 1, top - 2, 2, fy - top + 2, '#9a6b3f')}${rows
    .map((w, r) =>
      Array.from({ length: Math.ceil(w / 6) }, (_, c) => {
        const x = cx - w / 2 + c * 6
        return R(x, top - 12 + r * 3, Math.min(6, cx + w / 2 - x), 3.2, (Math.floor((x - cx + 60) / 6) % 2 ? a : b))
      }).join(''),
    )
    .join('')}`
}

const beachRest = (crabs: SceneCrab[], W: number, H: number, isSelected: boolean) => {
  const id = 'cd-b'
  const hz = HEAD + 6
  const unit = UNIT.ocean[1]
  const at = spots(Math.max(1, crabs.length), W, unit)
  const cloud = (y: number, dur: number, begin: number, s: number) =>
    `<g opacity="0.95"><animateTransform attributeName="transform" type="translate" values="-40,${y};${W + 10},${y}" dur="${dur}s" begin="${begin}s" repeatCount="indefinite"/>
<g transform="scale(${s})" fill="#ffffff">${R(4, 3, 18, 5, '#ffffff')}${R(8, 0, 9, 4, '#ffffff')}${R(0, 5, 26, 4, '#ffffff')}</g></g>`
  const palm =
    W >= 150
      ? `<g>${Array.from({ length: 9 }, (_, k) => R(W - 15 - Math.round(k * k * 0.08), H - 10 - k * 6, 5, 6.4, k % 2 ? '#9a6b3f' : '#b07d4c')).join('')}
<g transform="translate(${W - 19},${H - 64})"><animateTransform attributeName="transform" type="rotate" values="-3 0 0;3 0 0;-3 0 0" additive="sum" dur="4s" repeatCount="indefinite"/>
<path d="M0 0 q-14 -4 -22 8 q10 -6 22 -2Z M0 0 q14 -6 24 6 q-12 -4 -24 -2Z M0 0 q-4 -14 -16 -16 q10 6 14 16Z M0 0 q6 -14 18 -14 q-10 4 -16 14Z" fill="#3fae5f"/>
<circle cx="-2" cy="3" r="2.5" fill="#6b4226"/><circle cx="3" cy="4" r="2.5" fill="#7a4a2a"/></g></g>`
      : ''
  const rows = [...new Set(at.map(s => s.row))]
  const body = `${R(0, 0, W, hz, `url(#${id}s)`)}
<circle cx="${W - 46}" cy="20" r="15" fill="#fff1b8" opacity="0.4">${loop('r', '13;17;13', 3)}</circle><circle cx="${W - 46}" cy="20" r="9" fill="#ffd166"/>
${cloud(14, 26, -4, 1)}${cloud(30, 34, -20, 0.7)}
${R(0, hz - 10, W, 10, '#2f9de0')}${R(0, hz - 10, W, 2, '#6cc4f2')}
<g fill="#ffffff" opacity="0.85">${Array.from({ length: Math.ceil(W / 20) + 1 }, (_, k) => R(k * 20, hz - 3, 9, 1.5, '#ffffff')).join('')}<animateTransform attributeName="transform" type="translate" values="0,0;-6,0;0,0" dur="3s" repeatCount="indefinite"/></g>
${R(0, hz, W, H - hz, '#f5d9a0')}${R(0, hz, W, 3, '#fbe8c0')}
${Array.from({ length: Math.floor((W * (H - hz)) / 260) }, (_, k) => R(rand(k + 1) * W, hz + 4 + rand(k + 40) * (H - hz - 6), 1.5, 1.5, '#e2bf7f')).join('')}
${palm}
${rows.map(r => at.filter(s => s.row === r).map((s, j) => umbrella(s.x + 44, s.fy - 34, s.fy - 1, j + r)).join('')).join('')}
${at.map((s, i) => {
    const chair = `<g${crabs.length === 0 ? ' opacity="0.6"' : ''}>${R(s.x - 2, s.fy - 9, 46, 4, '#ef476f')}${Array.from({ length: 4 }, (_, k) => R(s.x + 4 + k * 11, s.fy - 9, 4, 4, '#ffffff')).join('')}
<path d="M${s.x - 2} ${s.fy - 9} L${s.x - 9} ${s.fy - 30} L${s.x - 4} ${s.fy - 31} L${s.x + 3} ${s.fy - 9}Z" fill="#ef476f"/><path d="M${s.x - 5.5} ${s.fy - 19} L${s.x - 2.5} ${s.fy - 19} L${s.x - 1} ${s.fy - 14} L${s.x - 4} ${s.fy - 14}Z" fill="#ffffff"/>
${R(s.x - 1, s.fy - 5, 2, 5, '#9a6b3f')}${R(s.x + 39, s.fy - 5, 2, 5, '#9a6b3f')}</g>`
    const c = crabs[i]
    return chair + (c && !c.away ? crab(s.x + 1, s.fy - 8, { i, sit: true, shades: true }) + (c.pinned ? pushpin(s.x - 5, s.fy - 22) : '') + (c.asks ? ask(s.x + 36, s.fy - 36, i) : `${R(s.x + 46, s.fy - 8, 8, 8, '#7a4a2a', ' rx="4"')}${R(s.x + 47.5, s.fy - 9, 5, 2, '#f4f1ea', ' rx="1"')}${R(s.x + 50, s.fy - 15, 1.2, 7, '#ff5d8f')}`) : '')
  }).join('')}
${oceanSeam(0, H)}`
  return frame(W, H, 'Waiting', crabs.filter(c => !c.away).length, isSelected, skyGrad(`${id}s`), body, 'right')
}

// ─────────────────────────────── Camp: a building site by day, a campfire at night ───────────────────────────────

const sawhorse = (x: number, fy: number, i: number, hasCrab: boolean) => {
  const dx = x + 40
  const sx = x + 37
  const sy = fy - 15
  const hammer = hasCrab
    ? `<g><animateTransform attributeName="transform" type="rotate" values="-70 ${sx} ${sy};15 ${sx} ${sy};-70 ${sx} ${sy}" keyTimes="0;0.35;1" dur="${(0.7 + (i % 3) * 0.08).toFixed(2)}s" repeatCount="indefinite"/>
${R(sx - 1, sy - 2, 3, 3, ACCENT)}${R(sx + 1, sy - 1, 11, 1.8, '#8a5a36')}${R(sx + 10, sy - 4, 4, 7, '#7d8894')}${R(sx + 10, sy - 4, 4, 1.5, '#a9b4bf')}</g>
<circle cx="${dx + 13}" cy="${fy - 15}" r="2" fill="#f1e2c4" opacity="0">${loop('opacity', '0;0;0.8;0', 0.7 + (i % 3) * 0.08, ' keyTimes="0;0.33;0.4;1"')}${loop('r', '1;1;3;5', 0.7 + (i % 3) * 0.08, ' keyTimes="0;0.33;0.4;1"')}</circle>`
    : R(dx + 4, fy - 19, 12, 2, '#8a5a36') + R(dx + 14, fy - 21, 4, 6, '#7d8894')
  return `<path d="M${dx} ${fy} L${dx + 6} ${fy - 13} M${dx + 12} ${fy} L${dx + 6} ${fy - 13} M${dx + 14} ${fy} L${dx + 20} ${fy - 13} M${dx + 26} ${fy} L${dx + 20} ${fy - 13}" stroke="#8a5a36" stroke-width="2.4"/>
${R(dx - 3, fy - 15, 32, 4, '#d8a066')}${R(dx - 3, fy - 15, 32, 1.2, '#ecc18d')}${R(dx + 22, fy - 7, 9, 7, '#c4553f')}${R(dx + 22, fy - 4, 9, 1, '#9c3f2f')}${hammer}`
}

// Where the site meets the camp the sun is setting: the sky and the ground fade through dusk on
// both sides of the seam, two pines stand on it and the trail runs across.
const campSeam = (bx: number, H: number) => {
  const hz = HEAD + 16
  const side = bx === 0 ? 'r' : 'l'
  const fade = (id: string, from: number, to: number) =>
    `<linearGradient id="${id}" x1="${from}" y1="0" x2="${to}" y2="0" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#ffffff" stop-opacity="0"/><stop offset="1" stop-color="#ffffff" stop-opacity="1"/></linearGradient>`
  const [a, b] = bx === 0 ? [bx + 60, bx] : [bx - 60, bx]
  return `<defs>${fade(`cd-dusk-f${side}`, a, b)}<mask id="cd-dusk-m${side}"><rect x="${Math.min(a, b)}" y="0" width="60" height="${H}" fill="url(#cd-dusk-f${side})"/></mask>
<linearGradient id="cd-dusk-s${side}" x1="0" y1="0" x2="0" y2="${hz}" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#4b3b78"/><stop offset="0.55" stop-color="#d9708a"/><stop offset="1" stop-color="#ffb07a"/></linearGradient></defs>
<g mask="url(#cd-dusk-m${side})">${R(Math.min(a, b), 0, 60, hz, `url(#cd-dusk-s${side})`)}${R(Math.min(a, b), hz, 60, H - hz, '#6b6a3e')}</g>
<circle cx="${bx}" cy="${hz - 1}" r="11" fill="#ffc46b" opacity="0.45"/><circle cx="${bx}" cy="${hz - 1}" r="7.5" fill="#ffd27a"/>${R(bx - 14, hz, 28, 3, '#6b6a3e')}
<path d="M${bx - 17} ${hz + 2} l8 -30 l8 30z" fill="#203828"/><path d="M${bx + 3} ${hz + 4} l9 -36 l9 36z" fill="#1b3122"/>${R(bx - 10, hz + 2, 2, 4, '#4a3020')}${R(bx + 11, hz + 4, 2, 4, '#4a3020')}
<path d="M${bx - 70} ${hz + 16} Q${bx} ${hz + 9} ${bx + 70} ${hz + 16}" fill="none" stroke="#e8d3a2" stroke-width="2" stroke-dasharray="5 4" opacity="0.6"/>`
}

const campWork = (crabs: SceneCrab[], W: number, H: number, isSelected: boolean) => {
  const id = 'cd-c'
  const hz = HEAD + 16
  const at = spots(Math.max(1, crabs.length), W, UNIT.camp[0])
  const cx = W - 62
  const crane = `${R(cx, 10, 3, hz - 6, '#f2b632')}${R(cx + 9, 10, 3, hz - 6, '#f2b632')}
${Array.from({ length: Math.floor((hz - 10) / 9) }, (_, k) => `<path d="M${cx + 1.5} ${14 + k * 9} L${cx + 10.5} ${20 + k * 9}" stroke="#d99a1e" stroke-width="1.3"/>`).join('')}
${R(cx - 80, 8, 98, 4, '#f2b632')}${Array.from({ length: 12 }, (_, k) => R(cx - 78 + k * 8, 9, 1.4, 2, '#d99a1e')).join('')}${R(cx + 12, 4, 8, 12, '#6b6f78')}${R(cx + 2, 2, 8, 8, '#3b8fd9')}${R(cx + 3.5, 3.5, 5, 3, '#c9ecff')}
<g><animateTransform attributeName="transform" type="rotate" values="-6 ${cx - 64} 12;6 ${cx - 64} 12;-6 ${cx - 64} 12" dur="3.2s" repeatCount="indefinite"/>
<path d="M${cx - 64} 12 V36" stroke="#3b3f47" stroke-width="1"/>${R(cx - 78, 36, 28, 5, '#c4553f')}${R(cx - 78, 36, 28, 1.5, '#e0705a')}</g>`
  const city = [14, 22, 10, 18, 26, 12, 20, 16]
    .map((h, k) => R(k * (W / 8), hz - h - 4, W / 8 - 2, h + 4, '#bcd6e6'))
    .join('')
  const body = `${R(0, 0, W, hz, `url(#${id}s)`)}${city}${crane}
${R(0, hz, W, H - hz, '#c9995f')}${R(0, hz, W, 3, '#b38450')}
${Array.from({ length: Math.floor((W * (H - hz)) / 300) }, (_, k) => R(rand(k + 5) * W, hz + 5 + rand(k + 60) * (H - hz - 8), 3, 1.5, '#b08049')).join('')}
${R(6, hz + 4, W - 12, 3, '#ffcc33', ' opacity="0.9"')}${Array.from({ length: Math.ceil(W / 12) }, (_, k) => `<path d="M${6 + k * 12} ${hz + 7} l4 -3 h4 l-4 3z" fill="#1f1f1f"/>`).join('')}
<path d="M${W - 16} ${H - 4} l5 -16 l5 16z" fill="#ff7a2f"/>${R(W - 14.5, H - 13, 7, 2.5, '#ffffff')}${R(W - 19, H - 5, 16, 2.5, '#e05f1d')}
${campSeam(W, H)}
${at.map((s, i) => sawhorse(s.x, s.fy, i, Boolean(crabs[i] && !crabs[i]!.away)) + (crabs[i] && !crabs[i]!.away ? crab(s.x, s.fy, { i, hammer: true, hat: true, wave: crabs[i]!.wave }) + (crabs[i]!.asks ? ask(s.x + 30, s.fy - 32, i) : '') : '')).join('')}`
  return frame(W, H, 'Working', crabs.filter(c => !c.away).length, isSelected, grad(`${id}s`, ['#7cc8f5', '#d8f1ff']), body, 'left')
}

const fire = (x: number, fy: number, isLit: boolean) => {
  const logs = `<path d="M${x - 9} ${fy - 1} L${x + 9} ${fy - 6}" stroke="#6b4329" stroke-width="4"/><path d="M${x - 9} ${fy - 6} L${x + 9} ${fy - 1}" stroke="#7a4d30" stroke-width="4"/>`
  if (!isLit)
    return `${logs}<circle cx="${x}" cy="${fy - 10}" r="2.5" fill="#9aa0ad" opacity="0">${loop('cy', `${fy - 8};${fy - 26}`, 3)}${loop('opacity', '0;0.5;0', 3)}</circle>`
  const flame = (w: number, h: number, c: string, dur: number) =>
    `<path d="M${x - w} ${fy - 4} Q${x - w} ${fy - 4 - h * 0.6} ${x} ${fy - 4 - h} Q${x + w} ${fy - 4 - h * 0.6} ${x + w} ${fy - 4} Z" fill="${c}"><animateTransform attributeName="transform" type="scale" values="1 1;1.05 1.18;0.95 0.92;1 1" dur="${dur}s" repeatCount="indefinite" additive="sum"/></path>`
  const sparks = [0, 1, 2]
    .map(k => R(x - 3 + k * 3, fy - 14, 1.5, 1.5, '#ffd27a', ' opacity="0"', loop('y', `${fy - 14};${fy - 40}`, 1.6 + k * 0.4, ` begin="${k * 0.5}s"`) + loop('opacity', '0;1;0', 1.6 + k * 0.4, ` begin="${k * 0.5}s"`)))
    .join('')
  return `<ellipse cx="${x}" cy="${fy - 6}" rx="44" ry="26" fill="#ff8a3c" opacity="0.16">${loop('opacity', '0.12;0.2;0.14;0.12', 1.3)}</ellipse>
${logs}<g transform="translate(${x},${fy - 4}) translate(${-x},${-(fy - 4)})">${flame(8, 22, '#ff6b35', 0.9)}${flame(5.5, 16, '#ffb347', 0.7)}${flame(3, 9, '#ffe08a', 0.5)}</g>${sparks}`
}

const campRest = (crabs: SceneCrab[], W: number, H: number, isSelected: boolean) => {
  const id = 'cd-n'
  const hz = HEAD + 16
  const unit = UNIT.camp[1]
  const n = Math.max(1, crabs.length)
  const per = Math.max(1, Math.floor((W - 20 - 30) / unit))
  const rows = Math.ceil(n / per)
  const trees = Array.from({ length: Math.ceil(W / 22) + 1 }, (_, k) => {
    const tx = k * 22 + (k % 2) * 8
    const th = 16 + rand(k + 11) * 12
    return `<path d="M${tx} ${hz} l7 -${th} l7 ${th}z" fill="#141c36"/>`
  }).join('')
  const rowsOut = Array.from({ length: rows }, (_, r) => {
    const mine = Array.from({ length: Math.min(per, n - r * per) }, (_, j) => r * per + j)
    const left = Math.ceil(mine.length / 2)
    const fy = HEAD + 38 + r * ROW
    const total = mine.length * unit + 30
    const x0 = (W - total) / 2
    const fx = x0 + left * unit + 15
    const seat = (i: number, j: number) => {
      const x = j < left ? x0 + j * unit : x0 + j * unit + 30
      const c = crabs[i]
      const faces = j < left ? 1 : -1
      const isNext = j === left - 1 || j === left
      const stickFrom = faces > 0 ? x + 38 : x + 1
      const stickTo = faces > 0 ? fx - 6 : fx + 6
      return `${R(x - 2, fy - 6, 44, 6, '#7a4a2a', ' rx="3"')}${R(x - 2, fy - 6, 44, 1.5, '#9a643a')}<circle cx="${faces > 0 ? x - 1 : x + 41}" cy="${fy - 3}" r="3" fill="#c8945f"/>
${c && !c.away ? `${crab(x + 1, fy - 5, { i, sit: true })}${isNext ? `<path d="M${stickFrom} ${fy - 14} L${stickTo} ${fy - 22}" stroke="#d6b27e" stroke-width="1.2"/>${R(stickTo - 2, fy - 25, 4.5, 4.5, '#fff4e0', ' rx="1"', loop('fill', '#fff4e0;#f0c58a;#fff4e0', 5 + (i % 3)))}` : mug(faces > 0 ? x + 37 : x - 5, fy - 18, i, '#c96f4a')}${c.asks ? ask(x + 22, fy - 34, i) : ''}${c.pinned ? pushpin(x + 2, fy - 6) : ''}` : ''}`
    }
    return fire(fx, fy, crabs.length > 0) + mine.map((i, j) => seat(i, j)).join('')
  }).join('')
  const body = `${R(0, 0, W, hz, `url(#${id}s)`)}${stars(W, hz - 10, Math.floor(W / 12), 21)}
<circle cx="${W - 70}" cy="20" r="7" fill="#f6e7b0"/><circle cx="${W - 67}" cy="17.5" r="6" fill="#141c3e"/>
<path d="M0 ${hz - 6} Q ${W * 0.25} ${hz - 26} ${W * 0.5} ${hz - 10} T ${W} ${hz - 14} V ${hz} H 0 Z" fill="#1f2748"/>${trees}
${R(0, hz, W, H - hz, '#1c3427')}${Array.from({ length: Math.floor(W / 9) }, (_, k) => R(rand(k + 70) * W, hz + 3 + rand(k + 80) * (H - hz - 6), 1.5, 3, '#2a4a36')).join('')}
${W >= 170 ? `<path d="M${W - 50} ${hz + 10} l18 -30 l18 30z" fill="#d97757"/><path d="M${W - 36} ${hz + 10} l4 -12 l4 12z" fill="#7a3a28"/><path d="M${W - 50} ${hz + 10} l18 -30" stroke="#f0a283" stroke-width="1"/>` : ''}
${campSeam(0, H)}
${rowsOut}`
  return frame(W, H, 'Waiting', crabs.filter(c => !c.away).length, isSelected, grad(`${id}s`, ['#0a1030', '#262257', '#3b2f63']), body, 'right')
}

export const SCENES: Record<Theme, { work: typeof studioWork; rest: typeof studioRest }> = {
  studio: { work: studioWork, rest: studioRest },
  ocean: { work: oceanWork, rest: beachRest },
  camp: { work: campWork, rest: campRest },
}

// The two halves of the picture: each takes room by how many crabs it holds, and both grow a row
// whenever a side runs out of room.
export const sceneLayout = (theme: Theme, working: number, waiting: number, W: number, gap = 0) => {
  const [uw, ur] = UNIT[theme]
  const room = W - gap
  const min = 150
  const a = 20 + Math.max(1, working) * uw
  const b = 20 + Math.max(1, waiting) * ur + (theme === 'camp' ? 30 : 0)
  const workW = Math.round(Math.max(min, Math.min(room - min, (room * a) / (a + b))))
  const restW = room - workW
  const restRows = theme === 'camp' ? Math.ceil(Math.max(1, waiting) / Math.max(1, Math.floor((restW - 50) / ur))) : rowsFor(waiting, restW, ur)
  return { workW, restW, H: sceneHeight(Math.max(rowsFor(working, workW, uw), restRows)) }
}

// The whole picture: the Working half, the Waiting half, and any crab on its way between them,
// drawn as one image so nothing shows at the seam.
export const picture = (
  theme: Theme,
  work: SceneCrab[],
  rest: SceneCrab[],
  lay: { workW: number; restW: number; H: number },
  selected: 'working' | 'waiting' | null,
  trips = '',
) => {
  const W = lay.workW + lay.restW
  const half = (svg: string, x: number, w: number) =>
    `<svg x="${x}" y="0" width="${w}" height="${lay.H}" viewBox="0 0 ${w} ${lay.H}">${svg.replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, '')}</svg>`
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${lay.H}" width="${W}" height="${lay.H}">
<defs><clipPath id="cd-whole"><rect width="${W}" height="${lay.H}" rx="12"/></clipPath><style>@media (prefers-reduced-motion: reduce) { .cd-fx { display: none } }</style></defs>
${half(SCENES[theme].work(work, lay.workW, lay.H, selected === 'working'), 0, lay.workW)}${half(SCENES[theme].rest(rest, lay.restW, lay.H, selected === 'waiting'), lay.workW, lay.restW)}
<g clip-path="url(#cd-whole)" shape-rendering="crispEdges">${trips}</g></svg>`
}

// ─────────────────────────────── Trips between the halves ───────────────────────────────

type Point = { x: number; fy: number }

// Where crab i of n works: its feet, in its half's own coordinates.
export const workSpot = (theme: Theme, i: number, n: number, W: number): Point => {
  const s = spots(Math.max(1, n), W, UNIT[theme][0])[i]
  return s ? { x: s.x, fy: s.fy } : { x: 10, fy: HEAD + 38 }
}

// Where crab i of n rests, sitting: its feet, in its half's own coordinates.
export const restSpot = (theme: Theme, i: number, n: number, W: number): Point => {
  if (theme === 'camp') {
    const unit = UNIT.camp[1]
    const per = Math.max(1, Math.floor((W - 20 - 30) / unit))
    const row = Math.floor(i / per)
    const m = Math.min(per, Math.max(1, n) - row * per)
    const j = i - row * per
    const left = Math.ceil(m / 2)
    const x0 = (W - (m * unit + 30)) / 2
    return { x: (j < left ? x0 + j * unit : x0 + j * unit + 30) + 1, fy: HEAD + 38 + row * ROW - 5 }
  }
  const s = spots(Math.max(1, n), W, UNIT[theme][1])[i]
  if (!s) return { x: 10, fy: HEAD + 31 }
  return theme === 'studio' ? { x: s.x + 4, fy: s.fy - 7 } : { x: s.x + 1, fy: s.fy - 8 }
}

// A trip in three beats, 4.5 s in all: a moment at the desk, the walk over, a moment settling in.
const DESK_S = 0.75
const WALK_S = 3
const SEAT_S = 0.75
export const TRIP_S = DESK_S + WALK_S + SEAT_S
// The trip back to the desk (you answered its chat) runs the same beats, quicker.
const BACK_S = 2.1
export const tripSeconds = (to: 'working' | 'waiting') => (to === 'working' ? BACK_S : TRIP_S)
// When, as fractions of the trip out, the crab sets off and when it sits down.
const LEAVE = DESK_S / TRIP_S
const ARRIVE = (DESK_S + WALK_S) / TRIP_S
// A point `f` of the way through the walk, as a fraction of the whole trip.
const along = (f: number) => LEAVE + f * (ARRIVE - LEAVE)

// One crab's trip, drawn over the whole picture in its coordinates (the right half's shifted by bx,
// the seam): a crab whose chat just finished leaves its desk for its seat; one whose chat you
// answered goes back. `e` is how far into the trip the picture is drawn, so a redraw picks it up there.
// `label` is the chat's title, carried over the crab's head and kept inside the picture's width W;
// `key` tells apart trips under way at once.
export type Trip = { to: 'working' | 'waiting'; e: number; desk: Point; seat: Point; bx: number; W: number; label?: string; key?: number }

// Roughly how wide a line of 9.5 px text is: CJK about twice as wide as Latin.
const textW = (text: string) => [...text].reduce((w, ch) => w + (/[⺀-￯]/.test(ch) ? 9.6 : 5.4), 0)
const clipText = (text: string, max: number) => {
  let out = ''
  for (const ch of text) {
    if (textW(out + ch) > max) return `${out}…`
    out += ch
  }
  return out
}

export const tripArt = (theme: Theme, t: Trip) => {
  const isBack = t.to === 'working'
  const S = tripSeconds(t.to)
  const at = (a: number) => (isBack ? 1 - a : a)
  // A window [a, b] of the trip out, turned round for the trip back.
  const win = (a: number, b: number) => (isBack ? [1 - b, 1 - a] : [a, b]) as [number, number]
  const timing = ` dur="${S}s" begin="${(-t.e).toFixed(2)}s" fill="freeze"`
  const k = (n: number) => +n.toFixed(3)
  const visible = (a: number, b: number) =>
    a <= 0
      ? `<animate attributeName="opacity" values="1;${b >= 1 ? 1 : 0}" keyTimes="0;${k(Math.min(b, 0.999))}" calcMode="discrete"${timing}/>`
      : `<animate attributeName="opacity" values="0;1;${b >= 1 ? 1 : 0}" keyTimes="0;${k(a)};${k(Math.min(b, 0.999))}" calcMode="discrete"${timing}/>`
  const during = (a0: number, b0: number) => visible(...win(a0, b0))
  const shown = (a: number, b: number, art: string) => `<g opacity="0">${during(a, b)}${art}</g>`
  // The hop at the desk rises on an ease-out and drops on an ease-in, as a jump does; the walk keeps
  // an even pace between its points. Run backwards, each curve is turned round too.
  const UP = '0.23 1 0.32 1'
  const DOWN = '0.55 0 1 0.45'
  const EVEN = '0 0 1 1'
  const turned = (c: string) => {
    const [x1, y1, x2, y2] = c.split(' ').map(Number) as [number, number, number, number]
    return [1 - x2, 1 - y2, 1 - x1, 1 - y1].map(n => k(n)).join(' ')
  }
  const route = (pts: [number, number, number][], isHop = false) => {
    const ordered = isBack ? [...pts].reverse().map(([a, x, y]) => [at(a), x, y] as const) : pts
    const curves = pts.slice(1).map((_, j) => (isHop && j < 4 ? (j % 2 ? DOWN : UP) : EVEN))
    const splines = (isBack ? curves.reverse().map(turned) : curves).join(';')
    return `<animateTransform attributeName="transform" type="translate" values="${ordered.map(p => `${k(p[1])},${k(p[2])}`).join(';')}" keyTimes="${ordered.map(p => k(p[0])).join(';')}" calcMode="spline" keySplines="${splines}"${timing}/>`
  }
  // One-off motion, `sec` seconds into the trip, on the strong ease-out: fast off the mark, settling in.
  const EASE_OUT = '0.23 1 0.32 1'
  const startAt = (sec: number) => `${(sec - t.e).toFixed(2)}s`
  const ease = (attr: string, from: string, to: string, sec: number, dur: number) =>
    `<animate attributeName="${attr}" values="${from};${to}" keyTimes="0;1" calcMode="spline" keySplines="${EASE_OUT}" dur="${dur}s" begin="${startAt(sec)}" fill="freeze"/>`
  const easeMove = (type: 'translate' | 'scale', from: string, to: string, sec: number, dur: number) =>
    `<animateTransform attributeName="transform" type="${type}" values="${from};${to}" keyTimes="0;1" calcMode="spline" keySplines="${EASE_OUT}" dur="${dur}s" begin="${startAt(sec)}" fill="freeze"/>`
  // Shown from `sec` for `dur`: fades in quickly, holds, fades out.
  const flash = (sec: number, dur: number, peak = 1, hold = 0.6) =>
    `<animate attributeName="opacity" values="0;${peak};${peak};0" keyTimes="0;0.12;${hold};1" dur="${dur}s" begin="${startAt(sec)}" fill="freeze"/>`
  const bob = `<animateTransform attributeName="transform" type="translate" values="0,0;0,-2.4" dur="${isBack ? 0.22 : 0.3}s" calcMode="discrete" repeatCount="indefinite"/>`
  const walker = (extra = '') => `<g>${bob}${crab(0, 0, { i: 1 })}${extra}</g>`
  const { desk: d, seat: s, bx } = t
  const floor = HEAD + 38
  const id = `cd-trip-${t.key ?? 0}`
  // It hops for joy at its desk before it sets off (or when it gets back).
  const hop: [number, number, number][] = [[0, d.x, d.fy], [LEAVE * 0.25, d.x, d.fy - 7], [LEAVE * 0.5, d.x, d.fy], [LEAVE * 0.7, d.x, d.fy - 4], [LEAVE * 0.88, d.x, d.fy], [LEAVE, d.x, d.fy]]

  let pts: [number, number, number][]
  let sprites: string
  let below = ''
  let above = ''
  if (theme === 'studio') {
    pts = [...hop, [along(0.09), d.x + 4, floor + 2], [along(0.42), bx - 34, floor + 2], [along(0.61), bx + 6, floor + 2], [along(0.94), s.x, s.fy + 7], [ARRIVE, s.x, s.fy], [1, s.x, s.fy]]
    sprites = `${shown(0, LEAVE, crab(0, 0, { i: 0, typing: true }))}${shown(LEAVE, ARRIVE, walker())}${shown(ARRIVE, 1, crab(0, 0, { i: 2, sit: true }))}`
    // The door swings open toward you while the crab goes through, with the other room's light behind it.
    below = `${shown(LEAVE + 0.03, 1, R(d.x + 42.5, d.fy - 35.5, 17, 12, '#161826'))}${shown(along(0.39), along(0.67), `${R(bx - 4, DOOR.top, 8, DOOR.bottom - DOOR.top, '#ffe2a8')}<polygon points="${bx + 4},${DOOR.top} ${bx + 15},${DOOR.top + 4} ${bx + 15},${DOOR.bottom + 4} ${bx + 4},${DOOR.bottom}" fill="#9a6740"/><polygon points="${bx - 4},${DOOR.bottom} ${bx + 4},${DOOR.bottom} ${bx + 18},${DOOR.bottom + 10} ${bx - 18},${DOOR.bottom + 10}" fill="#ffd27a" opacity="0.3"/>`)}`
    above = shown(ARRIVE + 0.04, 1, mug(s.x + 38, s.fy - 12, 2))
  } else if (theme === 'ocean') {
    pts = [...hop, [along(0.15), d.x + 8, d.fy - 16], [along(0.45), bx - 50, HEAD + 24], [along(0.67), bx - 6, SAND + 2], [along(0.76), bx + 12, SAND + 6], [along(0.96), s.x, s.fy + 8], [ARRIVE, s.x, s.fy], [1, s.x, s.fy]]
    sprites = `${shown(0, LEAVE, crab(0, 0, { i: 0, typing: true }))}${shown(LEAVE, ARRIVE, walker())}${shown(ARRIVE, ARRIVE + 0.06, crab(0, 0, { i: 2, sit: true }))}${shown(ARRIVE + 0.06, 1, crab(0, 0, { i: 2, sit: true, shades: true }))}`
    below = `${shown(LEAVE + 0.03, 1, R(d.x + 45, d.fy - 35, 12, 14, '#0a1a26', ' rx="2.5"'))}${[0, 1, 2, 3]
      .map(j => `<circle cx="${d.x + 18 + j * 4}" cy="${d.fy - 20}" r="${1.6 + (j % 2)}" fill="#d6f7ff" fill-opacity="0.25" stroke="#d6f7ff" stroke-width="0.8" opacity="0">${during(LEAVE + j * 0.03, along(0.5))}<animate attributeName="cy" values="${d.fy - 20};${SURF + 3}" dur="${(S * 0.3).toFixed(2)}s" begin="${(-t.e + S * at(LEAVE + j * 0.03)).toFixed(2)}s" fill="freeze"/></circle>`)
      .join('')}`
    above = [-6, -3, 0, 3, 6]
      .map((dx, j) => `<rect x="${bx - 8 + dx}" y="${SURF - 2}" width="2" height="2" fill="#ffffff" opacity="0">${during(along(0.6), along(0.76))}<animate attributeName="y" values="${SURF - 2};${SURF - 12 - (j % 2) * 4};${SURF}" dur="${(S * 0.1).toFixed(2)}s" begin="${(-t.e + S * at(along(0.6))).toFixed(2)}s" fill="freeze"/></rect>`)
      .join('')
  } else {
    // Camp: the hard hat goes onto the sawhorse, and a lantern lights the way once it's dark.
    pts = [...hop, [along(0.06), d.x, d.fy + 6], [along(0.6), bx + 10, floor + 8], [along(0.96), s.x, s.fy + 11], [ARRIVE, s.x, s.fy], [1, s.x, s.fy]]
    const lantern = `<g transform="translate(40,-14)" shape-rendering="geometricPrecision">${shown(along(0.52), ARRIVE, `<circle r="10" fill="#ffd27a" opacity="0.28"/><rect x="-2.5" y="-3" width="5" height="6" rx="1" fill="#ffe08a"/><rect x="-3" y="-4.5" width="6" height="1.6" fill="#6b4329"/><path d="M-6 -7 L-1 -4.5" stroke="#6b4329" stroke-width="1"/>`)}</g>`
    sprites = `${shown(0, LEAVE, crab(0, 0, { i: 0, hammer: true }))}${shown(LEAVE, ARRIVE, walker(lantern))}${shown(ARRIVE, 1, crab(0, 0, { i: 2, sit: true }))}`
    below = `<g fill="#ffcc33">${route([[0, d.x + 13, d.fy - 22], [LEAVE, d.x + 13, d.fy - 22], [LEAVE + 0.06, d.x + 38, d.fy - 40], [LEAVE + 0.12, d.x + 52, d.fy - 21], [1, d.x + 52, d.fy - 21]])}
${R(0, 0, 15, 2.4, '#ffcc33')}${R(-3, 2.2, 21, 3.4, '#ffcc33')}${R(-7, 5.4, 29, 2.2, '#ffcc33')}</g>`
  }

  // So the trip can't be missed: the rest of the picture dims, a spotlight follows the crab, the crab
  // grows while it travels, its chat's name rides above it, and a ring pulses where it's headed.
  const dim = `<defs><radialGradient id="${id}-g"><stop offset="0.55" stop-color="#000000"/><stop offset="1" stop-color="#ffffff"/></radialGradient>
<mask id="${id}-m" maskUnits="userSpaceOnUse" x="-2000" y="-2000" width="6000" height="6000"><rect x="-2000" y="-2000" width="6000" height="6000" fill="#ffffff"/><g>${route(pts, true)}<circle cx="19.5" cy="-14" r="46" fill="url(#${id}-g)"/></g></mask></defs>
<rect x="-2000" y="-2000" width="6000" height="6000" fill="#04050b" opacity="0" mask="url(#${id}-m)"><animate attributeName="opacity" values="0;0.2;0.2;0" keyTimes="0;0.06;0.9;1"${timing}/></rect>`
  const goal = isBack ? d : s
  const ring = `<g opacity="0">${visible(0.06, isBack ? 1 - LEAVE : ARRIVE)}<ellipse cx="${k(goal.x + 19.5)}" cy="${k(goal.fy + 1)}" rx="24" ry="6" fill="none" stroke="#ffffff" stroke-width="1.4" stroke-dasharray="3 3" shape-rendering="geometricPrecision">${`<animate attributeName="stroke-opacity" values="0.9;0.25;0.9" dur="0.9s" repeatCount="indefinite"/>`}</ellipse></g>`
  // On arrival a ripple spreads once from where it lands.
  const arrive = (isBack ? 1 - LEAVE : ARRIVE) * S
  const ripple = `<g transform="translate(${k(goal.x + 19.5)},${k(goal.fy + 1)})"><g opacity="0">${flash(arrive, 0.6, 0.85, 0.3)}<g>${easeMove('scale', '1 1', '1.7 1.7', arrive, 0.6)}<ellipse rx="24" ry="6" fill="none" stroke="#ffffff" stroke-width="1.4" vector-effect="non-scaling-stroke" shape-rendering="geometricPrecision"/></g></g></g>`
  const [wa, wb] = win(LEAVE, ARRIVE)
  const grow = `<animateTransform attributeName="transform" type="scale" values="1;1;1.35;1.35;1;1" keyTimes="0;${k(wa)};${k(wa + 0.05)};${k(wb - 0.05)};${k(wb)};1"${timing}/>`
  const dust = [0, 1]
    .map(j => `<circle cx="${8 + j * 24}" cy="0" r="1" fill="#efe4cf" opacity="0"><animate attributeName="r" values="1;4.5" dur="0.5s" begin="${j * 0.25}s" repeatCount="indefinite"/><animate attributeName="opacity" values="0.7;0" dur="0.5s" begin="${j * 0.25}s" repeatCount="indefinite"/></circle>`)
    .join('')
  const text = t.label ? `${isBack ? '↩' : '✓'} ${clipText(t.label, 130)}` : ''
  const tagW = textW(text) + 16
  const tagColor = isBack ? ACCENT : '#3fa365'
  // The tag follows the crab but slides along its own path, held inside the picture's edges; the
  // little pointer under it stays on the crab.
  const tagPts = pts.map(([a, x, y]) => [a, Math.max(4, Math.min(t.W - 4 - tagW, x + 19.5 - tagW / 2)), y] as [number, number, number])
  const tag = text
    ? `<g>${route(tagPts, true)}${shown(LEAVE - 0.02, ARRIVE + 0.04, `<g shape-rendering="geometricPrecision"><rect x="0" y="-50" width="${k(tagW)}" height="15" rx="7.5" fill="${tagColor}"/><text x="${k(tagW / 2)}" y="-39.3" text-anchor="middle" font-family="${fontStack()}" font-size="9.5" font-weight="700" fill="#ffffff">${esc(text)}</text></g>`)}</g>`
    : ''
  const pointer = text ? shown(LEAVE - 0.02, ARRIVE + 0.04, `<path d="M15.5 -35.4 L19.5 -31 L23.5 -35.4Z" fill="${tagColor}" shape-rendering="geometricPrecision"/>`) : ''
  // Hurrying back: speed lines trail behind it, to the right, where it came from.
  const [sa, sb] = win(LEAVE, ARRIVE)
  const speedLines = isBack
    ? `<g opacity="0" class="cd-fx">${visible(sa, sb)}${[-5, -11, -17]
        .map((y, j) => `<rect x="42" y="${y}" width="9" height="1.4" fill="#ffffff" opacity="0"><animate attributeName="opacity" values="0.8;0" dur="0.36s" begin="${j * 0.12}s" repeatCount="indefinite"/><animateTransform attributeName="transform" type="translate" values="0,0;9,0" dur="0.36s" begin="${j * 0.12}s" repeatCount="indefinite"/></rect>`)
        .join('')}</g>`
    : ''
  const mover = `<g>${route(pts, true)}<g transform="translate(19.5 0)"><g>${grow}<g transform="translate(-19.5 0)">${sprites}</g></g></g>${isBack ? speedLines : shown(LEAVE, ARRIVE, `<g class="cd-fx">${dust}</g>`)}${pointer}</g>${tag}`

  // A burst of sparks at (cx, cy), `sec` into the trip: a quick flash, then sparks flying out on the
  // ease-out and dropping a little as they fade.
  // A burst of sparks at (cx, cy), `sec` into the trip: a flash, an outer ring of coloured sparks and
  // an inner one of white, flying out on the ease-out and dropping a little as they fade.
  const burst = (cx: number, cy: number, sec: number, colors: string[], n = 12, reach = 16) => {
    const size = reach > 20 ? 3 : 2.2
    const ring = (count: number, far: number, color: (j: number) => string, dur: number) =>
      Array.from({ length: count }, (_, j) => {
        const angle = (j / count) * Math.PI * 2 + 0.2
        const r = far * (0.85 + (j % 3) * 0.1)
        return `<g opacity="0">${flash(sec, dur, 1, 0.55)}<g>${easeMove('translate', '0,0', `${k(Math.cos(angle) * r)},${k(Math.sin(angle) * r * 0.85 + far * 0.3)}`, sec, dur)}${R(-size / 2, -size / 2, size, size, color(j))}</g></g>`
      }).join('')
    return `<g transform="translate(${k(cx)},${k(cy)})" class="cd-fx"><g opacity="0">${flash(sec, 0.4, 0.9, 0.3)}<g>${easeMove('scale', '0.6 0.6', `${k(reach / 9)} ${k(reach / 9)}`, sec, 0.4)}<circle r="5" fill="${colors[0]}" opacity="0.6" shape-rendering="geometricPrecision"/></g></g>${ring(n, reach, j => colors[j % colors.length]!, 1)}${reach > 20 ? ring(Math.round(n / 2), reach * 0.5, () => '#ffffff', 0.8) : ''}</g>`
  }

  // Out: a ✓ over the desk as the chat's work is done, then fireworks the moment the crab crosses
  // from Working into Waiting, fired up from where it crosses and bursting over the seam.
  const crossing = (() => {
    for (let i = 1; i < pts.length; i++) {
      const [a0, x0, y0] = pts[i - 1]!
      const [a1, x1, y1] = pts[i]!
      if (x0 !== x1 && (x0 - bx) * (x1 - bx) <= 0) {
        const f = (bx - x0) / (x1 - x0)
        return { sec: (a0 + (a1 - a0) * f) * S, y: y0 + (y1 - y0) * f }
      }
    }
    return { sec: along(0.6) * S, y: HEAD + 30 }
  })()
  const fireworks = () => {
    const rise = 0.45
    const shots = [
      { dx: 0, y: 32, wait: 0, colors: ['#ffd166', '#ffb347'] },
      { dx: -46, y: 36, wait: 0.2, colors: ['#ff8fc7', '#ef476f'] },
      { dx: 48, y: 30, wait: 0.4, colors: ['#7cd4ff', '#9be29b'] },
      { dx: -14, y: 28, wait: 0.6, colors: ['#b39cff', '#ffd166'] },
    ]
    return shots
      .map(f => {
        const cx = Math.max(30, Math.min(t.W - 30, bx + f.dx))
        // Each rocket leaves so its burst lands on the crossing (the first) or just after it.
        const sec = crossing.sec - rise + f.wait
        // Up from the crab as it crosses, and always at least 30 px of climb.
        const fromY = Math.max(crossing.y - 20, f.y + 30)
        const rocket = `<g class="cd-fx"><g opacity="0">${flash(sec, rise, 1, 0.9)}<g>${easeMove('translate', `${k(bx)},${k(fromY)}`, `${k(cx)},${f.y}`, sec, rise)}${R(-1.2, -3, 2.4, 5, '#fff6d6')}${R(-0.6, 2, 1.2, 8, '#ffd27a', ' opacity="0.55"')}</g></g></g>`
        return rocket + burst(cx, f.y, sec + rise, f.colors, 18, 32)
      })
      .join('')
  }
  const check = `<g transform="translate(${d.x + 20},${d.fy - 36})"><g opacity="0">${flash(0.1, DESK_S - 0.05, 1, 0.75)}<g>${easeMove('scale', '0.9 0.9', '1 1', 0.1, 0.2)}<g shape-rendering="geometricPrecision"><circle r="8" fill="#4fb36d"/><path d="M-3.8 0.2 L-1.1 2.9 L4 -2.7" fill="none" stroke="#ffffff" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"/></g></g></g></g>`

  // Back: your reply lands. A "!" pops over the crab on its seat, it hurries back with speed lines
  // trailing, and its desk powers on with a flash and a ring as it sits down to work.
  const notice = `<g transform="translate(${k(s.x + 30)},${k(s.fy - 32)})"><g opacity="0">${flash(0.1, SEAT_S - 0.05, 1, 0.75)}<g>${easeMove('scale', '0.9 0.9', '1 1', 0.1, 0.2)}<g shape-rendering="geometricPrecision"><rect x="-7" y="-6" width="14" height="11" rx="3" fill="${ACCENT}"/><path d="M-3 4.5 L-6 8.5 L1 4.5Z" fill="${ACCENT}"/><text x="0" y="3" text-anchor="middle" font-family="${fontStack()}" font-size="9.5" font-weight="800" fill="#ffffff">!</text></g></g></g></g>`
  const screen = theme === 'studio' ? { x: d.x + 51, y: d.fy - 29.5, w: 17, h: 12 } : theme === 'ocean' ? { x: d.x + 51, y: d.fy - 28, w: 12, h: 14 } : null
  const powerOn = screen
    ? `<g opacity="0">${flash((1 - LEAVE) * S, 0.5, 0.9, 0.2)}${R(screen.x - screen.w / 2, screen.y - screen.h / 2, screen.w, screen.h, '#e9fbff')}</g>
<g transform="translate(${k(screen.x)},${k(screen.y)})" class="cd-fx"><g opacity="0">${flash((1 - LEAVE) * S, 0.6, 0.8, 0.25)}<g>${easeMove('scale', '0.5 0.5', '2.4 2.4', (1 - LEAVE) * S, 0.6)}<circle r="8" fill="none" stroke="#9ff0ff" stroke-width="1.5" vector-effect="non-scaling-stroke" shape-rendering="geometricPrecision"/></g></g></g>`
    : burst(d.x + 20, d.fy - 24, (1 - LEAVE) * S, ['#ffcc33', '#ffffff'], 8, 9)
  const cue = isBack ? notice + powerOn : check + fireworks()

  return `<g class="trip">${below}${dim}${ring}${ripple}${mover}${above}${cue}</g>`
}
