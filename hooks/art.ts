// The pane's drawings, as SVG strings: the pet, project rows, session rows and the tiles.

export const ACCENT = '#d97757'
const SYSTEM_FONT = `-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Helvetica Neue', 'PingFang TC', sans-serif`
let FONT = SYSTEM_FONT

// The font setting: any font installed on this Mac, falling back to the system font for anything it lacks.
export const setFont = (name: string) => {
  FONT = !name || name === 'System' ? SYSTEM_FONT : `'${name.replace(/'/g, '')}', ${SYSTEM_FONT}`
}
export const fontStack = () => FONT
const TITLE = '#f2f2f2'
const DIM = '#9b9b9b'
const RULE = '#2f2f2f'

// The width every drawing takes unless the pane says otherwise.
export const ROW_W = 300
export const ROW_H = 60
export const CHAT_H = 36
export const TILES_H = 58

export type Mood = 'working' | 'waiting' | 'sleeping'

export const escape = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

// Cuts text to roughly `cols` Latin columns, counting CJK as two.
export const fit = (s: string, cols: number) => {
  let used = 0
  let out = ''
  for (const ch of s) {
    const w = /[⺀-￯]/.test(ch) ? 2 : 1
    if (used + w > cols - 1) return `${out}…`
    used += w
    out += ch
  }
  return out
}

const px = (x: number, y: number, w = 1, h = 1) =>
  `<rect x="${x}" y="${y}" width="${w + 0.02}" height="${h + 0.02}"/>`

// The Claude crab on a 13 x 7 grid, placed inside a 20 x 12 box.
const BODY = [px(2, 0, 9, 5), px(0, 2, 2, 2), px(11, 2, 2, 2)].join('')
const BODY_NO_RIGHT_ARM = [px(2, 0, 9, 5), px(0, 2, 2, 2)].join('')
const LEGS = [px(3, 5, 1, 2), px(5, 5, 1, 2), px(7, 5, 1, 2), px(9, 5, 1, 2)].join('')
const LEGS_SHORT = [px(3, 5), px(5, 5), px(7, 5), px(9, 5)].join('')
const EYES = `<g fill="#1a1a1a">${px(4, 1, 1, 2)}${px(8, 1, 1, 2)}</g>`
const EYES_SHUT = `<g fill="#1a1a1a">${px(3.6, 2.2, 1.8, 0.5)}${px(7.6, 2.2, 1.8, 0.5)}</g>`
const SLEEPY = '#9c6a57'

