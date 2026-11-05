import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { LiveSession, Project, Usage } from '../types'
import { ACCENT, ROW_H, TILES_H, heading, motion, projectRow, rule, setFont } from './art'
import { sceneTiles } from './tiles'
import { TRIP_S, picture, restSpot, sceneLayout, tripArt, tripSeconds, workSpot } from './scenes'
import type { SceneCrab, Theme } from './scenes'
import { CHART_H, HEADER_H, NOTE_H, PLOT, RANGES, SEGMENTS_H, chart, header as usageHeader, note, segments, shape, versusUsual } from './usage-view'
import type { Range } from './usage-view'
import type { Mood } from './art'

const PANE = 'crab-desk'
const TITLE = "Tuan's Working Terminal"
const STORE_KEY = 'projects'
const DISMISSED_KEY = 'dismissed'
const POLL_MS = 8000
const USAGE_MS = 10 * 60 * 1000
// The desktop sizes a Client's region in rows of its code font, about 19 px each; a click layer
// asks for as many rows as the drawing under it is tall, or it covers only the first line.
const ROW_PX = 19
const rowsFor = (px: number) => Math.max(1, Math.round(px / ROW_PX))
// Session files untouched for longer than this are not read.
const RECENT_MS = 14 * 24 * 60 * 60 * 1000
// A finished chat you haven't replied to counts as waiting on you for this long.
const UNREPLIED_MS = 24 * 60 * 60 * 1000
// Chats in folders that belong to no project (scratch folders included), as the sidebar's "This computer".
const THIS_COMPUTER = 'this-computer'

// Projects to start with on first run; empty, so each person builds their own list.
const SEED: { name: string; folders: string[] }[] = []

// Automatic routine runs: left out unless they are waiting on you.
const ROUTINE = /（每.+天）|（每週|【每週|情報報告|設計雷達|進度照|提醒/

const projects = atom({ plugin: 'crab-desk', key: 'projects' } as const, [])
// Which memos are expanded. Session-only, so every memo starts closed.
const openNotes = atom({ plugin: 'crab-desk', key: 'openNotes' } as const, [])
const isManaging = atom({ plugin: 'crab-desk', key: 'isManaging' } as const, false)
const expanded = atom({ plugin: 'crab-desk', key: 'expanded' } as const, [])
const live = atom({ plugin: 'crab-desk', key: 'live' } as const, [])
const liveError = atom({ plugin: 'crab-desk', key: 'liveError' } as const, '')
const now = atom({ plugin: 'crab-desk', key: 'now' } as const, 0)
const dismissed = atom({ plugin: 'crab-desk', key: 'dismissed' } as const, {})
const pinned = atom({ plugin: 'crab-desk', key: 'pinned' } as const, {})
const scene = atom({ plugin: 'crab-desk', key: 'scene' } as const, 'studio')
// Crabs on their way between Working and Waiting, since their chat finished or you answered it.
const trips = atom({ plugin: 'crab-desk', key: 'trips' } as const, [])
// The longest trip; a trip back to the desk is quicker (tripSeconds).
const TRIP_MS = TRIP_S * 1000
const isUnderWay = (t: { to: 'working' | 'waiting'; at: number }, at: number) => at - t.at < tripSeconds(t.to) * 1000
// Reduce Motion: every crab and scene holds still, and crabs change places without a trip.
const calm = atom({ plugin: 'crab-desk', key: 'calm' } as const, false)
const THEMES: { id: Theme; label: string }[] = [
  { id: 'studio', label: 'Studio' },
  { id: 'ocean', label: 'Ocean' },
  { id: 'camp', label: 'Camp' },
]
const usage = atom({ plugin: 'crab-desk', key: 'usage' } as const, null)
const isUsageOpen = atom({ plugin: 'crab-desk', key: 'isUsageOpen' } as const, false)
const tab = atom({ plugin: 'crab-desk', key: 'tab' } as const, 'projects')
const TABS = ['projects', 'chats', 'working', 'waiting'] as const
const usageRange = atom({ plugin: 'crab-desk', key: 'usageRange' } as const, 'W')
const usagePick = atom({ plugin: 'crab-desk', key: 'usagePick' } as const, null)
const usageRise = atom({ plugin: 'crab-desk', key: 'usageRise' } as const, true)

const norm = (s: string) => s.trim().toLowerCase()
const slug = (name: string) =>
  name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || `p-${Date.now()}`
const folderOf = (cwd: string) => cwd.replace(/\/+$/, '').split('/').pop()?.trim() ?? ''
const isScratch = (cwd: string) => cwd.includes('/scratch-workspaces/')

const ago = (t: number, at: number) => {
  const s = Math.max(0, Math.round((at - t) / 1000))
  if (s < 60) return 'just now'
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  return `${Math.floor(s / 86400)}d ago`
}

const projectFor = (list: Project[], folder: string) =>
  list.find(p => [p.name, ...(p.folders ?? [])].some(f => norm(f) === norm(folder)))

// Every open chat runs its own copy of Crab Desk, so what you change (projects, notes, closed
// chats) lives in shared files that each copy reads fresh: on every refresh, and before every
// change, which is merged into the latest file rather than over it.
const sharedPath = ($: EngineInterface, name: string) =>
  `${$.plugin.root.split('/.claude/')[0]}/.claude/mods-data/crab-desk/${name}.json`

async function readShared<T>($: EngineInterface, name: string): Promise<T | undefined> {
  try {
    return JSON.parse(await $.fs.read(sharedPath($, name))) as T
  } catch {
    return undefined
  }
}

async function writeShared($: EngineInterface, name: string, value: unknown) {
  await $.fs.write(sharedPath($, name), JSON.stringify(value))
}

async function save($: EngineInterface, fn: (list: Project[]) => Project[]) {
  const latest = (await readShared<Project[]>($, 'projects')) ?? (await read($, projects))
  const list = fn(latest)
  await writeShared($, 'projects', list)
  await update($, projects, () => list)
}

