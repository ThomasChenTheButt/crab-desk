import { expect, test } from 'claude-code/testing'

const PANE = {
  plugin: 'crab-desk',
  component: 'Pane',
  requestId: 'crab-desk',
  props: {
    title: 'Crab Desk',
    isFocused: false,
    bodyColumns: 40,
    placement: 'dock',
    scroll: { offset: 0, bodyRows: 60 },
    view: {},
  },
} as const

const t = Date.now() - 3 * 60 * 1000

// The desktop loads an Svg's source as an image file, which must be well-formed XML: one tag left
// open, or closed as </rect/>, and the whole picture fails to load.
const isWellFormed = (svg: string) => {
  const open: string[] = []
  for (const [, close, name, self] of svg.matchAll(/<(\/?)([a-zA-Z][\w:-]*)[^>]*?(\/?)>/g)) {
    if (close && self) return false
    if (close) {
      if (open.pop() !== name) return false
    } else if (!self) open.push(name!)
  }
  return open.length === 0
}

let n = 0
const file = (id: string, title: string, cwd: string, extra: object = {}) => {
  const at = t + ++n
  return { sessionId: id, title, cwd, isArchived: false, lastActivityAt: at, lastTurnEdgeAt: at, latestUserFrameAt: at - 1000, ...extra }
}

const FILES: ReturnType<typeof file>[] = [
  file('s-work', 'Lesson cut', '/Users/x/Desktop/client site '),
  file('s-ask', 'Hero redesign', '/Users/x/Desktop/photo blog', { turnWrapUp: { needsUser: 'Which one should I build?' } }),
  file('s-unreplied', 'Game landing page', '/Users/x/puzzle game', { turnWrapUp: null }),
  file('s-old', 'Old unreplied', '/Users/x/puzzle game', { lastActivityAt: t - 5 * 86400000, cliSessionId: 'cli-old' }),
  file('s-answered', 'Answered already', '/Users/x/Desktop/habit tracker', { turnWrapUp: { needsUser: 'OK?' }, latestUserFrameAt: t + 5000 }),
  file('s-blog-work', 'Hero animation', '/Users/x/Desktop/photo blog'),
  file('s-routine', 'AI 情報報告（每兩天）', '/Users/x/Desktop/photo blog'),
  // Its turn is over, but its background agents are still at work.
  file('s-bg', 'Landing variants', '/Users/x/puzzle game', { turnWrapUp: null, cliSessionId: 'cli-bg' }),
  file('s-scratch', 'Quick script', '/Users/x/Library/Application Support/Claude/scratch-workspaces/a/b/scratch-1'),
]

// The listing hides ids, as the app's does: running sessions are told apart by folder and time.
const LISTED = FILES.filter(f => ['s-work', 's-blog-work', 's-routine', 's-scratch'].includes(f.sessionId)).map(f => ({
  sessionId: '[REDACTED]', title: f.title, cwd: f.cwd, isRunning: true, lastActivityAt: new Date(f.lastActivityAt).toISOString(),
}))