const box = (inner: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 12" width="44" height="26" shape-rendering="crispEdges">${inner}</svg>`
// Ties every endless loop in a drawing to the wall clock. SMIL starts a picture's clock when it
// loads, so without this each redraw (a row's minutes left ticking down, a crab arriving) started
// every loop over and the walking crab jumped back to the start of its track. A loop's own `begin`
// stays as its offset. With `isCalm` (Reduce Motion) each loop is held on its last frame instead.
export const motion = (svg: string, isCalm = false) => {
  const T = Date.now() / 1000
  return svg.replace(/<(animate|animateTransform)\b([^>]*?)\/>/g, (tag, name: string, attrs: string) => {
    if (!attrs.includes('repeatCount="indefinite"')) return tag
    const dur = parseFloat(attrs.match(/\sdur="([\d.]+)s"/)?.[1] ?? '')
    if (!dur) return tag
    const offset = parseFloat(attrs.match(/\sbegin="(-?[\d.]+)s"/)?.[1] ?? '0')
    const rest = attrs.replace(/\sbegin="[^"]*"/, '')
    return isCalm
      ? `<${name}${rest.replace(' repeatCount="indefinite"', '')} begin="-3600s" fill="freeze"/>`
      : `<${name}${rest} begin="${(-((((T - offset) % dur) + dur) % dur)).toFixed(2)}s"/>`
  })
}

const blink = (dur: string, values: string) =>
  `<animate attributeName="opacity" values="${values}" dur="${dur}" calcMode="discrete" repeatCount="indefinite"/>`

// The designs picked on the Pet Picker page.
// Working ("Typing"): taps away at a tiny laptop while lines of code blink on its screen.
// Waiting ("Question bubble"): a speech bubble with a "?" pops up beside it, over and over.
// Sleeping ("Nightcap"): dimmed, eyes shut, in a floppy blue nightcap, with a bubble that grows and shrinks.
export const pet = (mood: Mood) => {
  if (mood === 'working') {
    return box(`<g transform="translate(0.5,5)">
  <g fill="${ACCENT}">${BODY_NO_RIGHT_ARM}${LEGS_SHORT}
    <g>${px(11, 2, 2, 1)}${blink('0.3s', '1;0')}</g>
    <g opacity="0">${px(11, 3, 2, 1)}${blink('0.3s', '0;1')}</g>
  </g>${EYES}
</g>
<rect x="13" y="4" width="6" height="4.2" fill="#3a3a3a"/>
<rect x="13.6" y="4.6" width="4.8" height="3" fill="#121212"/>
<rect x="12.4" y="8.2" width="7.2" height="0.9" fill="#5a5a5a"/>
<g transform="translate(14.1,5.1)"><rect width="3.6" height="0.5" fill="${ACCENT}"><animateTransform attributeName="transform" type="scale" values="0.17 1;0.33 1;0.5 1;0.67 1;0.83 1;1 1" calcMode="discrete" dur="1.2s" repeatCount="indefinite"/></rect></g>
<g transform="translate(14.1,6.2)"><rect width="3" height="0.5" fill="#6fbf8e"><animateTransform attributeName="transform" type="scale" values="0.2 1;0.4 1;0.6 1;0.8 1;1 1;1 1" calcMode="discrete" dur="1.2s" repeatCount="indefinite"/></rect></g>`)
  }

  if (mood === 'waiting') {
    return box(`<g transform="translate(1.5,4)"><g fill="${ACCENT}">${BODY}${LEGS}</g>${EYES}</g>
<g transform="translate(16.5,2.4)"><g>
  <animateTransform attributeName="transform" type="scale" values="1;1;0.2;1.1;1" keyTimes="0;0.6;0.75;0.9;1" dur="2s" repeatCount="indefinite"/>
  <rect x="-2.6" y="-2.2" width="5.2" height="4" rx="1.2" fill="#f2f2f2"/>
  <path d="M-1.2 1.6 L-2.4 3 L0 1.6Z" fill="#f2f2f2"/>
  <text x="0" y="1" text-anchor="middle" font-family="${FONT}" font-size="3.4" font-weight="800" fill="${ACCENT}">?</text>
</g></g>`)
  }

  return box(`<g transform="translate(3.5,4)">
  <g fill="${SLEEPY}">${BODY}${LEGS_SHORT}</g>${EYES_SHUT}
  <path d="M3 0 L10 0 L13 -3.2 L6 -2.4Z" fill="#5b6fb5"/>
  <circle cx="13.3" cy="-3.2" r="0.9" fill="#f2f2f2"/>
</g>
<circle cx="16.2" cy="7.2" r="1" fill="#bcd3ea" fill-opacity="0.65" stroke="#e6f0fa" stroke-width="0.2"><animate attributeName="r" values="0.3;1.6;0.3" dur="3s" repeatCount="indefinite"/></circle>`)
}

// A project row, as the Agents pane draws an agent: pet, bold name, dim line, thin bar, dot.
export const projectRow = (o: {
  name: string
  line: string
  mood: Mood
  width?: number
  // Its working chat's task list, when it has one: drawn as a trail of crabs, one per step.
  steps?: { done: number; total: number; label: string }
  // Several working chats: one crab each on a single track, placed by how far its chat has got.
  racers?: { frac: number; label: string; hasPlan: boolean }[]
}) => {
  const W = o.width ?? ROW_W
  const H = ROW_H
  const barX = 56
  const barW = W - barX - 26
  const dot =
    o.mood === 'waiting'
      ? `<circle cx="${W - 10}" cy="14" r="4" fill="${ACCENT}"/>`
      : o.mood === 'working'
        ? `<circle cx="${W - 10}" cy="14" r="4.5" fill="none" stroke="${ACCENT}" stroke-width="1.4" opacity="0.5"/><circle cx="${W - 10}" cy="14" r="2" fill="${ACCENT}"/>`
        : `<circle cx="${W - 10}" cy="14" r="3.5" fill="#5c5c5c"/>`
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">
<svg x="0" y="11" width="50" height="30">${pet(o.mood).replace(/^<svg[^>]*>/, '<svg viewBox="0 0 20 12" shape-rendering="crispEdges">')}</svg>
<text x="${barX}" y="18" fill="${TITLE}" font-family="${FONT}" font-size="13.5" font-weight="700">${escape(fit(o.name, Math.floor((W - 90) / 8)))}</text>
<text x="${barX}" y="34" fill="${DIM}" font-family="${FONT}" font-size="11.5">${escape(fit(o.line, Math.floor((W - 90) / 6.4)))}</text>
${
  // The bar only shows while a chat works: its task list as crabs, or one crab walking the track.
  o.mood === 'working'
    ? o.racers
      ? crabRace(o.racers, barX, barW)
      : o.steps
      ? crabTrail(o.steps, barX, barW)
      : crabWalk(barX, barW)
    : ''
}
${dot}
<rect x="0" y="${H - 1}" width="${W}" height="1" fill="${RULE}"/>
</svg>`
}

// A task list as a trail of little crabs: orange for steps done, one scuttling on the current
// step, grey for the steps ahead, joined by a line; the current step's name follows the trail.
const crabTrail = (o: { done: number; total: number; label: string }, x0: number, room: number) => {
  // Crabs grow up to twice the grid while the trail still leaves room for the step's name.
  const k = Math.max(1.1, Math.min(2, (room * 0.62 - (o.total - 1) * 5) / (o.total * 13)))
  const w = 13 * k
  const gap = Math.max(3, Math.min(9, (room * 0.62 - o.total * w) / Math.max(1, o.total - 1)))
  const y = 53 - 7 * k
  const mid = y + 2.5 * k
  const parts: string[] = []
  for (let i = 0; i < o.total; i++) {
    const x = x0 + i * (w + gap)
    if (i > 0) parts.push(`<rect x="${x - gap + 1}" y="${mid}" width="${gap - 2}" height="1.4" fill="${i <= o.done ? ACCENT : '#3a3a3a'}"/>`)
    const at = `translate(${x},${y}) scale(${k})`
    if (i < o.done) parts.push(`<g transform="${at}" fill="${ACCENT}">${BODY}${LEGS_SHORT}</g>`)
    else if (i === o.done)
      parts.push(`<g transform="${at}"><g fill="${ACCENT}">
  <animateTransform attributeName="transform" type="translate" values="-0.6,0;0.6,0" dur="0.36s" calcMode="discrete" repeatCount="indefinite"/>
  ${BODY}<g>${LEGS}${blink('0.36s', '1;0')}</g><g>${LEGS_SHORT}${blink('0.36s', '0;1')}</g>
</g>${EYES}</g>`)
    else parts.push(`<g transform="${at}" fill="#4a4a4a">${BODY}${LEGS_SHORT}</g>`)
  }
  const end = x0 + o.total * (w + gap) - gap + 8
  const cols = Math.floor((x0 + room - end) / 6.2)
  if (o.label && cols > 4)
    parts.push(`<text x="${end}" y="${y + 4 * k + 3}" fill="${TITLE}" font-family="${FONT}" font-size="11">${escape(fit(o.label, cols))}</text>`)
  return `<g shape-rendering="crispEdges">${parts.join('')}</g>`
}

// A working chat with no task list: one crab scuttling along a dotted track, end to end and back.
const crabWalk = (x0: number, room: number) => {
  const k = 1.5
  const w = 13 * k
  const track = 52
  const y = track - 7 * k
  const far = x0 + room - w
  const dur = Math.max(4, room / 45).toFixed(1)
  return `<g shape-rendering="crispEdges">
<line x1="${x0}" y1="${track}" x2="${x0 + room}" y2="${track}" stroke="#4a4a4a" stroke-width="1.4" stroke-dasharray="2 3"/>
<g><animateTransform attributeName="transform" type="translate" values="${x0},${y};${far},${y};${x0},${y}" keyTimes="0;0.5;1" calcMode="spline" keySplines="0.45 0 0.55 1;0.45 0 0.55 1" dur="${dur}s" repeatCount="indefinite"/>
<g transform="scale(${k})"><g fill="${ACCENT}">${BODY}<g>${LEGS}${blink('0.36s', '1;0')}</g><g>${LEGS_SHORT}${blink('0.36s', '0;1')}</g></g>${EYES}</g></g>
</g>`
}

// Several chats at once as a race: a dotted track to a finish flag, one scuttling crab per chat
// at how far its chat has got. A chat with no task list waits, dimmed, at the start. Crabs that
// would overlap stand on alternate heights. Hovering a crab names its chat.
const crabRace = (racers: { frac: number; label: string; hasPlan: boolean }[], x0: number, room: number) => {
  const k = 1.5
  const w = 13 * k
  const len = room - 22
  const track = 52
  const base = track - 7 * k
  const flagX = x0 + len + 8
  const parts = [
    `<line x1="${x0}" y1="${track}" x2="${flagX}" y2="${track}" stroke="#4a4a4a" stroke-width="1.4" stroke-dasharray="2 3"/>`,
    `<g transform="translate(${flagX},${track - 18.2}) scale(1.3)">${px(0, 0, 1, 14).replace('<rect', `<rect fill="${DIM}"`)}<g fill="${TITLE}">${px(1, 0, 8, 5)}</g><g fill="#1a1a1a">${px(1, 0, 2, 2)}${px(5, 0, 2, 2)}${px(3, 2, 2, 2)}${px(7, 2, 2, 2)}</g></g>`,
  ]
  const placed: { x: number; up: boolean }[] = []
  ;[...racers]
    .sort((a, b) => a.frac - b.frac)
    .forEach((r, i) => {
      const x = x0 + r.frac * (len - w)
      const near = placed.find(p => Math.abs(p.x - x) < w)
      const up = near ? !near.up : false
      placed.push({ x, up })
      const y = base - (up ? 5 : 0)
      const legs = r.hasPlan
        ? `<g>${LEGS}${blink('0.36s', '1;0')}</g><g>${LEGS_SHORT}${blink('0.36s', '0;1')}</g>`
        : LEGS_SHORT
      const shuffle = r.hasPlan
        ? `<animateTransform attributeName="transform" type="translate" values="-0.6,0;0.6,0" dur="${0.3 + (i % 3) * 0.06}s" calcMode="discrete" repeatCount="indefinite"/>`
        : ''
      parts.push(`<g transform="translate(${x},${y}) scale(${k})" opacity="${r.hasPlan ? 1 : 0.45}"><title>${escape(r.label)}</title><g fill="${ACCENT}">${shuffle}${BODY}${legs}</g>${EYES}</g>`)
    })
  return `<g shape-rendering="crispEdges">${parts.join('')}</g>`
}

// A chat's subtitle, smaller and dimmer than its title.
export const caption = (text: string, W: number) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} 16" width="${W}" height="16"><text x="0" y="11" fill="${DIM}" font-family="${FONT}" font-size="11">${escape(fit(text, Math.floor(W / 6)))}</text></svg>`

// A thin line between two chats.
export const rule = (W: number) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} 9" width="${W}" height="9"><rect x="0" y="4" width="${W}" height="1" fill="#3a3a3a"/></svg>`

// The dot beside a live chat: a ringed dot while it works, solid while it waits on you.
export const chatDot = (kind: 'working' | 'waiting') =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 14 14" width="14" height="14">${
    kind === 'waiting'
      ? `<circle cx="7" cy="7" r="4" fill="${ACCENT}"/>`
      : `<circle cx="7" cy="7" r="4.5" fill="none" stroke="${ACCENT}" stroke-width="1.4" opacity="0.5"/><circle cx="7" cy="7" r="2" fill="${ACCENT}"/>`
  }</svg>`

// A live chat under its project: a dot, the title, and a dim line.
export const sessionRow = (o: { title: string; line: string; kind: 'working' | 'waiting'; width?: number }) => {
  const W = o.width ?? ROW_W - 40
  const H = CHAT_H
  const dot =
    o.kind === 'waiting'
      ? `<circle cx="7" cy="11" r="4" fill="${ACCENT}"/>`
      : `<circle cx="7" cy="11" r="4.5" fill="none" stroke="${ACCENT}" stroke-width="1.4" opacity="0.5"/><circle cx="7" cy="11" r="2" fill="${ACCENT}"/>`
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">
${dot}
<text x="18" y="15" fill="${TITLE}" font-family="${FONT}" font-size="12.5" font-weight="600">${escape(fit(o.title, Math.floor((W - 24) / 7.6)))}</text>
<text x="18" y="30" fill="${DIM}" font-family="${FONT}" font-size="11">${escape(fit(o.line, Math.floor((W - 24) / 6.2)))}</text>
</svg>`
}