// Brings this copy up to date with changes made in other chats.
async function syncShared($: EngineInterface) {
  const [list, closed, pins, settings] = await Promise.all([
    readShared<Project[]>($, 'projects'),
    readShared<Record<string, number>>($, 'closed'),
    readShared<Record<string, number>>($, 'pinned'),
    readShared<{ scene?: Theme }>($, 'settings'),
  ])
  if (list && JSON.stringify(list) !== JSON.stringify(await read($, projects))) await update($, projects, () => list)
  if (closed && JSON.stringify(closed) !== JSON.stringify(await read($, dismissed))) await update($, dismissed, () => closed)
  if (pins && JSON.stringify(pins) !== JSON.stringify(await read($, pinned))) await update($, pinned, () => pins)
  const picked = settings?.scene
  if (picked && THEMES.some(t => t.id === picked) && picked !== (await read($, scene))) await update($, scene, () => picked)
}

// What the app keeps per Code session, in its own session files.
type SessionFile = {
  sessionId?: string
  cliSessionId?: string
  title?: string
  cwd?: string
  isArchived?: boolean
  lastActivityAt?: number
  lastFocusedAt?: number
  lastTurnEdgeAt?: number
  latestUserFrameAt?: number
  turnWrapUp?: { needsUser?: string | null } | null
  interruptedAwaitingPerson?: unknown
}

type Summary = {
  id: string
  cliId: string
  title: string
  cwd: string
  isArchived: boolean
  lastActivityAt: number
  lastUserAt: number
  lastFocusedAt: number
  lastTurnEdgeAt: number
  // You wrote after its last turn edge: a turn is under way.
  isMidTurn: boolean
  // You haven't written since its last turn ended.
  isUnreplied: boolean
  // The question the session's last turn left for you, if you haven't answered it.
  asks: string
}

const summaries = new Map<string, { mtimeMs: number; summary: Summary | undefined }>()
let sessionDirs: string[] | undefined

const summarize = (d: SessionFile): Summary | undefined => {
  if (!d.sessionId || !d.cwd) return undefined
  const answered = (d.latestUserFrameAt ?? 0) > (d.lastTurnEdgeAt ?? 0)
  const question = d.turnWrapUp?.needsUser || (d.interruptedAwaitingPerson ? 'Needs your input' : '')
  return {
    id: d.sessionId,
    cliId: d.cliSessionId ?? '',
    title: d.title || 'Untitled',
    cwd: d.cwd,
    isArchived: Boolean(d.isArchived),
    lastActivityAt: d.lastActivityAt ?? 0,
    lastUserAt: d.latestUserFrameAt ?? 0,
    lastFocusedAt: d.lastFocusedAt ?? 0,
    lastTurnEdgeAt: d.lastTurnEdgeAt ?? 0,
    isMidTurn: answered,
    isUnreplied: !answered,
    asks: answered ? '' : question || '',
  }
}

async function findSessionDirs($: EngineInterface) {
  const home = $.plugin.root.split('/.claude/')[0] ?? ''
  const base = `${home}/Library/Application Support/Claude/claude-code-sessions`
  const dirs: string[] = []
  for (const a of await $.fs.list(base))
    if (a.kind === 'dir')
      for (const b of await $.fs.list(`${base}/${a.name}`))
        if (b.kind === 'dir') dirs.push(`${base}/${a.name}/${b.name}`)
  return dirs
}

async function readSessionFiles($: EngineInterface, at: number, pins: Record<string, number> = {}) {
  sessionDirs ??= await findSessionDirs($)
  const out: Summary[] = []
  for (const dir of sessionDirs) {
    for (const f of await $.fs.list(dir)) {
      if (f.kind !== 'file' || !f.name.startsWith('local_') || !f.name.endsWith('.json')) continue
      // A pinned chat is read however long it has been quiet.
      if (at - f.mtimeMs > RECENT_MS && !Object.keys(pins).some(id => f.name.endsWith(`${id}.json`))) continue
      const path = `${dir}/${f.name}`
      let cached = summaries.get(path)
      if (!cached || cached.mtimeMs !== f.mtimeMs) {
        const summary = await $.fs
          .read(path)
          .then(text => summarize(JSON.parse(text) as SessionFile))
          .catch(() => undefined)
        cached = { mtimeMs: f.mtimeMs, summary }
        summaries.set(path, cached)
      }
      if (cached.summary && !cached.summary.isArchived) out.push(cached.summary)
    }
  }
  return out
}

type ListedSession = { cwd?: string; title?: string; isRunning?: boolean; lastActivityAt?: string }

// Which sessions are mid-turn. The listing hides most ids, so it is matched to the files by folder and time.
// It also leaves out the chat you are looking at, so `listed` says which chats it covered at all.
async function runningKeys($: EngineInterface) {
  const { text = '' } = await $.tool.call({ tool: 'mcp__ccd_session_mgmt__list_sessions', limit: 60 })
  const keys = new Set<string>()
  const listed = new Set<string>()
  for (const r of JSON.parse(text) as ListedSession[]) {
    if (!r.cwd) continue
    const own = [`${r.cwd}|${r.title ?? ''}`, ...(r.lastActivityAt ? [`${r.cwd}|${Date.parse(r.lastActivityAt)}`] : [])]
    for (const k of own) {
      listed.add(k)
      if (r.isRunning) keys.add(k)
    }
  }
  return { keys, listed }
}

// Chats last seen running in the listing, with their turn edge then. While you look at one it drops out
// of the listing, so it stays working until a turn ends in front of you.
const seenRunning = new Map<string, number>()

// Chats whose turn has ended but whose background agents are still at work (scripts/agents.py).
async function backgroundKeys($: EngineInterface) {
  const home = $.plugin.root.split('/.claude/')[0]
  const { exitCode, stdout } = await $.process.run(
    ['python3', '-I', `${$.plugin.root}/scripts/agents.py`, `${home}/.claude/projects`],
    { timeoutMs: 10000 },
  )
  return new Set<string>(exitCode === 0 ? (JSON.parse(stdout) as string[]) : [])
}

// How far each working chat is through its task list (scripts/progress.py).
async function progressOf($: EngineInterface, cliIds: string[]) {
  if (!cliIds.length) return {} as Record<string, LiveSession['progress']>
  const home = $.plugin.root.split('/.claude/')[0]
  const { exitCode, stdout } = await $.process.run(
    ['python3', '-I', `${$.plugin.root}/scripts/progress.py`, `${home}/.claude/projects`, ...cliIds],
    { timeoutMs: 10000 },
  )
  return exitCode === 0 ? (JSON.parse(stdout) as Record<string, LiveSession['progress']>) : {}
}

