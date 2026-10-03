/**
 * useDashboardViewerContext (v982 Phase 5 — Role-Aware Home Pages)
 * Resolves the generic `{ roleNames, accountId, accountType, isAccountOwner, isPmoAdmin }` shape
 * DashboardFramework's widget filter reads. A calling page may pass additional scope values it
 * already has to hand (e.g. `{ projectId }` from `useCurrentProject()`) — this hook does not know
 * about project context itself, only account/role, since that varies by which route tree the
 * composed home page lives in.
 *
 * v982 Phase 5 follow-up (Portfolio/Programme Manager Home): when the caller passes
 * `{ portfolioId }` or `{ programmeId }`, this hook ALSO resolves `isPortfolioManager`/
 * `isProgrammeManager` via the Phase 3 RLS helper RPCs (`has_portfolio_role`/`has_programme_role`,
 * SQL/v992) — the same explicit-grant model Phase 3's `getPortfolioMembershipAccess`/
 * `getProgrammeMembershipAccess` already use, reused here rather than building a parallel
 * resolver. `portfolioId`/`programmeId` themselves still flow straight through via `extra` (no
 * async needed for a widget's own `requiredScope: ['portfolioId']` match).
 */
import { useState, useEffect } from 'react'
import { platformDb } from '@nidus/supabase'
import { getCurrentUserAccountId } from '@nidus/shared/utils/accountResolution'
import { getUserSystemRoles } from '../../services/roleService'
import { normalizeRoleName } from './dashboardWidgetContract'

const EMPTY_CONTEXT = {
  roleNames: [],
  accountId: null,
  accountType: null,
  isAccountOwner: false,
  isPmoAdmin: false,
  isPortfolioManager: false,
  isProgrammeManager: false,
}

/**
 * @param {object} [extra] - additional scope values to merge in verbatim (e.g. { projectId }),
 *   plus the two recognised keys this hook resolves role status for: portfolioId, programmeId.
 * @returns {{ loading: boolean, context: DashboardViewerContext }}
 */
export function useDashboardViewerContext(extra = {}) {
  const [loading, setLoading] = useState(true)
  const [context, setContext] = useState(EMPTY_CONTEXT)
  const portfolioId = extra?.portfolioId || null
  const programmeId = extra?.programmeId || null

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      const {
        data: { user },
      } = await platformDb.auth.getUser()
      if (!user) {
        if (!cancelled) {
          setContext(EMPTY_CONTEXT)
          setLoading(false)
        }
        return
      }

      const [accountId, rolesRes, adminRes] = await Promise.all([
        getCurrentUserAccountId(),
        getUserSystemRoles(user.id),
        Promise.resolve(platformDb.rpc('is_user_pmo_admin', { p_auth_uuid: user.id })).catch(() => ({ data: false })),
      ])
      if (cancelled) return

      const roleNames = (rolesRes?.success ? rolesRes.data : [])
        .map((r) => r.roles?.role_name)
        .filter(Boolean)
        .map(normalizeRoleName)

      let accountType = null
      let isAccountOwner = false
      if (accountId) {
        const { data: userRow } = await platformDb.from('users').select('id').eq('auth_user_id', user.id).maybeSingle()
        const { data: account } = await platformDb
          .from('accounts')
          .select('account_type, owner_user_id')
          .eq('id', accountId)
          .maybeSingle()
        if (cancelled) return
        accountType = account?.account_type || null
        isAccountOwner = !!(account?.owner_user_id && userRow?.id && account.owner_user_id === userRow.id)
      }

      let isPortfolioManager = false
      let isProgrammeManager = false
      const [portfolioRoleRes, programmeRoleRes] = await Promise.all([
        portfolioId
          ? Promise.resolve(platformDb.rpc('has_portfolio_role', { p_auth_user_id: user.id, p_portfolio_id: portfolioId, p_role_names: ['portfolio_manager'] })).catch(() => ({ data: false }))
          : Promise.resolve(null),
        programmeId
          ? Promise.resolve(platformDb.rpc('has_programme_role', { p_auth_user_id: user.id, p_programme_id: programmeId, p_role_names: ['programme_manager'] })).catch(() => ({ data: false }))
          : Promise.resolve(null),
      ])
      if (cancelled) return
      if (portfolioRoleRes) isPortfolioManager = portfolioRoleRes.data === true
      if (programmeRoleRes) isProgrammeManager = programmeRoleRes.data === true

      setContext({
        roleNames,
        accountId: accountId || null,
        accountType,
        isAccountOwner,
        isPmoAdmin: adminRes?.data === true,
        isPortfolioManager,
        isProgrammeManager,
      })
      setLoading(false)
    })()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [portfolioId, programmeId])

  return { loading, context: { ...context, ...extra } }
}
