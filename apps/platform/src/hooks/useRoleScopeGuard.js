import { useEffect, useRef, useState } from 'react'
import { platformDb } from '@nidus/supabase'
import { resolveUserRoleScopes } from '../utils/menuLayoutUtils'

/**
 * Blocks a role-scoped Layout from rendering ANY of its chrome (sidebar included) when the
 * signed-in user's role doesn't grant the scope that Layout is about to render — the fix for
 * "PM navigates into a /pmo/... page and the PMO sidebar mounts anyway". Every role-scoped
 * Layout must call this and only render its MenuProvider/Sidebar once status === 'allowed'.
 *
 * Users with no scope-bearing role at all resolve to 'allowed' (fail open) — this hook decides
 * which SIDEBAR renders, not data access; RLS and each page's own permission checks remain the
 * real access boundary. Blocking here is purely to stop the wrong menu chrome from appearing.
 *
 * @param {'pmo' | 'pm' | 'tm'} requiredScope
 * @returns {{ status: 'loading' | 'allowed' | 'blocked', scopes: string[] }}
 */
export function useRoleScopeGuard(requiredScope) {
  const [state, setState] = useState({ status: 'loading', scopes: [] })
  const requiredRef = useRef(requiredScope)
  requiredRef.current = requiredScope

  useEffect(() => {
    let cancelled = false

    async function resolve() {
      const { data } = await platformDb.auth.getSession()
      const authUser = data?.session?.user || null
      if (!authUser) {
        // ProtectedRoute (mounted above every role-scoped Layout) already redirects unauthenticated
        // users away — reaching here with no session is a transient gap while that redirect lands.
        if (!cancelled) setState({ status: 'loading', scopes: [] })
        return
      }

      const scopes = await resolveUserRoleScopes(authUser)
      if (cancelled) return
      const allowed = scopes.length === 0 || scopes.includes(requiredRef.current)
      setState({ status: allowed ? 'allowed' : 'blocked', scopes })
    }

    resolve()
    return () => {
      cancelled = true
    }
  }, [requiredScope])

  return state
}
