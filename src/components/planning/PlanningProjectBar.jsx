import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { platformDb, simDb } from '@nidus/supabase'
import { getMyProjects } from '../../services/projectService'
import {
  looksLikeProjectUuid,
  resolveProjectRouteKeyFromId,
} from '@nidus/shared/utils/projectRouteParam'

/**
 * Load projects assigned to the logged-in user (membership / PM / project role).
 * Does not list organisation-wide or unassigned projects.
 */
async function loadPlanningProjectOptions(authUserId, internalUserId, isSim) {
  if (isSim) {
    const { data: pp, error } = await simDb
      .from('practice_projects')
      .select('id, project_name, project_code')
      .eq('user_id', authUserId)
      .order('created_at', { ascending: false })
    if (error) throw error
    return pp || []
  }

  if (!internalUserId) return []

  const mine = await getMyProjects(internalUserId)
  if (!mine.success) {
    throw new Error(mine.error || 'Failed to load assigned projects')
  }

  const rows = mine.data || []
  return [...rows].sort((a, b) =>
    String(a.project_name || '').localeCompare(String(b.project_name || ''), undefined, {
      sensitivity: 'base',
    }),
  )
}

/** Prefer friendly project_code in ?projectId= (rule 16.1); fall back to UUID. */
function projectOptionValue(p) {
  const code = p?.project_code != null ? String(p.project_code).trim() : ''
  return code || p?.id || ''
}

/**
 * Project selector for planning module. Persists ?projectId= in URL (code when available).
 * @param {{ isSim?: boolean }} props
 */
export default function PlanningProjectBar({ isSim = false }) {
  const [searchParams, setSearchParams] = useSearchParams()
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)

  const rawProjectId = searchParams.get('projectId') || ''

  const selectedValue = useMemo(() => {
    if (!rawProjectId) return ''
    const match = projects.find(
      (p) =>
        p.id === rawProjectId ||
        String(p.project_code || '').trim() === rawProjectId,
    )
    return match ? projectOptionValue(match) : rawProjectId
  }, [rawProjectId, projects])

  useEffect(() => {
    let cancelled = false

    ;(async () => {
      setLoading(true)
      setLoadError(null)
      try {
        const {
          data: { user: authUser },
          error: authError,
        } = await platformDb.auth.getUser()

        if (authError) throw authError
        if (!authUser) {
          if (!cancelled) setProjects([])
          return
        }

        let internalUserId = null
        if (!isSim) {
          const { data: userRow } = await platformDb
            .from('users')
            .select('id')
            .eq('auth_user_id', authUser.id)
            .maybeSingle()
          internalUserId = userRow?.id ?? null
        }

        const list = await loadPlanningProjectOptions(authUser.id, internalUserId, isSim)
        if (!cancelled) setProjects(list)
      } catch (e) {
        console.error('PlanningProjectBar:', e)
        if (!cancelled) {
          setProjects([])
          setLoadError(e?.message || 'Failed to load projects')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [isSim])

  // Self-correct raw UUID in the address bar to project_code when resolvable
  useEffect(() => {
    if (isSim || !rawProjectId || !looksLikeProjectUuid(rawProjectId)) return
    let cancelled = false
    ;(async () => {
      const friendly = await resolveProjectRouteKeyFromId(rawProjectId)
      if (cancelled || !friendly || friendly === rawProjectId) return
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev)
          next.set('projectId', friendly)
          return next
        },
        { replace: true },
      )
    })()
    return () => {
      cancelled = true
    }
  }, [isSim, rawProjectId, setSearchParams])

  const onChange = (e) => {
    const key = e.target.value
    const next = new URLSearchParams(searchParams)
    if (key) next.set('projectId', key)
    else next.delete('projectId')
    setSearchParams(next, { replace: true })
  }

  const formatLabel = (p) => {
    const code = p.project_code ? `${p.project_code} — ` : ''
    return `${code}${p.project_name || p.id}`.trim()
  }

  return (
    <div className="mb-6 flex flex-col gap-2">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <label className="text-sm font-medium text-gray-700 dark:text-gray-200 whitespace-nowrap">
          {isSim ? 'Practice Project' : 'Project'}
        </label>
        <select
          value={selectedValue}
          onChange={onChange}
          disabled={loading || (!loading && projects.length === 0)}
          className="max-w-md rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 disabled:opacity-60"
        >
          <option value="">
            {loading ? 'Loading projects…' : projects.length === 0 ? 'No projects available' : 'Select a project…'}
          </option>
          {projects.map((p) => (
            <option key={p.id} value={projectOptionValue(p)}>
              {formatLabel(p)}
            </option>
          ))}
        </select>
      </div>
      {loadError && (
        <p className="text-sm text-red-600 dark:text-red-400">{loadError}</p>
      )}
      {!loading && !loadError && projects.length === 0 && (
        <p className="text-sm text-gray-600 dark:text-gray-300">
          No projects assigned to you. Create a project or ask your administrator to assign you to one.
        </p>
      )}
    </div>
  )
}

/**
 * Raw ?projectId= from the URL (may be project_code or UUID).
 * Prefer usePlatformProjectId() when you need a resolved UUID for API calls.
 */
export function usePlanningProjectId() {
  const [searchParams] = useSearchParams()
  return searchParams.get('projectId') || ''
}
