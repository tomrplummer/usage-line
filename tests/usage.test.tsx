import { expect, mock, test } from 'claude-code/testing'
import { formatResetIn, readings } from '../hooks/register'

const NOW = Date.parse('2026-10-26T20:00:00Z')

const BAND = {
  plugin: 'usage-line',
  component: 'AbovePrompt',
  // Only the props the band reads; the rest are the surface's layout.
  props: { hasSurvey: false, isWorking: false, maxRows: 4 } as never,
} as const

const words = (node: unknown): string =>
  typeof node === 'string' || typeof node === 'number'
    ? String(node)
    : Array.isArray(node)
      ? node.map(words).join('')
      : node && typeof node === 'object' && 'children' in node
        ? words((node as { children: unknown }).children)
        : ''

test('reads both windows with reset countdowns', async () => {
  expect(
    readings(
      [
        { kind: 'five_hour', percentUsed: 23.5, resetsAt: '2026-10-26T22:14:00Z' },
        { kind: 'seven_day', percentUsed: 41, resetsAt: '2026-10-30T00:00:00Z' },
      ],
      NOW,
    ),
  ).toEqual([
    { label: '5-hour', percent: 24, resetIn: '2h 14m' },
    { label: 'Weekly', percent: 41, resetIn: '3d 4h' },
  ])
})

test('handles a missing or past reset time', async () => {
  expect(formatResetIn(undefined, NOW)).toBeUndefined()
  expect(formatResetIn('2026-10-26T19:00:00Z', NOW)).toBe('0m')
})

test('draws the usage line in the band once the engine measures', async ($, on) => {
  mock.clock(on, { now: NOW })
  on('session.measure', ($, e) => ({ changed: e.changed }))
  on('ui.render', () => ({ type: 'engine', ref: 0 }))

  await $.session.measure({
    context: { contextWindowSize: 200_000 } as never,
    rateLimits: [
      { kind: 'five_hour', percentUsed: 7, resetsAt: '2026-10-26T20:30:00Z' },
      { kind: 'seven_day', percentUsed: 92 },
    ],
    changed: ['rateLimits'],
  })

  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await $.ui.mount({ ...BAND, surface })
    expect(words(await ui.drawn())).toBe('5-hour 7% (resets in 30m) · Weekly 92%')
    await ui.unmount()
  }
})

test('stacks under another mod drawing in the band', async ($, on) => {
  mock.clock(on, { now: NOW })
  on('session.measure', ($, e) => ({ changed: e.changed }))
  on('ui.render', ($, e) => {
    const { Text } = $.ui.resolve(e)
    return <Text>other mod</Text>
  })

  await $.session.measure({
    context: { contextWindowSize: 200_000 } as never,
    rateLimits: [{ kind: 'five_hour', percentUsed: 7 }],
    changed: ['rateLimits'],
  })

  const ui = await $.ui.mount({ ...BAND, surface: 'desktop' })
  expect(words(await ui.drawn())).toBe('other mod5-hour 7%')
  await ui.unmount()
})
