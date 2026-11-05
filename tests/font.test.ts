import { expect, test } from 'claude-code/testing'

import { setFont, tiles } from '../hooks/art'

test('the font setting reaches what the panel draws, with the system font behind it', () => {
  setFont('Futura')
  expect(tiles([{ label: 'Projects', value: '6' }])).toContain(`font-family="'Futura', -apple-system`)
  setFont('System')
  expect(tiles([{ label: 'Projects', value: '6' }])).toContain('font-family="-apple-system')
})
