/**
 * v1239 Slice 3 — page frame for the shared schedule screens: title, project picker (when the
 * URL does not already name the project), the schedule sub-navigation (Level 4 tabs, so no new
 * sidebar items), the Recalculate action and the save-conflict banner (Slice 3.4).
 * Every schedule view shows a Back control above the title (rule 73: browser history).
 */
import { NavLink, useParams } from 'react-router-dom'
import { RefreshCw } from 'lucide-react'
import { usePlanning } from '@nidus/planning/context/PlanningContext.jsx'
import { useScheduleLinks } from '../hooks/useSchedule.js'
import BackButton from './BackButton.jsx'

export const SCHEDULE_TABS = [
  { sub: 'activities', label: 'Tasks' },
  { sub: 'board', label: 'Board' },
  { sub: 'gantt', label: 'Gantt' },
  { sub: 'network', label: 'Network' },
  { sub: 'critical-path', label: 'Critical path' },
  { sub: 'milestones', label: 'Milestones' },
  { sub: 'look-ahead', label: 'Look-ahead' },
  { sub: 'variance', label: 'Variance' },
  { sub: 'dependencies', label: 'Dependencies' },
  { sub: 'calendar', label: 'Calendar' },
  { sub: 'baselines', label: 'Baselines' },
  { sub: 'workload', label: 'Workload' },
  { sub: 'time', label: 'My time' },
  { sub: 'exchange', label: 'Import / export' },
  { sub: 'due-dates', label: 'Due dates' },
]

export function ConflictBanner({ message, onReload }) {
  if (!message) return null
  return (
    <div role="alert" className="rounded-lg border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/30 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
      <div className="text-sm text-amber-900 dark:text-amber-100">
        <p className="font-medium">This plan changed since you opened it.</p>
        <p className="mt-1">Someone else saved a change first. Reload to see the latest plan, then apply your change again.</p>
      </div>
      <button type="button" onClick={onReload} className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-sm font-medium">
        Reload plan
      </button>
    </div>
  )
}

export default function ScheduleLayout({ title, description, schedule = null, actions = null, children, showTabs = true }) {
  const { isSim, ProjectBar } = usePlanning()
  const params = useParams()
  const link = useScheduleLinks()

  const recalc = async () => {
    try {
      await schedule.recalculate()
    } catch {
      // conflict / error state is shown by the banner below
    }
  }

  return (
    <div className="w-full px-3 sm:px-4 lg:px-5 xl:px-6 py-6 space-y-4">
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3">
        <div>
          <BackButton />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{title}</h1>
          {description && <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{description}</p>}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {actions}
          {schedule && (
            <button
              type="button"
              onClick={recalc}
              disabled={schedule.recalculating || !schedule.tasks.length}
              className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
              title="Work out every date again from durations, links and the calendar"
            >
              <RefreshCw className={`h-4 w-4 ${schedule.recalculating ? 'animate-spin' : ''}`} />
              {schedule.recalculating ? 'Recalculating…' : 'Recalculate'}
            </button>
          )}
        </div>
      </div>
      {!params.projectId && <ProjectBar isSim={isSim} autoSelectSingle />}
      {showTabs && (
        <nav aria-label="Schedule views" className="flex gap-1 overflow-x-auto border-b border-gray-200 dark:border-gray-700">
          {SCHEDULE_TABS.map((t) => (
            <NavLink
              key={t.sub}
              to={link(t.sub)}
              className={({ isActive }) =>
                `px-3 py-2 text-sm whitespace-nowrap border-b-2 -mb-px ${
                  isActive
                    ? 'border-blue-600 text-blue-700 dark:text-blue-300 font-medium'
                    : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`
              }
            >
              {t.label}
            </NavLink>
          ))}
        </nav>
      )}
      {schedule && <ConflictBanner message={schedule.conflict} onReload={schedule.reload} />}
      {schedule?.error && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{schedule.error}</p>}
      {children}
    </div>
  )
}

/** Shown while no project is chosen yet. */
export function ChooseProject() {
  return (
    <div className="p-8 text-center text-sm text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
      Choose a project above to see its schedule.
    </div>
  )
}

export function Loading({ text = 'Loading schedule…' }) {
  return <div className="p-6 text-sm text-gray-700 dark:text-gray-200">{text}</div>
}
