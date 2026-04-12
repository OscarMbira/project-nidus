import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { platformDb, simDb } from '../../services/supabase/supabaseClient'
import { getMyProjects } from '../../services/projectService'

/**
 * Project selector for planning module. Persists ?projectId= in URL.
 * @param {{ isSim?: boolean }} props
 */
export default function PlanningProjectBar({ isSim = false }) {
  const [searchParams, setSearchParams] = useSearchParams()
  const [userId, setUserId] = useState(null)
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)

  const projectId = searchParams.get('projectId') || ''

  useEffect(() => {
    let c = false
    ;(async () => {
      const {
        data: { user },
      } = await platformDb.auth.getUser()
      let uid = null
      if (user) {
        const { data } = await platformDb.from('users').select('id').eq('auth_user_id', user.id).maybeSingle()
        uid = data?.id || null
      }
      if (!c) setUserId(uid)
    })()
    return () => {
      c = true
    }
  }, [])

  useEffect(() => {
    if (userId == null && !isSim) return
    ;(async () => {
      setLoading(true)
      try {
        if (isSim) {
          const {
            data: { user },
          } = await platformDb.auth.getUser()
          if (!user) {
            setProjects([])
            return
          }
          const { data: pp } = await simDb
            .from('practice_projects')
            .select('id, project_name')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
          setProjects(pp || [])
        } else {
          const res = await getMyProjects(userId)
          if (res.success && res.data) setProjects(res.data)
          else setProjects([])
        }
      } finally {
        setLoading(false)
      }
    })()
  }, [userId, isSim])

  const onChange = (e) => {
    const id = e.target.value
    const next = new URLSearchParams(searchParams)
    if (id) next.set('projectId', id)
    else next.delete('projectId')
    setSearchParams(next, { replace: true })
  }

  return (
    <div className="mb-6 flex flex-col sm:flex-row sm:items-center gap-3">
      <label className="text-sm font-medium text-gray-300 whitespace-nowrap">
        {isSim ? 'Practice project' : 'Project'}
      </label>
      <select
        value={projectId}
        onChange={onChange}
        disabled={loading}
        className="max-w-md rounded-lg border border-gray-600 bg-gray-900 text-gray-100 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
      >
        <option value="">{loading ? 'Loading…' : 'Select a project…'}</option>
        {(projects || []).map((p) => (
          <option key={p.id} value={p.id}>
            {p.project_name || p.project_code || p.id}
          </option>
        ))}
      </select>
    </div>
  )
}

export function usePlanningProjectId() {
  const [searchParams] = useSearchParams()
  return searchParams.get('projectId') || ''
}
