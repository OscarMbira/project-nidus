import { useEffect, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { usePlatformProjectId } from '@nidus/shared/hooks/usePlatformProjectId.js'
import { resolveProjectRouteKeyFromId } from '@nidus/shared/utils/projectRouteParam.js'
import { buildPmTemplatesListPath } from '@nidus/shared/utils/organisationalTemplateRoutes.js'

/**
 * v848 / v864 — Simulator Process Templates Hub → Project Templates
 * at /simulator/pm/templates/project/<projectKey>.
 */
export default function ProcessTemplatesLandingRedirect() {
  const { projectId, loading } = usePlatformProjectId()
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
      <div className="mx-auto max-w-3xl px-4 py-12 text-center text-gray-700 dark:text-gray-300">
        <p>Select a practice project first to capture process-document data under Project Templates.</p>
        <Link
          to="/simulator/practice-projects"
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
        pathname: '/simulator/pm/templates/project',
        listVariant: 'project',
        projectKey,
      })}
      replace
    />
  )
}
