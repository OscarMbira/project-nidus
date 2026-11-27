/** v1359 (A14) — sso.domain_verify: DNS TXT check over HTTPS, result recorded, outages retried. */
import { describe, expect, it, vi } from 'vitest'
import { handlers } from '../handlers/index.js'
import { txtValues } from '../handlers/sso.domain_verify.js'

const INFO = { connection_id: 'c1', account_id: 'a1', name: 'Example SSO', domains: ['company.example', 'staff.company.example'], expected: 'nidus-verify=abc123', verified: false }
const dns = (txts, status = 0) => ({ ok: true, status: 200, text: JSON.stringify({ Status: status, Answer: txts.map((t) => ({ type: 16, data: `"${t}"` })) }) })

function makeCtx({ info = INFO, answers = {} } = {}) {
  return {
    rpc: vi.fn(async (fn) => ({ data: fn === 'sso_domain_verify_context' ? info : { verified: true }, error: null })),
    httpGet: vi.fn(async (url) => answers[new URL(url).searchParams.get('name')] || dns([])),
    env: () => undefined,
    log: vi.fn(),
  }
}

describe('sso.domain_verify', () => {
  const handler = handlers['sso.domain_verify']

  it('verifies when every domain has the TXT record', async () => {
    const ctx = makeCtx({ answers: { 'company.example': dns(['v=spf1 -all', 'nidus-verify=abc123']), 'staff.company.example': dns(['nidus-verify=abc123']) } })
    const out = await handler.handle({ connection_id: 'c1' }, ctx)
    expect(out).toMatchObject({ processed: 1, verified: true })
    expect(ctx.httpGet).toHaveBeenCalledWith('https://dns.google/resolve?name=company.example&type=TXT')
    expect(ctx.rpc).toHaveBeenLastCalledWith('sso_domain_verify_result', { p_connection_id: 'c1', p_ok: true, p_detail: 'TXT record found on company.example, staff.company.example' })
  })

  it('records a failure naming the domain without the record', async () => {
    const ctx = makeCtx({ answers: { 'company.example': dns(['nidus-verify=abc123']), 'staff.company.example': dns(['nidus-verify=other']) } })
    const out = await handler.handle({ connection_id: 'c1' }, ctx)
    expect(out).toMatchObject({ processed: 1, verified: false })
    expect(ctx.rpc).toHaveBeenLastCalledWith('sso_domain_verify_result', { p_connection_id: 'c1', p_ok: false, p_detail: 'staff.company.example: TXT record not found' })
  })

  it('retries (does not record) when the DNS service fails', async () => {
    const ctx = makeCtx({ answers: { 'company.example': { ok: false, status: 503, text: '' } } })
    const out = await handler.handle({ connection_id: 'c1' }, ctx)
    expect(out.error).toMatch(/company.example: DNS lookup failed \(503\)/)
    expect(ctx.rpc.mock.calls.some(([fn]) => fn === 'sso_domain_verify_result')).toBe(false)
  })

  it('treats a missing domain (NXDOMAIN) as not verified, and joins split TXT strings', async () => {
    const ctx = makeCtx({ info: { ...INFO, domains: ['gone.example'] }, answers: { 'gone.example': { ok: true, status: 200, text: JSON.stringify({ Status: 3 }) } } })
    expect((await handler.handle({ connection_id: 'c1' }, ctx)).verified).toBe(false)
    expect(txtValues({ Answer: [{ type: 16, data: '"nidus-verify=" "abc123"' }] })).toEqual(['nidus-verify=abc123'])
  })

  it('skips unknown connections and needs a connection id', async () => {
    expect(await handler.handle({ connection_id: 'x' }, makeCtx({ info: { skip: 'connection not found' } }))).toEqual({ processed: 0, skipped: 'connection not found' })
    expect((await handler.handle({}, makeCtx())).error).toMatch(/connection_id/)
  })
})
