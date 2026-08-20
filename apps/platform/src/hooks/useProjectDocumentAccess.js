import { useEffect, useState } from 'react'
import { platformDb } from '@nidus/supabase'
import { fetchUserRoleNamesForAuthUser } from '@nidus/shared/utils/menuLayoutUtils'

/** Roles that keep full Capture/Edit/Retire/Restore rights on project documents (v849). */
const MANAGE_ROLES = new Set([
  'project_manager',
  'portfolio_manager',
  'programme_manager',
  'pmo_admin',
  'system_admin',
  'account_owner',
  'superuser',
])

/** Project-membership table differs by schema — mirrors resolveProjectTierAncestry's pattern. */
const MEMBERSHIP_TABLES = {
  public: { table: 'user_projects', projectCol: 'project_id', userIdMode: 'internal' },
  sim: { table: 'practice_project_memberships', projectCol: 'practice_project_id', userIdMode: 'auth' },
}

/**
 * Resolve the current user's access tier for the "Project Documents" page (v897 Part B):
 * team_lead/team_member get View + Export only, restricted to a project they're an assigned
 * member of — every other granted role (project_manager and above) keeps full, unrestricted
 * access, unchanged. Roles are shared across Platform/Simulator (public.roles/user_roles),
 * so role resolution always uses platformDb regardless of which app's `db`/`schema` the
 * caller passes for the membership check itself.
 * @param {object} [opts]
 * @param {object} [opts.db] - platformDb or simDb, used only for the membership check
 * @param {string|null} [opts.projectId] - current project id; membership is only checked
 *   (and only matters) for team_lead/team_member — other roles skip it entirely
 * @param {'public'|'sim'} [opts.schema]
 * @returns {{ loading: boolean, canManage: boolean, isMember: boolean, roleNames: string[] }}
 */
export function useProjectDocumentAccess({ db = platformDb, projectId = null, schema = 'public' } = {}) {
  const [state, setState] = useState({ loading: true, canManage: true, isMember: true, roleNames: [] })

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const {
        data: { user: authUser },
      } = await platformDb.auth.getUser()
      const roleNames = await fetchUserRoleNamesForAuthUser(authUser)
      if (cancelled) return
      // No resolvable roles (e.g. still loading elsewhere) — default to managed access
      // rather than locking out a legitimately-privileged user on a transient empty read.
      const canManage = roleNames.length === 0 || roleNames.some((r) => MANAGE_ROLES.has(r))

      if (canManage || !projectId || !authUser?.id) {
        setState({ loading: false, canManage, isMember: true, roleNames })
        return
      }

      const t = MEMBERSHIP_TABLES[schema] || MEMBERSHIP_TABLES.public
      let membershipUserId = authUser.id
      if (t.userIdMode === 'internal') {
        const { data: userRow } = await platformDb.from('users').select('id').eq('auth_user_id', authUser.id).maybeSingle()
        membershipUserId = userRow?.id || null
      }
      let isMember = false
      if (membershipUserId) {
        let query = db.from(t.table).select('id').eq(t.projectCol, projectId).eq('user_id', membershipUserId)
        if (t.table === 'user_projects') query = query.eq('is_deleted', false)
        const { data: membership } = await query.maybeSingle()
        isMember = Boolean(membership)
      }
      if (!cancelled) setState({ loading: false, canManage, isMember, roleNames })
    })()
    return () => {
      cancelled = true
    }
  }, [db, projectId, schema])

  return state
}
