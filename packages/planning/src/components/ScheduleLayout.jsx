/**
 * v1239 Slice 3 — page frame for the shared schedule screens: title, project picker (when the
 * URL does not already name the project), the schedule sub-navigation (Level 4 tabs, so no new
 * sidebar items), the Recalculate action and the save-conflict banner (Slice 3.4).
 * Every schedule view shows a Back control above the title (rule 73: browser history).
 * v1265: every view can go full screen (Esc to leave) or open in a new window, which starts in
 * full screen (?view=full).
 */
import { useEffect, useState } from 'react'
import { useLocation, useParams, useSearchParams } from 'react-router-dom'
import { RefreshCw, Maximize2, Minimize2, ExternalLink } from 'lucide-react'
import { usePlanning } from '@nidus/planning/context/PlanningContext.jsx'
import { useScheduleLinks } from '../hooks/useSchedule.js'
import BackButton from './BackButton.jsx'
import TaskModal from './TaskModal.jsx'
import ScheduleViewMenus from './ScheduleViewMenus.jsx'

/**
 * v1265: the schedule views in four groups, each a dropdown menu (owner request 2026-10-13).
 * Every view keeps its own route; only the navigation is grouped.
 */
export const SCHEDULE_GROUPS = [
  { key: 'plan', label: 'Plan', items: [
    { sub: 'activities', label: 'Tasks' },
    { sub: 'gantt', label: 'Plan Sheet' },
    { sub: 'board', label: 'Board' },
    { sub: 'due-dates', label: 'Due dates' },
    { sub: 'exchange', label: 'Import / export' },
  ] },
  { key: 'sequence', label: 'Sequence', items: [
    { sub: 'network', label: 'Network' },
    { sub: 'critical-path', label: 'Critical path' },
    { sub: 'dependencies', label: 'Dependencies' },
  ] },
  { key: 'track', label: 'Track', items: [
    { sub: 'milestones', label: 'Milestones' },
    { sub: 'look-ahead', label: 'Look-ahead' },
    { sub: 'variance', label: 'Variance' },
    { sub: 'baselines', label: 'Baselines' },
  ] },
  { key: 'time', label: 'Time & people', items: [
    { sub: 'calendar', label: 'Calendar' },
    { sub: 'workload', label: 'Workload' },
    { sub: 'time', label: 'My time' },
  ] },
]

/** Every view in one list (kept for callers that need the flat list). */
export const SCHEDULE_TABS = SCHEDULE_GROUPS.flatMap((g) => g.items)

/** True when the current path is that view (or a page under it, e.g. calendar/exceptions). */
export function isScheduleViewActive(pathname, sub) {
  const m = String(pathname).match(/\/schedule\/([^?#]*)/)
  const rest = m ? m[1] : ''
  return rest === sub || rest.startsWith(`${sub}/`)
}

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
  const { isSim, ProjectBar, headerProjectPicker } = usePlanning()
  const params = useParams()
  const link = useScheduleLinks()
  const { pathname } = useLocation()
  const [searchParams, setSearchParams] = useSearchParams()
  const [full, setFullState] = useState(() => searchParams.get('view') === 'full')
  const setFull = (on) => {
    setFullState(on)
    if (!on && searchParams.get('view')) {
      const next = new URLSearchParams(searchParams)
      next.delete('view')
      setSearchParams(next, { replace: true })
    }
  }
  useEffect(() => {
    if (!full) return undefined
    const onKey = (e) => { if (e.key === 'Escape') setFull(false) }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [full]) // eslint-disable-line react-hooks/exhaustive-deps
  const popOut = () => {
    const url = new URL(window.location.href)
    url.searchParams.set('view', 'full')
    window.open(url.toString(), '_blank', 'noopener')
  }
  // Stay in full screen when switching views.
  const withFullView = (to) => `${to}${to.includes('?') ? '&' : '?'}view=full`
  const iconBtn = 'inline-flex items-center justify-center h-9 w-9 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700'

  const recalc = async () => {
    try {
      await schedule.recalculate()
    } catch {
      // conflict / error state is shown by the banner below
    }
  }

  return (
    <div className={full
      ? 'fixed inset-0 z-[60] overflow-auto bg-gray-50 dark:bg-gray-900 px-3 sm:px-4 lg:px-5 py-4 space-y-4'
      : 'w-full px-3 sm:px-4 lg:px-5 xl:px-6 py-6 space-y-4'}
      role={full ? 'dialog' : undefined} aria-modal={full ? 'true' : undefined} aria-label={full ? `${title} (full screen)` : undefined}>
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3">
        <div>
          {!full && <BackButton />}
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{title}</h1>
          {description && <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{description}</p>}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {actions}
          <button type="button" onClick={() => setFull(!full)} className={iconBtn}
            title={full ? 'Exit full screen (Esc)' : 'Full screen'} aria-label={full ? 'Exit full screen' : 'Full screen'} aria-pressed={full}>
            {full ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </button>
          {!full && (
            <button type="button" onClick={popOut} className={iconBtn} title="Open in a new window" aria-label="Open in a new window">
              <ExternalLink className="h-4 w-4" />
            </button>
          )}
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
      {/* v1265: no second picker when the header already has one (Platform). */}
      {!params.projectId && !headerProjectPicker && <ProjectBar isSim={isSim} autoSelectSingle />}
      {showTabs && (
        <ScheduleViewMenus
          groups={SCHEDULE_GROUPS}
          to={(sub) => (full ? withFullView(link(sub)) : link(sub))}
          isActive={(sub) => isScheduleViewActive(pathname, sub)}
        />
      )}
      {schedule && <ConflictBanner message={schedule.conflict} onReload={schedule.reload} />}
      {schedule?.error && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{schedule.error}</p>}
      {children}
      {/* v1265: the task form opens as a modal over every schedule view (?task=…). */}
      <TaskModal onChanged={schedule?.reload} />
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
