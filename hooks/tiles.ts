// The Projects, Chats and Today tiles drawn as little pieces of the scene below them, so the top
// row and the picture read as one place: a shelf of binders, a chat on a monitor and a window on
// the night in the Studio; a sandcastle, a bottle and the sun over the sea at the Ocean; a pallet
// of bricks, a campfire and the sky over the site at Camp. The name and number sit on the same
// dark chip the Working and Waiting halves use.

import { ACCENT, TILES_H, escape, fontStack } from './art'
import type { Tile } from './art'
import { R, flick, grad, loop, rand, stars } from './scenes'
import type { Theme } from './scenes'

export type TileKind = 'projects' | 'chats' | 'today'
export type SceneTile = Tile & { kind: TileKind; count?: number }

const H = TILES_H
const BRICK = '#c4553f'

// The sky for the hour: day, dusk or night, in the theme's own day colours.
const skyFor = (hour: number, day: string[]) =>
  hour >= 7 && hour < 17 ? day : (hour >= 5 && hour < 7) || (hour >= 17 && hour < 19) ? ['#3b2f63', '#b5577a', '#f6a35c'] : ['#0a1030', '#262257']
const isNight = (hour: number) => hour < 5 || hour >= 19

// The sun by day, the moon by night, on an arc across x0..x1 between yTop and yLow, at the hour.
const sunOrMoon = (hour: number, x0: number, x1: number, yTop: number, yLow: number) => {
  const up = hour >= 6 && hour < 18
  const p = up ? (hour - 6) / 12 : ((hour - 18 + 24) % 24) / 12
  const x = x0 + p * (x1 - x0)
  const y = yLow - Math.sin(p * Math.PI) * (yLow - yTop)
  return up
    ? `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="9" fill="#ffd36b" opacity="0.25">${loop('r', '8;10;8', 3)}</circle><circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="5" fill="#ffd36b"/>`
    : `<path d="M${(x + 1).toFixed(1)} ${(y - 5).toFixed(1)} A5 5 0 1 0 ${(x + 1).toFixed(1)} ${(y + 5).toFixed(1)} A3.6 5 0 1 1 ${(x + 1).toFixed(1)} ${(y - 5).toFixed(1)}Z" fill="#f4ecd0"/>`
}

// ─────────────────────────────── Studio ───────────────────────────────

const studioWall = (w: number) => `${R(0, 0, w, H, 'url(#cd-t-wall)')}${R(0, H - 7, w, 7, '#3b2a3a')}${R(0, H - 7, w, 1.5, '#4d3a4f')}`
const WALL = grad('cd-t-wall', ['#2a3160', '#1d2245'])

// A shelf of binders, one per project; past six the shelf is full.
const studioProjects = (w: number, n: number) => {
  const x0 = w - 27
  const colors = ['#e85d75', '#7cd4ff', '#f7c96b', '#9be29b', '#d9a0ff', '#f2a283']
  const binders = Array.from({ length: Math.min(n, 6) }, (_, k) => {
    const h = 11 + Math.round(rand(k + 3) * 4)
    return `${R(x0 + 1 + k * 3.6, H - 22 - h, 3, h, colors[k % colors.length]!)}${R(x0 + 1.6 + k * 3.6, H - 18 - h, 1.8, 1.4, '#ffffff', ' opacity="0.55"')}`
  }).join('')
  return `${R(x0 - 2, H - 22, 26, 2.5, '#b07a4c')}${R(x0 - 2, H - 19.5, 26, 1.2, '#8a5a36')}${R(x0, H - 19, 2, 4, '#7a4c2e')}${R(x0 + 20, H - 19, 2, 4, '#7a4c2e')}${binders}
${R(x0 + 8, H - 13, 7, 6, '#c96f4a')}${R(x0 + 9, H - 19, 2, 6, '#5fa86b')}${R(x0 + 12, H - 17, 2, 4, '#4f9a5c')}`
}

