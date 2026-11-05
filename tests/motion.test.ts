import { expect, test } from 'claude-code/testing'
import { motion, projectRow } from '../hooks/art'
import { tripArt } from '../hooks/scenes'

const loops = (svg: string) => svg.match(/<animate(Transform)?\b[^>]*repeatCount="indefinite"[^>]*\/>/g) ?? []

test('every endless loop is tied to the wall clock, so a redraw carries on where it was', () => {
  const svg = motion(projectRow({ name: 'client site', line: '1 working', mood: 'working' }))
  expect(loops(svg).length).toBeGreaterThan(0)
  for (const tag of loops(svg)) {
    const begins = tag.match(/\sbegin="(-?[\d.]+)s"/g) ?? []
    expect(begins.length).toBe(1)
    const at = parseFloat(tag.match(/\sbegin="(-?[\d.]+)s"/)![1]!)
    const dur = parseFloat(tag.match(/\sdur="([\d.]+)s"/)![1]!)
    expect(at).toBeLessThanOrEqual(0)
    expect(-at).toBeLessThanOrEqual(dur)
  }
})

test('under Reduce Motion nothing loops: each loop holds its last frame', () => {
  const svg = motion(projectRow({ name: 'client site', line: '1 working', mood: 'working' }), true)
  expect(loops(svg).length).toBe(0)
  expect(svg).toContain('fill="freeze"')
})

test('a working dot stays still', () => {
  const svg = projectRow({ name: 'client site', line: '1 working', mood: 'working' })
  expect(svg).not.toContain('attributeName="r"')
})

test('the trip back to the desk is quicker than the trip out, and the hop is eased', () => {
  const trip = (to: 'working' | 'waiting') =>
    tripArt('studio', { to, e: 0, desk: { x: 20, fy: 80 }, seat: { x: 200, fy: 80 }, bx: 150, W: 300 })
  expect(trip('waiting')).toContain('dur="4.5s"')
  expect(trip('working')).toContain('dur="2.1s"')
  expect(trip('waiting')).toContain('keySplines="0.23 1 0.32 1;0.55 0 1 0.45;')
})