async function poll($: EngineInterface) {
  const at = Date.now()
  await syncShared($).catch(() => {})
  try {
    const pins = await read($, pinned)
    const [files, running, background] = await Promise.all([
      readSessionFiles($, at, pins),
      runningKeys($),
      backgroundKeys($).catch(() => new Set<string>()),
    ])
    const found: LiveSession[] = []
    const focused = files.reduce<Summary | undefined>((a, s) => (!a || s.lastFocusedAt > a.lastFocusedAt ? s : a), undefined)
    for (const s of files) {
      const keys = [`${s.cwd}|${s.lastActivityAt}`, `${s.cwd}|${s.title}`]
      const isListed = keys.some(k => running.listed.has(k))
      const isListedRunning = keys.some(k => running.keys.has(k))
      if (isListedRunning) seenRunning.set(s.id, s.lastTurnEdgeAt)
      else if (isListed) seenRunning.delete(s.id)
      const isOnScreen = !isListed && s.id === focused?.id && s.lastFocusedAt > 0
      const isPinned = s.id in pins
      const isRunning =
        isListedRunning ||
        background.has(s.cliId) ||
        (isOnScreen && (s.isMidTurn || seenRunning.get(s.id) === s.lastTurnEdgeAt))
      const base = {
        id: s.id,
        title: s.title,
        folder: isScratch(s.cwd) ? '' : folderOf(s.cwd),
        link: `claude://claude.ai/epitaxy/${s.id}`,
        lastActivityAt: s.lastActivityAt,
        lastUserAt: s.lastUserAt,
        asks: s.asks,
        ...(isPinned ? { isPinned } : {}),
      }
      if (isRunning) {
        if (isPinned || !ROUTINE.test(s.title)) found.push({ ...base, kind: 'working' })
      } else if (isPinned || s.asks || (s.isUnreplied && !ROUTINE.test(s.title) && at - s.lastActivityAt < UNREPLIED_MS)) {
        found.push({ ...base, kind: 'waiting' })
      }
    }
    const cliOf = new Map(files.map(s => [s.id, s.cliId]))
    const working = found.filter(s => s.kind === 'working' && cliOf.get(s.id))
    const plans = await progressOf($, working.map(s => cliOf.get(s.id)!)).catch(() => ({}) as Record<string, LiveSession['progress']>)
    for (const s of working) {
      const plan = plans[cliOf.get(s.id)!]
      if (plan && plan.done < plan.total) s.progress = plan
    }
    found.sort((a, b) => b.lastActivityAt - a.lastActivityAt)
    const before = await read($, live)
    await startTrips($, before, found, at)
    if (JSON.stringify(before) !== JSON.stringify(found)) await update($, live, () => found)
    if ((await read($, liveError)) !== '') await update($, liveError, () => '')
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    await update($, liveError, () => `Live chats unavailable: ${message.slice(0, 120)}`)
  }
  await update($, now, () => at)
}

// Closing a chat means you're done with it: it stays out of the panel until you write in it
// again. The app touches a chat's activity time on its own, so that time can't bring it back.
// The app's sidebar is left alone.
async function dismiss($: EngineInterface, s: LiveSession) {
  const latest = (await readShared<Record<string, number>>($, 'closed')) ?? (await read($, dismissed))
  const kept = { ...latest, [s.id]: Date.now() }
  await writeShared($, 'closed', kept)
  await update($, dismissed, () => kept)
  // Closing a pinned chat unpins it too.
  if (s.isPinned) await setPinned($, s.id, false)
}

const without = (r: Record<string, number>, id: string) => Object.fromEntries(Object.entries(r).filter(([k]) => k !== id))

// Pinning a chat keeps it under Waiting until you unpin or close it, even with nothing to answer
// and long after a day: a reminder that you're still on it. Pins are shared like closed chats.
async function setPinned($: EngineInterface, id: string, isPinned: boolean) {
  const latest = (await readShared<Record<string, number>>($, 'pinned')) ?? (await read($, pinned))
  const kept = isPinned ? { ...latest, [id]: Date.now() } : without(latest, id)
  await writeShared($, 'pinned', kept)
  await update($, pinned, () => kept)
  // Pinning brings back a chat you had closed.
  const closed = (await readShared<Record<string, number>>($, 'closed')) ?? (await read($, dismissed))
  if (isPinned && id in closed) {
    const open = without(closed, id)
    await writeShared($, 'closed', open)
    await update($, dismissed, () => open)
  }
}

// A chat whose kind changed since the last look sends its crab across the picture: to the rest half
// when its turn ended, back to its desk when you answered. A closed chat's crab doesn't travel.
async function startTrips($: EngineInterface, before: LiveSession[], found: LiveSession[], at: number) {
  const closed = await read($, dismissed)
  const shown = (list: LiveSession[]) => list.filter(s => !(s.id in closed) || s.lastUserAt > (closed[s.id] ?? 0))
  const was = shown(before)
  const started = shown(found).flatMap(s => {
    const prev = was.find(x => x.id === s.id)
    if (!prev || prev.kind === s.kind) return []
    return [{ id: s.id, to: s.kind, at, fromIndex: was.filter(x => x.kind === prev.kind).indexOf(prev) }]
  })
  if (!started.length) return
  await update($, trips, list => [...list.filter(t => isUnderWay(t, at) && !started.some(n => n.id === t.id)), ...started])
  // A redraw once it's over sits the crab down for good.
  $.clock.after(TRIP_MS + 100, () => void endTrips($))
}

async function endTrips($: EngineInterface) {
  const at = Date.now()
  const list = await read($, trips)
  if (list.some(t => !isUnderWay(t, at))) await update($, trips, l => l.filter(t => isUnderWay(t, at)))
}

// Which scene the Working and Waiting tiles show, the same in every chat.
async function setScene($: EngineInterface, next: Theme) {
  const latest = (await readShared<Record<string, unknown>>($, 'settings')) ?? {}
  await writeShared($, 'settings', { ...latest, scene: next })
  await update($, scene, () => next)
}

