/** v1352 Slice 0 — handlers wrap the existing edge functions unchanged and report a processed count. */
import { describe, expect, it, vi } from 'vitest'
import { handlers } from '../handlers/index.js'

const ctxWith = (res, env = {}) => ({
  invokeFunction: vi.fn(async () => res),
  env: (name) => env[name],
  rpc: vi.fn(),
  log: () => {},
})

describe('background job handlers', () => {
  it('ai.embed calls ai-embed with the AI cron secret and counts stored rows', async () => {
    const ctx = ctxWith({ ok: true, status: 200, data: { result: { public: { stored: 3 }, sim: { stored: 2 } }, ms: 10 } }, { AI_CRON_SECRET: 's3cret' })
    const out = await handlers['ai.embed'].handle({}, ctx)
    expect(ctx.invokeFunction).toHaveBeenCalledWith('ai-embed', { limit: 3, budgetMs: 5000 }, { headers: { 'x-ai-cron-secret': 's3cret' } })
    expect(out.processed).toBe(5)
  })

  it('ai.embed passes through the kill switch skip and reports HTTP errors', async () => {
    expect(await handlers['ai.embed'].handle({}, ctxWith({ ok: true, status: 200, data: { skipped: 'kill switch on' } })))
      .toMatchObject({ processed: 0, skipped: 'kill switch on' })
    expect((await handlers['ai.embed'].handle({}, ctxWith({ ok: false, status: 401, data: { error: 'Not allowed' } }))).error)
      .toMatch(/401: Not allowed/)
  })

  it('ai.embed sends a small batch, honours a payload override and explains a 546 resource-limit error', async () => {
    const ctx = ctxWith({ ok: true, status: 200, data: { result: {} } })
    await handlers['ai.embed'].handle({ limit: 1, budgetMs: 3000 }, ctx)
    expect(ctx.invokeFunction.mock.calls[0][1]).toEqual({ limit: 1, budgetMs: 3000 })
    expect((await handlers['ai.embed'].handle({}, ctxWith({ ok: false, status: 546, data: null }))).error)
      .toMatch(/resource limit \(546\) with 3 rows/)
  })

  it('drafts.expire calls expire-drafts and adds up expiries and warnings', async () => {
    const ctx = ctxWith({ ok: true, status: 200, data: { success: true, results: { expiredPlatform: 2, expiredSimulator: 1, warningsSent: 4, errors: [] } } })
    const out = await handlers['drafts.expire'].handle({}, ctx)
    expect(ctx.invokeFunction).toHaveBeenCalledWith('expire-drafts', {})
    expect(out.processed).toBe(7)
    expect((await handlers['drafts.expire'].handle({}, ctxWith({ ok: false, status: 500, data: { success: false, error: 'boom' } }))).error)
      .toMatch(/boom/)
  })

  it('testers.moratorium_expiry counts the notices it sent', async () => {
    const ctx = ctxWith({ ok: true, status: 200, data: { success: true, results: [{ tester_id: 'a' }, { tester_id: 'b', error: 'x' }] } })
    const out = await handlers['testers.moratorium_expiry'].handle({}, ctx)
    expect(ctx.invokeFunction).toHaveBeenCalledWith('admin-moratorium-cron', {})
    expect(out.processed).toBe(1)
  })

  it('system.alert_email sends one email and refuses an incomplete payload', async () => {
    const ctx = ctxWith({ ok: true, status: 200, data: { success: true, message_id: 'm1' } })
    const payload = { to: 'head.of.operations@company.example', subject: 'Background job failed', html: '<p>Details</p>' }
    expect(await handlers['system.alert_email'].handle(payload, ctx)).toEqual({ processed: 1, message_id: 'm1' })
    expect(ctx.invokeFunction).toHaveBeenCalledWith('send-email', payload)
    expect((await handlers['system.alert_email'].handle({ to: 'x@company.example' }, ctx)).error).toMatch(/needs to, subject and html/)
  })
})
