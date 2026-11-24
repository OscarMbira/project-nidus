/** v1352 Slice 1 — health report and daily digest handlers, and their email bodies. */
import { describe, expect, it, vi } from 'vitest'
import { handlers } from '../handlers/index.js'
import { buildDigestEmail, buildHealthReportEmail, escapeHtml, evmIndices, formatAmount, PRACTICE_LABEL } from '../email.js'

const report = (over = {}) => ({
  schema: 'public',
  practice: false,
  run_id: 'run-1',
  schedule_name: 'Weekly health',
  report_date: '23 Nov 2026',
  recipients: ['head.of.finance@company.example', 'project.sponsor@company.example'],
  project: { name: 'Warehouse Upgrade', code: 'PRJ-0001', status: 'Executing', health: 'amber', percent_complete: 40, budget: 250000, currency: 'GBP' },
  counts: { open_risks: 3, open_issues: 1, overdue_tasks: 2, overdue_milestones: 0, actual_cost: 98000 },
  milestones: [{ name: 'Racking installed', date: '1 Dec 2026' }],
  evm: { planned_value: 100, earned_value: 80, actual_cost: 90 },
  ...over,
})

function ctxFor({ build = { data: report(), error: null }, send = () => ({ ok: true, status: 200, data: { success: true } }) } = {}) {
  return {
    rpc: vi.fn(async (fn) => {
      if (fn === 'scheduled_report_build') return build
      if (fn === 'scheduled_report_finish') return { data: 'completed', error: null }
      if (fn === 'notifications_digest_mark_sent') return { data: 2, error: null }
      return { data: null, error: { message: `unexpected ${fn}` } }
    }),
    invokeFunction: vi.fn(async (_name, body) => send(body)),
    env: () => undefined,
    log: vi.fn(),
  }
}

const finishCall = (ctx) => ctx.rpc.mock.calls.find(([fn]) => fn === 'scheduled_report_finish')?.[1]

describe('reports.health_send', () => {
  it('builds the report, emails every recipient and records a completed run', async () => {
    const ctx = ctxFor()
    const out = await handlers['reports.health_send'].handle({ schema: 'public', run_id: 'run-1' }, ctx)
    expect(ctx.rpc).toHaveBeenCalledWith('scheduled_report_build', { p_schema: 'public', p_run_id: 'run-1' })
    expect(ctx.invokeFunction).toHaveBeenCalledTimes(2)
    expect(ctx.invokeFunction.mock.calls[0][0]).toBe('send-email')
    expect(ctx.invokeFunction.mock.calls[0][1].subject).toMatch(/Project health report: Warehouse Upgrade/)
    expect(finishCall(ctx)).toMatchObject({ p_ok: true, p_sent: 2, p_error: null })
    expect(out.processed).toBe(2)
  })

  it('marks practice (Simulator) reports in the subject and the body', async () => {
    const ctx = ctxFor({ build: { data: report({ schema: 'sim', practice: true }), error: null } })
    await handlers['reports.health_send'].handle({ schema: 'sim', run_id: 'run-2' }, ctx)
    const { subject, html } = ctx.invokeFunction.mock.calls[0][1]
    expect(subject.startsWith(`[${PRACTICE_LABEL}]`)).toBe(true)
    expect(html).toContain('practice project in the Simulator')
  })

  it('fails the run without retrying when there are no recipients', async () => {
    const ctx = ctxFor({ build: { data: report({ recipients: [] }), error: null } })
    const out = await handlers['reports.health_send'].handle({ schema: 'public', run_id: 'run-3' }, ctx)
    expect(out.error).toBeUndefined()
    expect(ctx.invokeFunction).not.toHaveBeenCalled()
    expect(finishCall(ctx)).toMatchObject({ p_ok: false, p_sent: 0 })
  })

  it('records a partial send and asks for a retry when nothing could be sent', async () => {
    let n = 0
    const partial = ctxFor({ send: () => (n++ === 0 ? { ok: true, status: 200, data: { success: true } } : { ok: false, status: 500, data: { error: 'smtp down' } }) })
    expect((await handlers['reports.health_send'].handle({ schema: 'public', run_id: 'r' }, partial)).processed).toBe(1)
    expect(finishCall(partial)).toMatchObject({ p_ok: true, p_sent: 1 })
    expect(finishCall(partial).p_error).toMatch(/smtp down/)

    const none = ctxFor({ send: () => ({ ok: false, status: 500, data: { error: 'smtp down' } }) })
    const out = await handlers['reports.health_send'].handle({ schema: 'public', run_id: 'r' }, none)
    expect(out.error).toMatch(/No report email could be sent/)
    expect(finishCall(none)).toMatchObject({ p_ok: false, p_sent: 0 })
  })

  it('refuses an incomplete item and reports a build error', async () => {
    expect((await handlers['reports.health_send'].handle({ schema: 'other', run_id: 'r' }, ctxFor())).error).toMatch(/schema and run_id/)
    const ctx = ctxFor({ build: { data: null, error: { message: 'Report run x not found' } } })
    expect((await handlers['reports.health_send'].handle({ schema: 'public', run_id: 'x' }, ctx)).error).toMatch(/not found/)
  })
})