async function togglePin($: EngineInterface, s: LiveSession) {
  await setPinned($, s.id, !s.isPinned)
  await update($, live, list => list.map(x => (x.id === s.id ? { ...x, isPinned: !s.isPinned } : x)))
  void poll($)
}

// Today's active time against your own average, from scripts/usage.py over the transcripts.
async function measureUsage($: EngineInterface) {
  try {
    const { exitCode, stdout } = await $.process.run(
      // The history lives outside the mod's folder, which each update replaces.
      ['python3', '-I', `${$.plugin.root}/scripts/usage.py`, `${$.plugin.root.split('/.claude/')[0]}/.claude/mods-data/crab-desk/usage-cache.json`],
      { timeoutMs: 120000 },
    )
    if (exitCode !== 0) return
    const { today, average, daily = {}, hours = [], usualByNow = 0, usualHours = [] } = JSON.parse(stdout) as Usage
    await update($, usage, () => ({ today, average, daily, hours, usualByNow, usualHours }))
  } catch {
    // Leave the last reading in place.
  }
}

// The mod was first built as "project-progress"; its saved projects, notes and closed chats are
// copied over once, the first time it runs under its own name.
async function adoptOldStore($: EngineInterface) {
  if ((await $.store.get(STORE_KEY)) !== undefined) return
  try {
    const home = $.plugin.root.split('/.claude/')[0] ?? ''
    const dir = `${home}/.claude/plugins/store`
    const old = (await $.fs.list(dir)).find(f => f.name.startsWith('project-progress_inline-'))
    if (!old) return
    const saved = JSON.parse(await $.fs.read(`${dir}/${old.name}`)) as { projects?: unknown; dismissed?: unknown }
    if (saved.projects) await $.store.set(STORE_KEY, saved.projects)
    if (saved.dismissed) await $.store.set(DISMISSED_KEY, saved.dismissed)
  } catch {
    // Nothing to adopt; start from the seed list.
  }
}

async function openSession($: EngineInterface, s: LiveSession) {
  try {
    const { exitCode } = await $.process.run(['open', s.link])
    if (exitCode !== 0) throw new Error(`open exited ${exitCode}`)
  } catch {
    await $.ui.toast(`Couldn't open “${s.title}”. Open it from the sidebar.`)
  }
}

// Whether to hold everything still: the Motion setting says so, or it follows macOS's Reduce Motion
// (System Settings → Accessibility → Display), read again every minute.
async function checkCalm($: EngineInterface, choice: string) {
  let isCalm = choice === 'Calm'
  if (choice !== 'Calm' && choice !== 'Full') {
    const { exitCode, stdout } = await $.process.run(['defaults', 'read', 'com.apple.universalaccess', 'reduceMotion'], { timeoutMs: 3000 })
    isCalm = exitCode === 0 && stdout.trim() === '1'
  }
  if (isCalm !== (await read($, calm))) await update($, calm, () => isCalm)
}