test('live sessions sit under their project, memos stay hidden until opened', async ($, on) => {
  on('command.register', () => ({ value: { command: 'crab-desk' } }))
  on('ui.open', () => ({ value: { isPlaced: true } }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('clock.every', () => ({ value: undefined }))
  on('clock.after', () => ({ value: undefined }))
  // The chat /wait is typed in.
  on('session.id', () => ({ value: 'cli-old' }))
  const store = new Map<string, unknown>()
  on('store.get', (_, e) => ({ value: store.get(e.key) }))
  on('store.set', (_, e) => {
    store.set(e.key, e.value)
    return { value: undefined }
  })
  const opened: string[] = []
  on('process.run', (_, e) => {
    const argv = (e as { argv?: readonly string[] }).argv ?? []
    if (argv[0] === 'python3' && String(argv[2]).endsWith('agents.py'))
      return { value: { exitCode: 0, stdout: '["cli-bg"]', stderr: '', isStdoutTruncated: false, isStderrTruncated: false } }
    if (argv[0] === 'python3' && String(argv[2]).endsWith('progress.py'))
      return { value: { exitCode: 0, stdout: JSON.stringify({ 'cli-bg': { done: 2, total: 5, step: 'Render round 4', minutesLeft: 6 } }), stderr: '', isStdoutTruncated: false, isStderrTruncated: false } }
    if (argv[0] === 'python3')
      return { value: { exitCode: 0, stdout: JSON.stringify({ today: 275, average: 380, days: 15, daily: { '2026-10-27': 160, '2026-10-28': 275 }, hours: Array.from({ length: 24 }, (_, h) => (h === 15 ? 30 : 0)), usualByNow: 250, usualHours: Array.from({ length: 24 }, () => 15) }), stderr: '', isStdoutTruncated: false, isStderrTruncated: false } }
    opened.push(argv.join(' '))
    return { value: { exitCode: 0, stdout: '', stderr: '', isStdoutTruncated: false, isStderrTruncated: false } }
  })
  on('tool.call', () => ({ result: {}, text: JSON.stringify(LISTED) }))
  on('fs.list', (_, e) => {
    const path = (e as { path?: string }).path ?? ''
    if (path.endsWith('claude-code-sessions')) return { value: [{ name: 'org', kind: 'dir', size: 0, mtimeMs: 0, isLink: false }] }
    if (path.endsWith('/org')) return { value: [{ name: 'acct', kind: 'dir', size: 0, mtimeMs: 0, isLink: false }] }
    return { value: FILES.map(f => ({ name: `local_${f.sessionId}.json`, kind: 'file', size: 1, mtimeMs: f.lastActivityAt, isLink: false })) }
  })
  // Files every chat's copy of Crab Desk shares, by name (projects, closed).
  const shared = new Map<string, unknown>()
  // Example projects, as someone would have added them in the panel.
  shared.set('projects', ['budget app', 'photo blog', 'habit tracker', 'client site', 'puzzle game'].map(name => ({
    id: name.replace(/ /g, '-'), name, progress: 0, note: '', isShown: true, folders: [name],
  })))
  const sharedName = (path: string) => /mods-data\/crab-desk\/(\w+)\.json$/.exec(path)?.[1]
  on('fs.read', (_, e) => {
    const path = (e as { path?: string }).path ?? ''
    const name = sharedName(path)
    if (name) {
      if (!shared.has(name)) throw new Error('ENOENT')
      return { value: JSON.stringify(shared.get(name)) }
    }
    const f = FILES.find(x => path.endsWith(`local_${x.sessionId}.json`))
    return { value: JSON.stringify(f) }
  })
  on('fs.write', (_, e) => {
    const { path = '', text = '' } = e as { path?: string; text?: string }
    const name = sharedName(path)
    if (name) shared.set(name, JSON.parse(text))
    return { value: undefined }
  })

  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })
  await $.command.run({ command: 'crab-desk', args: '', origin: { kind: 'user' }, presentation: 'typed' } as never)

  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await $.ui.mount({ ...PANE, surface })
    expect(await ui.find({ type: 'Input', key: 'note-working-client-site' })).toBeUndefined()
    expect(await ui.find({ type: 'Button', key: 'open-s-work' })).toBeUndefined()
    expect(await ui.find({ type: 'Button', key: 'expand-working-client-site' })).toBeDefined()
    await ui.unmount()
  }

  const ui = await $.ui.mount({ ...PANE, surface: 'desktop' })
  const counts = await ui.find({ type: 'Svg' })
  // The Today tile: 4h 35m so far against a 6h 20m average is 28% under. Clicking it opens the usage view.
  expect(await ui.find({ type: 'Client', key: 'hit-usage' })).toBeDefined()
  await ui.pointer({ type: 'up', x: 1, y: 0, button: 'left', in: 'hit-usage' })
  expect(await ui.find({ type: 'Box', key: 'usage-view' })).toBeDefined()
  // The count tiles are tabs: unlaid-out, a click lands mid-row, on Chats (the second of two).
  await ui.pointer({ type: 'up', x: 0, y: 0, button: 'left', in: 'hit-tabs' })
  expect(await ui.find({ type: 'Box', key: 'all-chats' })).toBeDefined()
  await ui.pointer({ type: 'up', x: 0, y: 0, button: 'left', in: 'hit-tabs' })
  expect(await ui.find({ type: 'Box', key: 'all-chats' })).toBeUndefined()
  // So is the picture's Working half, on the left. Unlaid-out in a test the click layer is one column
  // wide, and a click lands half a column past its x: -0.4 is near the left edge, 1 past the right.
  const onWorking = { type: 'up', x: -0.4, y: 0, button: 'left', in: 'hit-scenes' } as const
  const onWaiting = { type: 'up', x: 1, y: 0, button: 'left', in: 'hit-scenes' } as const
  await ui.pointer(onWorking)
  expect(await ui.find({ type: 'Client', key: 'hit-s-work' })).toBeDefined()
  expect(await ui.find({ type: 'Button', key: 'expand-waiting-photo-blog' })).toBeUndefined()
  await ui.pointer(onWorking)
  expect(await ui.find({ type: 'Button', key: 'expand-waiting-photo-blog' })).toBeDefined()
  // The switch picks a range (W by default); the chart follows the pointer across its bars.
  expect(await ui.find({ type: 'Client', key: 'hit-chart-W' })).toBeDefined()
  // Unlaid-out in a test, the click lands mid-switch: M.
  await ui.pointer({ type: 'up', x: 0, y: 0, button: 'left', in: 'hit-range' })
  expect(await ui.find({ type: 'Client', key: 'hit-chart-M' })).toBeDefined()
  expect(await ui.find({ type: 'Client', key: 'hit-chart-W' })).toBeUndefined()
  await ui.pointer({ type: 'move', x: 0, y: 1, in: 'hit-chart-M' })
  await ui.pointer({ type: 'leave', x: 0, y: 1, in: 'hit-chart-M' })
  await ui.pointer({ type: 'up', x: 1, y: 0, button: 'left', in: 'hit-usage' })
  expect(await ui.find({ type: 'Box', key: 'usage-view' })).toBeUndefined()
  expect(String(counts?.props.alt)).toContain('4 working, 2 waiting on you')
  // The scenes: one crab at work per working chat, one resting per chat waiting on you.
  const sceneArt = async () => (await ui.findAll({ type: 'Svg' })) as { props: { alt?: unknown; source?: unknown } }[]
  expect((await sceneArt()).every(a => isWellFormed(String(a.props.source)))).toBe(true)
  const alts = (await sceneArt()).map(a => String(a.props.alt))
  expect(alts).toContain('Working: 4 crabs at work. Waiting: 2 crabs waiting on you')
  // The scene switch moves the crabs to another place, in every chat.
  expect((await sceneArt()).some(a => String(a.props.source).includes('cd-w'))).toBe(true)
  await ui.press({ key: 'scene-ocean' })
  expect((await sceneArt()).some(a => String(a.props.source).includes('cd-o'))).toBe(true)
  expect((shared.get('settings') as { scene?: string }).scene).toBe('ocean')
  // Each scene opens its tab, and again goes back to every project.
  await ui.pointer(onWaiting)
  expect(await ui.find({ type: 'Button', key: 'expand-waiting-photo-blog' })).toBeDefined()
  expect(await ui.find({ type: 'Button', key: 'expand-working-photo-blog' })).toBeUndefined()
  await ui.pointer(onWaiting)
  expect(await ui.find({ type: 'Button', key: 'expand-working-photo-blog' })).toBeDefined()
  // Scratch sessions go under Other; routine runs and finished ones don't show.
  // Chats outside any project sit under "This computer", grouped like any project.
  await ui.press({ key: 'expand-working-this-computer' })
  expect(await ui.find({ type: 'Client', key: 'hit-s-scratch' })).toBeDefined()
  expect(await ui.find({ type: 'Client', key: 'hit-s-routine' })).toBeUndefined()

  // One project can sit under Waiting and Working at once, each card holding its own chats.
  expect(await ui.find({ type: 'Button', key: 'expand-working-photo-blog' })).toBeDefined()
  expect(await ui.find({ type: 'Button', key: 'expand-sleeping-photo-blog' })).toBeUndefined()
  // Waiting cards start open.
  expect(await ui.find({ type: 'Client', key: 'hit-s-blog-work' })).toBeUndefined()
  expect(await ui.find({ type: 'Client', key: 'hit-s-ask' })).toBeDefined()
  // Pressing the row itself opens the chat in the app.
  await ui.pointer({ type: 'up', x: 3, y: 0, button: 'left', in: 'hit-s-ask' })
  expect(opened).toContain('open claude://claude.ai/epitaxy/s-ask')
  await ui.press({ key: 'expand-sleeping-habit-tracker' })
  expect(await ui.find({ type: 'Client', key: 'hit-s-answered' })).toBeUndefined()
  // A finished chat you haven't replied to is waiting on you, not quiet; an old one is.
  expect(await ui.find({ type: 'Client', key: 'hit-s-unreplied' })).toBeDefined()
  expect(await ui.find({ type: 'Client', key: 'hit-s-old' })).toBeUndefined()
  expect(await ui.find({ type: 'Client', key: 'hit-s-bg' })).toBeUndefined()
  // A closed working card already shows its chat's progress.
  const arts = (await ui.findAll({ type: 'Svg' })) as { props: { alt?: unknown } }[]
  expect(arts.map(a => String(a.props.alt))).toContain('puzzle game: 1 working · step 3 of 5 · ~6 min left')
  await ui.press({ key: 'expand-working-puzzle-game' })
  const bg = await ui.find({ type: 'Client', key: 'hit-s-bg' })
  expect(bg).toBeDefined()
  // A working chat with a task list shows how far along it is and a rough time left.
  const row = (bg?.props.props as { row: { line: string; bar?: string } }).row
  expect(row.line).toContain('Render round 4')
  expect(row.bar).toBe('✓ ✓ ● ○ ○  step 3 of 5 · ~6 min left')
  // Hide closes a waiting card.
  await ui.press({ key: 'expand-waiting-puzzle-game' })
  expect(await ui.find({ type: 'Client', key: 'hit-s-unreplied' })).toBeUndefined()
  await ui.press({ key: 'expand-waiting-puzzle-game' })

  // Closing a chat hides it from the panel and the counts, and keeps it hidden.
  await ui.press({ key: 'close-s-unreplied' })
  expect(await ui.find({ type: 'Client', key: 'hit-s-unreplied' })).toBeUndefined()
  expect(String((await ui.find({ type: 'Svg' }))?.props.alt)).toContain('4 working, 1 waiting on you')
  expect(Object.keys((shared.get('closed') ?? {}) as object)).toContain('s-unreplied')

  // A chat closed in another window disappears here on the next refresh.
  await ui.press({ key: 'expand-working-photo-blog' })
  expect(await ui.find({ type: 'Client', key: 'hit-s-blog-work' })).toBeDefined()
  shared.set('closed', { ...(shared.get('closed') as object), 's-blog-work': Date.now() })
  await $.command.run({ command: 'crab-desk', args: '', origin: { kind: 'user' }, presentation: 'typed' } as never)
  expect(await ui.find({ type: 'Client', key: 'hit-s-blog-work' })).toBeUndefined()

  // The app touching a closed chat's activity time doesn't bring it back; writing in it does.
  const closed = FILES.find(f => f.sessionId === 's-unreplied')!
  closed.lastActivityAt += 60_000
  await $.command.run({ command: 'crab-desk', args: '', origin: { kind: 'user' }, presentation: 'typed' } as never)
  expect(await ui.find({ type: 'Client', key: 'hit-s-unreplied' })).toBeUndefined()
  closed.lastActivityAt += 60_000
  closed.latestUserFrameAt = Date.now() + 1000
  closed.lastTurnEdgeAt = Date.now() + 2000
  await $.command.run({ command: 'crab-desk', args: '', origin: { kind: 'user' }, presentation: 'typed' } as never)
  expect(await ui.find({ type: 'Client', key: 'hit-s-unreplied' })).toBeDefined()

  await ui.press({ key: 'expand-working-client-site' })
  expect(await ui.find({ type: 'Client', key: 'hit-s-work' })).toBeDefined()
  await ui.press({ key: 'memo-working-client-site' })
  await ui.input({ key: 'note-working-client-site', text: 'ship v2 deck' })
  expect((await ui.find({ type: 'Input', key: 'note-working-client-site' }))?.text).toBe('ship v2 deck')
  await ui.press({ key: 'memo-working-client-site' })
  expect(await ui.find({ type: 'Input', key: 'note-working-client-site' })).toBeUndefined()

  const saved = shared.get('projects') as { id: string; progress: number; note: string }[]
  const p = saved.find(x => x.id === 'client-site')
  expect(p?.note).toBe('ship v2 deck')

  // The listing leaves out the chat you are looking at; a working chat stays working while you watch it.
  const countsNow = async () => String((await ui.find({ type: 'Svg' }))?.props.alt)
  const before = await countsNow()
  const work = FILES.find(f => f.sessionId === 's-work')! as ReturnType<typeof file> & { lastFocusedAt?: number }
  // Opening it rewrites its file (the mod re-reads a file when its time changes).
  work.lastFocusedAt = Date.now()
  work.lastActivityAt += 1
  LISTED.splice(LISTED.findIndex(r => r.title === work.title), 1)
  await $.command.run({ command: 'crab-desk', args: '', origin: { kind: 'user' }, presentation: 'typed' } as never)
  expect(await countsNow()).toBe(before)
  // Its turn ending in front of you lets it go.
  work.lastTurnEdgeAt += 10_000
  work.lastActivityAt += 1
  await $.command.run({ command: 'crab-desk', args: '', origin: { kind: 'user' }, presentation: 'typed' } as never)
  expect(await countsNow()).not.toBe(before)
  // Its crab sets off across the picture for the Waiting half, waved off by the crabs still at work.
  const scenePicture = async () => String((await sceneArt()).map(a => a.props.source).find(src => String(src).includes('cd-whole')))
  expect(await scenePicture()).toContain('class="trip"')
  expect(await scenePicture()).toContain('<set attributeName="opacity" to="1"')
  // The trip can't be missed: the picture dims around it, and the chat's name rides over the crab.
  expect(await scenePicture()).toContain('mask="url(#cd-trip-0-m)"')
  expect(await scenePicture()).toContain('✓ Lesson cut')
  // Its work done, small fireworks go up over the room; decoration that steps aside for reduced motion.
  expect(await scenePicture()).toContain('class="cd-fx"')
  expect(await scenePicture()).toContain('prefers-reduced-motion')
  expect(isWellFormed(await scenePicture())).toBe(true)

  // /wait typed in a chat pins it under Waiting: it stays with nothing to answer, long after a day.
  const run = (command: string) => $.command.run({ command, args: '', origin: { kind: 'user' }, presentation: 'typed' } as never)
  expect(await ui.find({ type: 'Client', key: 'hit-s-old' })).toBeUndefined()
  const said = await run('wait')
  expect(String((said as { text?: string }).text)).toContain('Pinned')
  await run('crab-desk')
  const old = await ui.find({ type: 'Client', key: 'hit-s-old' })
  expect((old?.props.props as { row: { line: string } } | undefined)?.row.line).toContain('pinned')
  expect(Object.keys(shared.get('pinned') as object)).toContain('s-old')
  // Quiet for weeks, a pinned chat still shows.
  FILES.find(f => f.sessionId === 's-old')!.lastActivityAt -= 20 * 86400000
  await run('crab-desk')
  expect(await ui.find({ type: 'Client', key: 'hit-s-old' })).toBeDefined()
  // A pinned row wears its pin in its corner, with no pin button; clicking the pin pulls it out.
  expect((old?.props.props as { row: { isPinned?: boolean } } | undefined)?.row.isPinned).toBe(true)
  expect(await ui.find({ type: 'Button', key: 'pin-s-old' })).toBeUndefined()
  await ui.pointer({ type: 'up', x: 0, y: 0, button: 'left', in: 'hit-s-old' })
  await run('crab-desk')
  expect(await ui.find({ type: 'Client', key: 'hit-s-old' })).toBeUndefined()
  // Pin on a row pins that chat; closing a pinned chat unpins it.
  await ui.press({ key: 'pin-s-ask' })
  expect(Object.keys(shared.get('pinned') as object)).toContain('s-ask')
  await ui.press({ key: 'close-s-ask' })
  expect(Object.keys(shared.get('pinned') as object)).not.toContain('s-ask')
  await ui.unmount()
})
