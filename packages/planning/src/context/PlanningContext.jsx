/**
 * v1239 — Planning context: the shell (Platform, Simulator, Planner) tells the shared planning
 * screens which data set to use and where they are mounted. Replaces each screen's old
 * `location.pathname.includes('/simulator/')` check (v1239 D7).
 *
 *   mode            'platform' | 'planner'  → public schema (platformDb, project_id)
 *                   'simulator'             → sim schema (simDb, practice_project_id)
 *   basePath        where the planning routes are mounted, e.g. '/pm/planning', '/simulator/pm/planning', '/app/planning'
 *   ProjectBar      the shell's project picker component (props: { isSim, autoSelectSingle, anyRole }).
 *                   It stays in each app because it uses the app's own project service; the Planner
 *                   app passes its own. Screens render it via usePlanning().ProjectBar.
 */
import { createContext, useContext, useMemo } from 'react'

export const PLANNING_MODES = ['platform', 'simulator', 'planner']

const PlanningContext = createContext(null)

// Shell did not supply a picker: render nothing rather than a broken control.
function NoProjectBar() {
  return null
}

export function PlanningProvider({ mode, basePath, ProjectBar = null, children }) {
  if (!PLANNING_MODES.includes(mode)) {
    throw new Error(`Unknown planning mode "${mode}" (expected ${PLANNING_MODES.join(', ')})`)
  }
  const value = useMemo(
    () => ({
      mode,
      isSim: mode === 'simulator',
      basePath: String(basePath || '').replace(/\/$/, ''),
      ProjectBar: ProjectBar || NoProjectBar,
    }),
    [mode, basePath, ProjectBar]
  )
  return <PlanningContext.Provider value={value}>{children}</PlanningContext.Provider>
}

export function usePlanning() {
  const value = useContext(PlanningContext)
  if (!value) throw new Error('Planning screens must be rendered inside a PlanningProvider')
  return value
}

/** Join a planning base path and a sub-path: planningPath('/pm/planning', 'health') → '/pm/planning/health'. */
export function planningPath(basePath, sub = '') {
  const base = String(basePath || '').replace(/\/$/, '')
  const rest = String(sub || '').replace(/^\//, '')
  return rest ? `${base}/${rest}` : base
}
