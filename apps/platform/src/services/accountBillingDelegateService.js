/**
 * Account Owner Privileges — billing delegation for pmo_admin users.
 */

import { platformDb } from './supabase/supabaseClient'
import { assignSystemRole } from './roleService'
import {
  canGrantBillingPrivileges,
  canInvitePmoAdmin,
  resolveBillingAccess,
} from './billingAccessService'
import { dispatchOrganisationPmoAdminInvitationEmail } from './invitationService'
import { resolveInviterDisplayNameFromUser } from '@nidus/shared/utils/invitationInviteeFormat.js'

/**
 * @param {string} accountId
 * @returns {Promise<{ success: boolean, data: object[], error: string|null }>}
 */
export async function listBillingDelegates(accountId) {
  try {
    const { data, error } = await platformDb
      .from('account_billing_delegates')
      .select(`
        id,
        user_id,
        granted_at,
        revoked_at,
        is_active,
        granted_by_user_id,
        users:user_id ( id, full_name, email )
      `)
      .eq('account_id', accountId)
      .eq('is_active', true)
      .is('revoked_at', null)
      .order('granted_at', { ascending: false })

    if (error) throw error
    return { success: true, data: data || [], error: null }
  } catch (error) {
    return { success: false, data: [], error: error.message || 'Failed to list delegates' }
  }
}

/**
 * @param {string} authUserId
 * @param {string} targetInternalUserId
 * @param {string} accountId
 */
export async function grantBillingPrivileges(authUserId, targetInternalUserId, accountId) {
  try {
    const canGrant = await canGrantBillingPrivileges(authUserId, accountId)
    if (!canGrant) {
      return { success: false, error: 'Only the account owner can grant billing privileges' }
    }

    const { data: grantor } = await platformDb
      .from('users')
      .select('id')
      .eq('auth_user_id', authUserId)
      .maybeSingle()

    if (!grantor?.id) return { success: false, error: 'Grantor not found' }

    const { data: targetAuth } = await platformDb
      .from('users')
      .select('id, auth_user_id, email, full_name')
      .eq('id', targetInternalUserId)
      .maybeSingle()

    if (!targetAuth?.id) return { success: false, error: 'User not found' }

    await ensurePmoAdminRole(targetAuth.auth_user_id)

    const { error } = await platformDb.from('account_billing_delegates').upsert(
      {
        account_id: accountId,
        user_id: targetInternalUserId,
        granted_by_user_id: grantor.id,
        granted_at: new Date().toISOString(),
        revoked_at: null,
        is_active: true,
      },
      { onConflict: 'account_id,user_id' }
    )

    if (error) throw error

    await logBillingAudit(accountId, grantor.id, 'grant_billing_privileges', targetInternalUserId)

    return { success: true, error: null }
  } catch (error) {
    return { success: false, error: error.message || 'Failed to grant billing privileges' }
  }
}

/**
 * @param {string} authUserId
 * @param {string} targetInternalUserId
 * @param {string} accountId
 */
