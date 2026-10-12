/**
 * v1240 — Current-project context object and reader, shared by every app.
 *
 * The provider that fills it (role lookups, PM project list, persistence) stays in each app as
 * `CurrentProjectProvider` (apps/platform/src/context/CurrentProjectContext.jsx and the
 * Simulator copy) because it calls app services. Shared hooks such as usePlatformProjectId read
 * it through useCurrentProject(), which returns safe defaults when no provider is mounted
 * (Simulator shell, Planner).
 */
import { createContext, useContext } from 'react'

export const CurrentProjectContext = createContext(null)

const NO_PROVIDER = Object.freeze({
  projects: [],
  currentProjectId: null,
  currentProject: null,
  setCurrentProject: () => {},
  loading: false,
  refresh: () => {},
})

export function useCurrentProject() {
  return useContext(CurrentProjectContext) || NO_PROVIDER
}
