/**
 * Project Charter → same Brief document with Charter labels/URLs.
 */
import { Navigate } from 'react-router-dom'
import { usePlatformProjectId } from '@nidus/shared/hooks/usePlatformProjectId.js'
import { briefCharterDocPath } from '@nidus/shared/utils/briefCharterTerminology.js'

const CHARTER_LIST = '/pm/initiation/project-charter'

/**
 * @param {{ mode?: 'list' | 'create' | 'view' | 'edit' }} props
 */
export default function ProjectCharterToBriefRedirect({ mode = 'list' }) {
  const { projectId, routeKey, loading } = usePlatformProjectId()

  if (loading) {
    return (
      <div className="flex items-center justify-center h-40">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    )
  }

  const key = routeKey || projectId

  if (mode === 'list' || !key) {
    return <Navigate to={CHARTER_LIST} replace />
  }

  return <Navigate to={briefCharterDocPath(key, mode === 'edit' ? 'edit' : mode === 'view' ? 'view' : 'create', 'charter')} replace />
}
