/**
 * v1352 Slice 2 (2.3) — handler for catalogue job `payments.pending_recheck` (hourly, UTC). The server-side
 * version of the browser-only `paynow-poll`: payments no longer depend on the payer's browser or on Paynow's
 * status message reaching paynow-webhook.
 *
 * For each pending Paynow payment that is due a check (public.payments_pending_for_recheck: old enough, still
 * inside the re-check window, not checked in the last 50 minutes):
 *   1. read its poll URL — only Paynow's own https hosts are fetched;
 *   2. trust the answer only when its hash matches (verifyPaynowHash, needs PAYNOW_INTEGRATION_KEY) and it is
 *      about the same reference;
 *   3. when Paynow reports a final status, hand the exact signed message to paynow-webhook, which checks the
 *      hash again and runs the normal, idempotent fulfilment (subscription, Planner seats / edition);
 *   4. record the outcome on the payment (public.payments_recheck_note).
 * Unverified answers change nothing. A missing integration key fails the run, so Admin is alerted.
 */
import { isPaynowPollUrl, mapPaynowStatus, verifyPaynowHash } from '../../_shared/paynow.js'

export async function handle(_payload, ctx) {
  const key = ctx.env('PAYNOW_INTEGRATION_KEY')
  if (!key) return { error: 'PAYNOW_INTEGRATION_KEY is not set for background-job-worker, so payments cannot be verified' }

  const listed = await ctx.rpc('payments_pending_for_recheck', { p_limit: 50 })
  if (listed.error) return { error: `payments_pending_for_recheck: ${listed.error.message}` }
  const payments = Array.isArray(listed.data) ? listed.data : []

  const extraHosts = []
  try {
    const configured = ctx.env('PAYNOW_URL')
    if (configured) extraHosts.push(new URL(configured).hostname)
  } catch { /* ignore a malformed setting */ }

  const counts = { checked: 0, still_pending: 0, forwarded: 0, unverified: 0, failed: 0 }
  const note = async (reference, outcome) => {
    const res = await ctx.rpc('payments_recheck_note', { p_reference: reference, p_outcome: outcome })
    if (res.error) ctx.log?.(`[payments.pending_recheck] could not record ${outcome} for ${reference}: ${res.error.message}`)
  }

  for (const payment of payments) {
    const reference = payment?.reference
    if (!reference) continue
    counts.checked += 1
    if (!isPaynowPollUrl(payment.poll_url, extraHosts)) {
      counts.unverified += 1
      await note(reference, 'poll address is not a Paynow address')
      continue
    }
    let reply
    try {
      reply = await ctx.httpGet(payment.poll_url)
    } catch (err) {
      reply = { ok: false, status: 0, text: String(err?.message || err) }
    }
    if (!reply.ok) {
      counts.failed += 1
      await note(reference, `Paynow did not answer (${reply.status})`)
      continue
    }
    const params = new URLSearchParams(reply.text || '')
    if (params.get('reference') !== reference || !(await verifyPaynowHash(params, key))) {
      counts.unverified += 1
      await note(reference, 'answer not verified (hash or reference did not match); nothing changed')
      continue
    }
    const status = mapPaynowStatus(params.get('status'))
    if (status === 'pending') {
      counts.still_pending += 1
      await note(reference, 'still pending at Paynow')
      continue
    }
    const forwarded = await ctx.invokeFunction('paynow-webhook', null, { form: reply.text })
    if (!forwarded.ok) {
      counts.failed += 1
      await note(reference, `verified ${status}, but paynow-webhook returned ${forwarded.status}`)
      continue
    }
    counts.forwarded += 1
    await note(reference, `verified ${status}; passed to paynow-webhook`)
  }

  return { processed: counts.forwarded, ...counts }
}
