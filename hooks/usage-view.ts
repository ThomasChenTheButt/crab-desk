// The usage view under the Today tile, laid out like Health's charts: a D / W / M / 6M / Y switch,
// a header with the range's average (or the bar under the pointer), the bars with the average as a
// dashed line, and a short highlight. Each part is its own drawing so each can take its own clicks.

import type { Usage } from '../types'

export type Range = 'D' | 'W' | 'M' | '6M' | 'Y'
export const RANGES: Range[] = ['D', 'W', 'M', '6M', 'Y']

const ACCENT = '#d97757'
import { fontStack } from './art'

const font = () => fontStack()
const TITLE = '#f2f2f2'
const DIM = '#9b9b9b'
const GRID = '#333333'
const MONTH = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const WEEKDAY = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export const SEGMENTS_H = 34
export const HEADER_H = 62
export const CHART_H = 168
export const NOTE_H = 40
// The share of the chart's width the bars take; the rest holds the axis labels on the right.
export const PLOT: [number, number] = [0, 0.86]

const escape = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
export const hm = (m: number) => {
  const r = Math.round(m)
  return r >= 60 ? `${Math.floor(r / 60)}h ${r % 60}m` : `${r}m`
}
const key = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n)
const short = (d: Date) => `${MONTH[d.getMonth()]} ${d.getDate()}`
const span = (a: Date, b: Date) =>
  a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear()
    ? `${MONTH[a.getMonth()]} ${a.getDate()}–${b.getDate()}, ${b.getFullYear()}`
    : `${short(a)} – ${short(b)}, ${b.getFullYear()}`

export type Bar = { value: number; axis: string; caption: string }
export type Shaped = {
  bars: Bar[]
  // What the header calls the range's figure, and the figure itself in minutes.
  label: 'TOTAL' | 'AVERAGE'
  figure: number
  caption: string
  // Each bar's value is a total for D, a daily average for 6M and Y, a day's total for W and M.
  barLabel: 'TOTAL' | 'AVERAGE'
  // D only: a usual day's minutes in each hour, drawn faintly behind today's bars.
  usual?: number[]
}

// Today so far against a usual day by this same time, as Health compares steps "by now".
// Early on the usual is tiny, so the gap reads in minutes until it is worth a percentage.
export const versusUsual = (u: Usage) => {
  const usual = u.usualByNow ?? 0
  const gap = u.today - usual
  const isUp = gap >= 0
  if (usual === 0 && u.today === 0) return { badge: undefined, isUp, words: 'Nothing yet today, as usual by now.' }
  if (usual > 0 && Math.abs(gap) <= usual * 0.1) return { badge: '≈ usual', isUp: true, words: `About as much as usual by now (${hm(usual)}).` }
  const badge =
    usual >= 30 ? `${isUp ? '↑' : '↓'}${Math.round((Math.abs(gap) / usual) * 100)}%` : `${isUp ? '+' : '−'}${hm(Math.abs(gap))}`
  const words = `${isUp ? 'More' : 'Less'} than usual by now: ${hm(u.today)} so far, against your usual ${hm(usual)}.`
  return { badge, isUp, words }
}

