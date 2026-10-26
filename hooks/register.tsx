import type { Register, SessionRateLimit } from 'claude-code'

const LIMITS = { plugin: 'usage-line', key: 'limits' } as const

const LABELS: Record<string, string> = {
  five_hour: '5-hour',
  seven_day: 'Weekly',
  spend_limit: 'Spend',
}

const MINUTE = 60_000

export type Reading = { label: string; percent: number; resetIn?: string }

export function formatResetIn(resetsAt: string | undefined, now: number): string | undefined {
  if (resetsAt === undefined) return undefined
  const at = Date.parse(resetsAt)
  if (Number.isNaN(at)) return undefined
  const minutes = Math.max(0, Math.round((at - now) / MINUTE))
  const days = Math.floor(minutes / 1440)
  const hours = Math.floor((minutes % 1440) / 60)
  const mins = minutes % 60
  if (days > 0) return `${days}d ${hours}h`
  if (hours > 0) return `${hours}h ${mins}m`
  return `${mins}m`
}

export function readings(limits: readonly SessionRateLimit[], now: number): Reading[] {
  return limits.map(limit => ({
    label: LABELS[limit.kind] ?? limit.kind,
    percent: Math.round(limit.percentUsed),
    resetIn: formatResetIn(limit.resetsAt, now),
  }))
}

function percentColor(percent: number): string | undefined {
  if (percent >= 90) return 'red'
  if (percent >= 75) return 'yellow'
  return undefined
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    const started = await next(e)
    await $.state.set(LIMITS, (await $.session.usage()).rateLimits)
    // Percentages only move with replies; redraw so the reset countdown ticks.
    $.clock.every(MINUTE, () => $.ui.invalidate('ui.render'))
    return started
  })

  on('session.measure', async ($, e, next) => {
    await $.state.set(LIMITS, e.rateLimits)
    return next(e)
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const limits = (await $.state.get(LIMITS)).value ?? []
    if (e.props.hasSurvey || limits.length === 0) return next(e)

    const below = await next(e)
    const { Box, Text } = $.ui.resolve(e)
    const parts = readings(limits, await $.clock.now()).flatMap((r, i) => [
      ...(i > 0 ? [<Text dimColor> · </Text>] : []),
      <Text dimColor>{r.label} </Text>,
      <Text color={percentColor(r.percent)}>{r.percent}%</Text>,
      ...(r.resetIn ? [<Text dimColor> (resets in {r.resetIn})</Text>] : []),
    ])
    const line = <Text wrap="truncate-end">{parts}</Text>

    // Another mod may draw in this band too: stack under it rather than replace it.
    return below.type === 'engine' ? line : (
      <Box flexDirection="column">
        {below}
        {line}
      </Box>
    )
  })
}
