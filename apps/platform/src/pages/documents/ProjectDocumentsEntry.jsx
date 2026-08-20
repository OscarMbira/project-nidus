import { Suspense, lazy, useEffect } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { usePlatformProjectId } from '@nidus/shared/hooks/usePlatformProjectId.js'

const ProjectDocumentsRegisterPage = lazy(() =>
  import('@nidus/pmo-module/pages/ProjectDocumentsRegisterPage.jsx'),
)

/**
 * PM Project Documents entry — ensures project entity context, then renders the register.
 * Route: /platform/documents/project
 *
 * Syncs ?entityType=&entityId= in the background so the register can start loading
 * immediately (no Navigate remount delay).
 */
export default function ProjectDocumentsEntry() {
  const { projectId, loading } = usePlatformProjectId()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

  const hasEntity =
    !!projectId &&
    searchParams.get('entityType') === 'project' &&
    searchParams.get('entityId') === projectId

  useEffect(() => {
    if (!projectId || hasEntity) return
    navigate(
      `/platform/documents/project?entityType=project&entityId=${encodeURIComponent(projectId)}`,
      { replace: true },
    )
  }, [projectId, hasEntity, navigate])

  if (loading) {
    return <div className="p-8 text-gray-600 dark:text-gray-400">Loading…</div>
  }

  if (!projectId) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12 text-center text-gray-700 dark:text-gray-300">
        <p>Select a project first to view and capture its process documents.</p>
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
    <Suspense fallback={<div className="p-8 text-gray-600 dark:text-gray-400">Loading…</div>}>
      <ProjectDocumentsRegisterPage />
    </Suspense>
  )
}