export const register: Register = (on, options) => {
  setFont(typeof options.font === 'string' ? options.font : 'System')
  const motionChoice = typeof options.motion === 'string' ? options.motion : 'Follow macOS'

  on('session.start', async ($, e, next) => {
    // The shared files win; the mod's own store (and the older "project-progress" one) only seed
    // them the first time.
    await adoptOldStore($)
    const stored =
      (await readShared<Project[]>($, 'projects')) ?? ((await $.store.get(STORE_KEY)) as Project[] | undefined)
    const list: Project[] = stored
      ? stored.map(p => (p.folders ? p : { ...p, folders: SEED.find(s => s.name === p.name)?.folders ?? [p.name] }))
      : SEED.map(s => ({ id: slug(s.name), name: s.name, progress: 0, note: '', isShown: true, folders: s.folders }))
    if (!list.some(p => p.id === THIS_COMPUTER))
      list.push({ id: THIS_COMPUTER, name: 'This computer', progress: 0, note: '', isShown: true, folders: [] })
    await writeShared($, 'projects', list)
    await update($, projects, () => list)
    const closed =
      (await readShared<Record<string, number>>($, 'closed')) ??
      (((await $.store.get(DISMISSED_KEY)) ?? {}) as Record<string, number>)
    await writeShared($, 'closed', closed)
    await update($, dismissed, () => closed)
    const pins = (await readShared<Record<string, number>>($, 'pinned')) ?? {}
    await update($, pinned, () => pins)
    const picked = (await readShared<{ scene?: Theme }>($, 'settings'))?.scene
    if (picked && THEMES.some(t => t.id === picked)) await update($, scene, () => picked)

    await $.command.register({
      name: 'terminal',
      description: "Open Tuan's Working Terminal: your projects and the chats that need you",
    })
    await $.command.register({ name: 'crab-desk', description: "Open Tuan's Working Terminal (its old name)" })
    await $.command.register({
      name: 'wait',
      description: "Pin this chat under Waiting in Tuan's Working Terminal, to remind you you're still on it; again to unpin",
    })
    void $.ui.open({ id: PANE, title: TITLE })

    void checkCalm($, motionChoice)
    $.clock.every(60 * 1000, () => void checkCalm($, motionChoice))
    void poll($)
    $.clock.every(POLL_MS, () => void poll($))
    void measureUsage($)
    $.clock.every(USAGE_MS, () => void measureUsage($))

    return next(e)
  })

  on('command.run', { command: /^(terminal|crab-desk)$/ }, async $ => {
    await $.ui.open({ id: PANE, title: TITLE })
    void poll($)

    return { text: "Tuan's Working Terminal opened." }
  })

  // Typed in a chat, /wait pins that chat under Waiting; typed again, it unpins it.
  on('command.run', { command: /^wait$/ }, async $ => {
    const cliId = await $.session.id()
    const pins = (await readShared<Record<string, number>>($, 'pinned')) ?? (await read($, pinned))
    const mine = (await readSessionFiles($, Date.now(), pins)).find(s => s.cliId === cliId)
    if (!mine) return { text: "Couldn't find this chat among the app's Code chats, so nothing was pinned." }
    const isPinned = !(mine.id in pins)
    await setPinned($, mine.id, isPinned)
    void poll($)
    return {
      text: isPinned
        ? "Pinned under Waiting in Tuan's Working Terminal. Type /wait again to unpin it."
        : 'Unpinned: it leaves Waiting once nothing in it needs you.',
    }
  })

  // A click on a chat row's layer (hit.tsx) opens that chat.
  on('ui.message', async ($, e) => {
    const data = e.data as { open?: unknown; unpin?: unknown; toggle?: unknown; usage?: unknown; index?: unknown; tabs?: unknown; scene?: unknown } | null
    // A pinned row's pin, clicked: pull it out.
    if (typeof data?.unpin === 'string') {
      const s = (await read($, live)).find(x => x.id === data.unpin)
      if (s?.isPinned) await togglePin($, s)
      return {}
    }
    // A count tile: open its tab, or go back to all projects when it is already open.
    // The picture: its Working half or its Waiting half, as a count tile.
    if (data?.scene === true && typeof data.index === 'number') {
      const picked = data.index === 0 ? 'working' : 'waiting'
      await update($, tab, now => (now === picked ? 'projects' : picked))
      return {}
    }
    if (data?.tabs === true && typeof data.index === 'number') {
      const picked = TABS[data.index] ?? 'projects'
      await update($, tab, now => (now === picked ? 'projects' : picked))
      return {}
    }
    // The usage view's switch and chart: pick a range, or follow the pointer across the bars.
    if (data?.usage === 'range' && typeof data.index === 'number') {
      const next = RANGES[data.index]
      if (next && next !== (await read($, usageRange))) {
        await update($, usageRange, () => next)
        await update($, usagePick, () => null)
        await update($, usageRise, () => true)
      }
      return {}
    }
    if (data?.usage === 'scrub') {
      const index = typeof data.index === 'number' ? data.index : null
      await update($, usageRise, () => false)
      if (index !== (await read($, usagePick))) await update($, usagePick, () => index)
      return {}
    }
    if (data?.toggle === 'usage') {
      await update($, isUsageOpen, v => !v)
      await update($, usagePick, () => null)
      await update($, usageRise, () => true)
      // Fresh numbers each time the view opens.
      if (await read($, isUsageOpen)) void measureUsage($)
      return {}
    }
    const id = data?.open
    if (typeof id !== 'string') return {}
    const s = (await read($, live)).find(x => x.id === id)
    if (s) await openSession($, s)
    return {}
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const els = $.ui.resolve(e)
    const { Box, Text, Button } = els
    const Input = 'Input' in els ? els.Input : undefined
    const Svg = 'Svg' in els ? els.Svg : undefined
    const Client = 'Client' in els ? els.Client : undefined
    const list = await read($, projects)
    const notesOpen = await read($, openNotes)
    const managing = await read($, isManaging)
    const open = await read($, expanded)
    const closed = await read($, dismissed)
    const sessions = (await read($, live)).filter(s => !(s.id in closed) || s.lastUserAt > (closed[s.id] ?? 0))
    const error = await read($, liveError)
    const at = (await read($, now)) || Date.now()
    // The desktop counts the pane's width in its code font's characters, about 8.8 px each (measured).
    const columns = 'bodyColumns' in e.props ? e.props.bodyColumns : 40
    const paneW = Math.max(280, Math.min(760, Math.round(columns * 8.8)))
    const rowW = paneW - 26
    const chatW = paneW - 24 - 60

    const toggle = (id: string) =>
      update($, expanded, ids => (ids.includes(id) ? ids.filter(x => x !== id) : [...ids, id]))
    const toggleNote = (id: string) =>
      update($, openNotes, ids => (ids.includes(id) ? ids.filter(x => x !== id) : [...ids, id]))

    const header = (
      <Box flexDirection="row" justifyContent="space-between" alignItems="center">
        <Text bold>{managing ? 'Choose projects' : 'Projects'}</Text>
        <Button key="manage" plain dimColor onPress={() => update($, isManaging, v => !v)}>
          {managing ? 'Done' : 'Edit list'}
        </Button>
      </Box>
    )

    if (managing) {
      return (
        <Box flexDirection="column" gap={1}>
          {header}
          {list.map(p => (
            <Box key={`row-${p.id}`} flexDirection="column" gap={1} paddingY={1}>
              <Box flexDirection="row" justifyContent="space-between" alignItems="center">
                <Text bold dimColor={!p.isShown}>{p.name}</Text>
                <Box flexDirection="row" gap={1}>
                  <Button
                    key={`show-${p.id}`}
                    variant={p.isShown ? 'primary' : 'secondary'}
                    onPress={() =>
                      save($, l => l.map(x => (x.id === p.id ? { ...x, isShown: !x.isShown } : x)))
                    }
                  >
                    {p.isShown ? 'Shown' : 'Hidden'}
                  </Button>
                  <Button
                    key={`remove-${p.id}`}
                    dimColor
                    onPress={() => save($, l => l.filter(x => x.id !== p.id))}
                  >
                    Remove
                  </Button>
                </Box>
              </Box>
              {Input && (
                <Input
                  key={`folders-${p.id}`}
                  label="Folders"
                  placeholder="folder names, comma separated"
                  value={(p.folders ?? []).join(', ')}
                  submitLabel="set"
                  onSubmit={v => {
                    const folders = v.split(',').map(f => f.trim()).filter(Boolean)
                    void save($, l => l.map(x => (x.id === p.id ? { ...x, folders } : x)))
                  }}
                />
              )}
            </Box>
          ))}
          {Input && (
            <Input
              key="add-project"
              placeholder="Add a project…"
              submitLabel="add"
              value=""
              onSubmit={v => {
                const name = v.trim()
                if (!name) return
                void save($, l =>
                  l.some(x => x.name === name)
                    ? l
                    : [...l, { id: slug(name), name, progress: 0, note: '', isShown: true, folders: [name] }],
                )
              }}
            />
          )}
        </Box>
      )
    }

    const shown = list.filter(p => p.isShown)
    const byProject = new Map<string, LiveSession[]>()
    for (const s of sessions) {
      const p = s.folder ? projectFor(shown, s.folder) : undefined
      const id = p?.id ?? THIS_COMPUTER
      byProject.set(id, [...(byProject.get(id) ?? []), s])
    }
    for (const group of byProject.values())
      group.sort((a, b) =>
        a.kind === b.kind ? b.lastActivityAt - a.lastActivityAt : a.kind === 'waiting' ? -1 : 1,
      )

    const openTab = await read($, tab)
    const usageOpen = await read($, isUsageOpen)
    const range = (await read($, usageRange)) as Range
    const pick = await read($, usagePick)
    const rise = await read($, usageRise)
    const countsW = Math.round(rowW * 0.48)
    const todayW = rowW - countsW - 8
    const used = await read($, usage)
    const hm = (m: number) => (m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${m}m`)
    const vs = used ? versusUsual(used) : undefined
    const today = {
      label: 'Today',
      value: used ? hm(used.today) : '…',
      badge: vs?.badge,
      note: used ? `usual by now ${hm(used.usualByNow)}` : undefined,
      isUp: vs?.isUp ?? true,
    }
    const working = sessions.filter(s => s.kind === 'working').length
    const waiting = sessions.filter(s => s.kind === 'waiting').length
    // Working and Waiting are scenes: one crab per chat, in the place the scene switch picks.
    const theme = await read($, scene)
    // The Today tile's sky follows the clock: the sun by day, the moon by night.
    const clock = new Date()
    const hour = clock.getHours() + clock.getMinutes() / 60
    // A crab on a trip keeps its old place free until it gets there, and isn't drawn at its new one yet.
    const drawnAt = Date.now()
    const isCalm = await read($, calm)
    const moving = isCalm ? [] : (await read($, trips)).filter(t => isUnderWay(t, drawnAt) && sessions.some(s => s.id === t.id && s.kind === t.to))
    const half = (kind: LiveSession['kind']) => {
      const mine = sessions.filter(s => s.kind === kind)
      const crabs: SceneCrab[] = mine.map(s => ({ asks: s.asks !== '', pinned: Boolean(s.isPinned), away: moving.some(t => t.id === s.id) }))
      const ids = mine.map(s => s.id)
      for (const t of moving.filter(t => t.to !== kind)) {
        const at = Math.max(0, Math.min(t.fromIndex, crabs.length))
        crabs.splice(at, 0, { away: true })
        ids.splice(at, 0, `from:${t.id}`)
      }
      return { crabs, ids }
    }
    const workHalf = half('working')
    const restHalf = half('waiting')
    const lay = sceneLayout(theme, workHalf.crabs.length, restHalf.crabs.length, rowW)
    // While a crab sets off for a break, the ones still at work wave it off.
    const leaving = moving.filter(t => t.to === 'waiting').map(t => (drawnAt - t.at) / 1000)
    if (leaving.length) for (const c of workHalf.crabs) if (!c.away) c.wave = Math.min(...leaving)
    const tripsArt = moving
      .map((t, key) => {
        const isOut = t.to === 'waiting'
        const desk = workSpot(theme, workHalf.ids.indexOf(isOut ? `from:${t.id}` : t.id), workHalf.crabs.length, lay.workW)
        const seat = restSpot(theme, restHalf.ids.indexOf(isOut ? t.id : `from:${t.id}`), restHalf.crabs.length, lay.restW)
        const label = sessions.find(s => s.id === t.id)?.title
        return tripArt(theme, { to: t.to, e: (drawnAt - t.at) / 1000, desk, seat: { x: seat.x + lay.workW, fy: seat.fy }, bx: lay.workW, W: lay.workW + lay.restW, label, key })
      })
      .join('')
    const sceneSelected = openTab === 'working' || openTab === 'waiting' ? openTab : null

    const chatLine = (s: LiveSession) =>
      [
        s.kind === 'waiting' ? s.asks || (s.isPinned ? 'pinned · still on your plate' : 'waiting on your reply') : s.progress?.step || 'working',
        ago(s.lastActivityAt, at),
      ].join(' · ')

    // A working chat with a task list: ✓ ✓ ● ○ ○  step 3 of 5 · ~6 min left. The time is a guess from how
    // long its done steps took, so it shows only once a step has finished.
    const barLine = (s: LiveSession) => {
      const p = s.progress
      if (!p) return undefined
      const trail = Array.from({ length: p.total }, (_, i) => (i < p.done ? '✓' : i === p.done ? '●' : '○')).join(' ')
      const left = p.minutesLeft == null ? '' : ` · ~${p.minutesLeft < 60 ? `${p.minutesLeft} min` : hm(p.minutesLeft)} left`
      return `${trail}  step ${Math.min(p.done + 1, p.total)} of ${p.total}${left}`
    }

    // The whole chat row opens the chat; Pin keeps it under Waiting; ✕ hides it from the panel. On the desktop an
    // invisible layer (hit.tsx) lies over the drawn row and turns any click on it into a message.
    const chat = (s: LiveSession) => (
      <Box key={`live-${s.id}`} flexDirection="row" alignItems="center" gap={1}>
        {Client ? (
          // The row is drawn by the click layer itself: the engine sizes an overlay in text rows and
          // squeezed one laid over a picture to its first line.
          <Box key={`row-${s.id}`} flexGrow={1}>
            <Client
              key={`hit-${s.id}`}
              module="./hit.tsx"
              props={{
                message: { open: s.id },
                unpin: { unpin: s.id },
                row: { mark: s.kind === 'working' ? '◉' : '●', markColor: ACCENT, title: s.title, line: chatLine(s), ...(s.progress ? { bar: barLine(s) } : {}), isPinned: Boolean(s.isPinned) },
              }}
              width="100%"
            />
          </Box>
        ) : (
          <Box flexDirection="column">
            <Button key={`open-${s.id}`} label={s.isPinned ? `📌 ${s.title}` : s.title} plain onPress={() => openSession($, s)} />
            <Text dimColor>{chatLine(s)}</Text>
            {s.progress ? <Text color={ACCENT}>{barLine(s)}</Text> : null}
          </Box>
        )}
        {/* Pinning: a dim pin to press in. A pinned row shows its pin in its own corner, so only a
            surface with no click layer keeps the button to pull it out. */}
        {(!s.isPinned || !Client) && <Button key={`pin-${s.id}`} label="📌" plain dimColor={!s.isPinned} onPress={() => togglePin($, s)} />}
        <Button key={`close-${s.id}`} label="✕" plain dimColor onPress={() => dismiss($, s)} />
      </Box>
    )

    const chatList = (list: LiveSession[]) =>
      list.map((s, i) => (
        <Box key={`chat-${s.id}`} flexDirection="column">
          {i > 0 && Svg && <Svg source={rule(chatW + 30)} alt="" width={chatW + 30} height={9} />}
          {chat(s)}
        </Box>
      ))

    // A project sits under Waiting if any chat waits on you and under Working if any chat runs,
    // both at once when it has both; it is asleep only when it has no live chat at all.
    const chatsOf = (p: Project, mood: Mood) =>
      mood === 'sleeping' ? [] : (byProject.get(p.id) ?? []).filter(s => s.kind === mood)
    const isIn = (p: Project, mood: Mood) =>
      mood === 'sleeping' ? (byProject.get(p.id) ?? []).length === 0 : chatsOf(p, mood).length > 0

    const card = (p: Project, mood: Mood) => {
      const mine = chatsOf(p, mood)
      const slot = `${mood}-${p.id}`
      // Waiting cards start open, so a chat that needs you is one click away; so does every card
      // in the Working or Waiting tab. Show / Hide flips a card from where it starts.
      const isOpen = open.includes(slot) !== (mood === 'waiting' || openTab === mood)
      // A working card carries its chat's task-list progress on its own bar, so it shows while closed.
      // With several chats it follows the one with the most left to do.
      const plans = mine.map(s => s.progress).filter(p => p != null)
      // Two or more working chats race: one crab per chat on one track. One chat walks its step trail.
      const isRace = mood === 'working' && mine.length > 1 && plans.length > 0
      const plan = [...plans].sort((a, b) => a.done / a.total - b.done / b.total)[0]
      // The time left is until the slowest chat is done, when the whole project is free again.
      const minutes = plans.reduce<number | null>((most, p) => (p.minutesLeft == null ? most : Math.max(most ?? 0, p.minutesLeft)), null)
      const left = minutes == null ? '' : ` · ~${minutes < 60 ? `${minutes} min` : hm(minutes)} left`
      const line =
        mood === 'sleeping'
          ? 'asleep'
          : `${mine.length} ${mood === 'waiting' ? 'waiting on you' : 'working'}${
              isRace ? left : plan ? ` · step ${Math.min(plan.done + 1, plan.total)} of ${plan.total}${left}` : ''
            }`
      const art = isRace
        ? {
            racers: mine.map(s => ({
              frac: s.progress ? s.progress.done / s.progress.total : 0,
              label: s.progress ? `${s.title}: step ${Math.min(s.progress.done + 1, s.progress.total)} of ${s.progress.total}` : `${s.title}: no task list`,
              hasPlan: Boolean(s.progress),
            })),
          }
        : plan
          ? { steps: { done: plan.done, total: plan.total, label: plan.step } }
          : {}
      const noteOpen = notesOpen.includes(slot)
      return (
        <Box key={`card-${slot}`} flexDirection="column">
          <Box flexDirection="row" alignItems="center">
            {Svg ? (
              <Svg
                key={`card-art-${slot}`}
                source={motion(projectRow({ name: p.name, line, mood, width: rowW, ...art }), isCalm)}
                alt={`${p.name}: ${line}`}
                width={rowW}
                height={ROW_H}
                isInteractive
              />
            ) : (
              <Text>
                <Text bold>{p.name}</Text> <Text dimColor>{line}</Text>
              </Text>
            )}
            <Button key={`expand-${slot}`} label={isOpen ? 'Hide ▴' : 'Show ▾'} variant="secondary" onPress={() => toggle(slot)} />
          </Box>
          {isOpen && (
            <Box flexDirection="column" paddingLeft={3}>
              {mine.length === 0 && <Text dimColor>No live chats.</Text>}
              {chatList(mine)}
              <Box flexDirection="row" gap={2} alignItems="center">
                <Button
                  key={`memo-${slot}`}
                  label={noteOpen ? 'Memo ▾' : 'Memo ▸'}
                  plain
                  dimColor={!noteOpen}
                  onPress={() => toggleNote(slot)}
                />
              </Box>
              {noteOpen && Input && (
                <Input
                  key={`note-${slot}`}
                  placeholder="Notes for this project…"
                  rows={4}
                  value={p.note}
                  submitLabel="save"
                  onInput={v => void save($, l => l.map(x => (x.id === p.id ? { ...x, note: v } : x)))}
                  onSubmit={v => void save($, l => l.map(x => (x.id === p.id ? { ...x, note: v } : x)))}
                />
              )}
              {noteOpen && !Input && <Text dimColor>{p.note || 'No notes yet.'}</Text>}
            </Box>
          )}
        </Box>
      )
    }

    // Grouped by what the project needs: waiting on you first, then working, then asleep.
    const groups: { mood: Mood; label: string }[] = [
      { mood: 'waiting', label: 'Waiting on you' },
      { mood: 'working', label: 'Working' },
      { mood: 'sleeping', label: 'Asleep' },
    ]

    return (
      <Box flexDirection="column" gap={1}>
        {Svg ? (
          <Box flexDirection="row" gap={1}>
            {/* The count tiles are tabs; Working and Waiting are the scenes below. */}
            <Box key="count-tabs" position="relative">
              <Svg
                source={motion(sceneTiles(theme, [
                  { kind: 'projects', count: shown.length, label: 'Projects', value: String(shown.length), isSelected: openTab === 'projects' },
                  { kind: 'chats', count: sessions.length, label: 'Chats', value: String(sessions.length), isSelected: openTab === 'chats' },
                ], countsW, hour), isCalm)}
                alt={`${shown.length} projects, ${sessions.length} chats, ${working} working, ${waiting} waiting on you`}
                width={countsW}
                height={TILES_H}
              />
              {Client && (
                <Box position="absolute" top={0} left={0} right={0} height={rowsFor(TILES_H)}>
                  <Client key="hit-tabs" module="./hit.tsx" props={{ rows: rowsFor(TILES_H), message: { tabs: true }, slots: 2 }} width="100%" height={rowsFor(TILES_H)} />
                </Box>
              )}
            </Box>
            {/* The Today tile opens and closes the usage view below it. */}
            <Box key="today-tile" position="relative">
              <Svg
                source={motion(sceneTiles(theme, [{ ...today, kind: 'today', label: usageOpen ? 'Today ▴' : 'Today ▾' }], todayW, hour), isCalm)}
                alt={`${today.label} ${today.value} ${today.badge ?? ''}`}
                width={todayW}
                height={TILES_H}
              />
              {Client && (
                <Box position="absolute" top={0} left={0} right={0} height={rowsFor(TILES_H)}>
                  <Client key="hit-usage" module="./hit.tsx" props={{ rows: rowsFor(TILES_H), message: { toggle: 'usage' } }} width="100%" height={rowsFor(TILES_H)} />
                </Box>
              )}
            </Box>
          </Box>
        ) : (
          <Box flexDirection="row" justifyContent="space-between">
            <Text dimColor>
              {sessions.length} chats · {working} working · {waiting} waiting on you
            </Text>
            <Button key="usage" label={`Today ${today.value} ${today.badge ?? ''}`} plain dimColor onPress={() => update($, isUsageOpen, v => !v)} />
          </Box>
        )}
        {usageOpen && used && (() => {
          const shaped = shape(used, range)
          const layer = (key: string, props: unknown, px: number) =>
            Client && (
              <Box position="absolute" top={0} left={0} right={0} bottom={0}>
                <Client key={key} module="./hit.tsx" props={{ ...(props as object), rows: rowsFor(px) }} width="100%" height={rowsFor(px)} />
              </Box>
            )
          if (!Svg)
            return (
              <Box flexDirection="column">
                <Text dimColor>
                  {range} · {shaped.label === 'AVERAGE' ? 'average' : 'total'} {Math.round(shaped.figure)}m · {shaped.caption}
                </Text>
                <Box flexDirection="row" gap={1}>
                  {RANGES.map((r, i) => (
                    <Button key={`range-${r}`} label={r} plain dimColor={r !== range} onPress={() => void (async () => {
                      await update($, usageRange, () => RANGES[i] ?? 'W')
                      await update($, usagePick, () => null)
                    })()} />
                  ))}
                </Box>
              </Box>
            )
          return (
            <Box key="usage-view" flexDirection="column" gap={1}>
              <Box key="usage-switch" position="relative">
                <Svg source={segments(range, rowW)} alt={`Range: ${range}`} width={rowW} height={SEGMENTS_H} />
                {layer('hit-range', { message: { usage: 'range' }, slots: RANGES.length }, SEGMENTS_H)}
              </Box>
              <Svg source={usageHeader(shaped, pick, rowW)} alt={`${shaped.label} ${Math.round(shaped.figure)} minutes, ${shaped.caption}`} width={rowW} height={HEADER_H} />
              <Box key="usage-chart" position="relative">
                <Svg source={chart(shaped, pick, rowW, rise)} alt={`${shaped.bars.length} bars`} width={rowW} height={CHART_H} isInteractive />
                {layer(`hit-chart-${range}`, { message: { usage: 'scrub' }, slots: shaped.bars.length, plot: PLOT, scrub: true }, CHART_H)}
              </Box>
              <Svg source={note(used, rowW, range)} alt={range === 'D' ? versusUsual(used).words : 'Highlight'} width={rowW} height={NOTE_H} />
            </Box>
          )
        })()}
        {Svg && (
          // One picture, Working on the left and Waiting on the right; each half opens its tab, as a
          // count tile does. The click layer splits at the seam: two slots over twice the left half.
          <Box key="scenes" flexDirection="column">
            <Box key="scene-picture" position="relative">
              <Svg
                source={motion(picture(theme, workHalf.crabs, restHalf.crabs, lay, sceneSelected, tripsArt), isCalm)}
                alt={`Working: ${working} crabs at work. Waiting: ${waiting} crabs waiting on you`}
                width={lay.workW + lay.restW}
                height={lay.H}
              />
              {Client && (
                <Box position="absolute" top={0} left={0} right={0} height={rowsFor(lay.H)}>
                  <Client key="hit-scenes" module="./hit.tsx" props={{ rows: rowsFor(lay.H), message: { scene: true }, slots: 2, plot: [0, (2 * lay.workW) / (lay.workW + lay.restW)] }} width="100%" height={rowsFor(lay.H)} />
                </Box>
              )}
            </Box>
            {/* The scene switch: the same crabs in another place. */}
            <Box key="scene-switch" flexDirection="row" gap={1} justifyContent="flex-end">
              <Text dimColor>Scene</Text>
              {THEMES.map(t => (
                <Button key={`scene-${t.id}`} label={t.label} plain dimColor={t.id !== theme} onPress={() => setScene($, t.id)} />
              ))}
            </Box>
          </Box>
        )}
        {header}
        {error !== '' && <Text dimColor>{error}</Text>}
        {shown.length === 0 && <Text dimColor>No projects shown. Use Edit list to pick some.</Text>}
        {openTab === 'chats' && (
          <Box key="all-chats" flexDirection="column">
            {Svg ? <Svg source={heading(`Every live chat · ${sessions.length}`, rowW)} alt="Every live chat" width={rowW} height={24} /> : <Text dimColor>Every live chat</Text>}
            {sessions.length === 0 && <Text dimColor>No live chats right now.</Text>}
            {chatList([...sessions].sort((a, b) => (a.kind === b.kind ? b.lastActivityAt - a.lastActivityAt : a.kind === 'waiting' ? -1 : 1)))}
          </Box>
        )}
        {openTab !== 'chats' && groups.filter(g => openTab === 'projects' || g.mood === openTab).map(g => {
          const members = shown.filter(p => isIn(p, g.mood))
          if (members.length === 0) return null
          const label = `${g.label} · ${members.length}`
          return (
            <Box key={`group-${g.mood}`} flexDirection="column">
              {Svg ? <Svg source={heading(label, rowW)} alt={label} width={rowW} height={24} /> : <Text dimColor>{label}</Text>}
              {members.map(p => card(p, g.mood))}
            </Box>
          )
        })}
      </Box>
    )
  })
}
