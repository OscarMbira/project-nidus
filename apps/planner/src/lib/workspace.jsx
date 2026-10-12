/**
 * v1239 Slice 5 — the signed-in Planner workspace: context (user, account, edition, trial
 * status, roles), the sidebar menu and the account's projects. The account, menu and projects
 * load in one parallel batch once the context is known (rule 66).
 *
 * First verified sign-in with no workspace yet → planner_create_account() creates it (D4).
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useAuth } from './auth.jsx'
import { inviteTokenFromPath, readPendingInvite } from './pendingInvite.js'
import { buildMenuTree, ensureAccount, getContext, getMenu, listProjects } from './plannerApi.js'

const WorkspaceContext = createContext(null)

export function WorkspaceProvider({ children }) {
  const { user } = useAuth()
  const { pathname } = useLocation()
  // An invited person joins the inviting workspace: never auto-create a trial workspace for them.
  const inviting = !!(inviteTokenFromPath(pathname) || readPendingInvite())
  const [state, setState] = useState({ loading: true, error: null, context: null, menu: [], projects: [] })

  const load = useCallback(async () => {
    if (!user) return
    setState((s) => ({ ...s, loading: true, error: null }))
    try {
      let context = await getContext()
      if (!context?.account_id && !inviting) {
        await ensureAccount(user.user_metadata?.full_name)
        context = await getContext()
      }
      const [menuRows, projects] = await Promise.all([getMenu(), listProjects(context?.account_id)])
      setState({ loading: false, error: null, context, menu: buildMenuTree(menuRows), projects })
    } catch (err) {
      setState((s) => ({ ...s, loading: false, error: err.message }))
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id])

  useEffect(() => { load() }, [load])

  const reloadProjects = useCallback(async () => {
    const projects = await listProjects(state.context?.account_id)
    setState((s) => ({ ...s, projects }))
    return projects
  }, [state.context?.account_id])

  const value = useMemo(() => {
    const ctx = state.context || {}
    const roles = ctx.roles || []
    return {
      ...state,
      reload: load,
      reloadProjects,
      readOnly: !!ctx.status?.read_only,
      isOwner: !!ctx.is_owner,
      canManage: !!ctx.is_owner || roles.includes('account_owner') || roles.includes('project_manager'),
    }
  }, [state, load, reloadProjects])

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>
}

export function useWorkspace() {
  const ctx = useContext(WorkspaceContext)
  if (!ctx) throw new Error('useWorkspace must be used inside WorkspaceProvider')
  return ctx
}
