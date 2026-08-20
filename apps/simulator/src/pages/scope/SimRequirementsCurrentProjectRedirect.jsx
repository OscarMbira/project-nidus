import { Navigate } from 'react-router-dom'
import { useCurrentProject } from '../../context/CurrentProjectContext'

/**
 * Controls & Registers has no project segment in its URLs (see v872/v879), but the Requirements
 * Register page is only routed as /simulator/practice-projects/:projectId/scope/requirements — this
 * redirects to that page for the PM area's last-selected "current project" context.
 */
export default function SimRequirementsCurrentProjectRedirect() {
  const { currentProjectId, loading } = useCurrentProject()

  if (loading) return null
  if (!currentProjectId) return <Navigate to="/simulator/practice-projects" replace />
  return <Navigate to={`/simulator/practice-projects/${currentProjectId}/scope/requirements`} replace />
}
