/**
 * Paynow helpers shared by paynow-webhook, paynow-poll and the background job `payments.pending_recheck`
 * (v1352 Slice 2, 2.3). Pure functions (Web Crypto only), so they run in Deno, Node and the Vitest suite.
 *
 * Hash check: a Paynow message is trusted only when it carries a `hash` that matches one of these, built
 * with the integration key (a secret only Paynow and this server hold):
 *   - values  — the values of every field except `hash`, in the order received, then the key (Paynow's
 *               documented method);
 *   - legacy  — `key=value` pairs sorted by name and joined with `&`, then the key (the method this code
 *               base used before v1352 Slice 2).
 * Both need the integration key, so accepting either does not let anyone forge a message. A message with no
 * hash, or no integration key configured, is never trusted.
 */

export const PAYNOW_HOSTS = ['paynow.co.zw', 'www.paynow.co.zw']

async function sha512Upper(text) {
  const bytes = new TextEncoder().encode(text)
  const digest = await crypto.subtle.digest('SHA-512', bytes)
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, '0')).join('').toUpperCase()
}

/** [[key, value], …] in the order received, without `hash`. Accepts URLSearchParams, a Map or a plain object. */
export function paynowEntries(params) {
  const entries = params instanceof URLSearchParams || params instanceof Map
    ? Array.from(params.entries())
    : Object.entries(params || {})
  return entries.filter(([key]) => String(key).toLowerCase() !== 'hash').map(([k, v]) => [String(k), String(v ?? '')])
}

export function paynowHashValues(params, integrationKey) {
  return sha512Upper(paynowEntries(params).map(([, v]) => v).join('') + integrationKey)
}

export function paynowHashLegacy(params, integrationKey) {
  const sorted = paynowEntries(params).sort((a, b) => a[0].localeCompare(b[0]))
  return sha512Upper(sorted.map(([k, v]) => `${k}=${v}`).join('&') + integrationKey)
}

function sameText(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

function readHash(params) {
  if (params instanceof URLSearchParams || params instanceof Map) return params.get('hash') ?? params.get('Hash')
  return params?.hash ?? params?.Hash
}

/** True only when the message carries a hash that matches (see the header). */
export async function verifyPaynowHash(params, integrationKey) {
  const hash = String(readHash(params) || '').trim().toUpperCase()
  if (!hash || !integrationKey) return false
  if (sameText(hash, await paynowHashValues(params, integrationKey))) return true
  return sameText(hash, await paynowHashLegacy(params, integrationKey))
}

/** Paynow status text → payment_transactions.status (same mapping as paynow-webhook). */
export function mapPaynowStatus(status) {
  switch (String(status || '').trim().toLowerCase()) {
    case 'paid': return 'paid'
    case 'cancelled': return 'cancelled'
    case 'error':
    case 'failed': return 'failed'
    default: return 'pending'
  }
}

/** Only Paynow's own https addresses may be polled (the poll URL is stored data, never fetched blindly). */
export function isPaynowPollUrl(value, extraHosts = []) {
  let url
  try { url = new URL(String(value || '')) } catch { return false }
  if (url.protocol !== 'https:') return false
  const host = url.hostname.toLowerCase()
  return [...PAYNOW_HOSTS, ...extraHosts.map((h) => String(h).toLowerCase())].includes(host)
}
