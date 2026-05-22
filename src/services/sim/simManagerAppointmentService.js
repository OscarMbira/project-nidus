/**
 * Simulator manager appointments — sim.sim_manager_appointment_records
 */
import { simDb } from '../supabase/supabaseClient'

const TABLE = 'sim_manager_appointment_records'
const SELECT = '*'

async function getSimUserId() {
  const { data, error } = await simDb.rpc('get_current_user_id')
  if (error) throw error
  return data
}

export async function listSimManagerAppointments({ status } = {}) {
  let q = simDb.from(TABLE).select(SELECT).eq('is_deleted', false).order('created_at', { ascending: false })
  if (status) q = q.eq('appointment_status', status)
  const { data, error } = await q
  if (error) return { success: false, data: [], error: error.message }
  return { success: true, data: data || [] }
}

export async function getSimManagerAppointment(id) {
  const { data, error } = await simDb.from(TABLE).select(SELECT).eq('id', id).maybeSingle()
  if (error) return { success: false, error: error.message }
  return { success: true, data }
}

export async function createSimManagerAppointment(input) {
  const appointedBy = input.appointedByUserId || (await getSimUserId())
  const row = {
    invitation_id: input.invitationId || null,
    entity_type: input.entityType || 'practice_project',
    practice_project_id: input.practiceProjectId || null,
    scenario_id: input.scenarioId || null,
    entity_name: input.entityName || '',
    manager_role_name: input.managerRoleName || 'project_manager',
    appointee_user_id: input.appointeeUserId,
    appointed_by_user_id: appointedBy,
    reporting_to_user_id: input.reportingToUserId || null,
    assignment_start_date: input.assignmentStartDate || null,
    assignment_end_date: input.assignmentEndDate || null,
    time_commitment_pct: input.timeCommitmentPct ?? null,
    budget_authority_limit: input.budgetAuthorityLimit ?? null,
    authority_notes: input.authorityNotes || null,
    reporting_frequency: input.reportingFrequency || null,
    known_constraints: input.knownConstraints || null,
    reference_document: input.referenceDocument || null,
    appointment_message: input.appointmentMessage || null,
    appointment_status: 'pending_acceptance',
  }
  const { data, error } = await simDb.from(TABLE).insert(row).select(SELECT).maybeSingle()
  if (error) return { success: false, error: error.message }
  return { success: true, data }
}

export async function acceptSimManagerAppointment(id, acceptanceData = {}) {
  const { error } = await simDb
    .from(TABLE)
    .update({
      appointment_status: 'active',
      accepted_at: new Date().toISOString(),
      availability_confirmed: acceptanceData.availabilityConfirmed ?? false,
      actual_start_date: acceptanceData.actualStartDate || null,
      conflict_of_interest: acceptanceData.conflictOfInterest ?? false,
      coi_detail: acceptanceData.coiDetail || null,
      capability_acknowledged: acceptanceData.capabilityAcknowledged ?? false,
      acceptance_conditions: acceptanceData.acceptanceConditions || null,
      initial_observations: acceptanceData.initialObservations || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
  if (error) return { success: false, error: error.message }
  return { success: true }
}

export async function declineSimManagerAppointment(id, declineReason, declineNote) {
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

export async function getMyPendingSimManagerAppointments() {
  const uid = await getSimUserId()
  const { data, error } = await simDb
    .from(TABLE)
    .select(SELECT)
    .eq('appointee_user_id', uid)
    .eq('appointment_status', 'pending_acceptance')
    .eq('is_deleted', false)
  if (error) return { success: false, data: [], error: error.message }
  return { success: true, data: data || [] }
}
