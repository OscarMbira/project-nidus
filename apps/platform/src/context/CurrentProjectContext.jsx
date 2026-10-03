/**
 * CurrentProjectContext
 * Tracks which project a PM is currently working in across the /pm/* area — there is no
 * project segment in these routes, so without this every page and the dashboard's own stats
 * either has no way to scope a query to "this project" or silently aggregates across every
 * project the user can see. Selection is remembered per-user in localStorage.
 */
import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import { getAuthenticatedUser } from '@nidus/shared/utils/authSession'
import { getUserProjectRoles } from '../services/roleService'
import { readCurrentPmProjectId, writeCurrentPmProjectId } from '@nidus/shared/utils/currentProjectStorage'
import { isGovernanceOnlyFromRoles } from '@nidus/shared/utils/projectRoleDashboardUtils'

const CurrentProjectContext = createContext(null)

// rule 66: this context is on the critical path for every /pm/* page (the whole PM Dashboard,
// including PmHealthSummaryWidget's 9-query batch, waits on currentProjectId before it can even
// start) yet had zero caching — every single mount re-ran getUserProjectRoles()'s 2 sequential
// round trips (users lookup, then project_memberships) from scratch, even seconds after the same
// data was already fetched for a prior page. Short TTL so a real role/membership change (rare,
// mid-session) still shows up quickly on the next natural remount.
const PROJECT_ROLES_CACHE_PREFIX = 'nidus:pmProjects:v2:'
const PROJECT_ROLES_CACHE_TTL_MS = 5 * 60 * 1000

function readProjectsCache(authUserId) {
  if (typeof sessionStorage === 'undefined' || !authUserId) return null
  try {
    const raw = sessionStorage.getItem(`${PROJECT_ROLES_CACHE_PREFIX}${authUserId}`)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!parsed || !Array.isArray(parsed.projects) || !parsed.savedAt) return null
    if (Date.now() - parsed.savedAt > PROJECT_ROLES_CACHE_TTL_MS) return null
    return parsed
  } catch {
    return null
  }
}

function writeProjectsCache(authUserId, projects, currentProjectId) {
  if (typeof sessionStorage === 'undefined' || !authUserId) return
  try {
    sessionStorage.setItem(
      `${PROJECT_ROLES_CACHE_PREFIX}${authUserId}`,
      JSON.stringify({ projects, currentProjectId, savedAt: Date.now() })
    )
  } catch {
    /* sessionStorage unavailable/full — cache is a pure optimization, safe to skip */
  }
}

export function CurrentProjectProvider({ children }) {
  const [projects, setProjects] = useState([])
  const [currentProjectId, setCurrentProjectId] = useState(null)
  const [loading, setLoading] = useState(true)
  const authUserIdRef = useRef(null)

  const load = useCallback(async (forceRefresh = false) => {
    try {
      const { user } = await getAuthenticatedUser()
      authUserIdRef.current = user?.id || null
      if (!user) {
        setProjects([])
        setCurrentProjectId(null)
        setLoading(false)
        return
      }

      const cached = !forceRefresh && readProjectsCache(user.id)
      if (cached) {
        setProjects(cached.projects)
        setCurrentProjectId(cached.currentProjectId)
        // Keep localStorage in sync — shared usePlatformProjectId (and pages that only
        // read the storage key) otherwise see null after a cache hit and load no teams.
        writeCurrentPmProjectId(cached.currentProjectId)
        setLoading(false)
        return
      }

      setLoading(true)
      const result = await getUserProjectRoles(user.id)
      if (!result.success) {
        setProjects([])
        setCurrentProjectId(null)
        setLoading(false)
        return
      }
      // A project can have more than one active `project_memberships` row for the same user
      // (duplicate invite, re-added with a second role, ...) — de-dupe by project_id so the
      // selector never lists the same project twice, merging any distinct role names found.
      const byProjectId = new Map()
      for (const r of result.data || []) {
        if (!r.projects) continue
        const roleName = r.project_roles?.role_display_name
        const roleKey = r.project_roles?.role_name
        const isGovernanceOnly = !!r.project_roles?.is_governance_only
        const existing = byProjectId.get(r.project_id)
        if (existing) {
          if (roleName) existing.roleNames.add(roleName)
          if (roleKey) existing.roleKeys.add(roleKey)
          existing.governanceFlags.push({ is_governance_only: isGovernanceOnly })
          continue
        }
        byProjectId.set(r.project_id, {
          projectId: r.project_id,
          projectName: r.projects?.project_name || r.projects?.project_code || 'Untitled project',
          projectCode: r.projects?.project_code || null,
          roleNames: new Set(roleName ? [roleName] : []),
          roleKeys: new Set(roleKey ? [roleKey] : []),
          governanceFlags: [{ is_governance_only: isGovernanceOnly }],
        })
      }
      const list = Array.from(byProjectId.values()).map((p) => ({
        projectId: p.projectId,
        projectName: p.projectName,
        projectCode: p.projectCode,
        roleDisplayName: p.roleNames.size > 0 ? Array.from(p.roleNames).join(' / ') : null,
        // Raw project_roles.role_name values (e.g. 'project_board_member') — for reliable
        // role-gated UI branching. roleDisplayName is a human label and can merge multiple
        // roles with " / ", which isn't safe to compare against for that purpose.
        roleKeys: Array.from(p.roleKeys),
        // v902: DB-driven (project_roles.is_governance_only) so org-created custom roles can
        // opt into the read-only Governance Dashboard too, not just the 3 hardcoded built-ins.
        isGovernanceOnly: isGovernanceOnlyFromRoles(p.governanceFlags),
      }))
      setProjects(list)

      const savedId = readCurrentPmProjectId()
      const stillValid = savedId && list.some((p) => p.projectId === savedId)
      const resolvedId = stillValid ? savedId : (list[0]?.projectId || null)
      setCurrentProjectId(resolvedId)
      writeCurrentPmProjectId(resolvedId)
      writeProjectsCache(user.id, list, resolvedId)
    } catch (error) {
      console.error('[CurrentProjectContext] failed to load projects:', error)
      setProjects([])
      setCurrentProjectId(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const setCurrentProject = useCallback((projectId) => {
    setCurrentProjectId(projectId)
    writeCurrentPmProjectId(projectId)
    // Keep the session cache's "current" pointer in sync — otherwise a remount right after a
    // manual project switch would read the cache back and silently revert the selection.
    setProjects((prev) => {
      writeProjectsCache(authUserIdRef.current, prev, projectId)
      return prev
    })
  }, [])

  const currentProject = projects.find((p) => p.projectId === currentProjectId) || null

  return (
    <CurrentProjectContext.Provider value={{ projects, currentProjectId, currentProject, setCurrentProject, loading, refresh: () => load(true) }}>
      {children}
    </CurrentProjectContext.Provider>
  )
}

export function useCurrentProject() {
  const ctx = useContext(CurrentProjectContext)
  if (!ctx) return { projects: [], currentProjectId: null, currentProject: null, setCurrentProject: () => {}, loading: false, refresh: () => {} }
  return ctx
}
