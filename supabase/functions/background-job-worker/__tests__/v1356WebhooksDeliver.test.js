/** v1356 / v1359 (gap A9) — webhooks.deliver through worker functions, signature, private-address guard. */
import { describe, expect, it, vi } from 'vitest'
import { createHmac } from 'node:crypto'
import { handlers } from '../handlers/index.js'
import { sign, targetProblem, timingSafeEqualHex } from '../handlers/webhooks.deliver.js'

const INFO = {
  delivery_id: 'd1', endpoint_id: 'e1', account_id: 'a1', target_url: 'https://hooks.company.example/nidus',
  secret: 'whsec_test', event_type: 'risk.updated',
  event: { id: 'o1', type: 'risk.updated', created_at: '2026-11-27T10:00:00Z', data: { resource_type: 'risk', resource_id: 'r1' } },
}

function makeCtx({ info = INFO, result = { delivered: true } } = {}) {
  return {
    rpc: vi.fn(async (fn) => ({ data: fn === 'webhook_delivery_context' ? info : result, error: null })),
    env: () => undefined,
    log: vi.fn(),
  }
}
const reply = (status, text = 'ok') => ({ ok: status >= 200 && status < 300, status, text: async () => text })

describe('webhooks.deliver', () => {
  const handler = handlers['webhooks.deliver']

  it('posts the event with a verifiable signature and records success', async () => {
    const ctx = makeCtx()
    const fetch = vi.fn(async () => reply(200))
    const out = await handler.handle({ delivery_id: 'd1' }, ctx, { fetch, now: () => 1_800_000_000_000 })
    expect(out).toEqual({ processed: 1, status: 200 })
    const [url, init] = fetch.mock.calls[0]
    expect(url).toBe(INFO.target_url)
    expect(init.method).toBe('POST')
    expect(init.redirect).toBe('manual')
    const expected = createHmac('sha256', 'whsec_test').update(`1800000000.${init.body}`).digest('hex')
    expect(init.headers['X-Nidus-Signature']).toBe(`t=1800000000,v1=${expected}`)
    expect(JSON.parse(init.body)).toEqual(INFO.event)
    expect(ctx.rpc).toHaveBeenLastCalledWith('webhook_delivery_result', { p_delivery_id: 'd1', p_ok: true, p_status: 200, p_body: 'ok' })
  })

  it('records a failure and asks the queue to retry; stops once the endpoint is switched off', async () => {
    const out = await handler.handle({ delivery_id: 'd1' }, makeCtx({ result: { delivered: false, failures: 3 } }), { fetch: async () => reply(500, 'down') })
    expect(out.error).toMatch(/failed \(500\): down/)
    const off = await handler.handle({ delivery_id: 'd1' }, makeCtx({ result: { delivered: false, failures: 10, disabled: true } }), { fetch: async () => { throw new Error('timeout') } })
    expect(off).toMatchObject({ processed: 0, disabled: true })
  })

  it('skips deliveries the database says are done, and needs a delivery id', async () => {
    expect(await handler.handle({ delivery_id: 'd1' }, makeCtx({ info: { skip: 'endpoint is not active' } }), { fetch: vi.fn() }))
      .toEqual({ processed: 0, skipped: 'endpoint is not active' })
    expect((await handler.handle({}, makeCtx())).error).toMatch(/delivery_id/)
  })

  it('never calls local or private addresses', async () => {
    for (const url of ['http://hooks.company.example', 'https://localhost/x', 'https://127.0.0.1/x', 'https://10.0.0.5/x',
      'https://169.254.169.254/latest', 'https://192.168.1.10/x', 'https://172.20.0.1/x', 'https://[::1]/x', 'https://db.internal/x']) {
      expect(targetProblem(url)).not.toBeNull()
    }
    expect(targetProblem('https://hooks.company.example/nidus')).toBeNull()
    const fetch = vi.fn()
    const ctx = makeCtx({ info: { ...INFO, target_url: 'https://169.254.169.254/latest/meta-data' } })
    const out = await handler.handle({ delivery_id: 'd1' }, ctx, { fetch })
    expect(fetch).not.toHaveBeenCalled()
    expect(out.error).toMatch(/private network/)
  })

  it('signs and compares like a receiver would', () => {
    const s = sign('k', '1', '{}')
    expect(timingSafeEqualHex(s, createHmac('sha256', 'k').update('1.{}').digest('hex'))).toBe(true)
    expect(timingSafeEqualHex(s, s.replace(/.$/, '0'))).toBe(s.endsWith('0'))
  })
})
