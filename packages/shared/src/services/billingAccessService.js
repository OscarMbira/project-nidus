/**
 * Billing access — account owner OR active billing delegate.
 * @see projectplan/v728_Account_Owner_Billing_Separation_Feature_Reference.md
 */

import { platformDb } from '@nidus/supabase'
import { getUserSystemRoles } from './roleService'

const BILLING_ACTION_STATUSES = new Set(['past_due', 'paused', 'cancelled', 'expired', 'inactive'])
const HEALTHY_STATUSES = new Set(['active', 'trialing', 'trial'])

/**
 * Account from an accepted organisation_invitations row (invited PMO admin, etc.).
 * @param {string} internalUserId
 * @returns {Promise<string|null>}
 */
export async function resolveAccountIdFromOrganisationInvitation(internalUserId) {
  if (!internalUserId) return null

  const { data: invite } = await platformDb
    .from('organisation_invitations')
    .select('organisation_id')
    .eq('invitation_status', 'accepted')
    .eq('is_deleted', false)
    .or(`accepted_by_user_id.eq.${internalUserId},invited_user_id.eq.${internalUserId}`)
    .order('accepted_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  return invite?.organisation_id ?? null
}

/**
 * Resolve primary organisation account for an internal user id.
 * @param {string} internalUserId
 * @returns {Promise<string|null>}
 */
export async function resolveAccountIdForUser(internalUserId) {
  if (!internalUserId) return null

  const { data: owned } = await platformDb
    .from('accounts')
    .select('id')
    .eq('owner_user_id', internalUserId)
    .eq('is_deleted', false)
    .maybeSingle()

  if (owned?.id) return owned.id

  const invitedOrgAccountId = await resolveAccountIdFromOrganisationInvitation(internalUserId)
  if (invitedOrgAccountId) return invitedOrgAccountId

  const { data: delegate } = await platformDb
    .from('account_billing_delegates')
    .select('account_id')
    .eq('user_id', internalUserId)
    .eq('is_active', true)
    .is('revoked_at', null)
    .limit(1)
    .maybeSingle()

  if (delegate?.account_id) return delegate.account_id

  const { data: project } = await platformDb
    .from('projects')
    .select('account_id')
    .or(`owner_user_id.eq.${internalUserId},project_manager_user_id.eq.${internalUserId}`)
    .eq('is_deleted', false)
    .limit(1)
    .maybeSingle()

  return project?.account_id ?? null
}

/**
 * @param {string} authUserId
 * @param {string} [accountId]
 * @returns {Promise<{ hasBillingAccess: boolean, isOwner: boolean, isDelegate: boolean, accountId: string|null }>}
 */
export async function resolveBillingAccess(authUserId, accountId = null) {
  const empty = { hasBillingAccess: false, isOwner: false, isDelegate: false, accountId: null }

  if (!authUserId) return empty

  const { data: userRow } = await platformDb
    .from('users')
    .select('id')
    .eq('auth_user_id', authUserId)
    .maybeSingle()

  if (!userRow?.id) return empty

  const accId = accountId || (await resolveAccountIdForUser(userRow.id))
  if (!accId) return empty

  let isOwner = false
  try {
    const { data: ownerRpc } = await platformDb.rpc('is_account_owner', {
      p_auth_user_id: authUserId,
      p_account_id: accId,
    })
    isOwner = ownerRpc === true
  } catch {
    const { data: acct } = await platformDb
      .from('accounts')
      .select('owner_user_id')
      .eq('id', accId)
      .maybeSingle()
    isOwner = acct?.owner_user_id === userRow.id
  }

  if (!isOwner) {
    const rolesResult = await getUserSystemRoles(authUserId)
    if (rolesResult.success && rolesResult.data?.some((a) => a.roles?.role_name === 'account_owner')) {
      isOwner = true
    }
  }

  if (isOwner) {
    return { hasBillingAccess: true, isOwner: true, isDelegate: false, accountId: accId }
  }

  let isDelegate = false
  try {
    const { data: billingRpc } = await platformDb.rpc('has_billing_access', {
      p_auth_user_id: authUserId,
      p_account_id: accId,
    })
    if (billingRpc === true) {
      return { hasBillingAccess: true, isOwner: false, isDelegate: true, accountId: accId }
    }
  } catch {
    // RPC may not exist until v733 migration
  }

  const { data: delegateRow } = await platformDb
    .from('account_billing_delegates')
    .select('id')
    .eq('account_id', accId)
    .eq('user_id', userRow.id)
    .eq('is_active', true)
    .is('revoked_at', null)
    .maybeSingle()

  isDelegate = !!delegateRow?.id

  return {
    hasBillingAccess: isDelegate,
    isOwner: false,
    isDelegate,
    accountId: accId,
  }
}

/** @returns {Promise<boolean>} */
export async function hasBillingAccess(authUserId, accountId = null) {
  const result = await resolveBillingAccess(authUserId, accountId)
  return result.hasBillingAccess
}

/** @returns {Promise<boolean>} */
export async function canInvitePmoAdmin(authUserId) {
  return hasBillingAccess(authUserId)
}

/** @returns {Promise<boolean>} */
export async function canGrantBillingPrivileges(authUserId, accountId = null) {
  const access = await resolveBillingAccess(authUserId, accountId)
  return access.isOwner
}

/**
 * Subscription billing alert for dashboard banner / post-login routing.
 * @param {string} accountId
 * @returns {Promise<{ needsRedirect: boolean, showBanner: boolean, daysRemaining: number|null, expiryDate: string|null, message: string|null }>}
 */
export async function getSubscriptionBillingAlert(accountId) {
  const none = { needsRedirect: false, showBanner: false, daysRemaining: null, expiryDate: null, message: null }
  if (!accountId) return none

  const { data: account } = await platformDb
    .from('accounts')
    .select('subscription_status, trial_ends_at, subscription_plan')
    .eq('id', accountId)
    .maybeSingle()

  const { data: subs } = await platformDb
    .from('platform_subscriptions')
    .select('status, expires_at, is_lifetime')
    .eq('account_id', accountId)
    .order('created_at', { ascending: false })
    .limit(5)

  const now = Date.now()
  let expiryMs = null
  let status = account?.subscription_status || null

  for (const sub of subs || []) {
    if (sub.is_lifetime) continue
    if (sub.expires_at) {
      const t = new Date(sub.expires_at).getTime()
      if (!expiryMs || t < expiryMs) expiryMs = t
    }
    if (!status && sub.status) status = sub.status
  }

  if (account?.trial_ends_at) {
    const trialMs = new Date(account.trial_ends_at).getTime()
    if (!expiryMs || trialMs < expiryMs) expiryMs = trialMs
  }

  const normalizedStatus = String(status || '').toLowerCase()

  if (BILLING_ACTION_STATUSES.has(normalizedStatus)) {
    return {
      needsRedirect: true,
      showBanner: false,
      daysRemaining: null,
      expiryDate: expiryMs ? new Date(expiryMs).toISOString() : null,
      message: 'Your subscription requires attention. Please review billing.',
    }
  }

  if (!expiryMs && !subs?.length && !account?.subscription_plan) {
    return {
      needsRedirect: true,
      showBanner: false,
      daysRemaining: null,
      expiryDate: null,
      message: 'No active subscription found. Choose a plan to continue.',
    }
  }

  if (!expiryMs) return none

  const daysRemaining = Math.ceil((expiryMs - now) / (24 * 60 * 60 * 1000))
  const expiryDate = new Date(expiryMs).toISOString()

  if (daysRemaining <= 0 && !HEALTHY_STATUSES.has(normalizedStatus)) {
    return {
      needsRedirect: true,
      showBanner: false,
      daysRemaining: 0,
      expiryDate,
      message: 'Your subscription has expired. Please renew to continue.',
    }
  }

  if (daysRemaining > 0 && daysRemaining <= 7) {
    const label = normalizedStatus === 'trialing' || account?.trial_ends_at ? 'trial ends' : 'subscription renews'
    return {
      needsRedirect: false,
      showBanner: true,
      daysRemaining,
      expiryDate,
      message: `Your ${label} on ${new Date(expiryMs).toLocaleDateString()} (${daysRemaining} day${daysRemaining === 1 ? '' : 's'} remaining).`,
    }
  }

  return none
}

export default {
  resolveAccountIdForUser,
  resolveBillingAccess,
  hasBillingAccess,
  canInvitePmoAdmin,
  canGrantBillingPrivileges,
  getSubscriptionBillingAlert,
}
