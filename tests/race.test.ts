import { expect, test } from 'claude-code/testing'
import { projectRow } from '../hooks/art'

test('several working chats race: one crab each, named on hover, and a finish flag', () => {
  const svg = projectRow({
    name: 'puzzle game',
    line: '2 working · ~12 min left',
    mood: 'working',
    racers: [
      { frac: 0.4, label: 'Landing variants: step 3 of 5', hasPlan: true },
      { frac: 0, label: 'Explainer: no task list', hasPlan: false },
    ],
  })
  expect(svg).toContain('<title>Landing variants: step 3 of 5</title>')
  expect(svg).toContain('<title>Explainer: no task list</title>')
  expect(svg).toContain('stroke-dasharray')
})

test('a working chat with no task list gets one crab walking the track, not a sweep', () => {
  const svg = projectRow({ name: 'client site', line: '1 working', mood: 'working' })
  expect(svg).toContain('stroke-dasharray')
  expect(svg).toContain('animateTransform')
  expect(svg).not.toContain('url(#sh)')
})
