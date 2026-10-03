import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FlaskConical, ChevronLeft } from 'lucide-react'
import { useCurrentProject } from '../../context/CurrentProjectContext'

/**
 * Shell for Testing & QA pages.
 * The open project is the one already chosen in the header (Project name / Project ID).
 * This shell does not draw a second project picker.
 */
export default function TestingPageShell({ title, subtitle, children }) {
  const navigate = useNavigate()
  const { projects: assignedProjects, currentProjectId, setCurrentProject, loading } = useCurrentProject()
  const projects = useMemo(
    () => assignedProjects.map((project) => ({
      id: project.projectId,
      project_name: project.projectName,
      project_code: project.projectCode,
    })),
    [assignedProjects],
  )
  const [projectId, setProjectId] = useState('')

  useEffect(() => {
    if (loading) return
    const assignedIds = new Set(projects.map((project) => project.id))
    if (currentProjectId && assignedIds.has(currentProjectId)) {
      setProjectId(currentProjectId)
      return
    }
    if (projects.length === 1) {
      setProjectId(projects[0].id)
      setCurrentProject(projects[0].id)
      return
    }
    setProjectId('')
  }, [loading, projects, currentProjectId, setCurrentProject])

  const selected = projects.find((p) => p.id === projectId)

  return (
    <div className="w-full text-gray-900 dark:text-gray-100">
      <div className="border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-start gap-3">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="mt-1 p-1 rounded-lg text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-white"
              aria-label="Back"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <div>
              <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                <FlaskConical className="h-5 w-5" />
                <span className="text-xs font-semibold uppercase tracking-wide">Testing &amp; QA</span>
              </div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white mt-0.5">{title}</h1>
              {subtitle && <p className="text-sm text-gray-700 dark:text-gray-200 mt-1">{subtitle}</p>}
            </div>
          </div>
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-4 py-6">{children({ projectId, projectLabel: selected })}</div>
    </div>
  )
}
