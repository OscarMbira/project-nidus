/**
 * v1342 (D8) — the old core Environments pages (Testing & QA) now redirect to the one
 * Environments register, so bookmarks and links from test suites and runs keep working.
 * Platform: /platform/testing/environments… · Simulator: /simulator/practice-testing/environments…
 */
import { Navigate, useLocation, useParams } from 'react-router-dom'
import { environmentsRedirectPath } from '@nidus/shared/utils/environmentRegister'

/** Local-storage key of the Simulator testing pages' practice project (SimTestingPageShell). */
export const SIM_TESTING_PROJECT_STORAGE_KEY = 'nidus-sim-testing-practice-project-id'

function readPracticeProjectId() {
  try {
    return localStorage.getItem(SIM_TESTING_PROJECT_STORAGE_KEY) || null
  } catch {
    return null
  }
}

/** @param {{ app?: 'platform'|'simulator', mode?: 'view'|'edit'|'new' }} props */
export default function EnvironmentsRegisterRedirect({ app = 'platform', mode = 'view' }) {
  const { environmentKey = '' } = useParams()
  const { search } = useLocation()
  const to = environmentsRedirectPath({
    app,
    mode,
    environmentKey,
    search,
    practiceProjectId: app === 'simulator' ? readPracticeProjectId() : null,
  })
  return <Navigate to={to} replace />
}