// Turns the day-by-day record into the bars of one range, ending today.
export const shape = (u: Usage, range: Range, now = new Date()): Shaped => {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const minutesOn = (d: Date) => u.daily[key(d)] ?? 0
  // Averages start at the first day on record, so days before your history began don't dilute them.
  const first = Object.keys(u.daily).filter(k => (u.daily[k] ?? 0) > 0).sort()[0] ?? key(today)
  const meanOf = (days: Date[]) => {
    const counted = days.filter(d => key(d) >= first)
    return counted.length ? counted.reduce((s, d) => s + minutesOn(d), 0) / counted.length : 0
  }

  if (range === 'D') {
    const bars = u.hours.map((m, h) => ({
      value: m,
      axis: h % 6 === 0 ? (h === 0 ? '12a' : h === 12 ? '12p' : h < 12 ? `${h}a` : `${h - 12}p`) : '',
      caption: `${h === 0 ? 12 : h > 12 ? h - 12 : h}${h < 12 ? 'am' : 'pm'} – ${h + 1 === 24 ? 12 : h + 1 > 12 ? h + 1 - 12 : h + 1}${h + 1 < 12 || h + 1 === 24 ? 'am' : 'pm'}`,
    }))
    return { bars, label: 'TOTAL', figure: u.today, caption: `Today, ${short(today)}`, barLabel: 'TOTAL', usual: u.usualHours }
  }

  if (range === 'W' || range === 'M') {
    const count = range === 'W' ? 7 : 30
    const days = Array.from({ length: count }, (_, i) => addDays(today, i - count + 1))
    const bars = days.map((d, i) => ({
      value: minutesOn(d),
      axis: range === 'W' ? WEEKDAY[d.getDay()] ?? '' : i % 7 === 2 ? String(d.getDate()) : '',
      caption: `${WEEKDAY[d.getDay()]}, ${short(d)}`,
    }))
    return {
      bars,
      label: 'AVERAGE',
      figure: meanOf(days),
      caption: span(days[0] ?? today, today),
      barLabel: 'TOTAL',
    }
  }

  if (range === '6M') {
    const weeks = 26
    const bars: Bar[] = []
    const all: Date[] = []
    let lastMonth = -1
    for (let w = weeks - 1; w >= 0; w--) {
      const end = addDays(today, -7 * w)
      const days = Array.from({ length: 7 }, (_, i) => addDays(end, i - 6)).filter(d => d <= today)
      all.push(...days)
      const start = days[0] ?? end
      const isNewMonth = end.getMonth() !== lastMonth
      lastMonth = end.getMonth()
      bars.push({ value: meanOf(days), axis: isNewMonth ? MONTH[end.getMonth()] ?? '' : '', caption: span(start, end) })
    }
    return { bars, label: 'AVERAGE', figure: meanOf(all), caption: span(all[0] ?? today, today), barLabel: 'AVERAGE' }
  }

  const bars: Bar[] = []
  const all: Date[] = []
  for (let m = 11; m >= 0; m--) {
    const first = new Date(today.getFullYear(), today.getMonth() - m, 1)
    const days: Date[] = []
    for (let d = first; d.getMonth() === first.getMonth() && d <= today; d = addDays(d, 1)) days.push(d)
    all.push(...days)
    bars.push({
      value: meanOf(days),
      axis: (MONTH[first.getMonth()] ?? '').slice(0, 1),
      caption: `${MONTH[first.getMonth()]} ${first.getFullYear()}`,
    })
  }
  return { bars, label: 'AVERAGE', figure: meanOf(all), caption: `${short(all[0] ?? today)} – ${short(today)}, ${today.getFullYear()}`, barLabel: 'AVERAGE' }
}

// The switch, like Health's segmented control: the chosen range sits on a lighter pill.
export const segments = (range: Range, W: number) => {
  const pad = 3
  const w = (W - pad * 2) / RANGES.length
  const i = RANGES.indexOf(range)
  const cells = RANGES.map(
    (r, n) =>
      `<text x="${pad + n * w + w / 2}" y="${SEGMENTS_H / 2 + 4.5}" text-anchor="middle" fill="${r === range ? TITLE : DIM}" font-family="${font()}" font-size="12.5" font-weight="${r === range ? 600 : 500}">${r}</text>`,
  ).join('')
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${SEGMENTS_H}" width="${W}" height="${SEGMENTS_H}">
<rect width="${W}" height="${SEGMENTS_H}" rx="${SEGMENTS_H / 2}" fill="#262626"/>
<rect x="${pad + i * w}" y="${pad}" width="${w}" height="${SEGMENTS_H - pad * 2}" rx="${(SEGMENTS_H - pad * 2) / 2}" fill="#4a4a4a"/>
${cells}
</svg>`
}

// The figure above the chart: the range's average or total, or the bar under the pointer.
export const header = (s: Shaped, selected: number | null, W: number) => {
  const bar = selected === null ? undefined : s.bars[selected]
  const label = bar ? s.barLabel : s.label
  const value = bar ? bar.value : s.figure
  const caption = bar ? bar.caption : s.caption
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${HEADER_H}" width="${W}" height="${HEADER_H}">
<text x="2" y="14" fill="${DIM}" font-family="${font()}" font-size="11" font-weight="600" letter-spacing="0.4">${label}</text>
<text x="2" y="42" fill="${TITLE}" font-family="${font()}" font-size="28" font-weight="700" letter-spacing="-0.6">${escape(hm(value))}</text>
<text x="2" y="58" fill="${DIM}" font-family="${font()}" font-size="12" font-weight="500">${escape(caption)}</text>
</svg>`
}

