/**
 * Resolve current user's organisation (account) id for Platform and Simulator features.
 * Prefer get_user_accounts() (owned + project membership via user_roles), then fallbacks
 * for legacy paths and project_memberships-only users.
 */

import { platformDb } from '../services/supabase/supabaseClient'

/**
 * @returns {Promise<string|null>} accounts.id or null
 */
export async function getCurrentUserAccountId() {
  try {
    const {
      data: { user },
    } = await platformDb.auth.getUser()
    if (!user) return null

    const { data: rpcRows, error: rpcError } = await platformDb.rpc('get_user_accounts', {
      p_auth_user_id: user.id,
    })
    if (rpcError) {
      console.warn('[accountResolution] get_user_accounts failed, using fallbacks:', rpcError.message || rpcError)
    } else if (Array.isArray(rpcRows) && rpcRows.length > 0) {
      const row = rpcRows.find((r) => r?.account_id)
      if (row?.account_id) return row.account_id
    }

    const { data: userRow } = await platformDb.from('users').select('id').eq('auth_user_id', user.id).maybeSingle()
    if (!userRow?.id) return null

    const { data: accountRow } = await platformDb
      .from('accounts')
      .select('id')
      .eq('owner_user_id', userRow.id)
      .eq('is_deleted', false)
      .maybeSingle()
    if (accountRow?.id) return accountRow.id

    const { data: projAsOwner } = await platformDb
      .from('projects')
      .select('account_id')
      .eq('owner_user_id', userRow.id)
      .not('account_id', 'is', null)
      .eq('is_deleted', false)
      .limit(1)
      .maybeSingle()
    if (projAsOwner?.account_id) return projAsOwner.account_id

    const { data: projAsManager } = await platformDb
      .from('projects')
      .select('account_id')
      .eq('project_manager_user_id', userRow.id)
      .not('account_id', 'is', null)
      .eq('is_deleted', false)
      .limit(1)
      .maybeSingle()
    if (projAsManager?.account_id) return projAsManager.account_id

    const { data: pmRows } = await platformDb
      .from('project_memberships')
      .select('project_id')
      .eq('user_id', userRow.id)
      .eq('is_active', true)
      .eq('invitation_status', 'accepted')
      .limit(8)
    if (pmRows?.length) {
      const projectIds = pmRows.map((r) => r.project_id)
      const { data: projPm } = await platformDb
        .from('projects')
        .select('account_id')
        .in('id', projectIds)
        .not('account_id', 'is', null)
        .eq('is_deleted', false)
        .limit(1)
        .maybeSingle()
      if (projPm?.account_id) return projPm.account_id
    }

    const { data: memberRows } = await platformDb
      .from('user_projects')
      .select('project_id')
      .eq('user_id', userRow.id)
      .eq('is_deleted', false)
      .limit(5)
    if (memberRows?.length) {
      const projectIds = memberRows.map((r) => r.project_id)
      const { data: proj } = await platformDb
        .from('projects')
        .select('account_id')
        .in('id', projectIds)
        .not('account_id', 'is', null)
        .eq('is_deleted', false)
        .limit(1)
        .maybeSingle()
      if (proj?.account_id) return proj.account_id
    }

    return null
  } catch (e) {
    console.error('[accountResolution] getCurrentUserAccountId', e)
    return null
  }
}
