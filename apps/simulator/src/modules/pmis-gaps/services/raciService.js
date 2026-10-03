/**
 * RACI Matrix (GAP-10) — Simulator mirror of Platform's raciService.js.
 * Full CRUD on sim.raci_matrices/sim.raci_rows/sim.raci_assignments.
 * v963 Phase 12 (Simulator). See SQL/v963l_sim_recurring_tasks_raci_tables.sql.
 *
 * sim.raci_assignments.member_user_id references auth.users(id) directly, and so
 * does sim.practice_project_memberships.user_id (unlike Platform, sim has no
 * separate internal-users-table id space — see
 * apps/simulator/src/services/sim/simProjectMembershipService.js's
 * getSimProjectMembers(), reused here for the member picker).
 */
import { simDb } from '@nidus/supabase'
import { createGapRecord, updateGapRecord } from './gapDataService'
import { getSimProjectMembers } from '../../../services/sim/simProjectMembershipService'

const MATRIX_TABLE = 'raci_matrices'
const OPTS = { sim: true }

export async function listRaciMatrices(practiceProjectId) {
  if (!practiceProjectId) return { success: true, data: [] }
  const { data, error } = await simDb
    .from(MATRIX_TABLE)
    .select('*')
    .eq('practice_project_id', practiceProjectId)
    .eq('is_deleted', false)
    .order('created_at', { ascending: false })
  if (error) return { success: false, data: [], error: error.message }
  return { success: true, data: data || [] }
}

/** Practice project members eligible for RACI assignment (auth.users id already). */
export async function getProjectMembersForRaci(practiceProjectId) {
  const result = await getSimProjectMembers(practiceProjectId)
  if (!result.success) return { success: false, data: [], error: result.error }
  const members = (result.data || [])
    .filter((m) => m.user_id)
    .map((m) => ({ authUserId: m.user_id, fullName: m.profile?.full_name || m.profile?.email || 'Unknown', email: m.profile?.email }))
  return { success: true, data: members }
}

export async function getRaciMatrix(id) {
  const { data: matrix, error: matrixError } = await simDb.from(MATRIX_TABLE).select('*').eq('id', id).maybeSingle()
  if (matrixError) return { success: false, data: null, error: matrixError.message }
  if (!matrix) return { success: false, data: null, error: 'not_found' }

  const { data: rows, error: rowsError } = await simDb
    .from('raci_rows')
    .select('*')
    .eq('matrix_id', id)
    .eq('is_deleted', false)
    .order('sort_order', { ascending: true })
  if (rowsError) return { success: false, data: null, error: rowsError.message }

  const rowIds = (rows || []).map((r) => r.id)
  let assignments = []
  if (rowIds.length) {
    const { data: assignRows, error: assignError } = await simDb
      .from('raci_assignments')
      .select('*')
      .in('row_id', rowIds)
      .eq('is_deleted', false)
    if (assignError) return { success: false, data: null, error: assignError.message }
    assignments = assignRows || []
  }

  const rowsWithAssignments = (rows || []).map((row) => ({
    ...row,
    assignments: assignments.filter((a) => a.row_id === row.id),
  }))

  return { success: true, data: { ...matrix, rows: rowsWithAssignments } }
}

export async function createRaciMatrix(practiceProjectId, payload) {
  try {
    const data = await createGapRecord(MATRIX_TABLE, { ...payload, practice_project_id: practiceProjectId }, OPTS)
    return { success: true, data }
  } catch (error) {
    return { success: false, data: null, error: error.message || 'Failed to create RACI matrix' }
  }
}

export async function updateRaciMatrix(id, payload) {
  try {
    const data = await updateGapRecord(MATRIX_TABLE, id, payload, OPTS)
    return { success: true, data }
  } catch (error) {
    return { success: false, data: null, error: error.message || 'Failed to update RACI matrix' }
  }
}

export async function deleteRaciMatrix(id) {
  try {
    await updateGapRecord(MATRIX_TABLE, id, { is_deleted: true }, OPTS)
    return { success: true }
  } catch (error) {
    return { success: false, error: error.message || 'Failed to delete RACI matrix' }
  }
}

export async function addRaciRow(matrixId, { deliverable_name, linked_entity_type = null, linked_entity_id = null, sort_order = 0 }) {
  try {
    const data = await createGapRecord('raci_rows', { matrix_id: matrixId, deliverable_name, linked_entity_type, linked_entity_id, sort_order }, OPTS)
    return { success: true, data }
  } catch (error) {
    return { success: false, data: null, error: error.message || 'Failed to add row' }
  }
}

export async function updateRaciRow(rowId, payload) {
  try {
    const data = await updateGapRecord('raci_rows', rowId, payload, OPTS)
    return { success: true, data }
  } catch (error) {
    return { success: false, data: null, error: error.message || 'Failed to update row' }
  }
}

export async function deleteRaciRow(rowId) {
  try {
    await updateGapRecord('raci_rows', rowId, { is_deleted: true }, OPTS)
    return { success: true }
  } catch (error) {
    return { success: false, error: error.message || 'Failed to delete row' }
  }
}

export async function setRaciAssignment(rowId, memberAuthUserId, raciRole, enabled) {
  try {
    if (enabled) {
      const { data: existing } = await simDb
        .from('raci_assignments')
        .select('id, is_deleted')
        .eq('row_id', rowId)
        .eq('member_user_id', memberAuthUserId)
        .eq('raci_role', raciRole)
        .maybeSingle()
      if (existing?.id) {
        if (existing.is_deleted) {
          const { error } = await simDb.from('raci_assignments').update({ is_deleted: false }).eq('id', existing.id)
          if (error) throw error
        }
        return { success: true }
      }
      const { error } = await simDb
        .from('raci_assignments')
        .insert({ row_id: rowId, member_user_id: memberAuthUserId, raci_role: raciRole })
      if (error) throw error
      return { success: true }
    }
    const { error } = await simDb
      .from('raci_assignments')
      .update({ is_deleted: true })
      .eq('row_id', rowId)
      .eq('member_user_id', memberAuthUserId)
      .eq('raci_role', raciRole)
    if (error) throw error
    return { success: true }
  } catch (error) {
    return { success: false, error: error.message || 'Failed to update assignment' }
  }
}
