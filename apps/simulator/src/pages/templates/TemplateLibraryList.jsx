import { Link, Navigate, useSearchParams } from 'react-router-dom'
import { usePlatformProjectId } from '@nidus/shared/hooks/usePlatformProjectId.js'

/**
 * Redirect hub for Organisational Templates (Simulator PM).
 * v851: preserves domainGroup (and other) query params through the redirect.
 * Route: /simulator/templates
 */
export default function TemplateLibraryList() {
  const { projectId, loading } = usePlatformProjectId()
  const [searchParams] = useSearchParams()

  if (loading) {
    return <div className="p-8 text-gray-600 dark:text-gray-400">Loading…</div>
  }

  if (!projectId) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12 text-center text-gray-700 dark:text-gray-300">
        <p>Select a project first to browse and customise its templates.</p>
        <Link
          to="/simulator/practice-projects"
          className="mt-4 inline-block text-blue-600 hover:underline dark:text-blue-400"
        >
          Go to Projects
        </Link>
      </div>
    )
  }

  const next = new URLSearchParams(searchParams)
  next.set('entityType', 'project')
  next.set('entityId', projectId)

  return (
    <Navigate
      to={`/simulator/pm/templates/organisational?${next.toString()}`}
      replace
    />
  )
}
