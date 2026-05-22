/**
 * Manager appointment records (v593) — Platform public schema
 */
import { platformDb } from './supabase/supabaseClient'
import { inviteUserToProject } from './projectMembershipService'
import { dispatchProjectInvitationEmail } from './invitationService'
import { postInviteTableRow } from './inviteTransport'
import { resendInvitation } from './projectMembershipService'
import { clampInvitationExpiryDays } from './invitationExpiryService'
import {
  managerRoleForEntityType,
  normalizeManagerRoleName,
} from '../utils/appointmentRoleUtils'

const APPT_SELECT = `
  *,
  appointee:appointee_user_id(id, full_name, email),
  appointer:appointed_by_user_id(id, full_name, email),
  reporting_to:reporting_to_user_id(id, full_name, email),
  invitation:invitation_id(id, invitation_token, invitation_status, invited_email)
`

async function getCurrentUserId() {
  const {
    data: { user },
  } = await platformDb.auth.getUser()
  if (!user?.id) return null
  const { data } = await platformDb
    .from('users')
    .select('id')
    .eq('auth_user_id', user.id)
    .maybeSingle()
  return data?.id || null
}

async function resolveRoleIdForManager(roleName) {
  const normalized = normalizeManagerRoleName(roleName)
  const { data, error } = await platformDb
    .from('roles')
    .select('id')
    .eq('role_name', normalized)
    .eq('is_active', true)
    .maybeSingle()
  if (error) throw error
  if (data?.id) return data.id
  const { data: fallback } = await platformDb
    .from('roles')
    .select('id')
    .eq('role_name', 'project_manager')
    .eq('is_active', true)
    .maybeSingle()
  return fallback?.id || null
}

/**
 * @param {object} input
 */
export async function createManagerAppointment(input) {
  const appointedBy = input.appointedByUserId || (await getCurrentUserId())
  if (!appointedBy) return { success: false, error: 'Not authenticated' }

  const entityType = input.entityType
  const managerRole = input.managerRoleName || managerRoleForEntityType(entityType)
  const appointeeUserId = input.appointeeUserId
  if (!appointeeUserId) return { success: false, error: 'Appointee is required' }

  const { data: appointee, error: uErr } = await platformDb
    .from('users')
    .select('id, email, full_name')
    .eq('id', appointeeUserId)
    .maybeSingle()
  if (uErr) throw uErr
  if (!appointee?.email) return { success: false, error: 'Appointee email not found' }

  const roleId = await resolveRoleIdForManager(managerRole)
  if (!roleId) return { success: false, error: 'Manager role not found in roles table' }

  const expiryDays = clampInvitationExpiryDays(input.expiryDays ?? 14)
  const invitationExpiresAt = new Date(Date.now() + expiryDays * 86400000).toISOString()
  const message = input.appointmentMessage?.trim() || input.personalMessage?.trim() || null

  let invitationId = input.invitationId || null
  let invitationRow = null

  if (!invitationId) {
    if (entityType === 'project' && input.projectId) {
      const inv = await inviteUserToProject(input.projectId, {
        email: appointee.email,
        roleId,
        message,
        expiryDays,
        inviteeFirstName: appointee.full_name?.split(' ')[0],
      })
      if (!inv.success) return { success: false, error: inv.error || 'Failed to create invitation' }
      invitationRow = inv.data
      invitationId = inv.data?.id
    } else {
      const invPayload = {
        entity_type: entityType,
        project_id: entityType === 'project' ? input.projectId : null,
        programme_id: entityType === 'programme' ? input.programmeId : null,
        portfolio_id: entityType === 'portfolio' ? input.portfolioId : null,
        invited_email: appointee.email.trim().toLowerCase(),
        invited_user_id: appointee.id,
        role_id: roleId,
        invited_by_user_id: appointedBy,
        invitation_message: message,
        invitation_expires_at: invitationExpiresAt,
        invitation_status: 'pending',
      }
      const ins = await postInviteTableRow(
        invPayload,
        'id, invitation_token, invitation_status, project_id, programme_id, portfolio_id, entity_type',
      )
      if (!ins.ok) return { success: false, error: ins.error || 'Failed to create invitation' }
      invitationRow = ins.data
      invitationId = ins.data?.id
      if (invitationRow?.invitation_token && entityType === 'project' && input.projectId) {
        void dispatchProjectInvitationEmail(appointee.email, {
          invitationToken: invitationRow.invitation_token,
          projectId: input.projectId,
          roleId,
          message,
        })
      }
    }
  }

  const row = {
    invitation_id: invitationId,
    entity_type: entityType,
    project_id: entityType === 'project' ? input.projectId : null,
    programme_id: entityType === 'programme' ? input.programmeId : null,
    portfolio_id: entityType === 'portfolio' ? input.portfolioId : null,
    manager_role_name: normalizeManagerRoleName(managerRole),
    appointee_user_id: appointeeUserId,
    appointed_by_user_id: appointedBy,
    reporting_to_user_id: input.reportingToUserId || null,
    assignment_start_date: input.assignmentStartDate || null,
    assignment_end_date: input.assignmentEndDate || null,
    time_commitment_pct: input.timeCommitmentPct ?? null,
    budget_authority_limit: input.budgetAuthorityLimit ?? null,
    authority_notes: input.authorityNotes?.trim() || null,
    reporting_frequency: input.reportingFrequency || null,
    known_constraints: input.knownConstraints?.trim() || null,
    reference_document: input.referenceDocument?.trim() || null,
    appointment_message: message,
    appointment_status: 'pending_acceptance',
  }

  const { data, error } = await platformDb
    .from('manager_appointment_records')
    .insert(row)
    .select(APPT_SELECT)
    .maybeSingle()

  if (error) return { success: false, error: error.message }
  return { success: true, data, invitation: invitationRow }
}

