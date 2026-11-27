/**
 * v1356 — handler for `webhooks.deliver`: one webhook delivery with an HMAC-SHA256 signature and timestamp (D7).
 * Queued by public.enqueue_webhook_event; v1352 handles back-off, dead items and replay.
 *
 * v1359 (gap A9): reads and writes only through the service-role functions public.webhook_delivery_context and
 * public.webhook_delivery_result (SQL v1609); the worker adapter has no direct table client. Targets must be
 * public https addresses: localhost, private and link-local addresses are refused (no calls into our own network).
 *
 * Signature header: X-Nidus-Signature: t=<unix seconds>,v1=<hex HMAC-SHA256 of "<t>.<body>" with the endpoint secret>
 */
import { createHmac } from 'node:crypto'

export const TIMEOUT_MS = 10_000

/** Constant-time compare of two hex strings (for receivers verifying the signature; kept for tests). */
export function timingSafeEqualHex(a, b) {
  if (!a || !b || a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

/** Only public https targets. */
export function targetProblem(url) {
  let u
  try { u = new URL(url) } catch { return 'the address is not a valid URL' }
  if (u.protocol !== 'https:') return 'the address must use https'
  const host = u.hostname.toLowerCase().replace(/^\[|\]$/g, '')
  if (host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.local') || host.endsWith('.internal')) {
    return 'the address points at a local host'
  }
  const v4 = host.match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)$/)
  if (v4) {
    const [a, b] = [Number(v4[1]), Number(v4[2])]
    if (a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31)
        || (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127)) {
      return 'the address points at a private network'
    }
  }
  if (host.includes(':') && (host === '::1' || host.startsWith('fc') || host.startsWith('fd') || host.startsWith('fe80'))) {
    return 'the address points at a private network'
  }
  return null
}

export function sign(secret, timestamp, body) {
  return createHmac('sha256', String(secret)).update(`${timestamp}.${body}`).digest('hex')
}

export async function handle(payload, ctx, options = {}) {
  const fetchFn = options.fetch || globalThis.fetch
  const now = options.now || (() => Date.now())
  const deliveryId = payload?.delivery_id
  if (!deliveryId) return { error: 'delivery_id is missing from the payload' }

  const res = await ctx.rpc('webhook_delivery_context', { p_delivery_id: deliveryId })
  if (res.error) return { error: `webhook_delivery_context: ${res.error.message}` }
  const info = res.data || {}
  if (info.skip) return { processed: 0, skipped: info.skip }

  const record = async (ok, status, body) => {
    const out = await ctx.rpc('webhook_delivery_result', { p_delivery_id: deliveryId, p_ok: ok, p_status: status, p_body: body })
    if (out.error) throw new Error(`webhook_delivery_result: ${out.error.message}`)
    return out.data || {}
  }

  const problem = targetProblem(info.target_url)
  if (problem) {
    await record(false, 0, `Not sent: ${problem}`)
    return { error: `Webhook not sent: ${problem}` }
  }

  const body = JSON.stringify(info.event)
  const timestamp = Math.floor(now() / 1000).toString()
  let status = 0
  let text = ''
  try {
    const controller = typeof AbortController === 'function' ? new AbortController() : null
    const timer = controller ? setTimeout(() => controller.abort(), TIMEOUT_MS) : null
    const reply = await fetchFn(info.target_url, {
      method: 'POST',
      redirect: 'manual',
      signal: controller?.signal,
      headers: {
        'Content-Type': 'application/json',
        'X-Nidus-Signature': `t=${timestamp},v1=${sign(info.secret, timestamp, body)}`,
        'X-Nidus-Event': info.event_type,
        'User-Agent': 'Nidus-Webhooks/1.0',
      },
      body,
    })
    if (timer) clearTimeout(timer)
    status = reply.status
    text = (await reply.text()).slice(0, 2000)
    if (reply.ok) {
      await record(true, status, text)
      return { processed: 1, status }
    }
  } catch (err) {
    text = String(err?.message || err).slice(0, 500)
  }

  const out = await record(false, status, text)
  // An error makes the v1352 queue retry with back-off; a switched-off endpoint is not retried.
  if (out.disabled) return { processed: 0, disabled: true, error: `Endpoint switched off after ${out.failures} failures` }
  return { error: `Webhook delivery failed (${status || 'no response'}): ${text}` }
}
