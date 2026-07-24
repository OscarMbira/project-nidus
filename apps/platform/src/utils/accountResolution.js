/**
 * Resolve current user's organisation (account) id for Platform and Simulator features.
 * Prefer fast owner/project lookups, then get_user_accounts() (heavy — subscription counts).
 */

import { platformDb } from '@nidus/supabase'
import { resolveAccountIdFromOrganisationInvitation } from '../services/billingAccessService'

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

const ACCOUNT_CACHE_PREFIX = 'nidus:acct:'

/** True for a non-empty UUID string (avoids PostgREST 400 on id=eq.null). */
export function isValidAccountId(id) {
  return typeof id === 'string' && UUID_RE.test(id.trim())
}

function readCachedAccountId(authUserId) {
  if (typeof sessionStorage === 'undefined' || !authUserId) return null
  const cached = sessionStorage.getItem(`${ACCOUNT_CACHE_PREFIX}${authUserId}`)
  return isValidAccountId(cached) ? cached : null
}

function writeCachedAccountId(authUserId, accountId) {
  if (typeof sessionStorage === 'undefined' || !authUserId || !isValidAccountId(accountId)) return
  sessionStorage.setItem(`${ACCOUNT_CACHE_PREFIX}${authUserId}`, accountId)
}

/**
 * @returns {Promise<string|null>} public.users.id or null
 */
export async function getCurrentUserInternalUserId() {
  // getSession() reads the already-persisted local session — no network round
  // trip — unlike getUser(), which always re-validates with the Auth server.
  // ProtectedRoute already does that server-side revalidation once per
  // protected area; re-hitting the Auth server here on every call (this
  // function is used by 125+ files) was a flat per-page-load cost completely
  // independent of how much data the page actually renders.
  const {
    data: { session },
  } = await platformDb.auth.getSession()
  const user = session?.user
  if (!user) return null

  const { data: userRow } = await platformDb
    .from('users')
    .select('id')
    .eq('auth_user_id', user.id)
    .maybeSingle()
  if (userRow?.id) return userRow.id

  if (user.email) {
    const { data: byEmail } = await platformDb
      .from('users')
      .select('id')
      .eq('email', user.email)
      .maybeSingle()
    if (byEmail?.id) return byEmail.id
  }

  return null
}

async function resolveAccountFromProjects(userRowId) {
  const { data: projAsOwner } = await platformDb
    .from('projects')
    .select('account_id')
    .eq('owner_user_id', userRowId)
    .not('account_id', 'is', null)
    .eq('is_deleted', false)
    .limit(1)
    .maybeSingle()
  if (projAsOwner?.account_id) return projAsOwner.account_id

  const { data: projAsManager } = await platformDb
    .from('projects')
    .select('account_id')
    .eq('project_manager_user_id', userRowId)
    .not('account_id', 'is', null)
    .eq('is_deleted', false)
    .limit(1)
    .maybeSingle()
  if (projAsManager?.account_id) return projAsManager.account_id

  const { data: pmRows } = await platformDb
    .from('project_memberships')
    .select('project_id')
    .eq('user_id', userRowId)
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
    .eq('user_id', userRowId)
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
}

/**
 * Fast account lookup when auth / internal user id is already known (e.g. dashboard bootstrap).
 * Skips heavy get_user_accounts() when possible.
 *
 * @param {string} authUserId
 * @param {string|null} [internalUserId]
 * @returns {Promise<string|null>} accounts.id or null
 */
export async function resolveAccountIdForAuthUser(authUserId, internalUserId = null) {
  try {
    if (!authUserId) return null

    const cached = readCachedAccountId(authUserId)
    if (cached) return cached

    let userRowId = internalUserId
    if (!userRowId) {
      userRowId = await getCurrentUserInternalUserId()
    }
    if (!userRowId) return null

    const { data: ownedAccount } = await platformDb
      .from('accounts')
      .select('id')
      .eq('owner_user_id', userRowId)
      .eq('is_deleted', false)
      .limit(1)
      .maybeSingle()
    if (ownedAccount?.id) {
      writeCachedAccountId(authUserId, ownedAccount.id)
      return ownedAccount.id
    }

    const fromOrgInvite = await resolveAccountIdFromOrganisationInvitation(userRowId)
    if (fromOrgInvite) {
      writeCachedAccountId(authUserId, fromOrgInvite)
      return fromOrgInvite
    }

    const fromProjects = await resolveAccountFromProjects(userRowId)
    if (fromProjects) {
      writeCachedAccountId(authUserId, fromProjects)
      return fromProjects
    }

    const { data: rpcRows, error: rpcError } = await platformDb.rpc('get_user_accounts', {
      p_auth_user_id: authUserId,
    })
    if (rpcError) {
      console.warn('[accountResolution] get_user_accounts failed:', rpcError.message || rpcError)
    } else if (Array.isArray(rpcRows) && rpcRows.length > 0) {
      const row = rpcRows.find((r) => r?.account_id)
      if (row?.account_id) {
        writeCachedAccountId(authUserId, row.account_id)
        return row.account_id
      }
    }

    return null
  } catch (e) {
    console.error('[accountResolution] resolveAccountIdForAuthUser', e)
    return null
  }
}

/**
 * @returns {Promise<string|null>} accounts.id or null
 */
export async function getCurrentUserAccountId() {
  try {
    // See getCurrentUserInternalUserId's comment — getSession() avoids an
    // Auth-server round trip on every call; the account id itself is already
    // cached in sessionStorage per authUserId once resolved once.
    const {
      data: { session },
    } = await platformDb.auth.getSession()
    const user = session?.user
    if (!user) return null
    return resolveAccountIdForAuthUser(user.id)
  } catch (e) {
    console.error('[accountResolution] getCurrentUserAccountId', e)
    return null
  }
}
