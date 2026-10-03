/**
 * Programme Projects widget (v982 Phase 5 follow-up — Programme Manager Home)
 * Child projects under the current programme — reuses the existing getProgrammeProjects()
 * (programmeService.js), not a new query.
 */
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getProgrammeProjects } from '../../../services/programmeService'
import { useCurrentProgramme } from '../../../context/CurrentProgrammeContext'
import { FolderKanban } from 'lucide-react'

export default function ProgrammeProjectsWidget() {
  const navigate = useNavigate()
  const { programmeId } = useCurrentProgramme()
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!programmeId) { setLoading(false); return }
    let cancelled = false
    ;(async () => {
      setLoading(true)
      try {
        const data = await getProgrammeProjects(programmeId)
        if (!cancelled) setProjects(data || [])
      } catch {
        if (!cancelled) setProjects([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [programmeId])

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
        <FolderKanban className="h-5 w-5 text-blue-600 dark:text-blue-400" />
        Programme Projects
      </h2>
      {loading ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">Loading…</p>
      ) : projects.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">No projects assigned to this programme yet.</p>
      ) : (
        <ul className="divide-y divide-gray-100 dark:divide-gray-700">
          {projects.map((row) => (
            <li key={row.id} className="flex items-center justify-between py-2 gap-3">
              <button
                type="button"
                onClick={() => navigate(`/pm/dashboard?projectId=${encodeURIComponent(row.project?.project_code || row.project_id)}`)}
                className="text-sm text-gray-700 dark:text-gray-300 hover:underline truncate text-left"
              >
                {row.project?.project_name || 'Untitled project'}
              </button>
              <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                {row.project?.project_statuses?.status_name || row.assignment_status || ''}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
