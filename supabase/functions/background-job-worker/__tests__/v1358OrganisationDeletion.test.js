/** v1358 Slice 3a — organisation.deletion_notify: confirmation link per app, email text, skips and errors. */
import { describe, expect, it, vi } from 'vitest'
import { handlers } from '../handlers/index.js'
import { buildEmail, confirmLink } from '../handlers/organisation.deletion_notify.js'

const INFO = {
  reference: 'ODR-009', organisation: 'Example Freight Ltd', edition: 'platform',
  owner_name: 'Head of Operations', owner_email: 'head.of.operations@company.example', expires: '10 Dec 2026',
}

function makeCtx({ info = INFO, env = { SITE_URL: 'https://app.example/' }, send = { ok: true, status: 200, data: { success: true } } } = {}) {
  return {
    rpc: vi.fn(async () => ({ data: info, error: null })),
    invokeFunction: vi.fn(async () => send),
    env: (name) => env[name],
    log: vi.fn(),
  }
}

describe('organisation.deletion_notify', () => {
  const handler = handlers['organisation.deletion_notify']

  it('is registered for its catalogue code', () => {
    expect(typeof handler?.handle).toBe('function')
  })

  it('links Platform owners to Data export & deletion and Planner owners to Settings', () => {
    const ctx = makeCtx({ env: { SITE_URL: 'https://app.example/', PLANNER_SITE_URL: 'https://planner.example' } })
    expect(confirmLink(ctx, 'platform', 'abc')).toBe('https://app.example/platform/organisation/data-export?confirm=abc')
    expect(confirmLink(ctx, 'planner', 'abc')).toBe('https://planner.example/app/settings/data?confirm=abc')
    expect(confirmLink(makeCtx(), 'planner', 'abc')).toBe('https://app.example/app/settings/data?confirm=abc')
  })

  it('emails the owner the confirmation link', async () => {
    const ctx = makeCtx()
    const out = await handler.handle({ request_id: 'r1', kind: 'confirm', token: 'tok123' }, ctx)
    expect(out).toEqual({ processed: 1 })
    expect(ctx.rpc).toHaveBeenCalledWith('organisation_deletion_notify_context', { p_request_id: 'r1' })
    const [fn, body] = ctx.invokeFunction.mock.calls[0]
    expect(fn).toBe('send-email')
    expect(body.to).toBe('head.of.operations@company.example')
    expect(body.subject).toBe('Confirm the deletion of Example Freight Ltd')
    expect(body.html).toContain('https://app.example/platform/organisation/data-export?confirm=tok123')
    expect(body.html).toContain('ODR-009')
    expect(body.html).toContain('10 Dec 2026')
  })

  it('says a reminder replaces the earlier link and escapes names', () => {
    const { subject, html } = buildEmail({ ...INFO, organisation: 'A & B <Ltd>' }, 'https://app.example/x', 'reminder')
    expect(subject).toMatch(/^Reminder:/)
    expect(html).toContain('replaces the link in our earlier email')
    expect(html).toContain('A &amp; B &lt;Ltd&gt;')
  })

  it('skips a request that is no longer waiting and reports missing setup or failed sends', async () => {
    expect(await handler.handle({ request_id: 'r1', token: 't' }, makeCtx({ info: { skip: 'request is not waiting for confirmation' } })))
      .toEqual({ processed: 0, skipped: 'request is not waiting for confirmation' })
    expect((await handler.handle({ request_id: 'r1', token: 't' }, makeCtx({ env: {} }))).error).toMatch(/SITE_URL/)
    expect((await handler.handle({ request_id: 'r1' }, makeCtx())).error).toMatch(/token are required/)
    expect((await handler.handle({ request_id: 'r1', token: 't' }, makeCtx({ send: { ok: false, status: 500, data: { error: 'SMTP down' } } }))).error)
      .toMatch(/SMTP down/)
  })
})
