import { Suspense, lazy, useEffect, useState } from 'react'
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { usePlatformProjectId } from '@nidus/shared/hooks/usePlatformProjectId.js'
import {
  looksLikeProjectUuid,
  resolveProjectIdFromRouteSegment,
  resolveProjectRouteKeyFromId,
} from '@nidus/shared/utils/projectRouteParam.js'
import {
  buildPmTemplatesListPath,
  stripLegacyTemplateEntityParams,
} from '@nidus/shared/utils/organisationalTemplateRoutes.js'

const OrganisationalTemplatesPage = lazy(() =>
  import('@nidus/pmo-module/pages/OrganisationalTemplatesPage.jsx'),
)
const OrganisationalTemplateDetailPage = lazy(() =>
  import('@nidus/pmo-module/pages/OrganisationalTemplateDetailPage.jsx'),
)

/**
 * PM Organisational Templates (v864).
 * - /platform/templates/organisational → redirect to …/organisational/<projectKey> when project known
 * - /platform/templates/organisational/:projectId → list if project, else legacy detail
 * - Detail with key: /platform/templates/organisational/:projectId/:nodeId
 */
export default function OrganisationalTemplatesEntry() {
  const { projectId, routeKey, loading } = usePlatformProjectId()
  const params = useParams()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const location = useLocation()
  const [friendlyKey, setFriendlyKey] = useState(null)
  const [segmentMode, setSegmentMode] = useState('pending')

  const pathSeg = params.projectId ? String(params.projectId) : null
  const legacyEntityId = searchParams.get('entityId')
  const hasLegacyQuery = Boolean(legacyEntityId || searchParams.get('entityType'))

  useEffect(() => {
    let cancelled = false
    const sourceId = projectId || legacyEntityId || null
    if (!sourceId) {
      setFriendlyKey(null)
      return undefined
    }
    resolveProjectRouteKeyFromId(sourceId).then((key) => {
      if (!cancelled) setFriendlyKey(key || sourceId)
    })
    return () => {
      cancelled = true
    }
  }, [projectId, legacyEntityId])

  useEffect(() => {
    let cancelled = false
    if (!pathSeg) {
      setSegmentMode(projectId ? 'list' : 'flat')
      return undefined
    }
    setSegmentMode('pending')
    ;(async () => {
      if (looksLikeProjectUuid(pathSeg) || pathSeg === friendlyKey || pathSeg === routeKey) {
        if (!cancelled) setSegmentMode('list')
        return
      }
      const id = await resolveProjectIdFromRouteSegment(pathSeg)
      if (!cancelled) setSegmentMode(id ? 'list' : 'detail')
    })()
    return () => {
      cancelled = true
    }
  }, [pathSeg, friendlyKey, routeKey, projectId])

  useEffect(() => {
    if (loading) return
    // Flat PMO-style list (no project): leave unscoped
    if (!pathSeg && !projectId && !legacyEntityId) return
    if (!friendlyKey) return
    if (pathSeg && segmentMode !== 'list') return
    if (!pathSeg && segmentMode !== 'list' && segmentMode !== 'flat') return
    if (!pathSeg && !projectId) return

    const target = buildPmTemplatesListPath({
      pathname: location.pathname,
      listVariant: 'organisational',
      projectKey: friendlyKey,
      searchParams,
    })
    const currentPath = location.pathname.replace(/\/+$/, '')
    const targetPath = target.split('?')[0]
    const needPathFix =
      !pathSeg ||
      looksLikeProjectUuid(pathSeg) ||
      pathSeg !== friendlyKey
    const needQueryFix = hasLegacyQuery
    if (!needPathFix && !needQueryFix) return
    if (currentPath === targetPath && !needQueryFix) return
    navigate(target, { replace: true })
  }, [
    loading,
    friendlyKey,
    pathSeg,
    segmentMode,
    hasLegacyQuery,
    searchParams,
    location.pathname,
    navigate,
    projectId,
    legacyEntityId,
  ])

  useEffect(() => {
    if (segmentMode !== 'detail' || !pathSeg || !friendlyKey) return
    // Only redirect legacy detail into keyed path when we have project context
    if (!projectId && !legacyEntityId) return
    const qs = stripLegacyTemplateEntityParams(searchParams).toString()
    const dest = `/platform/templates/organisational/${encodeURIComponent(friendlyKey)}/${encodeURIComponent(pathSeg)}${qs ? `?${qs}` : ''}`
    navigate(dest, { replace: true })
  }, [segmentMode, pathSeg, friendlyKey, projectId, legacyEntityId, searchParams, navigate])

  if (loading || (pathSeg && segmentMode === 'pending')) {
    return <div className="p-8 text-gray-600 dark:text-gray-400">Loading…</div>
  }

  if (pathSeg && segmentMode === 'detail') {
    return (
      <Suspense fallback={<div className="p-8 text-gray-600 dark:text-gray-400">Loading…</div>}>
        <OrganisationalTemplateDetailPage />
      </Suspense>
    )
  }

  return (
    <Suspense fallback={<div className="p-8 text-gray-600 dark:text-gray-400">Loading…</div>}>
      <OrganisationalTemplatesPage listVariant="organisational" />
    </Suspense>
  )
}
