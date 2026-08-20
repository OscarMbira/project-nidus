import { useEffect, useState } from 'react'
import { platformDb } from '@nidus/supabase'
import { userHasAnyRole } from '@nidus/shared/utils/menuLayoutUtils'

/**
 * Fine-grained, exact-role-name gate for pages narrower than a whole layout scope (e.g. Form
 * Template Builder needs specifically pmo_admin/org_admin/system_admin/super_admin, not "any
 * PMO-scope role" — see Documentation/Role_Scoped_Routing_Guide.md). For pages whose access
 * check is embedded in an async data-loading sequence rather than a simple render gate, call
 * `userHasAnyRole()` directly instead of this component.
 */
export default function RequireRole({ roles, children, fallback = null }) {
  const [status, setStatus] = useState('loading')

  useEffect(() => {
    let cancelled = false
    async function check() {
      const { data } = await platformDb.auth.getSession()
      const authUser = data?.session?.user || null
      if (!authUser) {
        if (!cancelled) setStatus('blocked')
        return
      }
      const allowed = await userHasAnyRole(authUser, roles)
      if (!cancelled) setStatus(allowed ? 'allowed' : 'blocked')
    }
    check()
    return () => {
      cancelled = true
    }
  }, [roles])

  if (status === 'loading') return null
  if (status === 'blocked') return fallback
  return children
}