export async function getManagerAppointment(appointmentId) {
  const { data, error } = await platformDb
    .from('manager_appointment_records')
    .select(APPT_SELECT)
    .eq('id', appointmentId)
    .eq('is_deleted', false)
    .maybeSingle()
  if (error) return { success: false, error: error.message }
  return { success: true, data }
}

export async function getManagerAppointmentByInvitationId(invitationId) {
  const { data, error } = await platformDb
    .from('manager_appointment_records')
    .select(APPT_SELECT)
    .eq('invitation_id', invitationId)
    .eq('is_deleted', false)
    .maybeSingle()
  if (error) return { success: false, error: error.message }
  return { success: true, data }
}

export async function getAppointmentsForEntity(entityType, entityId) {
  const col =
    entityType === 'programme'
      ? 'programme_id'
      : entityType === 'portfolio'
        ? 'portfolio_id'
        : 'project_id'
  const { data, error } = await platformDb
    .from('manager_appointment_records')
    .select(APPT_SELECT)
    .eq('entity_type', entityType)
    .eq(col, entityId)
    .eq('is_deleted', false)
    .order('created_at', { ascending: false })
  if (error) return { success: false, error: error.message, data: [] }
  return { success: true, data: data || [] }
}

export async function listManagerAppointments({ status } = {}) {
  let q = platformDb
    .from('manager_appointment_records')
    .select(APPT_SELECT)
    .eq('is_deleted', false)
    .order('created_at', { ascending: false })
  if (status) q = q.eq('appointment_status', status)
  const { data, error } = await q
  if (error) return { success: false, error: error.message, data: [] }
  return { success: true, data: data || [] }
}

export async function listMyManagerAppointments(userId) {
  const uid = userId || (await getCurrentUserId())
  if (!uid) return { success: false, data: [], error: 'Not authenticated' }
  const { data, error } = await platformDb
    .from('manager_appointment_records')
    .select(APPT_SELECT)
    .eq('appointee_user_id', uid)
    .eq('is_deleted', false)
    .order('created_at', { ascending: false })
  if (error) return { success: false, data: [], error: error.message }
  return { success: true, data: data || [] }
}

export async function getMyPendingAppointments(userId) {
  const uid = userId || (await getCurrentUserId())
  if (!uid) return { success: false, data: [], error: 'Not authenticated' }
  const { data, error } = await platformDb
    .from('manager_appointment_records')
    .select(APPT_SELECT)
    .eq('appointee_user_id', uid)
    .eq('appointment_status', 'pending_acceptance')
    .eq('is_deleted', false)
    .order('created_at', { ascending: false })
  if (error) return { success: false, error: error.message, data: [] }
  return { success: true, data: data || [] }
}

export async function acceptManagerAppointment(appointmentId, acceptanceData = {}) {
  const { data, error } = await platformDb.rpc('accept_manager_appointment', {
    p_appointment_id: appointmentId,
    p_availability_confirmed: acceptanceData.availabilityConfirmed ?? null,
    p_actual_start_date: acceptanceData.actualStartDate || null,
    p_coi_declared: acceptanceData.conflictOfInterest ?? null,
    p_coi_detail: acceptanceData.coiDetail || null,
    p_capability_acknowledged: acceptanceData.capabilityAcknowledged ?? null,
    p_conditions: acceptanceData.acceptanceConditions || null,
    p_initial_observations: acceptanceData.initialObservations || null,
  })
  if (error) return { success: false, error: error.message }
  return { success: true, data }
}

export async function declineManagerAppointment(appointmentId, declineReason, declineNote) {
  const { data, error } = await platformDb.rpc('decline_manager_appointment', {
    p_appointment_id: appointmentId,
    p_decline_reason: declineReason || 'other',
    p_decline_note: declineNote || null,
  })
  if (error) return { success: false, error: error.message }
  return { success: true, data }
}

export async function withdrawManagerAppointment(appointmentId) {
  const { data: appt, error: fErr } = await getManagerAppointment(appointmentId)
  if (fErr || !appt) return { success: false, error: fErr || 'Not found' }

  const { error } = await platformDb
    .from('manager_appointment_records')
    .update({ appointment_status: 'withdrawn', updated_at: new Date().toISOString() })
    .eq('id', appointmentId)

  if (error) return { success: false, error: error.message }

  if (appt.invitation_id) {
    await platformDb
      .from('project_invitations')
      .update({
        invitation_status: 'cancelled',
        cancelled_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', appt.invitation_id)
      .eq('invitation_status', 'pending')
  }
  return { success: true }
}

export async function remindManagerAppointment(appointmentId) {
  const { data: appt } = await getManagerAppointment(appointmentId)
  const invId = appt?.invitation_id
  if (!invId) return { success: false, error: 'No linked invitation' }
  return resendInvitation(invId)
}
