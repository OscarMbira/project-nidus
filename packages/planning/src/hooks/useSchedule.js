/**
 * v1239 Slice 3 — hooks shared by the schedule screens.
 *
 *   useScheduleProjectId()  the project the screen works on, for every shell:
 *       Platform / Planner → usePlatformProjectId() (`:projectId` route param or `?projectId=`,
 *                            code or UUID, resolved to projects.id; rule 16.1)
 *       Simulator          → the practice project's `:projectId` param (or `?projectId=`)
 *   useScheduleData()       the mode-aware data service (services/scheduleData.js)
 *   useSchedule(projectId)  tasks + dependencies + calendar, recalculate, conflict state
 *   useScheduleLinks()      paths between schedule screens, wherever the shell mounted them
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useLocation, useParams, useSearchParams } from 'react-router-dom'
import { usePlatformProjectId } from '@nidus/shared/hooks/usePlatformProjectId'
import { usePlanning } from '@nidus/planning/context/PlanningContext.jsx'
import { createScheduleData, expectedVersionsOf, ScheduleConflictError } from '../services/scheduleData.js'

function useSimProjectId() {
  const params = useParams()
  const [searchParams] = useSearchParams()
  const key = params.projectId || searchParams.get('projectId') || ''
  return { projectId: key || null, routeKey: key || null, loading: false, error: null }
}

export function useScheduleProjectId() {
  const { isSim } = usePlanning()
  // The mode is fixed for the lifetime of a shell (PlanningProvider), so the same hook runs on
  // every render of a given screen. The Simulator must not run the public-schema resolver.
  // eslint-disable-next-line react-hooks/rules-of-hooks
  return isSim ? useSimProjectId() : usePlatformProjectId()
}

export function useScheduleData() {
  const { isSim } = usePlanning()
  return useMemo(() => createScheduleData(isSim), [isSim])
}

/**
 * Loads the plan and exposes `recalculate()` (database authority, optimistic-concurrency check
 * against the row versions this screen loaded). `conflict` is set when someone else saved first.
 */
export function useSchedule(projectId, { withCalendar = true } = {}) {
  const data = useScheduleData()
  const [state, setState] = useState({ tasks: [], dependencies: [], calendar: null, exceptions: [], loading: true, error: null })
  const [conflict, setConflict] = useState(null)
  const [recalculating, setRecalculating] = useState(false)

  const reload = useCallback(async () => {
    if (!projectId) {
      setState((s) => ({ ...s, loading: false }))
      return
    }
    setState((s) => ({ ...s, loading: true, error: null }))
    setConflict(null)
    try {
      // Tasks and the calendar are independent; dependencies need the task ids (rule 66).
      const tasksPromise = data.listTasks(projectId)
      const [tasks, dependencies, cal] = await Promise.all([
        tasksPromise,
        tasksPromise.then((t) => data.listDependencies(projectId, t)),
        withCalendar ? data.getCalendarRows(projectId) : Promise.resolve({ calendar: null, exceptions: [] }),
      ])
      setState({ tasks, dependencies, calendar: cal.calendar, exceptions: cal.exceptions, loading: false, error: null })
    } catch (err) {
      setState((s) => ({ ...s, loading: false, error: err.message || 'Could not load the schedule.' }))
    }
  }, [data, projectId, withCalendar])

  useEffect(() => {
    reload()
  }, [reload])

  const recalculate = useCallback(async () => {
    setRecalculating(true)
    try {
      const result = await data.recalculate(projectId, expectedVersionsOf(state.tasks))
      await reload()
      return result
    } catch (err) {
      if (err instanceof ScheduleConflictError) setConflict(err.message)
      else setState((s) => ({ ...s, error: err.message || 'Could not recalculate the schedule.' }))
      throw err
    } finally {
      setRecalculating(false)
    }
  }, [data, projectId, state.tasks, reload])

  return { ...state, data, reload, recalculate, recalculating, conflict, setConflict }
}

/**
 * Builds links between schedule screens. The prefix is everything before the `/schedule/` (or
 * `/planning/`) segment of the current URL, so the same screens work under
 * `/platform/pm/schedule/*`, `/platform/projects/:id/schedule/*`,
 * `/simulator/practice-projects/:id/schedule/*` and the Planner's `/app/schedule/*`.
 * The query string (e.g. `?projectId=`) is kept.
 */
export function scheduleLinkFor(pathname, search, sub) {
  const m = String(pathname).match(/^(.*?)\/(schedule|planning)(\/|$)/)
  const prefix = m ? m[1] : String(pathname).replace(/\/$/, '')
  const rest = String(sub || '').replace(/^\//, '')
  return `${prefix}/schedule${rest ? `/${rest}` : ''}${search || ''}`
}

export function useScheduleLinks() {
  const { pathname, search } = useLocation()
  // Keep only ?projectId= so record-level params do not leak between screens.
  const kept = useMemo(() => {
    const p = new URLSearchParams(search).get('projectId')
    return p ? `?projectId=${encodeURIComponent(p)}` : ''
  }, [search])
  return useCallback((sub) => scheduleLinkFor(pathname, kept, sub), [pathname, kept])
}
