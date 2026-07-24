/**
 * Human-readable strings for Supabase Auth errors where `message` is often empty
 * (e.g. AuthRetryableFetchError after 504 Gateway Timeout / network failures).
 */

const DEFAULT_FALLBACK = 'Something went wrong. Please try again.'

function statusFrom(err) {
  if (!err || typeof err !== 'object') return undefined
  if (typeof err.status === 'number' && Number.isFinite(err.status)) return err.status
  const ctx = err.context
  if (ctx && typeof ctx === 'object' && typeof ctx.status === 'number') return ctx.status
  const code = err.code
  if (typeof code === 'number' && Number.isFinite(code)) return code
  if (typeof code === 'string' && /^\d{3}$/.test(code)) return Number(code)
  const resp =
    typeof ctx?.response?.status === 'number'
      ? ctx.response.status
      : typeof err.response?.status === 'number'
        ? err.response.status
        : undefined
  return resp
}

/**
 * @param {unknown} err
 * @param {string} [fallback]
 * @returns {string}
 */
export function normalizeSupabaseAuthError(err, fallback = DEFAULT_FALLBACK) {
  if (err == null || err === '') {
    return typeof fallback === 'string' && fallback.trim() ? fallback.trim() : DEFAULT_FALLBACK
  }
  if (typeof err === 'string') {
    const t = err.trim()
    return t || fallback
  }

  const name = typeof err.name === 'string' ? err.name : ''
  const msg = typeof err.message === 'string' ? err.message.trim() : ''
  const status = statusFrom(err)
  const haystack = `${name} ${msg}`.toLowerCase()

  // Our own 15-second race timeout
  if (msg === 'sign_up_timeout') {
    return (
      'Account creation timed out (no response after 15 s). ' +
      'Your Supabase project may be paused or sleeping — log in to app.supabase.com and resume it, then try again.'
    )
  }

  if (status === 504 || haystack.includes('504') || haystack.includes('gateway timeout')) {
    return (
      'The authentication service did not respond in time (504). ' +
      'Your Supabase project may be paused — check app.supabase.com and resume it, then try again.'
    )
  }

  if (status === 502 || haystack.includes('502')) {
    return 'The authentication service returned an error (502). Please try again in a few minutes.'
  }

  if (status === 503 || haystack.includes('503')) {
    return 'The authentication service is temporarily unavailable. Please try again shortly.'
  }

  if (
    name === 'AuthRetryableFetchError' ||
    /failed to fetch|networkerror|load failed|abort|timed out/i.test(msg)
  ) {
    if (!msg) {
      return (
        'Could not reach the authentication server (network or timeout). ' +
        'Check your connection, VPN/firewall rules, and that VITE_SUPABASE_URL is correct, then retry.'
      )
    }
  }

  if (msg) return msg

  if (typeof err.details === 'string' && err.details.trim()) return err.details.trim()
  if (typeof err.hint === 'string' && err.hint.trim()) return err.hint.trim()

  return typeof fallback === 'string' && fallback.trim() ? fallback.trim() : DEFAULT_FALLBACK
}