// A monitor with the chats on it as bubbles that come and go, one per chat (three at most).
const studioChats = (w: number, n: number) => {
  const x = w - 30
  const y = 14
  const bubbles = Array.from({ length: Math.min(n, 3) }, (_, k) => {
    const left = k % 2 === 0
    const bw = 8 + Math.round(rand(k + 11) * 6)
    const bx = left ? x + 3.5 : x + 20.5 - bw
    return R(bx, y + 3.5 + k * 4.5, bw, 3, left ? '#7cd4ff' : '#f7c96b', ' rx="1"', flick(4, '1;0;1', ` keyTimes="0;${(0.82 + k * 0.05).toFixed(2)};0.95"`))
  }).join('')
  return `<circle cx="${x + 13}" cy="${y + 9}" r="16" fill="#6fd3ff" opacity="0.1">${loop('opacity', '0.07;0.14;0.07', 2.4)}</circle>
${R(x, y, 26, 19, '#2a2d3e')}${R(x + 1.5, y + 1.5, 23, 16, '#0b1622')}${bubbles}${R(x + 11, y + 19, 4, 5, '#2a2d3e')}${R(x + 7, y + 23.5, 12, 2, '#2a2d3e')}
`
}

// A window on the sky at this hour, and a mug on the sill.
const studioToday = (w: number, hour: number) => {
  const x = w - 74
  const y = 26
  const ww = 52
  const wh = H - 7 - y - 4
  return `<defs>${grad('cd-t-win', skyFor(hour, ['#7cc8f5', '#d8f1ff']))}<clipPath id="cd-t-winc"><rect x="${x + 2}" y="${y + 2}" width="${ww - 4}" height="${wh - 4}"/></clipPath></defs>
${R(x, y, ww, wh, '#b07a4c')}<g clip-path="url(#cd-t-winc)">${R(x + 2, y + 2, ww - 4, wh - 4, 'url(#cd-t-win)')}${isNight(hour) ? `<g transform="translate(${x + 2},${y})">${stars(ww - 4, wh - 6, 5, 31)}</g>` : ''}${sunOrMoon(hour, x + 6, x + ww - 6, y + 6, y + wh)}</g>
${R(x + ww / 2 - 1, y, 2, wh, '#8a5a36')}${R(x, y + wh / 2 - 1, ww, 2, '#8a5a36')}${R(x - 3, y + wh, ww + 6, 2.5, '#8a5a36')}
${R(x + ww + 6, y + wh - 6.5, 6, 6.5, '#f4f1ea', ' rx="1"')}${R(x + ww + 6.8, y + wh - 5.7, 4.4, 1.2, '#6b4330')}${R(x + ww + 12, y + wh - 5, 1.6, 3, '#f4f1ea')}`
}

// ─────────────────────────────── Ocean ───────────────────────────────

