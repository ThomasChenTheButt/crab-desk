import { expect, test } from 'claude-code/testing'
import { sceneTiles } from '../hooks/tiles'

// The desktop loads each tile row as an image file, so every tag must close.
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

test('the Projects, Chats and Today tiles are drawn in every scene, by day and by night', () => {
  for (const theme of ['studio', 'ocean', 'camp'] as const)
    for (const hour of [3, 6.5, 12, 18, 23.9])
      for (const n of [0, 1, 6, 40]) {
        const counts = sceneTiles(theme, [
          { kind: 'projects', count: n, label: 'Projects', value: String(n), isSelected: true },
          { kind: 'chats', count: n, label: 'Chats', value: String(n) },
        ], 187, hour)
        const today = sceneTiles(theme, [{ kind: 'today', label: 'Today ▾', value: '1h 15m', badge: '↓68%', note: 'usual by now 3h 55m' }], 195, hour)
        expect(isWellFormed(counts)).toBe(true)
        expect(isWellFormed(today)).toBe(true)
        expect(counts).not.toContain('NaN')
        expect(today).not.toContain('NaN')
        expect(today).toContain('↓68%')
      }
})
