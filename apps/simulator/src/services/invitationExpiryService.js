/**
 * Project invitation expiry — account default + RPC helpers (Supabase public schema).
 */

import { platformDb } from './supabase/supabaseClient'

export const INVITE_EXPIRY_MIN_DAYS = 1
export const INVITE_EXPIRY_MAX_DAYS = 365
export const INVITE_EXPIRY_FALLBACK_DAYS = 7

export function clampInvitationExpiryDays(value) {
  if (value === '' || value === null || value === undefined) return INVITE_EXPIRY_FALLBACK_DAYS
  const n = Math.round(Number(value))
  if (!Number.isFinite(n)) return INVITE_EXPIRY_FALLBACK_DAYS
  return Math.min(INVITE_EXPIRY_MAX_DAYS, Math.max(INVITE_EXPIRY_MIN_DAYS, n))
}

/**
 * @param {string} accountId
 * @returns {Promise<{ success: boolean, days: number, error: string|null }>}
 */
export async function fetchAccountInvitationExpiryDays(accountId) {
  if (!accountId) {
    return { success: false, days: INVITE_EXPIRY_FALLBACK_DAYS, error: 'Missing account' }
  }
  try {
    const { data, error } = await platformDb.rpc('get_account_project_invitation_expiry_days', {
      p_account_id: accountId,
    })
    if (error) throw error
    return {
      success: true,
      days: clampInvitationExpiryDays(data ?? INVITE_EXPIRY_FALLBACK_DAYS),
      error: null,
    }
  } catch (e) {
    console.error('fetchAccountInvitationExpiryDays', e)
    return {
      success: false,
      days: INVITE_EXPIRY_FALLBACK_DAYS,
      error: e?.message || 'Failed to load invitation expiry setting',
    }
  }
}

/**
 * @param {string} accountId
 * @param {number} days
 */
export async function saveAccountInvitationExpiryDays(accountId, days) {
  const d = clampInvitationExpiryDays(days)
  if (!accountId) {
    return { success: false, error: 'Missing account' }
  }
  try {
    const { data, error } = await platformDb.rpc('set_account_project_invitation_expiry_days', {
      p_account_id: accountId,
      p_days: d,
    })
    if (error) throw error
    if (data !== true) {
      return { success: false, error: 'Update did not apply (account not found or access denied).' }
    }
    return { success: true, days: d, error: null }
  } catch (e) {
    console.error('saveAccountInvitationExpiryDays', e)
    return { success: false, error: e?.message || 'Failed to save invitation expiry setting' }
  }
}

/**
 * Effective account default for a project (respects RLS via RPC).
 * @param {string} projectId
 */
export async function fetchDefaultInvitationExpiryDaysForProject(projectId) {
  if (!projectId) {
    return { success: false, days: INVITE_EXPIRY_FALLBACK_DAYS, error: 'Missing project' }
  }
  try {
    const { data, error } = await platformDb.rpc('get_default_project_invitation_expiry_days', {
      p_project_id: projectId,
    })
    if (error) throw error
    return {
      success: true,
      days: clampInvitationExpiryDays(data ?? INVITE_EXPIRY_FALLBACK_DAYS),
      error: null,
    }
  } catch (e) {
    console.error('fetchDefaultInvitationExpiryDaysForProject', e)
    return {
      success: false,
      days: INVITE_EXPIRY_FALLBACK_DAYS,
      error: e?.message || 'Failed to resolve invitation expiry',
    }
  }
}
