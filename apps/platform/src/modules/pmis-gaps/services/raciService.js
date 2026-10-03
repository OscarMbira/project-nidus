/**
 * RACI Matrix (GAP-10) — full CRUD on raci_matrices/raci_rows/raci_assignments.
 * v963 Phase 12 (Platform). See SQL/v644_pmis_gap_tables_tier2.sql for schema.
 *
 * raci_assignments.member_user_id references auth.users(id) directly, NOT
 * public.users.id — public.users.id and auth.users.id are distinct id spaces in
 * this codebase (see public.users.auth_user_id linkage). getProjectMembersForRaci()
 * below returns both so callers can display a name (public.users) while writing the
 * auth id (auth_user_id) into raci_assignments.
 */
import { platformDb } from '@nidus/supabase'
import { createGapRecord, updateGapRecord } from './gapDataService'

const MATRIX_TABLE = 'raci_matrices'

export async function listRaciMatrices(projectId) {
  if (!projectId) return { success: true, data: [] }
  const { data, error } = await platformDb
    .from(MATRIX_TABLE)
    .select('*')
    .eq('project_id', projectId)
    .eq('is_deleted', false)
    .order('created_at', { ascending: false })
  if (error) return { success: false, data: [], error: error.message }
  return { success: true, data: data || [] }
}

/** Project members eligible for RACI assignment, with their auth.users id for the FK. */
export async function getProjectMembersForRaci(projectId) {
  if (!projectId) return { success: true, data: [] }
  const { data, error } = await platformDb
    .from('project_memberships')
    .select('user_id, user:users!project_memberships_user_id_fkey(id, full_name, email, auth_user_id)')
    .eq('project_id', projectId)
    .eq('is_active', true)
    .or('invitation_status.eq.accepted,invitation_status.is.null')
  if (error) return { success: false, data: [], error: error.message }
  const seen = new Set()
  const members = []
  for (const row of data || []) {
    const u = row.user
    if (!u?.auth_user_id || seen.has(u.auth_user_id)) continue
    seen.add(u.auth_user_id)
    members.push({ authUserId: u.auth_user_id, fullName: u.full_name || u.email || 'Unknown', email: u.email })
  }
  return { success: true, data: members }
}

/** Matrix + rows + each row's assignments, shaped for the grid editor. */
export async function getRaciMatrix(id) {
  const { data: matrix, error: matrixError } = await platformDb.from(MATRIX_TABLE).select('*').eq('id', id).maybeSingle()
  if (matrixError) return { success: false, data: null, error: matrixError.message }
  if (!matrix) return { success: false, data: null, error: 'not_found' }

  const { data: rows, error: rowsError } = await platformDb
    .from('raci_rows')
    .select('*')
    .eq('matrix_id', id)
    .eq('is_deleted', false)
    .order('sort_order', { ascending: true })
  if (rowsError) return { success: false, data: null, error: rowsError.message }

  const rowIds = (rows || []).map((r) => r.id)
  let assignments = []
  if (rowIds.length) {
    const { data: assignRows, error: assignError } = await platformDb
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

export async function createRaciMatrix(projectId, payload) {
  try {
    const data = await createGapRecord(MATRIX_TABLE, { ...payload, project_id: projectId })
    return { success: true, data }
  } catch (error) {
    return { success: false, data: null, error: error.message || 'Failed to create RACI matrix' }
  }
}

export async function updateRaciMatrix(id, payload) {
  try {
    const data = await updateGapRecord(MATRIX_TABLE, id, payload)
    return { success: true, data }
  } catch (error) {
    return { success: false, data: null, error: error.message || 'Failed to update RACI matrix' }
  }
}

export async function deleteRaciMatrix(id) {
  try {
    await updateGapRecord(MATRIX_TABLE, id, { is_deleted: true })
    return { success: true }
  } catch (error) {
    return { success: false, error: error.message || 'Failed to delete RACI matrix' }
  }
}

export async function addRaciRow(matrixId, { deliverable_name, linked_entity_type = null, linked_entity_id = null, sort_order = 0 }) {
  try {
    const data = await createGapRecord('raci_rows', { matrix_id: matrixId, deliverable_name, linked_entity_type, linked_entity_id, sort_order })
    return { success: true, data }
  } catch (error) {
    return { success: false, data: null, error: error.message || 'Failed to add row' }
  }
}

export async function updateRaciRow(rowId, payload) {
  try {
    const data = await updateGapRecord('raci_rows', rowId, payload)
    return { success: true, data }
  } catch (error) {
    return { success: false, data: null, error: error.message || 'Failed to update row' }
  }
}

export async function deleteRaciRow(rowId) {
  try {
    await updateGapRecord('raci_rows', rowId, { is_deleted: true })
    return { success: true }
  } catch (error) {
    return { success: false, error: error.message || 'Failed to delete row' }
  }
}

/**
 * Toggle one R/A/C/I cell for a row × member. Idempotent: enabling an already-set
 * cell or disabling an unset one is a no-op success.
 * @param {string} rowId
 * @param {string} memberAuthUserId
 * @param {'R'|'A'|'C'|'I'} raciRole
 * @param {boolean} enabled
 */
export async function setRaciAssignment(rowId, memberAuthUserId, raciRole, enabled) {
  try {
    if (enabled) {
      const { data: existing } = await platformDb
        .from('raci_assignments')
        .select('id, is_deleted')
        .eq('row_id', rowId)
        .eq('member_user_id', memberAuthUserId)
        .eq('raci_role', raciRole)
        .maybeSingle()
      if (existing?.id) {
        if (existing.is_deleted) {
          const { error } = await platformDb.from('raci_assignments').update({ is_deleted: false }).eq('id', existing.id)
          if (error) throw error
        }
        return { success: true }
      }
      const { error } = await platformDb
        .from('raci_assignments')
        .insert({ row_id: rowId, member_user_id: memberAuthUserId, raci_role: raciRole })
      if (error) throw error
      return { success: true }
    }
    const { error } = await platformDb
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
