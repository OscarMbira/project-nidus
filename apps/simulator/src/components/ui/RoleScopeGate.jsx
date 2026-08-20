import { Navigate, useLocation } from 'react-router-dom'
import { useRoleScopeGuard } from '@nidus/shared/hooks/useRoleScopeGuard'

/**
 * Wraps a role-scoped Layout (PMOLayout/PMLayout/etc). Renders `children` (which should include
 * that Layout's MenuProvider + Sidebar) only once the signed-in user's role is confirmed to grant
 * `requiredScope` — so the wrong sidebar can never mount, not even for one frame, while loading
 * or when blocked. On block, redirects to `blockedRedirectTo` — a home in a *different* scope
 * the user can open (never this Layout's own URL, or Navigate loops into a blank page).
 */
export default function RoleScopeGate({ requiredScope, blockedRedirectTo, children }) {
  const { status } = useRoleScopeGuard(requiredScope)
  const location = useLocation()

  if (status === 'loading') {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div
          className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"
          aria-hidden="true"
        />
      </div>
    )
  }

  if (status === 'blocked') {
    const target = blockedRedirectTo || '/'
    const targetPath = String(target).split('?')[0]
    // Same-path redirect = infinite remount (blank chrome). Fall back outside this shell.
    if (!targetPath || targetPath === location.pathname) {
      const fallback = location.pathname.startsWith('/simulator')
        ? '/simulator/dashboard'
        : '/platform/dashboard'
      return <Navigate to={fallback} replace />
    }
    return <Navigate to={target} replace />
  }

  return children
}
