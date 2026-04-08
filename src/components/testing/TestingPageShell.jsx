import { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { FlaskConical, ChevronLeft } from 'lucide-react'
import { platformDb } from '../../services/supabase/supabaseClient'
import SearchableProjectSelect from './SearchableProjectSelect'

const STORAGE_KEY = 'nidus-platform-testing-project-id'
const PROJECTS_LIMIT = 300

/**
 * Shell for Testing & QA pages: project picker + dark header + children.
 */
export default function TestingPageShell({ title, subtitle, children }) {
  const [projects, setProjects] = useState([])
  const [projectId, setProjectId] = useState(() => localStorage.getItem(STORAGE_KEY) || '')

  const loadProjects = useCallback(async () => {
    const { data } = await platformDb
      .from('projects')
      .select('id, project_name, project_code')
      .eq('is_deleted', false)
      .order('project_name', { ascending: true })
      .limit(PROJECTS_LIMIT)
    setProjects(data || [])
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
              to="/platform/dashboard"
              className="mt-1 p-1 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800"
              aria-label="Back to dashboard"
            >
              <ChevronLeft className="h-5 w-5" />
            </Link>
            <div>
              <div className="flex items-center gap-2 text-emerald-400">
                <FlaskConical className="h-5 w-5" />
                <span className="text-xs font-semibold uppercase tracking-wide">Testing &amp; QA</span>
              </div>
              <h1 className="text-xl font-bold text-white mt-0.5">{title}</h1>
              {subtitle && <p className="text-sm text-gray-400 mt-1">{subtitle}</p>}
            </div>
          </div>
          <div className="flex flex-col sm:items-end gap-1 w-full sm:w-auto">
            <SearchableProjectSelect
              id="testing-project-select"
              label="Project"
              projects={projects}
              value={projectId}
              onChange={setProjectId}
              emptyLabel="Select a project…"
            />
            {selected && (
              <span className="text-[11px] text-gray-500 truncate max-w-[min(100vw-2rem,420px)] text-right">{selected.id}</span>
            )}
          </div>
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-4 py-6">{children({ projectId, projectLabel: selected })}</div>
    </div>
  )
}