const SURFACE = 30
const oceanBack = (w: number, hour: number, id: string) =>
  `<defs>${grad(`${id}k`, skyFor(hour, ['#5cc6f2', '#a8e4fb', '#ffe2b8']))}${grad(`${id}s`, ['#1784a8', '#0b5577', '#083a56'])}</defs>
${R(0, 0, w, SURFACE, `url(#${id}k)`)}${R(0, SURFACE, w, H - SURFACE, `url(#${id}s)`)}
<g opacity="0.8">${Array.from({ length: Math.ceil(w / 22) }, (_, k) => R(k * 22 + 4, SURFACE - 0.5, 9, 1.5, '#ffffff')).join('')}<animateTransform attributeName="transform" type="translate" values="0,0;-5,0;0,0" dur="2.8s" repeatCount="indefinite"/></g>`

// A sandbank with a sandcastle, one tower per project (four at most), a flag on the tallest.
const oceanProjects = (w: number, n: number) => {
  const towers = Math.max(1, Math.min(n, 4))
  const tw = 5
  const x0 = w - 8 - towers * (tw + 1)
  const parts = Array.from({ length: n ? towers : 0 }, (_, k) => {
    const th = 8 + ((k * 5) % 3) * 3 + (k === Math.floor(towers / 2) ? 5 : 0)
    const tx = x0 + k * (tw + 1)
    return `${R(tx, H - 12 - th, tw, th, '#f5d9a0')}${R(tx, H - 12 - th, 1.2, 1.5, '#d9bb83')}${R(tx + 3.8, H - 12 - th, 1.2, 1.5, '#d9bb83')}${R(tx + 1.6, H - 9 - th, 1.8, 2.5, '#9c7a4a')}`
  })
  const mid = x0 + Math.floor(towers / 2) * (tw + 1) + 2
  const tallest = 8 + ((Math.floor(towers / 2) * 5) % 3) * 3 + 5
  const flag = n
    ? `${R(mid, H - 12 - tallest - 9, 1, 9, '#5a5a5a')}<path d="M${mid + 1} ${H - 12 - tallest - 9} h7 l-2 2 l2 2 h-7z" fill="${ACCENT}">${loop('d', `M${mid + 1} ${H - 12 - tallest - 9} h7 l-2 2 l2 2 h-7z;M${mid + 1} ${H - 12 - tallest - 9} h6 l-1 2 l1 2 h-6z;M${mid + 1} ${H - 12 - tallest - 9} h7 l-2 2 l2 2 h-7z`, 1.2)}</path>`
    : ''
  return `<path d="M${x0 - 16} ${H} Q${x0 - 4} ${H - 14} ${x0 + 8} ${H - 13} L${w} ${H - 14} V${H} Z" fill="#f5d9a0"/><path d="M${x0 - 10} ${H - 6} Q${x0} ${H - 13} ${x0 + 10} ${H - 12.5}" fill="none" stroke="#e9cf9c" stroke-width="1.5"/>${parts.join('')}${flag}
<circle cx="${w - 6}" cy="${H - 5}" r="1.8" fill="#f2a7b8"/>`
}

// A bottle bobbing on the swell with a note in it, and a bubble rising for each chat (five at most).
const oceanChats = (w: number, n: number) => {
  const x = w - 30
  const bubbles = Array.from({ length: Math.min(n, 5) }, (_, k) => {
    const bx = w - 30 + rand(k + 21) * 24
    const dur = 2.4 + rand(k + 41) * 1.6
    return `<circle cx="${bx.toFixed(1)}" cy="${H}" r="${(1.2 + rand(k + 61) * 1.2).toFixed(1)}" fill="none" stroke="#bfefff" stroke-width="0.8">${loop('cy', `${H - 2};${SURFACE + 3}`, dur, ` begin="${(-rand(k + 81) * dur).toFixed(2)}s"`)}${loop('opacity', '0;1;0.6;0', dur, ` begin="${(-rand(k + 81) * dur).toFixed(2)}s"`)}</circle>`
  }).join('')
  return `${bubbles}<g transform="translate(${x},${SURFACE - 6})"><g><animateTransform attributeName="transform" type="rotate" values="-10 8 6;8 8 6;-10 8 6" dur="2.6s" repeatCount="indefinite"/>
${R(0, 3, 15, 7, '#7fd6b4', ' rx="2" opacity="0.85"')}${R(15, 4.8, 4, 3.4, '#7fd6b4', ' opacity="0.85"')}${R(19, 4.5, 2.4, 4, '#9c6a43')}${R(3, 4.5, 8, 4, '#f4ecd0')}${R(4, 5.6, 6, 0.8, '#b99a6a')}${R(4, 7, 4, 0.8, '#b99a6a')}${R(1.5, 3.8, 9, 1, '#ffffff', ' opacity="0.6"')}</g></g>`
}

// The sun or the moon over the sea at this hour, with its light on the water.
const oceanToday = (w: number, hour: number) => {
  const x0 = w - 70
  const x1 = w - 12
  const p = hour >= 6 && hour < 18 ? (hour - 6) / 12 : ((hour - 18 + 24) % 24) / 12
  const gx = x0 + p * (x1 - x0)
  const glow = isNight(hour) ? '#f4ecd0' : '#ffe39a'
  return `${sunOrMoon(hour, x0, x1, 8, SURFACE + 2)}${R(0, SURFACE, w, 1, '#ffffff', ' opacity="0.25"')}
${[0, 1, 2, 3].map(k => R(gx - 6 + k * 1.5, SURFACE + 4 + k * 5, 12 - k * 3, 1.5, glow, ' opacity="0.55"', loop('opacity', '0.6;0.2;0.6', 1.8 + k * 0.4))).join('')}`
}

// ─────────────────────────────── Camp ───────────────────────────────

const campGround = (w: number, sky: string[], ground: string, id: string) =>
  `<defs>${grad(`${id}s`, sky)}</defs>${R(0, 0, w, H - 12, `url(#${id}s)`)}${R(0, H - 12, w, 12, ground)}${R(0, H - 12, w, 2, '#000000', ' fill-opacity="0.13"')}`

// A crane hook lowering bricks onto a pallet, one brick per project (nine at most), three to a row.
const campProjects = (w: number, n: number) => {
  const x0 = w - 24
  const shown = Math.min(n, 9)
  const bricks = Array.from({ length: shown }, (_, k) => {
    const row = Math.floor(k / 3)
    const col = k % 3
    const bx = x0 + col * 6.4 + (row % 2) * 3.2
    const by = H - 18 - row * 4
    return `${R(bx, by, 6, 3.6, BRICK)}${R(bx, by, 6, 1, '#e0705a')}`
  }).join('')
  const city = [10, 16, 8, 13, 18, 9].map((h, k) => R(k * (w / 6), H - 12 - h, w / 6 - 2, h, '#bcd6e6')).join('')
  return `${city}${R(x0 - 2, H - 14.5, 24, 2.5, '#9c6a43')}${R(x0, H - 12, 2, 2, '#7a4d30')}${R(x0 + 18, H - 12, 2, 2, '#7a4d30')}${bricks}
${R(x0 - 30, 4, 70, 3, '#f2b632')}${Array.from({ length: 9 }, (_, k) => R(x0 - 28 + k * 8, 4.6, 1.2, 1.8, '#d99a1e')).join('')}
<g><animateTransform attributeName="transform" type="rotate" values="-7 ${x0 + 10} 7;7 ${x0 + 10} 7;-7 ${x0 + 10} 7" dur="3.2s" repeatCount="indefinite"/>
<path d="M${x0 + 10} 7 V${H - 38}" stroke="#3b3f47" stroke-width="1"/>${R(x0 + 3, H - 38, 14, 3.5, BRICK)}${R(x0 + 3, H - 38, 14, 1, '#e0705a')}</g>
${R(6, H - 9, w - 12, 2.5, '#ffcc33', ' opacity="0.9"')}`
}

// A campfire at night with a spark rising for each chat (six at most), between two pines.
const campChats = (w: number, n: number) => {
  const fx = w - 19
  const fy = H - 12
  const pine = (x: number, s: number) => `<path d="M${x} ${fy - 22 * s} l${7 * s} ${12 * s} h-${3 * s} l${5 * s} ${10 * s} h-${18 * s} l${5 * s} -${10 * s} h-${3 * s}z" fill="#14281f"/>`
  const sparks = Array.from({ length: Math.min(n, 6) }, (_, k) => {
    const dur = 1.6 + rand(k + 7) * 1.2
    const sx = fx - 4 + rand(k + 17) * 8
    const begin = ` begin="${(-rand(k + 27) * dur).toFixed(2)}s"`
    return R(sx, fy - 8, 1.6, 1.6, k % 2 ? '#ffd36b' : '#ff9a3c', '', `${loop('y', `${fy - 8};${fy - 34}`, dur, begin)}${loop('x', `${sx};${sx + (k % 2 ? 4 : -4)}`, dur, begin)}${loop('opacity', '1;0.8;0', dur, begin)}`)
  }).join('')
  return `${pine(w - 34, 0.8)}${pine(w - 5, 0.7)}
<circle cx="${fx}" cy="${fy - 4}" r="16" fill="#ff9a3c" opacity="0.14">${loop('r', '14;18;14', 1.3)}</circle>
<path d="M${fx - 8} ${fy} L${fx + 8} ${fy - 4}" stroke="#6b4329" stroke-width="3.5"/><path d="M${fx - 8} ${fy - 4} L${fx + 8} ${fy}" stroke="#7a4d30" stroke-width="3.5"/>
<path d="M${fx - 5} ${fy - 3} Q${fx - 6} ${fy - 11} ${fx} ${fy - 16} Q${fx + 6} ${fy - 11} ${fx + 5} ${fy - 3}z" fill="#ff7a2f">${loop('d', `M${fx - 5} ${fy - 3} Q${fx - 6} ${fy - 11} ${fx} ${fy - 16} Q${fx + 6} ${fy - 11} ${fx + 5} ${fy - 3}z;M${fx - 5} ${fy - 3} Q${fx - 4} ${fy - 12} ${fx + 1} ${fy - 18} Q${fx + 5} ${fy - 10} ${fx + 5} ${fy - 3}z;M${fx - 5} ${fy - 3} Q${fx - 6} ${fy - 11} ${fx} ${fy - 16} Q${fx + 6} ${fy - 11} ${fx + 5} ${fy - 3}z`, 0.5)}</path>
<path d="M${fx - 2.5} ${fy - 3} Q${fx - 3} ${fy - 8} ${fx} ${fy - 10} Q${fx + 3} ${fy - 8} ${fx + 2.5} ${fy - 3}z" fill="#ffd36b"/>${sparks}`
}

// The sky over the site at this hour: the sun across it by day, the moon by night, a tent below.
const campToday = (w: number, hour: number) => {
  const tx = w - 34
  const ty = H - 12
  return `${isNight(hour) ? stars(w, 26, 9, 77) : ''}${sunOrMoon(hour, w - 76, w - 44, 9, H - 18)}
<path d="M${tx} ${ty} l11 -16 l11 16z" fill="${ACCENT}"/><path d="M${tx + 11} ${ty - 16} l11 16 h-4z" fill="#b25a3f"/><path d="M${tx + 8} ${ty} l3 -8 l3 8z" fill="#2a1a14"/>
${isNight(hour) ? `<rect x="${tx + 9.5}" y="${ty - 5}" width="3" height="3" fill="#ffd36b" opacity="0.8">${loop('opacity', '0.8;0.5;0.8', 2)}</rect>` : ''}`
}

// ─────────────────────────────── The row ───────────────────────────────

const art = (theme: Theme, kind: TileKind, w: number, n: number, hour: number) => {
  if (theme === 'studio') {
    const prop = kind === 'projects' ? studioProjects(w, n) : kind === 'chats' ? studioChats(w, n) : studioToday(w, hour)
    return `<defs>${WALL}</defs>${studioWall(w)}${prop}`
  }
  if (theme === 'ocean') {
    const id = `cd-t-o${kind[0]}`
    const prop = kind === 'projects' ? oceanProjects(w, n) : kind === 'chats' ? oceanChats(w, n) : oceanToday(w, hour)
    return `${oceanBack(w, kind === 'today' ? hour : 12, id)}${prop}`
  }
  const id = `cd-t-c${kind[0]}`
  if (kind === 'projects') return `${campGround(w, ['#7cc8f5', '#d8f1ff'], '#c9995f', id)}${campProjects(w, n)}`
  if (kind === 'chats') return `${campGround(w, ['#0a1030', '#262257', '#3b2f63'], '#2c2a3a', id)}${stars(w, 22, 7, 13)}${campChats(w, n)}`
  return `${campGround(w, skyFor(hour, ['#7cc8f5', '#d8f1ff']), isNight(hour) ? '#2c2a3a' : '#c9995f', id)}${campToday(w, hour)}`
}

// The row of tiles in the scene's theme. `hour` is the local time as a fraction of hours (14.5 = 2:30 pm).
export const sceneTiles = (theme: Theme, items: SceneTile[], W: number, hour: number) => {
  const gap = 6
  const w = (W - gap * (items.length - 1)) / items.length
  const font = fontStack()
  const cells = items
    .map((t, i) => {
      const clip = `cd-t-clip-${t.kind}`
      const big = t.value.length > 4
      const valueW = t.value.length * (big ? 7.6 : 10)
      const chipW = Math.max(t.label.length * 6.1, valueW + (t.badge ? t.badge.length * 6.4 + 6 : 0), (t.note ?? '').length * 5.1) + 14
      return `<g transform="translate(${(i * (w + gap)).toFixed(2)},0)">
<defs><clipPath id="${clip}"><rect width="${w.toFixed(2)}" height="${H}" rx="12"/></clipPath></defs>
<g clip-path="url(#${clip})"><g shape-rendering="crispEdges">${art(theme, t.kind, w, t.count ?? 0, hour)}</g>
<rect x="5" y="5" width="${Math.min(chipW, w - 10).toFixed(1)}" height="${t.note ? 48 : 42}" rx="9" fill="#0c0c12" fill-opacity="0.55"/>
<text x="12" y="19" fill="#ffffff" fill-opacity="0.75" font-family="${font}" font-size="10.5">${escape(t.label)}</text>
<text x="12" y="${t.note ? 36 : 39}" fill="#ffffff" font-family="${font}" font-size="${big ? 13.5 : 17}" font-weight="700">${escape(t.value)}</text>
${t.note ? `<text x="12" y="48" fill="#ffffff" fill-opacity="0.7" font-family="${font}" font-size="9.5">${escape(t.note)}</text>` : ''}
${t.badge ? `<text x="${(12 + valueW + 6).toFixed(1)}" y="${t.note ? 36 : 39}" fill="${t.isUp ? '#7fd9a0' : '#ff9a76'}" font-family="${font}" font-size="10.5" font-weight="700">${escape(t.badge)}</text>` : ''}</g>
<rect x="0.5" y="0.5" width="${(w - 1).toFixed(2)}" height="${H - 1}" rx="12" fill="none" stroke="${t.isSelected ? ACCENT : '#ffffff'}" stroke-opacity="${t.isSelected ? 0.85 : 0.08}" stroke-width="${t.isSelected ? 1.5 : 1}"/>
</g>`
    })
    .join('')
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">${cells}</svg>`
}
