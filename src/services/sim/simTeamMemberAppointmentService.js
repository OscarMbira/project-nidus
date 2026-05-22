/**
 * Simulator team member appointments — sim.sim_team_member_appointment_records
 */
import { simDb } from '../supabase/supabaseClient'

const TABLE = 'sim_team_member_appointment_records'

async function getSimUserId() {
  const { data, error } = await simDb.rpc('get_current_user_id')
  if (error) throw error
  return data
}

export async function listSimTeamMemberAppointments({ status } = {}) {
  let q = simDb.from(TABLE).select('*').eq('is_deleted', false).order('created_at', { ascending: false })
  if (status) q = q.eq('appointment_status', status)
  const { data, error } = await q
  if (error) return { success: false, data: [], error: error.message }
  return { success: true, data: data || [] }
}

export async function createSimTeamMemberAppointment(input) {
  const appointedBy = input.appointedByUserId || (await getSimUserId())
  const { data, error } = await simDb
    .from(TABLE)
    .insert({
      invitation_id: input.invitationId || null,
      practice_project_id: input.practiceProjectId || null,
      scenario_id: input.scenarioId || null,
      entity_name: input.entityName || '',
      member_role_name: input.memberRoleName || 'team_member',
      role_title: input.roleTitle || null,
      appointee_user_id: input.appointeeUserId,
      appointed_by_user_id: appointedBy,
      reporting_to_user_id: input.reportingToUserId || null,
      assignment_start_date: input.assignmentStartDate || null,
      assignment_end_date: input.assignmentEndDate || null,
      time_commitment_pct: input.timeCommitmentPct ?? null,
      primary_responsibilities: input.primaryResponsibilities || null,
      required_skills: input.requiredSkills || null,
      working_arrangement: input.workingArrangement || null,
      work_location: input.workLocation || null,
      appointment_message: input.appointmentMessage || null,
      appointment_status: 'pending_acceptance',
    })
    .select('*')
    .maybeSingle()
  if (error) return { success: false, error: error.message }
  return { success: true, data }
}

export async function getMyPendingSimTeamAppointments() {
  const uid = await getSimUserId()
  const { data, error } = await simDb
    .from(TABLE)
    .select('*')
    .eq('appointee_user_id', uid)
    .eq('appointment_status', 'pending_acceptance')
    .eq('is_deleted', false)
  if (error) return { success: false, data: [], error: error.message }
  return { success: true, data: data || [] }
}

export async function acceptSimTeamMemberAppointment(id, acceptanceData = {}) {
  const { error } = await simDb
    .from(TABLE)
    .update({
      appointment_status: 'active',
      accepted_at: new Date().toISOString(),
      availability_confirmed: acceptanceData.availabilityConfirmed ?? false,
      actual_start_date: acceptanceData.actualStartDate || null,
      conflict_of_interest: acceptanceData.conflictOfInterest ?? false,
      coi_detail: acceptanceData.coiDetail || null,
      skills_acknowledged: acceptanceData.skillsAcknowledged ?? false,
      acceptance_conditions: acceptanceData.acceptanceConditions || null,
      initial_observations: acceptanceData.initialObservations || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
  if (error) return { success: false, error: error.message }
  return { success: true }
}

export async function declineSimTeamMemberAppointment(id, declineReason, declineNote) {
  const { error } = await simDb
    .from(TABLE)
    .update({
      appointment_status: 'declined',
      declined_at: new Date().toISOString(),
      decline_reason: declineReason || 'other',
      decline_note: declineNote || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
  if (error) return { success: false, error: error.message }
  return { success: true }
}