describe('notifications.digest_send', () => {
  const payload = {
    user_id: 'u1',
    to: 'team.member@company.example',
    name: 'Team Member',
    date_label: '23 Nov 2026',
    items: [
      { id: 'n1', title: 'Risk review due 25 Nov 2026', message: 'The risk “Supplier delay” is due for review on 25 Nov 2026.', practice: false },
      { id: 'n2', title: 'Practice: Milestone due 1 Dec 2026', message: 'The milestone “Go-live” is due on 1 Dec 2026.', practice: true },
    ],
    notification_ids: ['n1', 'n2'],
  }

  it('sends one email and marks the notices as emailed', async () => {
    const ctx = ctxFor()
    const out = await handlers['notifications.digest_send'].handle(payload, ctx)
    expect(ctx.invokeFunction).toHaveBeenCalledTimes(1)
    expect(ctx.invokeFunction.mock.calls[0][1].to).toBe('team.member@company.example')
    expect(ctx.rpc).toHaveBeenCalledWith('notifications_digest_mark_sent', { p_user_id: 'u1', p_ids: ['n1', 'n2'] })
    expect(out).toMatchObject({ processed: 1, items: 2 })
  })

  it('returns an error (retry) when the email fails and does not mark anything', async () => {
    const ctx = ctxFor({ send: () => ({ ok: false, status: 502, data: { error: 'bad gateway' } }) })
    const out = await handlers['notifications.digest_send'].handle(payload, ctx)
    expect(out.error).toMatch(/502: bad gateway/)
    expect(ctx.rpc).not.toHaveBeenCalled()
  })

  it('does not fail after a sent email when marking fails, and refuses an empty digest', async () => {
    const ctx = ctxFor()
    ctx.rpc = vi.fn(async () => ({ data: null, error: { message: 'timeout' } }))
    expect((await handlers['notifications.digest_send'].handle(payload, ctx)).processed).toBe(1)
    expect(ctx.log).toHaveBeenCalled()
    expect((await handlers['notifications.digest_send'].handle({ ...payload, items: [] }, ctxFor())).error).toMatch(/needs user_id, to and items/)
  })
})

describe('email bodies', () => {
  it('digest separates live and practice items and marks a practice-only digest', () => {
    const both = buildDigestEmail({ items: [{ title: 'A', message: 'a' }, { title: 'B', message: 'b', practice: true }], date_label: '23 Nov 2026' })
    expect(both.subject).toBe('Your daily summary for 23 Nov 2026: 2 new notices')
    expect(both.html).toContain('Your projects')
    expect(both.html).toContain(PRACTICE_LABEL)
    const practiceOnly = buildDigestEmail({ items: [{ title: 'B', message: 'b', practice: true }] })
    expect(practiceOnly.subject.startsWith(`[${PRACTICE_LABEL}]`)).toBe(true)
    expect(practiceOnly.subject).toMatch(/1 new notice$/)
  })

  it('health report escapes text and shows EVM indices', () => {
    const { html } = buildHealthReportEmail(report({ project: { name: '<script>x</script>' } }))
    expect(html).not.toContain('<script>')
    expect(html).toContain('&lt;script&gt;')
    expect(html).toContain('Schedule performance (SPI)')
    expect(evmIndices({ planned_value: 100, earned_value: 80, actual_cost: 90 })).toEqual({ spi: 0.8, cpi: 0.89 })
    expect(evmIndices(null)).toEqual({ spi: null, cpi: null })
    expect(formatAmount(250000, 'GBP')).toBe('GBP 250,000')
    expect(formatAmount(null)).toBe('—')
    expect(escapeHtml('"a" & \'b\'')).toBe('&quot;a&quot; &amp; &#39;b&#39;')
  })
})
