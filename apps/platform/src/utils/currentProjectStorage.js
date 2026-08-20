/**
 * Shared localStorage key for the PM area's "current project" selection
 * (CurrentProjectContext writes it, usePlatformProjectId reads it as a fallback when a route
 * has no project path param or ?projectId= query param — e.g. sidebar-driven /pm/* navigation).
 * Deliberately not namespaced per auth user — this is a convenience default, not an access
 * boundary; RLS governs actual data access regardless of which project id is requested.
 */
export const CURRENT_PM_PROJECT_STORAGE_KEY = 'nidus_pm_current_project_id'

export function readCurrentPmProjectId() {
  if (typeof window === 'undefined') return null
  try {
    return window.localStorage.getItem(CURRENT_PM_PROJECT_STORAGE_KEY) || null
  } catch {
    return null
  }
}

export function writeCurrentPmProjectId(projectId) {
  if (typeof window === 'undefined') return
  try {
    if (projectId) window.localStorage.setItem(CURRENT_PM_PROJECT_STORAGE_KEY, projectId)
    else window.localStorage.removeItem(CURRENT_PM_PROJECT_STORAGE_KEY)
  } catch {
    // localStorage unavailable (private mode, quota) — non-fatal, selection just won't persist
  }
}
