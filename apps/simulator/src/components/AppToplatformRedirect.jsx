import { Navigate, useLocation } from 'react-router-dom'

/**
 * Redirect Component for Backward Compatibility
 * Redirects legacy /app/* paths to /platform/* (same app shell).
 *
 * Note: /app/project-members and /app/project-users are registered explicitly in App.jsx
 * and do not use this redirect.
 */
export default function AppToPlatformRedirect() {
  const location = useLocation()

  // Replace /app/ with /platform/ in the pathname
  const newPath = location.pathname.replace('/app/', '/platform/')

  // Preserve search params, hash, and state (e.g. fromMandate when creating project from mandate)
  const newLocation = {
    pathname: newPath,
    search: location.search,
    hash: location.hash,
    state: location.state
  }

  return <Navigate to={newLocation} replace />
}
