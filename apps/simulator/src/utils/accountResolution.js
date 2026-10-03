/**
 * Resolve current user's organisation (account) id for Platform and Simulator features.
 * Prefer fast owner/project lookups, then get_user_accounts() (heavy — subscription counts).
 */

import { platformDb } from '@nidus/supabase'
import { resolveAccountIdFromOrganisationInvitation } from '../services/billingAccessService'
import { clearSidebarCache } from './menuCacheUtils'

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

let _internalUserIdInFlight = null

/**
 * @returns {Promise<string|null>} public.users.id or null
 */
export async function getCurrentUserInternalUserId() {
  // In-flight de-dupe: this function is called independently by 125+ files, several
  // of which mount on the same page load (header, profile sections, project context,
  // ...) — under React 18 StrictMode's dev-only double-invoke, or just several
  // components' own effects firing within the same tick, that's the same query fired
  // many times over. Collapsing concurrent callers onto one shared request is exactly
  // the pattern userProfileService.js's getAuthSessionUserId() already uses for the
  // identical reason. Deliberately NOT a persistent cache — no staleness risk, a call
  // a moment later still does a fresh lookup.
  if (_internalUserIdInFlight) return _internalUserIdInFlight

  _internalUserIdInFlight = (async () => {
    // getSession() reads the already-persisted local session — no network round
    // trip — unlike getUser(), which always re-validates with the Auth server.
    // ProtectedRoute already does that server-side revalidation once per
    // protected area; re-hitting the Auth server here on every call was a flat
    // per-page-load cost completely independent of how much data the page
    // actually renders.
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
  })().finally(() => {
    _internalUserIdInFlight = null
  })

  return _internalUserIdInFlight
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

    // v982 Phase 4: an explicit active-workspace selection (set via the workspace switcher, see
    // setActiveWorkspace() below) takes priority over the owner/invite/project waterfall that
    // follows. For a user who has never switched (the common, single-org case — the overwhelming
    // majority of existing users pre-v995), this column is NULL and the function falls straight
    // through to the exact same waterfall as before v995 — zero behaviour change for that case.
    // Deliberately NOT re-validated against get_user_accounts() on every call here (that RPC is
    // the "heavy" one this file's own header comment warns about) — menu/account resolution is
    // not itself a security boundary (every downstream query is still RLS-scoped), so a stale
    // selection degrades to an empty state at worst, and is self-healed the next time the
    // workspace switcher loads the user's real accessible list (getAccessibleWorkspaces()).
    const { data: userRow } = await platformDb
      .from('users')
      .select('last_active_account_id')
      .eq('id', userRowId)
      .maybeSingle()
    if (userRow?.last_active_account_id) {
      writeCachedAccountId(authUserId, userRow.last_active_account_id)
      return userRow.last_active_account_id
    }

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

// ============================================================================
// v982 Phase 4 — Workspace Switching
// ============================================================================
// Extends this file directly (rather than a new workspaceService.js) since it already owns the
// exact account-resolution logic a workspace switcher needs to read and override — matches the
// plan's own recommended alternative (task B).

/**
 * Every workspace (account) the current auth user can access, via get_user_accounts() — already
 * returns account_name/is_owner/project_count/etc. per row, enough for a switcher UI without any
 * function changes. Used by the workspace switcher to populate its list AND to self-heal a stale
 * last_active_account_id (an account the user no longer has access to never appears here).
 * @returns {Promise<{success: boolean, data: array, error: string|null}>}
 */
export async function getAccessibleWorkspaces() {
  try {
    const {
      data: { session },
    } = await platformDb.auth.getSession()
    const user = session?.user
    if (!user) return { success: true, data: [], error: null }

    const { data, error } = await platformDb.rpc('get_user_accounts', { p_auth_user_id: user.id })
    if (error) throw error
    return { success: true, data: Array.isArray(data) ? data : [], error: null }
  } catch (e) {
    console.error('[accountResolution] getAccessibleWorkspaces', e)
    return { success: false, data: [], error: e.message || 'Failed to load accessible workspaces' }
  }
}

/**
 * Switches the current auth user's active workspace: persists the selection
 * (users.last_active_account_id, syncs across devices/sessions per decision 1), overwrites the
 * in-session account-id cache to the new value immediately, and — the single most important part
 * of this function — wipes every sidebar cache entry for this user (clearSidebarCache, all layout
 * scopes) so nothing from the previous workspace can be served stale. This does NOT itself
 * trigger a re-render; the caller (the workspace switcher UI) is expected to force a full page
 * navigation/reload immediately after a successful switch (see WorkspaceSwitcher.jsx) — a full
 * reload is the only way to guarantee every component that assumed a single resolved account
 * (menu, entitlements, industry packs, page-level state) recomputes from scratch with zero risk
 * of a stale-while-revalidate window, matching this phase's own stale-cache rigor requirement.
 * @param {string} accountId - the accounts.id to switch to (must be one of
 *   getAccessibleWorkspaces()'s own results — the caller is expected to only ever pass a value
 *   that came from that list, same discipline as any other picker in this codebase; RLS is still
 *   the real enforcement boundary if that discipline is ever bypassed).
 * @returns {Promise<{success: boolean, error: string|null}>}
 */
export async function setActiveWorkspace(accountId) {
  try {
    if (!isValidAccountId(accountId)) return { success: false, error: 'Invalid workspace id' }

    const {
      data: { session },
    } = await platformDb.auth.getSession()
    const user = session?.user
    if (!user) return { success: false, error: 'Not authenticated' }

    const userRowId = await getCurrentUserInternalUserId()
    if (!userRowId) return { success: false, error: 'Could not resolve your user record' }

    const { error } = await platformDb
      .from('users')
      .update({ last_active_account_id: accountId })
      .eq('id', userRowId)
    if (error) throw error

    // Overwrite (not clear) the session cache — the switch should take effect immediately for
    // any code that runs before the caller's own full-page reload completes.
    writeCachedAccountId(user.id, accountId)
    // Wipe every sidebar cache entry for this user, every layout scope — the sidebar cache key is
    // NOT partitioned by account_id (only by auth user id + layout scope, see
    // menuCacheUtils.js), so a stale-but-still-"fresh" (<10 min) entry from the OLD workspace
    // would otherwise keep being served under the SAME key after the switch. This is the exact
    // failure mode this phase's ground rules named explicitly.
    clearSidebarCache(user.id)

    return { success: true, error: null }
  } catch (e) {
    console.error('[accountResolution] setActiveWorkspace', e)
    return { success: false, error: e.message || 'Failed to switch workspace' }
  }
}
