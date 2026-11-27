/** v1352 Slice 2 — email outbox, Paynow re-check (shared verifier) and the report retry through the outbox. */
import { createHash } from 'node:crypto'
import { describe, expect, it, vi } from 'vitest'
import { handlers } from '../handlers/index.js'
import { buildNoticeEmail, PRACTICE_LABEL } from '../email.js'
import {
  isPaynowPollUrl, mapPaynowStatus, paynowHashLegacy, paynowHashValues, verifyPaynowHash,
} from '../../_shared/paynow.js'

const KEY = 'test-integration-key'
const sha512 = (text) => createHash('sha512').update(text).digest('hex').toUpperCase()

/** A Paynow status message signed the documented way (values in order + key). */
function signed(fields, key = KEY) {
  const params = new URLSearchParams(fields)
  params.append('hash', sha512(Object.values(fields).join('') + key))
  return params.toString()
}

const POLL = 'https://www.paynow.co.zw/Interface/CheckPayment/?guid=abc'
const message = (over = {}) => ({
  reference: 'NID-0001', paynowreference: '123456', amount: '25.00', status: 'Paid', pollurl: POLL, ...over,
})

describe('shared Paynow verifier', () => {
  it('accepts the documented hash and the legacy sorted hash, both with the key', async () => {
    const fields = message()
    expect(await verifyPaynowHash(new URLSearchParams(signed(fields)), KEY)).toBe(true)
    expect(await paynowHashValues(fields, KEY)).toBe(sha512(Object.values(fields).join('') + KEY))

    const legacy = new URLSearchParams(fields)
    legacy.append('hash', await paynowHashLegacy(fields, KEY))
    const sorted = Object.keys(fields).sort().map((k) => `${k}=${fields[k]}`).join('&')
    expect(await paynowHashLegacy(fields, KEY)).toBe(sha512(sorted + KEY))
    expect(await verifyPaynowHash(legacy, KEY)).toBe(true)
  })

  it('refuses a wrong key, a changed field, a missing hash or a missing key', async () => {
    const params = new URLSearchParams(signed(message()))
    expect(await verifyPaynowHash(params, 'other-key')).toBe(false)
    const tampered = new URLSearchParams(signed(message()))
    tampered.set('amount', '1.00')
    expect(await verifyPaynowHash(tampered, KEY)).toBe(false)
    expect(await verifyPaynowHash(new URLSearchParams(message()), KEY)).toBe(false)
    expect(await verifyPaynowHash(params, '')).toBe(false)
  })

  it('maps statuses and only allows Paynow https poll addresses', () => {
    expect(mapPaynowStatus('Paid')).toBe('paid')
    expect(mapPaynowStatus('Cancelled')).toBe('cancelled')
    expect(mapPaynowStatus('Error')).toBe('failed')
    expect(mapPaynowStatus('Created')).toBe('pending')
    expect(mapPaynowStatus('Sent')).toBe('pending')
    expect(isPaynowPollUrl(POLL)).toBe(true)
    expect(isPaynowPollUrl('http://www.paynow.co.zw/x')).toBe(false)
    expect(isPaynowPollUrl('https://paynow.co.zw.example/x')).toBe(false)
    expect(isPaynowPollUrl('https://internal.example/x')).toBe(false)
    expect(isPaynowPollUrl('https://sandbox.example/x', ['sandbox.example'])).toBe(true)
    expect(isPaynowPollUrl('not a url')).toBe(false)
  })
})

describe('email.send (outbox)', () => {
  const ctxSend = (res = { ok: true, status: 200, data: { success: true, message_id: 'm-1' } }) => ({
    invokeFunction: vi.fn(async () => res), rpc: vi.fn(), env: () => undefined, log: vi.fn(),
  })

  it('sends ready HTML as it is', async () => {
    const ctx = ctxSend()
    const out = await handlers['email.send'].handle({ to: 'head.of.finance@company.example', subject: 'Hello', html: '<p>Hi</p>' }, ctx)
    expect(ctx.invokeFunction).toHaveBeenCalledWith('send-email', { to: 'head.of.finance@company.example', subject: 'Hello', html: '<p>Hi</p>' })
    expect(out).toMatchObject({ processed: 1, message_id: 'm-1' })
  })

  it('builds a plain notice from a text body, escaped, with bullets and the practice mark', async () => {
    const ctx = ctxSend()
    await handlers['email.send'].handle({
      to: 'practice.lead@company.example', subject: 'Invitation expired', body: 'First <line>\n- one\n- two\nLast', practice: true,
    }, ctx)
    const { subject, html } = ctx.invokeFunction.mock.calls[0][1]
    expect(subject).toBe(`[${PRACTICE_LABEL}] Invitation expired`)
    expect(html).toContain('First &lt;line&gt;')
    expect(html).toContain('<ul style="padding-left:18px"><li>one</li><li>two</li></ul>')
    expect(html).toContain('<p style="margin:0 0 12px">Last</p>')
  })

  it('refuses an incomplete item and returns an error (queue back-off) when sending fails', async () => {
    expect((await handlers['email.send'].handle({ to: 'nobody', subject: 'x', body: 'y' }, ctxSend())).error).toMatch(/needs to, subject/)
    expect((await handlers['email.send'].handle({ to: 'a@company.example', subject: 'x' }, ctxSend())).error).toMatch(/html or body/)
    const out = await handlers['email.send'].handle({ to: 'a@company.example', subject: 'x', body: 'y' },
      ctxSend({ ok: false, status: 502, data: { error: 'smtp down' } }))
    expect(out.error).toMatch(/502: smtp down/)
  })

  it('buildNoticeEmail leaves live notices unmarked', () => {
    const { subject, html } = buildNoticeEmail({ subject: 'Your subscription renews', body: 'Text' })
    expect(subject).toBe('Your subscription renews')
    expect(html).not.toContain(PRACTICE_LABEL)
  })
})