export async function revokeBillingPrivileges(authUserId, targetInternalUserId, accountId) {
  try {
    const canGrant = await canGrantBillingPrivileges(authUserId, accountId)
    if (!canGrant) {
      return { success: false, error: 'Only the account owner can revoke billing privileges' }
    }

    const { data: grantor } = await platformDb
      .from('users')
      .select('id')
      .eq('auth_user_id', authUserId)
      .maybeSingle()

    const { error } = await platformDb
      .from('account_billing_delegates')
      .update({
        is_active: false,
        revoked_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('account_id', accountId)
      .eq('user_id', targetInternalUserId)
      .eq('is_active', true)

    if (error) throw error

    await logBillingAudit(accountId, grantor?.id, 'revoke_billing_privileges', targetInternalUserId)

    return { success: true, error: null }
  } catch (error) {
    return { success: false, error: error.message || 'Failed to revoke billing privileges' }
  }
}

/**
 * Invite a PMO administrator (pmo_admin only, no billing privileges).
 * @param {string} authUserId
 * @param {{ email: string, fullName?: string, firstName?: string, lastName?: string, message?: string, expiryDays?: number, inviterName?: string }} payload
 * @param {{ skipAccessRecheck?: boolean, accountId?: string|null }} [options]
 */
export async function invitePmoAdministrator(authUserId, {
  email,
  fullName = null,
  firstName = null,
  lastName = null,
  message = null,
  expiryDays = 7,
  inviterName = null,
} = {}, options = {}) {
  try {
    const { skipAccessRecheck = false, accountId: accountIdOverride = null } = options

    let accountId = accountIdOverride
    if (!skipAccessRecheck) {
      const canInvite = await canInvitePmoAdmin(authUserId)
      if (!canInvite) {
        return { success: false, error: 'Only the account owner or a billing delegate can invite PMO administrators' }
      }
    }

    if (!accountId) {
      const access = await resolveBillingAccess(authUserId)
      accountId = access.accountId
    }
    if (!accountId) return { success: false, error: 'Organisation account not found' }

    const [inviterRes, orgRes, pmoRoleRes, profileRes] = await Promise.all([
      platformDb
        .from('users')
        .select('id, full_name, email')
        .eq('auth_user_id', authUserId)
        .maybeSingle(),
      platformDb
        .from('accounts')
        .select('id, account_name, account_display_name, company_name')
        .eq('id', accountId)
        .maybeSingle(),
      platformDb
        .from('roles')
        .select('id, role_display_name')
        .eq('role_name', 'pmo_admin')
        .maybeSingle(),
      platformDb.rpc('get_my_display_name'),
    ])

    const inviter = inviterRes.data
    const org = orgRes.data
    const pmoRole = pmoRoleRes.data
    const rawProfile = Array.isArray(profileRes.data) && profileRes.data.length > 0
      ? profileRes.data[0]
      : null

    if (!inviter?.id) return { success: false, error: 'Inviter not found' }
    if (!pmoRole?.id) return { success: false, error: 'pmo_admin role not found' }

    const resolvedFullName =
      (fullName && String(fullName).trim()) ||
      [firstName, lastName].map((s) => String(s || '').trim()).filter(Boolean).join(' ') ||
      null

    const days = Math.min(365, Math.max(1, Number(expiryDays) || 7))
    const invitationToken = `${Date.now()}-${Math.random().toString(36).slice(2, 14)}`
    const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString()

    const { data: invitation, error: invErr } = await platformDb
      .from('organisation_invitations')
      .insert({
        organisation_id: accountId,
        invited_email: email.trim().toLowerCase(),
        role_id: pmoRole.id,
        role_name: 'pmo_admin',
        invited_by_user_id: inviter.id,
        invitation_token: invitationToken,
        invitation_message: message || null,
        invitation_expires_at: expiresAt,
        invitation_status: 'pending',
        invitation_metadata: {
          invite_type: 'pmo_admin',
          billing_privileges: false,
          full_name: resolvedFullName,
          first_name: firstName ? String(firstName).trim() : null,
          last_name: lastName ? String(lastName).trim() : null,
        },
      })
      .select('id')
      .maybeSingle()

    if (invErr) {
      if (/organisation_invitations|does not exist/i.test(invErr.message || '')) {
        return { success: false, error: 'Invitation system not configured. Apply SQL migrations v120+.' }
      }
      throw invErr
    }

    void logBillingAudit(accountId, inviter.id, 'invite_pmo_admin', null, {
      email,
      invitation_id: invitation?.id,
    })

    const orgLabel = org?.account_display_name || org?.account_name || org?.company_name || 'Project Nidus'
    const resolvedInviterName =
      inviterName ||
      resolveInviterDisplayNameFromUser(
        rawProfile ? { ...rawProfile, id: rawProfile.user_id } : inviter || {},
        inviter?.email,
      ) ||
      inviter?.full_name ||
      inviter?.email ||
      'Your organisation'
    const resolvedInviterJobTitle = rawProfile?.job_title || ''
    const roleDisplayName = pmoRole?.role_display_name || 'PMO Administrator'

    // Invitation row saved — email in background (matches project invitation UX).
    void dispatchOrganisationPmoAdminInvitationEmail(email.trim(), {
      organisationName: orgLabel,
      roleName: roleDisplayName,
      inviterName: resolvedInviterName,
      inviterJobTitle: resolvedInviterJobTitle,
      message: message || null,
      invitationToken,
      expiryDays: days,
      inviteeFirstName: firstName ? String(firstName).trim() : null,
      inviteeLastName: lastName ? String(lastName).trim() : null,
      billingAccess: false,
    })

    return { success: true, invitationId: invitation?.id, error: null }
  } catch (error) {
    return { success: false, error: error.message || 'Failed to send invitation' }
  }
}

/**
 * Transfer legal account ownership (v734).
 * @param {string} authUserId — current owner
 * @param {string} newOwnerInternalUserId
 * @param {string} accountId
 */
export async function transferAccountOwnership(authUserId, newOwnerInternalUserId, accountId) {
  try {
    const canGrant = await canGrantBillingPrivileges(authUserId, accountId)
    if (!canGrant) {
      return { success: false, error: 'Only the account owner can transfer ownership' }
    }

    const { data: currentOwner } = await platformDb
      .from('users')
      .select('id, auth_user_id')
      .eq('auth_user_id', authUserId)
      .maybeSingle()

    const { data: newOwner } = await platformDb
      .from('users')
      .select('id, auth_user_id, email')
      .eq('id', newOwnerInternalUserId)
      .maybeSingle()

    if (!currentOwner?.id || !newOwner?.auth_user_id) {
      return { success: false, error: 'Invalid ownership transfer participants' }
    }

    if (currentOwner.id === newOwner.id) {
      return { success: false, error: 'Cannot transfer ownership to yourself' }
    }

    await ensurePmoAdminRole(newOwner.auth_user_id)

    const { error: acctErr } = await platformDb
      .from('accounts')
      .update({ owner_user_id: newOwner.id, updated_at: new Date().toISOString() })
      .eq('id', accountId)
      .eq('owner_user_id', currentOwner.id)

    if (acctErr) throw acctErr

    await assignSystemRole(newOwner.auth_user_id, 'account_owner')

    await platformDb
      .from('account_billing_delegates')
      .update({ is_active: false, revoked_at: new Date().toISOString() })
      .eq('account_id', accountId)
      .eq('is_active', true)

    await logBillingAudit(accountId, currentOwner.id, 'transfer_ownership', newOwner.id)

    return { success: true, error: null }
  } catch (error) {
    return { success: false, error: error.message || 'Ownership transfer failed' }
  }
}

async function ensurePmoAdminRole(authUserId) {
  if (!authUserId) return
  await assignSystemRole(authUserId, 'pmo_admin')
}

async function logBillingAudit(accountId, actorUserId, action, targetUserId = null, metadata = {}) {
  try {
    await platformDb.from('account_billing_audit_log').insert({
      account_id: accountId,
      actor_user_id: actorUserId,
      action,
      target_user_id: targetUserId,
      metadata,
    })
  } catch {
    // audit table optional until migration applied
  }
}

/**
 * List org PMO admins with billing privilege flag.
 * @param {string} accountId
 */
export async function listOrgPmoAdmins(accountId) {
  try {
    const { data: pmoRole } = await platformDb
      .from('roles')
      .select('id')
      .eq('role_name', 'pmo_admin')
      .maybeSingle()

    if (!pmoRole?.id) return { success: true, data: [], error: null }

    const { data: userRoles, error } = await platformDb
      .from('user_roles')
      .select(`
        user_id,
        users:user_id ( id, full_name, email, auth_user_id )
      `)
      .eq('role_id', pmoRole.id)
      .eq('is_active', true)
      .eq('is_deleted', false)

    if (error) throw error

    const { data: delegates } = await platformDb
      .from('account_billing_delegates')
      .select('user_id')
      .eq('account_id', accountId)
      .eq('is_active', true)
      .is('revoked_at', null)

    const delegateIds = new Set((delegates || []).map((d) => d.user_id))

    const { data: account } = await platformDb
      .from('accounts')
      .select('owner_user_id')
      .eq('id', accountId)
      .maybeSingle()

    const seen = new Map()
    for (const row of userRoles || []) {
      const u = row.users
      if (!u?.id || seen.has(u.id)) continue
      seen.set(u.id, {
        ...u,
        hasBillingPrivileges: delegateIds.has(u.id),
        isAccountOwner: account?.owner_user_id === u.id,
        label: delegateIds.has(u.id)
          ? 'PMO Administrator (Billing)'
          : account?.owner_user_id === u.id
            ? 'Account Owner'
            : 'PMO Administrator',
      })
    }

    return { success: true, data: [...seen.values()], error: null }
  } catch (error) {
    return { success: false, data: [], error: error.message || 'Failed to list PMO admins' }
  }
}

export default {
  listBillingDelegates,
  grantBillingPrivileges,
  revokeBillingPrivileges,
  invitePmoAdministrator,
  transferAccountOwnership,
  listOrgPmoAdmins,
}
