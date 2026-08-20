import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { ArrowLeft, Briefcase, ChevronDown } from 'lucide-react'
import { useCurrentProject } from '../../context/CurrentProjectContext'

/**
 * Slim "current project" toolbar for /pm/* pages.
 * Two searchable filters — Project name and Project ID — so users can find a project
 * by either field without one long combined label.
 */
export default function PMProjectSelector() {
  const { projects, currentProjectId, setCurrentProject, loading } = useCurrentProject()
  const [nameFilter, setNameFilter] = useState('')
  const [codeFilter, setCodeFilter] = useState('')
  const [openField, setOpenField] = useState(null) // 'name' | 'code' | null
  const location = useLocation()
  const isOnDashboard = location.pathname === '/pm/dashboard'
  const isPersonalProfile = /\/(platform|pm|simulator(?:\/pm)?)\/profile\/?$/.test(location.pathname)

  // Profile is account-level, not project-scoped — hide the current-project toolbar.
  if (isPersonalProfile) return null

  if (loading) return null

  if (projects.length === 0) {
    return (
      <div className="flex items-center gap-2 border-b border-gray-200 bg-white px-4 py-2 text-sm text-gray-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 sm:px-6">
        <Briefcase className="h-4 w-4 flex-shrink-0" />
        <span>You're not a member of any project yet.</span>
      </div>
    )
  }

  const currentProject = projects.find((p) => p.projectId === currentProjectId)
  // Prefer project_code for the address bar — /pm/* has no path segment, so this is the only
  // friendly form the URL can take (see usePlatformProjectId's normalization for anything that
  // still lands here as a raw UUID).
  const currentProjectKey = currentProject?.projectCode || currentProjectId
  const dashboardHref = currentProjectKey ? `/pm/dashboard?projectId=${encodeURIComponent(currentProjectKey)}` : '/pm/dashboard'

  const nameQuery = nameFilter.trim().toLowerCase()
  const codeQuery = codeFilter.trim().toLowerCase()
  const filteredProjects = projects.filter((p) => {
    const nameOk = !nameQuery || (p.projectName || '').toLowerCase().includes(nameQuery)
    const codeOk =
      !codeQuery ||
      (p.projectCode || '').toLowerCase().includes(codeQuery) ||
      (p.roleDisplayName || '').toLowerCase().includes(codeQuery)
    return nameOk && codeOk
  })

  const handleSelect = (projectId) => {
    setCurrentProject(projectId)
    setNameFilter('')
    setCodeFilter('')
    setOpenField(null)
  }

  const nameDisplay =
    openField === 'name' ? nameFilter : (currentProject?.projectName || '')
  const codeDisplay =
    openField === 'code'
      ? codeFilter
      : currentProject
        ? [currentProject.projectCode, currentProject.roleDisplayName].filter(Boolean).join(' — ')
        : ''

  const listbox = (
    <ul
      role="listbox"
      className="absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded border border-gray-300 bg-white py-1 shadow-lg dark:border-gray-600 dark:bg-gray-900"
    >
      {filteredProjects.length === 0 ? (
        <li className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">
          No projects match the current filters
        </li>
      ) : (
        filteredProjects.map((p) => (
          <li key={p.projectId}>
            <button
              type="button"
              role="option"
              aria-selected={p.projectId === currentProjectId}
              onMouseDown={(e) => {
                e.preventDefault()
                handleSelect(p.projectId)
              }}
              className={`block w-full truncate px-3 py-2 text-left text-sm ${
                p.projectId === currentProjectId
                  ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                  : 'text-gray-900 hover:bg-gray-100 dark:text-gray-100 dark:hover:bg-gray-800'
              }`}
            >
              <span className="font-medium">{p.projectName}</span>
              {(p.projectCode || p.roleDisplayName) && (
                <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">
                  {[p.projectCode, p.roleDisplayName].filter(Boolean).join(' — ')}
                </span>
              )}
            </button>
          </li>
        ))
      )}
    </ul>
  )

  return (
    <div className="flex flex-col gap-2 border-b border-gray-200 bg-white px-4 py-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3 sm:px-6 dark:border-gray-700 dark:bg-gray-800">
      {!isOnDashboard && (
        <>
          <Link
            to={dashboardHref}
            className="inline-flex items-center gap-1 text-sm font-medium text-gray-800 hover:text-gray-950 hover:underline dark:text-gray-100 dark:hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Dashboard
          </Link>
          <span className="hidden h-4 w-px bg-gray-300 dark:bg-gray-600 sm:block" aria-hidden="true" />
        </>
      )}
      <Briefcase className="hidden h-4 w-4 flex-shrink-0 text-gray-600 dark:text-gray-300 sm:block" />

      <div className="flex w-full min-w-0 flex-col gap-1 sm:min-w-[22rem] sm:max-w-3xl sm:flex-[2] sm:flex-row sm:items-center sm:gap-2">
        <label
          htmlFor="pm-project-name"
          className="flex-shrink-0 text-sm font-medium text-gray-800 dark:text-gray-100"
        >
          Project name
        </label>
        <div className="relative min-w-0 w-full flex-1">
          <input
            id="pm-project-name"
            type="text"
            role="combobox"
            aria-expanded={openField === 'name'}
            value={nameDisplay}
            onFocus={() => {
              setOpenField('name')
              setNameFilter('')
            }}
            onChange={(e) => {
              setNameFilter(e.target.value)
              setOpenField('name')
            }}
            onBlur={() => setOpenField((f) => (f === 'name' ? null : f))}
            placeholder="Search by project name…"
            title={!openField && currentProject ? currentProject.projectName : undefined}
            className="w-full rounded border border-gray-300 bg-white px-2 py-1.5 pr-7 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
          />
          <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          {openField === 'name' && listbox}
        </div>
      </div>

      <div className="flex w-full min-w-0 flex-col gap-1 sm:min-w-[20rem] sm:max-w-2xl sm:flex-1 sm:flex-row sm:items-center sm:gap-2">
        <label
          htmlFor="pm-project-id"
          className="flex-shrink-0 text-sm font-medium text-gray-800 dark:text-gray-100"
        >
          Project ID
        </label>
        <div className="relative min-w-0 w-full flex-1">
          <input
            id="pm-project-id"
            type="text"
            role="combobox"
            aria-expanded={openField === 'code'}
            value={codeDisplay}
            onFocus={() => {
              setOpenField('code')
              setCodeFilter('')
            }}
            onChange={(e) => {
              setCodeFilter(e.target.value)
              setOpenField('code')
            }}
            onBlur={() => setOpenField((f) => (f === 'code' ? null : f))}
            placeholder="Search by project ID…"
            title={
              !openField && currentProject
                ? [currentProject.projectCode, currentProject.roleDisplayName].filter(Boolean).join(' — ')
                : undefined
            }
            className="w-full rounded border border-gray-300 bg-white px-2 py-1.5 pr-7 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
          />
          <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          {openField === 'code' && listbox}
        </div>
      </div>
    </div>
  )
}
