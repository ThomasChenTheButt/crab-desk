import { expect, test } from 'claude-code/testing'

import { versusUsual } from '../hooks/usage-view'

const day = (today: number, usualByNow: number) => ({ today, average: 380, daily: {}, hours: [], usualByNow, usualHours: [] })

test('today is compared with a usual day by this same time', () => {
  // Just after midnight the usual is tiny, so the gap reads in minutes, not as a wild percentage.
  expect(versusUsual(day(15, 5)).badge).toBe('+10m')
  // Later in the day it is a percentage of the usual by now, never of a whole day.
  expect(versusUsual(day(120, 240)).badge).toBe('↓50%')
  expect(versusUsual(day(300, 200)).badge).toBe('↑50%')
  // Within a tenth of the usual it is about the same.
  expect(versusUsual(day(205, 200)).badge).toBe('≈ usual')
  expect(versusUsual(day(0, 0)).badge).toBeUndefined()
})
