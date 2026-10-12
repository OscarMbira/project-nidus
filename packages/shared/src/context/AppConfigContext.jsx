/**
 * v1240 — App configuration context.
 *
 * Tells shared code which app it is running in, so one shared file can serve Platform,
 * Simulator and the Planner instead of each app keeping its own copy:
 *   - app       'platform' | 'simulator' | 'planner'
 *   - basePath  route prefix for links built by shared code (e.g. '' or '/simulator')
 *   - db        the Supabase client for this app's schema (platformDb or simDb)
 *
 * Mounted once per app in App.jsx. Static for the life of the app — not user state
 * (for the signed-in user's platform switching, see PlatformContext).
 */
import { createContext, useContext, useMemo } from 'react'

export const APP_IDS = ['platform', 'simulator', 'planner']

const AppConfigContext = createContext(null)

export function AppConfigProvider({ app, basePath = '', db, children }) {
  if (!APP_IDS.includes(app)) {
    throw new Error(`Unknown app "${app}" for AppConfigProvider (expected one of ${APP_IDS.join(', ')})`)
  }
  const value = useMemo(() => ({ app, basePath, db }), [app, basePath, db])
  return <AppConfigContext.Provider value={value}>{children}</AppConfigContext.Provider>
}

export function useAppConfig() {
  const value = useContext(AppConfigContext)
  if (!value) {
    throw new Error('useAppConfig must be used within an AppConfigProvider (mounted in App.jsx)')
  }
  return value
}

export default AppConfigContext
