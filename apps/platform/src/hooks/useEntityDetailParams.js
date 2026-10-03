import { useState, useEffect } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { resolveEntityId, getEntityCode } from '../utils/entityRouteParam'
import { isLikelyDatabaseUuid } from '../utils/isUuid'

/**
 * Resolves a `/platform/projects/:projectParam/.../:entityParam` route to real UUIDs for data
 * fetching, and self-corrects the address bar from raw UUIDs to friendly codes once resolvable
 * — the detail-page counterpart to usePlatformProjectId() for the /pm/controls/* query-param
 * pattern (v872). See ENTITY_URL_REGISTRY / entityRouteParam.js and CLAUDE.md rule 16.1.
 *
 * @param {string} entityType - key into ENTITY_URL_REGISTRY (must have scopeColumn: 'project_id')
 * @param {{ projectParam?: string, entityParam?: string, newValue?: string }} [options]
 *   entityParam omitted for list pages that only need the project resolved.
 *   newValue (default 'new') is passed through as-is, not resolved as a code/uuid.
 */
export function useEntityDetailParams(entityType, options = {}) {
  const { projectParam = 'projectId', entityParam = null, newValue = 'new' } = options
  const params = useParams()
  const navigate = useNavigate()
  const location = useLocation()

  const rawProject = params[projectParam] ? decodeURIComponent(params[projectParam]) : null
  const rawEntity = entityParam && params[entityParam] != null ? decodeURIComponent(params[entityParam]) : null
  const isNew = entityParam != null && rawEntity === newValue

  const [state, setState] = useState({ projectId: null, entityId: null, loading: true, error: null })

  useEffect(() => {
    let cancelled = false

    if (!rawProject) {
      setState({ projectId: null, entityId: null, loading: false, error: 'missing' })
      return undefined
    }

    setState((s) => ({ ...s, loading: true, error: null }))

    ;(async () => {
      const projectId = await resolveEntityId('project', rawProject)
      if (cancelled) return
      if (!projectId) {
        setState({ projectId: null, entityId: null, loading: false, error: 'not_found' })
        return
      }
      if (!entityParam || isNew) {
        setState({ projectId, entityId: isNew ? newValue : null, loading: false, error: null })
        return
      }
      if (rawEntity == null) {
        setState({ projectId, entityId: null, loading: false, error: null })
        return
      }
      const entityId = await resolveEntityId(entityType, rawEntity, projectId)
      if (cancelled) return
      setState({ projectId, entityId, loading: false, error: entityId ? null : 'not_found' })
    })()

    return () => {
      cancelled = true
    }
  }, [entityType, rawProject, rawEntity, entityParam, isNew, newValue])

  // Self-correct the address bar: once both segments resolve, rewrite any raw-UUID segment to
  // its friendly code. Idempotent — once corrected, isLikelyDatabaseUuid is false and this no-ops.
  useEffect(() => {
    if (state.loading || !state.projectId) return undefined
    const needsProjectFix = isLikelyDatabaseUuid(rawProject)
    const needsEntityFix = entityParam && !isNew && rawEntity && isLikelyDatabaseUuid(rawEntity)
    if (!needsProjectFix && !needsEntityFix) return undefined

    let cancelled = false
    ;(async () => {
      const [projectCode, entityCode] = await Promise.all([
        needsProjectFix ? getEntityCode('project', state.projectId) : Promise.resolve(null),
        needsEntityFix && state.entityId ? getEntityCode(entityType, state.entityId, state.projectId) : Promise.resolve(null),
      ])
      if (cancelled) return
      if (needsProjectFix && !projectCode) return
      if (needsEntityFix && !entityCode) return

      let nextPath = location.pathname
      if (needsProjectFix && projectCode && projectCode !== rawProject) {
        nextPath = nextPath.replace(encodeURIComponent(rawProject), encodeURIComponent(projectCode))
      }
      if (needsEntityFix && entityCode && entityCode !== rawEntity) {
        nextPath = nextPath.replace(encodeURIComponent(rawEntity), encodeURIComponent(entityCode))
      }
      if (nextPath !== location.pathname) {
        navigate(`${nextPath}${location.search}`, { replace: true })
      }
    })()
    return () => {
      cancelled = true
    }
  }, [state.loading, state.projectId, state.entityId, rawProject, rawEntity, entityType, entityParam, isNew, location.pathname, location.search, navigate])

  return {
    /** Resolved project UUID for Supabase queries */
    projectId: state.projectId,
    /** Resolved entity UUID (or the literal `newValue`, e.g. 'new') for Supabase queries */
    entityId: state.entityId,
    /** Decoded project route segment (code or uuid), preserved for building sibling links */
    projectRouteKey: rawProject,
    /** Decoded entity route segment (code or uuid), preserved for building sibling links */
    entityRouteKey: rawEntity,
    loading: state.loading,
    error: state.error,
  }
}
