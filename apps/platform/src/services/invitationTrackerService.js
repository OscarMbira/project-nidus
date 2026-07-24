/**
 * Invitation Tracker Service — Platform (public schema)
 */

import { appDb } from './supabase/supabaseClient'
import { cancelInvitation as cancelInvitationMembership } from './projectMembershipService'
import { sendInvitationReminder } from './invitationService'

/**
 * @typedef {Object} InvitationTrackerFilters
 * @property {'pm'|'pmo'} [scope]
 * @property {string|null} [status]
 * @property {string|null} [entityType]
 * @property {string|null} [dateFrom] ISO date/time
 * @property {string|null} [dateTo] ISO date/time
 */

/**
 * @param {InvitationTrackerFilters} [filters]
 * @returns {Promise<{ success: boolean, data: object[], error: string|null }>}
 */
export async function getSentInvitations(filters = {}) {
  const scope = filters.scope === 'pmo' ? 'pmo' : 'pm'
  try {
    const { data, error } = await appDb.rpc('get_sent_invitations_by_user', {
      p_scope: scope,
      p_status: filters.status || null,
      p_entity_type: filters.entityType || null,
      p_date_from: filters.dateFrom || null,
      p_date_to: filters.dateTo || null,
    })

    if (error) throw error

    const rows = Array.isArray(data) ? data : []
    return { success: true, data: rows, error: null }
  } catch (error) {
    console.error('[getSentInvitations]', error)
    return {
      success: false,
      data: [],
      error: error?.message || 'Failed to load invitations',
    }
  }
}

/**
 * @param {string} invitationId
 */
export async function cancelInvitation(invitationId) {
  return cancelInvitationMembership(invitationId)
}

/**
 * @param {string} invitationId
 */
export async function resendInvitationReminder(invitationId) {
  try {
    const result = await sendInvitationReminder(invitationId)
    if (!result.success) {
      return { success: false, error: result.error || 'Failed to resend reminder' }
    }
    return { success: true, error: null }
  } catch (error) {
    console.error('[resendInvitationReminder]', error)
    return { success: false, error: error?.message || 'Failed to resend reminder' }
  }
}

export default {
  getSentInvitations,
  cancelInvitation,
  resendInvitationReminder,
}
