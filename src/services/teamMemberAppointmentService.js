/**
 * Team member appointment records (v593 extension) — Platform
 */
import { platformDb } from './supabase/supabaseClient'
import { inviteUserToProject } from './projectMembershipService'
import { resendInvitation } from './projectMembershipService'

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

export async function createTeamMemberAppointment(input) {
  const appointedBy = input.appointedByUserId || (await getCurrentUserId())
  if (!appointedBy) return { success: false, error: 'Not authenticated' }
  if (!input.projectId) return { success: false, error: 'Project is required' }

  const { data: appointee, error: uErr } = await platformDb
    .from('users')
    .select('id, email, full_name')
    .eq('id', input.appointeeUserId)
    .maybeSingle()
  if (uErr) throw uErr
  if (!appointee?.email) return { success: false, error: 'Appointee email not found' }

  const roleId = input.roleId
  if (!roleId) return { success: false, error: 'Role is required' }

  const message = input.appointmentMessage?.trim() || null
  let invitationId = input.invitationId || null

  if (!invitationId) {
    const inv = await inviteUserToProject(input.projectId, {
      email: appointee.email,
      roleId,
      message,
      expiryDays: input.expiryDays ?? 14,
      inviteeFirstName: appointee.full_name?.split(' ')[0],
    })
    if (!inv.success) return { success: false, error: inv.error || 'Failed to create invitation' }
    invitationId = inv.data?.id
  }

  const { data, error } = await platformDb
    .from('team_member_appointment_records')
    .insert({
      invitation_id: invitationId,
      project_id: input.projectId,
      member_role_name: String(input.memberRoleName || 'team_member').toLowerCase(),
      role_title: input.roleTitle?.trim() || null,
      appointee_user_id: input.appointeeUserId,
      appointed_by_user_id: appointedBy,
      reporting_to_user_id: input.reportingToUserId || null,
      assignment_start_date: input.assignmentStartDate || null,
      assignment_end_date: input.assignmentEndDate || null,
      time_commitment_pct: input.timeCommitmentPct ?? null,
      primary_responsibilities: input.primaryResponsibilities?.trim() || null,
      required_skills: input.requiredSkills?.trim() || null,
      working_arrangement: input.workingArrangement || null,
      work_location: input.workLocation?.trim() || null,
      appointment_message: message,
      appointment_status: 'pending_acceptance',
    })
    .select(APPT_SELECT)
    .maybeSingle()

  if (error) return { success: false, error: error.message }
  return { success: true, data }
}

export async function getTeamMemberAppointment(appointmentId) {
  const { data, error } = await platformDb
    .from('team_member_appointment_records')
    .select(APPT_SELECT)
    .eq('id', appointmentId)
    .eq('is_deleted', false)
    .maybeSingle()
  if (error) return { success: false, error: error.message }
  return { success: true, data }
}

export async function getTeamMemberAppointmentByInvitationId(invitationId) {
  const { data, error } = await platformDb
    .from('team_member_appointment_records')
    .select(APPT_SELECT)
    .eq('invitation_id', invitationId)
    .eq('is_deleted', false)
    .maybeSingle()
  if (error) return { success: false, error: error.message }
  return { success: true, data }
}

export async function getAppointmentsForProject(projectId) {
  const { data, error } = await platformDb
    .from('team_member_appointment_records')
    .select(APPT_SELECT)
    .eq('project_id', projectId)
    .eq('is_deleted', false)
    .order('created_at', { ascending: false })
  if (error) return { success: false, data: [], error: error.message }
  return { success: true, data: data || [] }
}

export async function listTeamMemberAppointments({ status } = {}) {
  let q = platformDb
    .from('team_member_appointment_records')
    .select(APPT_SELECT)
    .eq('is_deleted', false)
    .order('created_at', { ascending: false })
  if (status) q = q.eq('appointment_status', status)
  const { data, error } = await q
  if (error) return { success: false, data: [], error: error.message }
  return { success: true, data: data || [] }
}

export async function listMyTeamMemberAppointments(userId) {
  const uid = userId || (await getCurrentUserId())
  if (!uid) return { success: false, data: [], error: 'Not authenticated' }
  const { data, error } = await platformDb
    .from('team_member_appointment_records')
    .select(APPT_SELECT)
    .eq('appointee_user_id', uid)
    .eq('is_deleted', false)
    .order('created_at', { ascending: false })
  if (error) return { success: false, data: [], error: error.message }
  return { success: true, data: data || [] }
}

export async function getMyPendingTeamAppointments(userId) {
  const uid = userId || (await getCurrentUserId())
  if (!uid) return { success: false, data: [], error: 'Not authenticated' }
  const { data, error } = await platformDb
    .from('team_member_appointment_records')
    .select(APPT_SELECT)
    .eq('appointee_user_id', uid)
    .eq('appointment_status', 'pending_acceptance')
    .eq('is_deleted', false)
  if (error) return { success: false, data: [], error: error.message }
  return { success: true, data: data || [] }
}

export async function acceptTeamMemberAppointment(appointmentId, acceptanceData = {}) {
  const { data, error } = await platformDb.rpc('accept_team_member_appointment', {
    p_appointment_id: appointmentId,
    p_availability_confirmed: acceptanceData.availabilityConfirmed ?? null,
    p_actual_start_date: acceptanceData.actualStartDate || null,
    p_coi_declared: acceptanceData.conflictOfInterest ?? null,
    p_coi_detail: acceptanceData.coiDetail || null,
    p_skills_acknowledged: acceptanceData.skillsAcknowledged ?? null,
    p_conditions: acceptanceData.acceptanceConditions || null,
    p_initial_observations: acceptanceData.initialObservations || null,
  })
  if (error) return { success: false, error: error.message }
  return { success: true, data }
}

export async function declineTeamMemberAppointment(appointmentId, declineReason, declineNote) {
  const { data, error } = await platformDb.rpc('decline_team_member_appointment', {
    p_appointment_id: appointmentId,
    p_decline_reason: declineReason || 'other',
    p_decline_note: declineNote || null,
  })
  if (error) return { success: false, error: error.message }
  return { success: true, data }
}

export async function withdrawTeamMemberAppointment(appointmentId) {
  const { error } = await platformDb
    .from('team_member_appointment_records')
    .update({ appointment_status: 'withdrawn', updated_at: new Date().toISOString() })
    .eq('id', appointmentId)
  if (error) return { success: false, error: error.message }
  return { success: true }
}

export async function remindTeamMemberAppointment(appointmentId) {
  const { data: appt } = await getTeamMemberAppointment(appointmentId)
  if (!appt?.data?.invitation_id) return { success: false, error: 'No linked invitation' }
  return resendInvitation(appt.data.invitation_id)
}
