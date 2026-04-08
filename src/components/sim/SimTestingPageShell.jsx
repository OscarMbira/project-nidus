import { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { FlaskConical, ChevronLeft } from 'lucide-react'
import { simDb } from '../../services/supabase/supabaseClient'
import { getMyPracticeProjects } from '../../services/sim/practiceProjectService'
import SearchableProjectSelect from '../testing/SearchableProjectSelect'

const STORAGE_KEY = 'nidus-sim-testing-practice-project-id'

/**
 * Simulator Testing & QA shell: practice project picker (sim.practice_projects).
 */
export default function SimTestingPageShell({ title, subtitle, children }) {
  const [projects, setProjects] = useState([])
  const [projectId, setProjectId] = useState(() => localStorage.getItem(STORAGE_KEY) || '')

  const loadProjects = useCallback(async () => {
    const {
      data: { user },
    } = await simDb.auth.getUser()
    if (!user) return
    const u = await simDb.from('users').select('id').eq('auth_user_id', user.id).maybeSingle()
    if (!u.data?.id) return
    const res = await getMyPracticeProjects(u.data.id)
    if (res.success) setProjects(res.data || [])
  }, [])

  useEffect(() => {
    loadProjects()
  }, [loadProjects])

  useEffect(() => {
    if (projectId) localStorage.setItem(STORAGE_KEY, projectId)
    else localStorage.removeItem(STORAGE_KEY)
  }, [projectId])

  const selected = projects.find((p) => p.id === projectId)

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <div className="border-b border-gray-800 bg-gray-950 sticky top-0 z-20 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex flex-col sm:flex-row sm:items-center gap-4 sm:justify-between">
          <div className="flex items-start gap-3">
            <Link
              to="/simulator/dashboard"
              className="mt-1 p-1 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800"
              aria-label="Back to simulator dashboard"
            >
              <ChevronLeft className="h-5 w-5" />
            </Link>
            <div>
              <div className="flex items-center gap-2 text-emerald-400">
                <FlaskConical className="h-5 w-5" />
                <span className="text-xs font-semibold uppercase tracking-wide">Practice Testing &amp; QA</span>
              </div>
              <h1 className="text-xl font-bold text-white mt-0.5">{title}</h1>
              {subtitle && <p className="text-sm text-gray-400 mt-1">{subtitle}</p>}
            </div>
          </div>
          <div className="flex flex-col sm:items-end gap-1 w-full sm:w-auto">
            <SearchableProjectSelect
              id="sim-testing-project-select"
              label="Practice project"
              projects={projects}
              value={projectId}
              onChange={setProjectId}
              emptyLabel="Select a practice project…"
              searchPlaceholder="Search practice project…"
            />
          </div>
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-4 py-6">{children({ projectId, projectLabel: selected })}</div>
    </div>
  )
}
