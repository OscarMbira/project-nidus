/**
 * Invitation Tracker Service — Simulator (sim schema)
 */

import { simDb } from '../supabase/supabaseClient'

/**
 * Resolve current public.users id for sim RLS.
 */
async function getCurrentUserId() {
  const {
    data: { user: authUser },
  } = await simDb.auth.getUser()
  if (!authUser) return null
  const { data: row } = await simDb.from('users').select('id').eq('auth_user_id', authUser.id).maybeSingle()
  return row?.id ?? null
}

/**
 * @param {Object} [filters]
 * @param {'pm'|'pmo'} [filters.scope]
 * @param {string|null} [filters.status]
 * @param {string|null} [filters.entityType]
 */
export async function getSentInvitations(filters = {}) {
  const scope = filters.scope === 'pmo' ? 'pmo' : 'pm'
  try {
    let query = simDb
      .from('entity_invitations')
      .select(
        `
        id,
        scenario_id,
        entity_type,
        entity_name,
        invited_email,
        invited_first_name,
        invited_last_name,
        role_name,
        role_display_name,
        invitation_status,
        invitation_sent_at,
        invitation_expires_at,
        invitation_message,
        invited_by_user_id,
        scenario:scenarios(name)
      `,
      )
      .eq('is_deleted', false)

    if (filters.status) {
      query = query.eq('invitation_status', filters.status)
    }
    if (filters.entityType) {
      query = query.eq('entity_type', filters.entityType)
    }

    if (scope === 'pm') {
      const userId = await getCurrentUserId()
      if (!userId) {
        return { success: false, data: [], error: 'User not found' }
      }
      query = query.eq('invited_by_user_id', userId).eq('entity_type', 'project')
    }

    const { data, error } = await query.order('invitation_sent_at', { ascending: false })
    if (error) throw error

    const rows = (data || []).map((row) => ({
      ...row,
      entity_name: row.entity_name || row.scenario?.name || '—',
      role_display_name: row.role_display_name || row.role_name,
      sent_at: row.invitation_sent_at,
    }))

    return { success: true, data: rows, error: null }
  } catch (error) {
    console.error('[sim getSentInvitations]', error)
    return {
      success: false,
      data: [],
      error: error?.message || 'Failed to load simulator invitations',
    }
  }
}

export async function cancelInvitation(invitationId) {
  try {
    const { data, error } = await simDb
      .from('entity_invitations')
      .update({
        invitation_status: 'cancelled',
        cancelled_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', invitationId)
      .select()
      .single()

    if (error) throw error
    return { success: true, data, error: null }
  } catch (error) {
    console.error('[sim cancelInvitation]', error)
    return { success: false, data: null, error: error?.message || 'Failed to cancel invitation' }
  }
}

export async function resendInvitationReminder(invitationId) {
  try {
    const { error } = await simDb
      .from('entity_invitations')
      .update({
        reminder_sent_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', invitationId)
      .eq('invitation_status', 'pending')

    if (error) throw error
    return { success: true, error: null }
  } catch (error) {
    console.error('[sim resendInvitationReminder]', error)
    return { success: false, error: error?.message || 'Failed to resend reminder' }
  }
}

export default {
  getSentInvitations,
  cancelInvitation,
  resendInvitationReminder,
}