// The bars, Health style: dashed day lines, a scale on the right, the average as a dashed line.
// While a bar is picked the rest dim and a guide drops from the top to it.
export const chart = (s: Shaped, selected: number | null, W: number, isOpening: boolean) => {
  const top = 10
  const bottom = CHART_H - 22
  const plotW = W * PLOT[1]
  const n = s.bars.length
  const slot = plotW / n
  const barW = Math.max(2, slot * (n > 20 ? 0.62 : 0.56))
  const peak = Math.max(1, ...s.bars.map(b => b.value), ...(s.usual ?? []), s.label === 'AVERAGE' ? s.figure : 0)
  // A tidy top for the scale: whole hours where it can.
  const ceiling = peak > 120 ? Math.ceil(peak / 120) * 120 : peak > 60 ? 120 : Math.ceil(peak / 15) * 15
  const yOf = (m: number) => bottom - ((bottom - top) * m) / ceiling
  const gridLines = [0, ceiling / 2, ceiling]
    .map(
      m => `<line x1="0" x2="${plotW}" y1="${yOf(m)}" y2="${yOf(m)}" stroke="${GRID}" stroke-width="1"/>
<text x="${plotW + 6}" y="${yOf(m) + 4}" fill="${DIM}" font-family="${font()}" font-size="10">${m === 0 ? '0' : hm(m)}</text>`,
    )
    .join('')
  const dayLines = n <= 12 ? s.bars.map((_, i) => `<line x1="${i * slot}" x2="${i * slot}" y1="${top}" y2="${bottom + 16}" stroke="${GRID}" stroke-dasharray="2 3"/>`).join('') : ''
  const bars = s.bars
    .map((b, i) => {
      const h = b.value > 0 ? Math.max(2, bottom - yOf(b.value)) : 0
      const x = i * slot + (slot - barW) / 2
      const isPicked = selected === i
      const fade = selected !== null && !isPicked ? 0.35 : 1
      return `<g class="bar" style="animation-delay:${Math.round((i / n) * 260)}ms"><rect x="${x}" y="${bottom - h}" width="${barW}" height="${h}" rx="${Math.min(3, barW / 3)}" fill="${ACCENT}" opacity="${fade}"/></g>
${b.axis ? `<text x="${n <= 12 ? i * slot + 4 : x}" y="${bottom + 15}" fill="${DIM}" font-family="${font()}" font-size="10">${escape(b.axis)}</text>` : ''}`
    })
    .join('')
  const usual = (s.usual ?? [])
    .map((m, i) => {
      const h = m > 0 ? Math.max(2, bottom - yOf(m)) : 0
      const x = i * slot + (slot - barW) / 2
      return h ? `<rect x="${x}" y="${bottom - h}" width="${barW}" height="${h}" rx="${Math.min(3, barW / 3)}" fill="none" stroke="#7a7a7a" stroke-width="1" stroke-dasharray="2 2"/>` : ''
    })
    .join('')
  const guide =
    selected !== null && s.bars[selected]
      ? `<line x1="${selected * slot + slot / 2}" x2="${selected * slot + slot / 2}" y1="${top - 6}" y2="${bottom}" stroke="#8a8a8a" stroke-width="1"/>`
      : ''
  const average =
    s.label === 'AVERAGE' && s.figure > 0
      ? `<line x1="0" x2="${plotW}" y1="${yOf(s.figure)}" y2="${yOf(s.figure)}" stroke="#e8e8e8" stroke-width="1" stroke-dasharray="4 3" opacity="0.8"/>`
      : ''
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${CHART_H}" width="${W}" height="${CHART_H}">
<style>
  .bar { transform-box: fill-box; transform-origin: 50% 100%; ${isOpening ? 'animation: rise 480ms cubic-bezier(0.2, 0.9, 0.25, 1) both;' : ''} }
  @keyframes rise { from { transform: scaleY(0) } to { transform: scaleY(1) } }
  @media (prefers-reduced-motion: reduce) { .bar { animation: none } }
</style>
${gridLines}
${dayLines}
${guide}
${usual}
${bars}
${average}
</svg>`
}

// One plain sentence under the chart, like Health's highlights.
export const note = (u: Usage, W: number, range: Range) => {
  const week = Object.entries(u.daily)
    .filter(([day]) => day >= key(addDays(new Date(), -6)))
    .reduce((s, [, m]) => s + m, 0)
  const sentence =
    range === 'D'
      ? versusUsual(u).words
      : u.average > 0
        ? `You averaged ${hm(week / 7)} a day over the last 7 days.`
        : 'Your averages fill in as you use Claude Code.'
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${NOTE_H}" width="${W}" height="${NOTE_H}">
<text x="2" y="16" fill="${ACCENT}" font-family="${font()}" font-size="11" font-weight="600">${range === 'D' ? 'Compared to usual' : 'Highlight'}</text>
<text x="2" y="33" fill="${TITLE}" font-family="${font()}" font-size="12">${escape(sentence)}</text>
</svg>`
}