export type Tile = { label: string; value: string; badge?: string; note?: string; isUp?: boolean; isSelected?: boolean }

// The row of number tiles; a tile may carry a badge (Today's change against your average) and a note.
export const tiles = (items: Tile[], W = ROW_W) => {
  const gap = 6
  const w = (W - gap * (items.length - 1)) / items.length
  const cells = items
    .map(
      (t, i) => `<g transform="translate(${i * (w + gap)},0)">
  <rect width="${w}" height="${TILES_H}" rx="10" fill="${t.isSelected ? '#3a3a3a' : '#262626'}"${t.isSelected ? ` stroke="${ACCENT}" stroke-opacity="0.7"` : ''}/>
  <text x="9" y="17" fill="${DIM}" font-family="${FONT}" font-size="10.5">${escape(t.label)}</text>
  ${t.badge ? `<text x="${w - 8}" y="17" text-anchor="end" fill="${t.isUp ? '#6fbf8e' : ACCENT}" font-family="${FONT}" font-size="10.5" font-weight="700">${escape(t.badge)}</text>` : ''}
  <text x="9" y="${t.note ? 36 : 40}" fill="${TITLE}" font-family="${FONT}" font-size="${t.value.length > 4 ? 13.5 : 17}" font-weight="700">${escape(t.value)}</text>
  ${t.note ? `<text x="9" y="50" fill="${DIM}" font-family="${FONT}" font-size="9.5">${escape(t.note)}</text>` : ''}
</g>`,
    )
    .join('')
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${TILES_H}" width="${W}" height="${TILES_H}">${cells}</svg>`
}

export const heading = (text: string, W = ROW_W) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} 24" width="${W}" height="24"><text x="0" y="16" fill="${DIM}" font-family="${FONT}" font-size="12.5">${escape(text)}</text></svg>`

