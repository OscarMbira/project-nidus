/**
 * Initialise client-side error reporting for Platform or Simulator.
 */
import { createClient } from '@supabase/supabase-js'
import { createErrorReporter } from './errorReportingService.js'

let errorLogDbInstance = null

function getErrorLogDb() {
  if (errorLogDbInstance) return errorLogDbInstance
  const url = import.meta.env.VITE_SUPABASE_URL
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY
  if (!url || !key) return null
  errorLogDbInstance = createClient(url, key, { db: { schema: 'admin' } })
  return errorLogDbInstance
}

export function initAppErrorReporting({ system, getAuthClient, getUser }) {
  const db = getErrorLogDb()
  if (!db) return null

  const reporter = createErrorReporter({
    db,
    system,
    getUser: async () => {
      const client = getAuthClient?.()
      if (!client) return null
      const { data: { user } } = await client.auth.getUser()
      if (!user) return null
      const profile = getUser ? await getUser(user.id) : null
      return {
        id: user.id,
        email: user.email,
        role: profile?.role || null,
      }
    },
  })

  reporter.init()

  const authClient = getAuthClient?.()
  if (authClient) reporter.wrapSupabaseClient(authClient, system)

  return reporter
}

export function reportReactError(reporter, error, errorInfo, componentName) {
  reporter?.report({
    error_type: 'render_error',
    error_message: error?.message,
    stack_trace: errorInfo?.componentStack,
    component_name: componentName,
  })
}
