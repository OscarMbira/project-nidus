import { useState, useEffect, useMemo } from 'react'
import { isLikelyDatabaseUuid } from '../utils/isUuid'
import {
  resolveProjectId,
  resolveProgrammeId,
  resolvePortfolioId,
  resolveRiskId,
  resolveIssueId,
  resolveChangeRequestId,
  resolveTeamId,
  resolveScenarioId,
  resolveSimRunId,
  resolvePracticeProjectId,
  getProjectCode,
  getProgrammeCode,
  getPortfolioCode,
  getRiskCode,
  getIssueCode,
  getChangeRequestRef,
  getTeamCode,
  getScenarioCode,
  getSimRunCode,
  getPracticeProjectCode,
} from '../services/entityResolverService'

/**
 * @typedef {'project'|'programme'|'portfolio'|'risk'|'issue'|'changeRequest'|'team'|'scenario'|'simRun'|'practiceProject'} EntityType
 */

/**
 * @param {string|null|undefined} rawParam
 * @param {EntityType} entityType
 * @param {string|null|undefined} [contextId] — parent UUID (e.g. project_id for risk/issue)
 */
export function useEntityId(rawParam, entityType, contextId) {
  const segment = useMemo(() => {
    if (rawParam == null) return ''
    try {
      return decodeURIComponent(String(rawParam).trim())
    } catch {
      return String(rawParam).trim()
    }
  }, [rawParam])

  const [uuid, setUuid] = useState(null)
  const [code, setCode] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false

    if (!segment) {
      setUuid(null)
      setCode(null)
      setLoading(false)
      setError('missing')
      return () => {
        cancelled = true
      }
    }

    setError(null)

    if (
      (entityType === 'risk' || entityType === 'issue') &&
      !String(contextId || '').trim()
    ) {
      setUuid(null)
      setCode(null)
      setLoading(false)
      setError('missing_context')
      return () => {
        cancelled = true
      }
    }

    const run = async () => {
      setLoading(true)
      try {
        let resolved = null
        switch (entityType) {
          case 'project':
            resolved = await resolveProjectId(segment)
            break
          case 'programme':
            resolved = await resolveProgrammeId(segment)
            break
          case 'portfolio':
            resolved = await resolvePortfolioId(segment)
            break
          case 'risk':
            resolved = await resolveRiskId(segment, contextId)
            break
          case 'issue':
            resolved = await resolveIssueId(segment, contextId)
            break
          case 'changeRequest':
            resolved = await resolveChangeRequestId(segment)
            break
          case 'team':
            resolved = await resolveTeamId(segment)
            break
          case 'scenario':
            resolved = await resolveScenarioId(segment)
            break
          case 'simRun':
            resolved = await resolveSimRunId(segment)
            break
          case 'practiceProject':
            resolved = await resolvePracticeProjectId(segment)
            break
          default:
            resolved = null
        }
        if (cancelled) return
        if (!resolved) {
          setUuid(null)
          setCode(isLikelyDatabaseUuid(segment) ? segment : null)
          setError('not_found')
          setLoading(false)
          return
        }
        setUuid(resolved)
        let c = null
        switch (entityType) {
          case 'project':
            c = await getProjectCode(resolved)
            break
          case 'programme':
            c = await getProgrammeCode(resolved)
            break
          case 'portfolio':
            c = await getPortfolioCode(resolved)
            break
          case 'risk':
            c = await getRiskCode(resolved, contextId)
            break
          case 'issue':
            c = await getIssueCode(resolved, contextId)
            break
          case 'changeRequest':
            c = await getChangeRequestRef(resolved)
            break
          case 'team':
            c = await getTeamCode(resolved)
            break
          case 'scenario':
            c = await getScenarioCode(resolved)
            break
          case 'simRun':
            c = await getSimRunCode(resolved)
            break
          case 'practiceProject':
            c = await getPracticeProjectCode(resolved)
            break
          default:
            c = null
        }
        if (cancelled) return
        setCode(c || segment)
        setError(null)
      } catch (e) {
        if (!cancelled) {
          console.warn('useEntityId', entityType, e)
          setUuid(null)
          setCode(null)
          setError('error')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    if (isLikelyDatabaseUuid(segment)) {
      setUuid(segment)
      setLoading(true)
      ;(async () => {
        try {
          let c = null
          switch (entityType) {
            case 'project':
              c = await getProjectCode(segment)
              break
            case 'programme':
              c = await getProgrammeCode(segment)
              break
            case 'portfolio':
              c = await getPortfolioCode(segment)
              break
            case 'risk':
              c = await getRiskCode(segment, contextId)
              break
            case 'issue':
              c = await getIssueCode(segment, contextId)
              break
            case 'changeRequest':
              c = await getChangeRequestRef(segment)
              break
            case 'team':
              c = await getTeamCode(segment)
              break
            case 'scenario':
              c = await getScenarioCode(segment)
              break
            case 'simRun':
              c = await getSimRunCode(segment)
              break
            case 'practiceProject':
              c = await getPracticeProjectCode(segment)
              break
            default:
              c = null
          }
          if (!cancelled) {
            setCode(c || segment)
            setError(null)
          }
        } catch (e) {
          if (!cancelled) {
            console.warn('useEntityId code fetch', e)
            setCode(segment)
          }
        } finally {
          if (!cancelled) setLoading(false)
        }
      })()
      return () => {
        cancelled = true
      }
    }

    run()
    return () => {
      cancelled = true
    }
  }, [segment, entityType, contextId])

  return { uuid, code, loading, error }
}
