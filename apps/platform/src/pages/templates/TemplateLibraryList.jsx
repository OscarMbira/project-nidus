import { useEffect, useState } from 'react'
import { Link, Navigate, useSearchParams } from 'react-router-dom'
import { usePlatformProjectId } from '@nidus/shared/hooks/usePlatformProjectId.js'
import { resolveProjectRouteKeyFromId } from '@nidus/shared/utils/projectRouteParam.js'
import {
  buildPmTemplatesListPath,
  stripLegacyTemplateEntityParams,
} from '@nidus/shared/utils/organisationalTemplateRoutes.js'

/**
 * Redirects legacy /platform/templates hub to Organisational Templates for the current project.
 * v864: uses /platform/templates/organisational/<projectKey> (no entityId query).
 */
export default function TemplateLibraryList() {
  const { projectId, loading } = usePlatformProjectId()
  const [searchParams] = useSearchParams()
  const [projectKey, setProjectKey] = useState(null)

  useEffect(() => {
    let cancelled = false
    if (!projectId) {
      setProjectKey(null)
      return undefined
    }
    resolveProjectRouteKeyFromId(projectId).then((key) => {
      if (!cancelled) setProjectKey(key || projectId)
    })
    return () => {
      cancelled = true
    }
  }, [projectId])

  if (loading || (projectId && !projectKey)) {
    return <div className="p-8 text-gray-600 dark:text-gray-400">Loading…</div>
  }

  if (!projectId) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12 text-center text-gray-700 dark:text-gray-300">
        <p>Select a project first to browse and customise its templates.</p>
        <Link
          to="/platform/projects"
          className="mt-4 inline-block text-blue-600 hover:underline dark:text-blue-400"
        >
          Go to Projects
        </Link>
      </div>
    )
  }

  return (
    <Navigate
      to={buildPmTemplatesListPath({
        pathname: '/platform/templates/organisational',
        listVariant: 'organisational',
        projectKey,
        searchParams: stripLegacyTemplateEntityParams(searchParams),
      })}
      replace
    />
  )
}