describe('payments.pending_recheck', () => {
  function ctxFor({ payments = [{ reference: 'NID-0001', poll_url: POLL }], reply, forward, env = { PAYNOW_INTEGRATION_KEY: KEY } } = {}) {
    return {
      env: (name) => env[name],
      rpc: vi.fn(async (fn) => {
        if (fn === 'payments_pending_for_recheck') return { data: payments, error: null }
        if (fn === 'payments_recheck_note') return { data: true, error: null }
        return { data: null, error: { message: `unexpected ${fn}` } }
      }),
      httpGet: vi.fn(async () => reply ?? { ok: true, status: 200, text: signed(message()) }),
      invokeFunction: vi.fn(async () => forward ?? { ok: true, status: 200, data: { status: 'ok' } }),
      log: vi.fn(),
    }
  }
  const notes = (ctx) => ctx.rpc.mock.calls.filter(([fn]) => fn === 'payments_recheck_note').map(([, a]) => a.p_outcome)

  it('fails the run when the integration key is missing (nothing can be verified)', async () => {
    const ctx = ctxFor({ env: {} })
    expect((await handlers['payments.pending_recheck'].handle({}, ctx)).error).toMatch(/PAYNOW_INTEGRATION_KEY/)
    expect(ctx.rpc).not.toHaveBeenCalled()
  })

  it('passes a verified final answer to paynow-webhook as the same signed form', async () => {
    const ctx = ctxFor()
    const out = await handlers['payments.pending_recheck'].handle({}, ctx)
    expect(ctx.httpGet).toHaveBeenCalledWith(POLL)
    expect(ctx.invokeFunction).toHaveBeenCalledWith('paynow-webhook', null, { form: signed(message()) })
    expect(out).toMatchObject({ processed: 1, forwarded: 1, checked: 1 })
    expect(notes(ctx)[0]).toMatch(/verified paid/)
  })

  it('changes nothing for an unverified answer, another reference, or a pending one', async () => {
    const forged = ctxFor({ reply: { ok: true, status: 200, text: signed(message(), 'attacker-key') } })
    expect((await handlers['payments.pending_recheck'].handle({}, forged)).unverified).toBe(1)
    expect(forged.invokeFunction).not.toHaveBeenCalled()
    expect(notes(forged)[0]).toMatch(/not verified/)

    const other = ctxFor({ reply: { ok: true, status: 200, text: signed(message({ reference: 'NID-9999' })) } })
    expect((await handlers['payments.pending_recheck'].handle({}, other)).unverified).toBe(1)
    expect(other.invokeFunction).not.toHaveBeenCalled()

    const pending = ctxFor({ reply: { ok: true, status: 200, text: signed(message({ status: 'Created' })) } })
    expect((await handlers['payments.pending_recheck'].handle({}, pending)).still_pending).toBe(1)
    expect(pending.invokeFunction).not.toHaveBeenCalled()
  })

  it('never fetches an address that is not Paynow’s, and records Paynow or webhook failures', async () => {
    const ctx = ctxFor({ payments: [{ reference: 'NID-0001', poll_url: 'https://internal.example/steal' }] })
    const out = await handlers['payments.pending_recheck'].handle({}, ctx)
    expect(ctx.httpGet).not.toHaveBeenCalled()
    expect(out.unverified).toBe(1)

    const down = ctxFor({ reply: { ok: false, status: 503, text: '' } })
    expect((await handlers['payments.pending_recheck'].handle({}, down)).failed).toBe(1)

    const hookDown = ctxFor({ forward: { ok: false, status: 500, data: null } })
    const res = await handlers['payments.pending_recheck'].handle({}, hookDown)
    expect(res).toMatchObject({ failed: 1, forwarded: 0 })
    expect(notes(hookDown)[0]).toMatch(/paynow-webhook returned 500/)
  })
})

describe('reports.health_send retries a failed copy through the outbox', () => {
  it('queues only the recipients whose copy failed', async () => {
    let n = 0
    const ctx = {
      rpc: vi.fn(async (fn) => {
        if (fn === 'scheduled_report_build') {
          return { data: { recipients: ['a@company.example', 'b@company.example'], project: { name: 'Warehouse Upgrade' } }, error: null }
        }
        if (fn === 'scheduled_report_finish') return { data: 'completed', error: null }
        if (fn === 'queue_email') return { data: 'item-1', error: null }
        return { data: null, error: { message: `unexpected ${fn}` } }
      }),
      invokeFunction: vi.fn(async () => (n++ === 0 ? { ok: true, status: 200, data: { success: true } } : { ok: false, status: 500, data: { error: 'smtp down' } })),
      env: () => undefined,
      log: vi.fn(),
    }
    const out = await handlers['reports.health_send'].handle({ schema: 'public', run_id: 'run-9' }, ctx)
    const queued = ctx.rpc.mock.calls.filter(([fn]) => fn === 'queue_email')
    expect(queued).toHaveLength(1)
    expect(queued[0][1]).toMatchObject({ p_to: 'b@company.example', p_dedupe_key: 'report:run-9:b@company.example' })
    expect(queued[0][1].p_html).toContain('Warehouse Upgrade')
    expect(out).toMatchObject({ processed: 1, failed: 1, retry_queued: 1 })
    const finish = ctx.rpc.mock.calls.find(([fn]) => fn === 'scheduled_report_finish')[1]
    expect(finish.p_error).toMatch(/1 queued for retry/)
  })
})
