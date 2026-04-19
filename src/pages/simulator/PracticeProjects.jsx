/**
 * Practice Projects List Page
 * Lists user's practice projects in simulator — card grid or table, searchable (both views).
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { FolderKanban, Plus, Search } from 'lucide-react'
import { simDb } from '../../services/supabase/supabaseClient'
import { getMyPracticeProjects } from '../../services/sim/practiceProjectService'
import ExportListMenu from '../../components/ui/ExportListMenu'
import { useViewMode } from '../../hooks/useViewMode'
import ViewToggle from '../../components/ui/ViewToggle'

const PRACTICE_PROJECT_COLUMNS = [
  { key: 'project_name', label: 'Name' },
  { key: 'project_code', label: 'Code' },
  { key: 'project_description', label: 'Description' },
  { key: 'health_status', label: 'Health' }
]

function formatShortDate(iso) {
  if (!iso) return ''
  try {
    return new Date(iso).toLocaleDateString()
  } catch {
    return ''
  }
}

function PracticeProjectGridCard({ project, onSelect }) {
  const status = project.project_status
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onSelect(project)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onSelect(project)
        }
      }}
      className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 cursor-pointer hover:border-blue-500 dark:hover:border-purple-500 transition-colors text-left"
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{project.project_name}</h3>
        {project.project_code && (
          <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded shrink-0 font-mono">
            {project.project_code}
          </span>
        )}
      </div>
      {project.project_description && (
        <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2 mb-4">{project.project_description}</p>
      )}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        {status?.status_name && (
          <span
            className="px-2 py-1 text-xs rounded text-white"
            style={{ backgroundColor: status.status_color || '#6B7280' }}
          >
            {status.status_name}
          </span>
        )}
        <span
          className={`px-2 py-1 text-xs rounded ${
            project.health_status === 'green'
              ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300'
              : project.health_status === 'amber'
                ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300'
                : 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300'
          }`}
        >
          {project.health_status || 'N/A'}
        </span>
      </div>
    </div>
  )
}

function PracticeProjectTableRow({ project, onSelect }) {
  const status = project.project_status
  const created = formatShortDate(project.created_at)
  return (
    <tr
      role="button"
      tabIndex={0}
      onClick={() => onSelect(project)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onSelect(project)
        }
      }}
      className="hover:bg-gray-50 dark:hover:bg-gray-700/30 cursor-pointer border-t border-gray-200 dark:border-gray-700"
    >
      <td className="px-4 py-3">
        <div className="text-gray-900 dark:text-white font-medium">{project.project_name}</div>
        {project.project_description && (
          <div className="text-sm text-gray-500 dark:text-gray-400 line-clamp-1">{project.project_description}</div>
        )}
      </td>
      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300 whitespace-nowrap">
        {project.project_code ? (
          <span className="text-xs font-mono bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">{project.project_code}</span>
        ) : (
          '—'
        )}
      </td>
      <td className="px-4 py-3">
        {status?.status_name ? (
          <span
            className="px-2 py-1 text-xs rounded text-white"
            style={{ backgroundColor: status.status_color || '#6B7280' }}
          >
            {status.status_name}
          </span>
        ) : (
          <span className="text-gray-400">—</span>
        )}
      </td>
      <td className="px-4 py-3">
        <span
          className={`px-2 py-1 text-xs rounded ${
            project.health_status === 'green'
              ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300'
              : project.health_status === 'amber'
                ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300'
                : 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300'
          }`}
        >
          {project.health_status || 'N/A'}
        </span>
      </td>
      <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">{created || '—'}</td>
    </tr>
  )
}

export default function PracticeProjects() {
  const navigate = useNavigate()
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [listLoading, setListLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [userId, setUserId] = useState(null)
  const [viewMode, setViewMode] = useViewMode('simulator-practice-projects', 'grid')
  const loadGenRef = useRef(0)

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchTerm), 300)
    return () => clearTimeout(t)
  }, [searchTerm])

  const loadUser = useCallback(async () => {
    try {
      const {
        data: { user }
      } = await simDb.auth.getUser()
      if (!user) {
        navigate('/auth/login')
        return
      }
      const { data: userRecord } = await simDb.from('users').select('id').eq('auth_user_id', user.id).single()
      if (userRecord) setUserId(userRecord.id)
    } catch (error) {
      console.error('Error loading user:', error)
    } finally {
      setLoading(false)
    }
  }, [navigate])

  useEffect(() => {
    loadUser()
  }, [loadUser])

  useEffect(() => {
    if (!userId) return
    const ac = new AbortController()
    const gen = ++loadGenRef.current
    ;(async () => {
      setListLoading(true)
      try {
        const result = await getMyPracticeProjects(userId, {}, { signal: ac.signal })
        if (ac.signal.aborted || gen !== loadGenRef.current) return
        if (result.aborted) return
        if (result.success) {
          setProjects(result.data || [])
        }
      } catch (e) {
        if (!ac.signal.aborted) console.error('Error loading practice projects:', e)
      } finally {
        if (!ac.signal.aborted && gen === loadGenRef.current) setListLoading(false)
      }
    })()
    return () => ac.abort()
  }, [userId])

  const filteredProjects = useMemo(() => {
    const q = debouncedSearch.trim().toLowerCase()
    if (!q) return projects
    return projects.filter((p) => {
      const name = p.project_name?.toLowerCase() ?? ''
      const desc = p.project_description?.toLowerCase() ?? ''
      const code = p.project_code?.toLowerCase() ?? ''
      const health = p.health_status?.toLowerCase() ?? ''
      const st = p.project_status?.status_name?.toLowerCase() ?? ''
      return name.includes(q) || desc.includes(q) || code.includes(q) || health.includes(q) || st.includes(q)
    })
  }, [projects, debouncedSearch])

  const exportRows = useMemo(
    () =>
      filteredProjects.map((p) => ({
        ...p,
        health_status: p.health_status ?? ''
      })),
    [filteredProjects]
  )

  const goToProject = useCallback(
    (project) => {
      if (project?.id) navigate(`/simulator/practice-projects/${project.id}`)
    },
    [navigate]
  )

  const showSkeleton = listLoading && projects.length === 0
  const showUpdating = listLoading && projects.length > 0

  if (loading && !userId) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-400">
        Loading...
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-start">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Practice Projects</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Manage your practice projects for learning
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <ExportListMenu
            columns={PRACTICE_PROJECT_COLUMNS}
            data={exportRows}
            baseFilename="PracticeProjects"
            disabled={filteredProjects.length === 0}
          />
          <button
            type="button"
            onClick={() => navigate('/simulator/practice-projects/create')}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
          >
            <Plus className="h-5 w-5 mr-2" />
            Create Practice Project
          </button>
        </div>
      </div>

      <div className="mb-6 flex flex-wrap items-center gap-4 justify-between">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
          <input
            type="search"
            placeholder="Search projects..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            autoComplete="off"
            aria-label="Search practice projects"
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-purple-500"
          />
        </div>
        <ViewToggle
          value={viewMode}
          onChange={setViewMode}
          ariaLabel="Practice project list layout"
        />
      </div>

      {showUpdating && (
        <p className="text-xs text-purple-400 mb-3 animate-pulse" aria-live="polite">
          Updating list…
        </p>
      )}

      {showSkeleton ? (
        viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
            {[1, 2, 3, 4, 5, 6].map((k) => (
              <div key={k} className="bg-gray-200 dark:bg-gray-800 rounded-lg border border-gray-300 dark:border-gray-700 h-40" />
            ))}
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden animate-pulse">
            <div className="h-10 bg-gray-200 dark:bg-gray-700/50" />
            {[1, 2, 3, 4, 5].map((k) => (
              <div key={k} className="h-14 border-t border-gray-200 dark:border-gray-700" />
            ))}
          </div>
        )
      ) : filteredProjects.length === 0 ? (
        <div className="text-center py-12 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
          <FolderKanban className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No practice projects</h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {searchTerm.trim()
              ? 'No projects match your search.'
              : 'Get started by creating a new practice project.'}
          </p>
        </div>
      ) : viewMode === 'grid' ? (
        <div
          className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 ${showUpdating ? 'opacity-75 transition-opacity' : ''}`}
        >
          {filteredProjects.map((project) => (
            <PracticeProjectGridCard key={project.id} project={project} onSelect={goToProject} />
          ))}
        </div>
      ) : (
        <div
          className={`bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden ${
            showUpdating ? 'opacity-75 transition-opacity' : ''
          }`}
        >
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-100 dark:bg-gray-700/50">
                <tr>
                  <th className="px-4 py-3 text-xs font-medium text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                    Project
                  </th>
                  <th className="px-4 py-3 text-xs font-medium text-gray-600 dark:text-gray-300 uppercase tracking-wider whitespace-nowrap">
                    Code
                  </th>
                  <th className="px-4 py-3 text-xs font-medium text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 py-3 text-xs font-medium text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                    Health
                  </th>
                  <th className="px-4 py-3 text-xs font-medium text-gray-600 dark:text-gray-300 uppercase tracking-wider whitespace-nowrap">
                    Created
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {filteredProjects.map((project) => (
                  <PracticeProjectTableRow key={project.id} project={project} onSelect={goToProject} />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
