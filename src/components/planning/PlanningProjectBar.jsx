import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { platformDb, simDb } from '../../services/supabase/supabaseClient'
import { getMyProjects } from '../../services/projectService'
import { listProjectsForMemberManagement } from '../../services/projectMembershipService'

const PROJECTS_LIMIT = 500

/**
 * Load projects for the planning hub selector (membership, PMO-wide, then RLS-visible fallback).
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

  const managed = await listProjectsForMemberManagement(internalUserId, authUserId)
  if (managed.success && managed.data?.length) {
    return managed.data
  }

  if (internalUserId) {
    const mine = await getMyProjects(internalUserId)
    if (mine.success && mine.data?.length) {
      return mine.data
    }
  }

  const { data: rows, error } = await platformDb
    .from('projects')
    .select('id, project_name, project_code')
    .eq('is_deleted', false)
    .order('project_name', { ascending: true })
    .limit(PROJECTS_LIMIT)

  if (error) throw error
  return rows || []
}

/**
 * Project selector for planning module. Persists ?projectId= in URL.
 * @param {{ isSim?: boolean }} props
 */
export default function PlanningProjectBar({ isSim = false }) {
  const [searchParams, setSearchParams] = useSearchParams()
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)

  const projectId = searchParams.get('projectId') || ''

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

  const onChange = (e) => {
    const id = e.target.value
    const next = new URLSearchParams(searchParams)
    if (id) next.set('projectId', id)
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
        <label className="text-sm font-medium text-gray-300 whitespace-nowrap">
          {isSim ? 'Practice project' : 'Project'}
        </label>
        <select
          value={projectId}
          onChange={onChange}
          disabled={loading || (!loading && projects.length === 0)}
          className="max-w-md rounded-lg border border-gray-600 bg-gray-900 text-gray-100 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 disabled:opacity-60"
        >
          <option value="">
            {loading ? 'Loading projects…' : projects.length === 0 ? 'No projects available' : 'Select a project…'}
          </option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {formatLabel(p)}
            </option>
          ))}
        </select>
      </div>
      {loadError && (
        <p className="text-sm text-red-400">{loadError}</p>
      )}
      {!loading && !loadError && projects.length === 0 && (
        <p className="text-sm text-gray-500">
          No projects found. Create a project or ask your administrator to assign you to one.
        </p>
      )}
</div>
  )
}

export function usePlanningProjectId() {
  const [searchParams] = useSearchParams()
  return searchParams.get('projectId') || ''
}
