/**
 * Lightweight error reporter for Platform and Simulator apps.
 * Reports to admin.system_error_log via Supabase insert.
 */

const RATE_LIMIT = 10
const RATE_WINDOW_MS = 60_000
const counts = new Map()

function sessionId() {
  let id = sessionStorage.getItem('nidus-error-session')
  if (!id) {
    id = crypto.randomUUID()
    sessionStorage.setItem('nidus-error-session', id)
  }
  return id
}

function sanitise(text) {
  if (!text) return text
  return String(text)
    .replace(/Bearer\s+\S+/gi, '[REDACTED]')
    .replace(/password[=:]\s*\S+/gi, 'password=[REDACTED]')
    .replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[EMAIL]')
}

function rateLimited(userId) {
  const key = userId || 'anon'
  const now = Date.now()
  const entry = counts.get(key) || { n: 0, t: now }
  if (now - entry.t > RATE_WINDOW_MS) {
    counts.set(key, { n: 1, t: now })
    return false
  }
  entry.n += 1
  counts.set(key, entry)
  return entry.n > RATE_LIMIT
}

export function createErrorReporter({ db, system, getUser }) {
  async function report(payload) {
    if (navigator.doNotTrack === '1') return
    const user = await getUser?.()
    if (rateLimited(user?.id)) return

    const row = {
      user_id: user?.id || null,
      user_email: user?.email || null,
      user_role: user?.role || null,
      system,
      page_route: window.location.pathname,
      error_type: payload.error_type || 'js_error',
      error_message: sanitise(payload.error_message)?.slice(0, 2000),
      stack_trace: sanitise(payload.stack_trace)?.slice(0, 8000),
      component_name: payload.component_name || null,
      browser: navigator.userAgent,
      session_id: sessionId(),
      device_type: /Mobi|Android/i.test(navigator.userAgent) ? 'mobile' : 'desktop',
    }

    try {
      await db.from('system_error_log').insert(row)
    } catch {
      // circuit breaker — silent fail
    }
  }

  function init() {
    window.addEventListener('error', (e) => {
      report({ error_type: 'js_error', error_message: e.message, stack_trace: e.error?.stack })
    })
    window.addEventListener('unhandledrejection', (e) => {
      report({ error_type: 'js_error', error_message: String(e.reason), stack_trace: e.reason?.stack })
    })
  }

  function wrapSupabaseClient(client, systemName) {
    const origFrom = client.from.bind(client)
    client.from = (table) => {
      const builder = origFrom(table)
      const origThen = builder.then?.bind(builder)
      if (origThen) {
        builder.then = (...args) =>
          origThen(...args).then((result) => {
            if (result.error) {
              report({
                error_type: result.error.code === '42501' ? 'rls_error' : 'api_error',
                error_message: `${table}: ${result.error.message}`,
                stack_trace: result.error.details,
              })
            }
            return result
          })
      }
      return builder
    }
    return client
  }

  return { report, init, wrapSupabaseClient }
}
