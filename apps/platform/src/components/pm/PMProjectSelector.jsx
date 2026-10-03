import { useState } from 'react'
import { useLocation } from 'react-router-dom'
import { Briefcase, ChevronDown } from 'lucide-react'
import { useCurrentProject } from '../../context/CurrentProjectContext'

/**
 * Current-project selector for /pm/* pages — one searchable combobox ("CODE — Name"). Rendered in
 * the app header on desktop and as a slim bar above content on mobile (`compact` for the header).
 * A user assigned to a single project sees a static label; CurrentProjectContext picks that project.
 */
export default function PMProjectSelector({ compact = false }) {
  const { projects, currentProjectId, setCurrentProject, loading } = useCurrentProject()
  const [filter, setFilter] = useState('')
  const [open, setOpen] = useState(false)
  const location = useLocation()
  const isPersonalProfile = /\/(platform|pm|simulator(?:\/pm)?)\/profile\/?$/.test(location.pathname)

  // Profile is account-level, not project-scoped — hide the current-project selector.
  if (isPersonalProfile) return null
  if (loading) return null

  if (projects.length === 0) {
    if (compact) {
      return <span className="text-sm font-medium text-amber-700 dark:text-amber-300">No project assigned</span>
    }
    return (
      <div
        role="status"
        className="flex items-center gap-2 border-b border-amber-400 bg-amber-100 px-4 py-2.5 text-sm font-semibold text-amber-950 dark:border-amber-500 dark:bg-amber-950 dark:text-amber-50 sm:px-6"
      >
        <Briefcase className="h-4 w-4 flex-shrink-0 text-amber-900 dark:text-amber-100" />
        <span>You're not a member of any project yet.</span>
      </div>
    )
  }

  const currentProject = projects.find((p) => p.projectId === currentProjectId)
  const labelFor = (p) => [p.projectCode, p.projectName].filter(Boolean).join(' — ')
  const currentLabel = currentProject ? labelFor(currentProject) : ''

  if (projects.length === 1) {
    return (
      <div className="flex min-w-0 items-center gap-2 text-xs font-medium leading-tight text-gray-900 dark:text-gray-100" title={currentLabel}>
        <Briefcase className="h-4 w-4 flex-shrink-0 text-gray-600 dark:text-gray-300" />
        <span className="break-words">{currentLabel}</span>
      </div>
    )
  }

  const query = filter.trim().toLowerCase()
  const filteredProjects = projects.filter((p) =>
    !query ||
    [p.projectName, p.projectCode, p.roleDisplayName].some((v) => (v || '').toLowerCase().includes(query))
  )

  const handleSelect = (projectId) => {
    setCurrentProject(projectId)
    setFilter('')
    setOpen(false)
  }

  return (
    <div className={`flex min-w-0 items-center gap-2 ${compact ? 'w-full' : 'w-full border-b border-gray-200 bg-white px-4 py-2 sm:px-6 dark:border-gray-700 dark:bg-gray-800'}`}>
      <Briefcase className="h-4 w-4 flex-shrink-0 text-gray-600 dark:text-gray-300" />
      <div className="relative min-w-0 w-full">
        <input
          id="pm-project-select"
          type="text"
          role="combobox"
          aria-label="Project"
          aria-expanded={open}
          value={open ? filter : currentLabel}
          onFocus={() => {
            setOpen(true)
            setFilter('')
          }}
          onChange={(e) => {
            setFilter(e.target.value)
            setOpen(true)
          }}
          onBlur={() => setOpen(false)}
          placeholder="Search by project name or ID…"
          title={!open ? currentLabel : undefined}
          className="w-full rounded border border-gray-300 bg-white px-2 py-1.5 pr-7 text-xs text-gray-900 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
        />
        <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        {open && (
          <ul
            role="listbox"
            className="absolute z-20 mt-1 max-h-64 w-full min-w-[18rem] overflow-auto rounded border border-gray-300 bg-white py-1 shadow-lg dark:border-gray-600 dark:bg-gray-900"
          >
            {filteredProjects.length === 0 ? (
              <li className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">No projects match your search</li>
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
                    className={`block w-full break-words px-3 py-2 text-left text-xs ${
                      p.projectId === currentProjectId
                        ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                        : 'text-gray-900 hover:bg-gray-100 dark:text-gray-100 dark:hover:bg-gray-800'
                    }`}
                  >
                    <span className="font-medium">{labelFor(p)}</span>
                    {p.roleDisplayName && (
                      <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">{p.roleDisplayName}</span>
                    )}
                  </button>
                </li>
              ))
            )}
          </ul>
        )}
      </div>
    </div>
  )
}
