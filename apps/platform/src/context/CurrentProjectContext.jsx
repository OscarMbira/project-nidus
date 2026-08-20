/**
 * CurrentProjectContext
 * Tracks which project a PM is currently working in across the /pm/* area — there is no
 * project segment in these routes, so without this every page and the dashboard's own stats
 * either has no way to scope a query to "this project" or silently aggregates across every
 * project the user can see. Selection is remembered per-user in localStorage.
 */
import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { getAuthenticatedUser } from '@nidus/shared/utils/authSession'
import { getUserProjectRoles } from '../services/roleService'
import { readCurrentPmProjectId, writeCurrentPmProjectId } from '@nidus/shared/utils/currentProjectStorage'
import { isGovernanceOnlyFromRoles } from '@nidus/shared/utils/projectRoleDashboardUtils'

const CurrentProjectContext = createContext(null)

export function CurrentProjectProvider({ children }) {
  const [projects, setProjects] = useState([])
  const [currentProjectId, setCurrentProjectId] = useState(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const { user } = await getAuthenticatedUser()
      if (!user) {
        setProjects([])
        setCurrentProjectId(null)
        setLoading(false)
        return
      }

      const result = await getUserProjectRoles(user.id)
      // A project can have more than one active `project_memberships` row for the same user
      // (duplicate invite, re-added with a second role, ...) — de-dupe by project_id so the
      // selector never lists the same project twice, merging any distinct role names found.
      const byProjectId = new Map()
      for (const r of (result.success ? result.data : [])) {
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
  }, [])

  const currentProject = projects.find((p) => p.projectId === currentProjectId) || null

  return (
    <CurrentProjectContext.Provider value={{ projects, currentProjectId, currentProject, setCurrentProject, loading, refresh: load }}>
      {children}
    </CurrentProjectContext.Provider>
  )
}

export function useCurrentProject() {
  const ctx = useContext(CurrentProjectContext)
  if (!ctx) return { projects: [], currentProjectId: null, currentProject: null, setCurrentProject: () => {}, loading: false, refresh: () => {} }
  return ctx
}
