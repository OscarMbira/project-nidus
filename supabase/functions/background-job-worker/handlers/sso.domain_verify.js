/**
 * v1359 (gap A14) — handler for `sso.domain_verify`: checks that every email domain of an SSO connection publishes
 * the TXT record  nidus-verify=<token>  and reports the result (SQL v1611). Payload: { connection_id, mode }.
 * DNS is read over HTTPS (Google public DNS JSON API) through ctx.httpGet, so the handler stays host-neutral.
 * A domain passes when any TXT string equals the expected value (case-sensitive token, quotes stripped).
 */
export const DNS_URL = 'https://dns.google/resolve'

export function txtValues(json) {
  return (Array.isArray(json?.Answer) ? json.Answer : [])
    .filter((a) => a.type === 16)
    .map((a) => String(a.data || '').split('" "').join('').replace(/^"|"$/g, '').trim())
}

export async function checkDomain(ctx, domain, expected) {
  if (!/^[a-z0-9.-]+\.[a-z]{2,}$/i.test(domain)) return { domain, ok: false, reason: 'not a valid domain name' }
  const res = await ctx.httpGet(`${DNS_URL}?name=${encodeURIComponent(domain)}&type=TXT`)
  if (!res?.ok) return { domain, ok: false, reason: `DNS lookup failed (${res?.status || 'no response'})`, retry: true }
  let json
  try { json = JSON.parse(res.text) } catch { return { domain, ok: false, reason: 'DNS answer could not be read', retry: true } }
  if (json.Status !== 0 && json.Status !== 3) return { domain, ok: false, reason: `DNS lookup failed (status ${json.Status})`, retry: true }
  const found = txtValues(json).includes(expected)
  return { domain, ok: found, reason: found ? 'found' : 'TXT record not found' }
}

export async function handle(payload, ctx) {
  const id = payload?.connection_id
  if (!id) return { error: 'connection_id is missing from the payload' }
  if (typeof ctx.httpGet !== 'function') return { error: 'The worker adapter has no httpGet' }

  const res = await ctx.rpc('sso_domain_verify_context', { p_connection_id: id })
  if (res.error) return { error: `sso_domain_verify_context: ${res.error.message}` }
  const info = res.data || {}
  if (info.skip) return { processed: 0, skipped: info.skip }
  const domains = Array.isArray(info.domains) ? info.domains : []
  if (!domains.length) return { processed: 0, skipped: 'no domains' }

  const results = []
  for (const domain of domains) results.push(await checkDomain(ctx, domain, info.expected))
  // A DNS service failure is retried by the queue instead of being recorded as a failed check.
  const outage = results.find((r) => r.retry)
  if (outage) return { error: `${outage.domain}: ${outage.reason}` }

  const ok = results.every((r) => r.ok)
  const detail = ok
    ? `TXT record found on ${domains.join(', ')}`
    : results.filter((r) => !r.ok).map((r) => `${r.domain}: ${r.reason}`).join('; ')
  const saved = await ctx.rpc('sso_domain_verify_result', { p_connection_id: id, p_ok: ok, p_detail: detail })
  if (saved.error) return { error: `sso_domain_verify_result: ${saved.error.message}` }
  return { processed: 1, verified: ok, detail }
}
