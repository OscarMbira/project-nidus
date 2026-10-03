import { simDb } from './supabaseClient'

/**
 * Constraints Register — service (Simulator, v1100). Mirrors
 * apps/platform/src/services/constraintService.js against sim.practice_constraints
 * (SQL/v1104_sim_practice_constraints_schema.sql).
 */

/**
 * @param {string} projectId - sim.practice_projects.id
 * @returns {Promise<{success: boolean, data: array, error: string|null}>}
 */
export async function listConstraints(projectId) {
  if (!projectId) return { success: true, data: [], error: null }
  try {
    const { data, error } = await simDb
      .from('practice_constraints')
      .select(`*, owner:owner_user_id (id, full_name, email)`)
      .eq('project_id', projectId)
      .eq('is_deleted', false)
      .order('created_at', { ascending: true })

    if (error) throw error
    return { success: true, data: data || [], error: null }
  } catch (error) {
    console.error('listConstraints:', error)
    return { success: false, data: [], error: error.message || 'Failed to load constraints' }
  }
}

/**
 * @param {string} constraintId
 * @returns {Promise<{success: boolean, data: object|null, error: string|null}>}
 */
export async function getConstraint(constraintId) {
  if (!constraintId) return { success: true, data: null, error: null }
  try {
    const { data, error } = await simDb
      .from('practice_constraints')
      .select(`*, owner:owner_user_id (id, full_name, email)`)
      .eq('id', constraintId)
      .eq('is_deleted', false)
      .maybeSingle()

    if (error) throw error
    return { success: true, data, error: null }
  } catch (error) {
    console.error('getConstraint:', error)
    return { success: false, data: null, error: error.message || 'Failed to load constraint' }
  }
}

/**
 * @param {{ projectId: string, constraintText: string, category?: string, status?: string,
 *   ownerUserId?: string, dueDate?: string, impactSeverity?: string, notes?: string }} params
 * @returns {Promise<{success: boolean, data: object|null, error: string|null}>}
 */
export async function createConstraint(params) {
  try {
    const { data: { user } } = await simDb.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    const { data: userRecord } = await simDb
      .from('users')
      .select('id')
      .eq('auth_user_id', user.id)
      .eq('is_deleted', false)
      .single()
    const currentUserId = userRecord?.id || null

    const { data, error } = await simDb
      .from('practice_constraints')
      .insert({
        project_id: params.projectId,
        constraint_text: params.constraintText || '',
        category: params.category || null,
        status: params.status || 'open',
        owner_user_id: params.ownerUserId || null,
        due_date: params.dueDate || null,
        impact_severity: params.impactSeverity || null,
        notes: params.notes || null,
        created_by: currentUserId,
        updated_by: currentUserId,
      })
      .select()
      .single()

    if (error) throw error
    return { success: true, data, error: null }
  } catch (error) {
    console.error('createConstraint:', error)
    return { success: false, data: null, error: error.message || 'Failed to create constraint' }
  }
}

/**
 * @param {string} constraintId
 * @param {{ constraintText?: string, category?: string, status?: string, ownerUserId?: string,
 *   dueDate?: string, impactSeverity?: string, notes?: string }} updates
 * @returns {Promise<{success: boolean, error: string|null}>}
 */
export async function updateConstraint(constraintId, updates) {
  try {
    const patch = { updated_at: new Date().toISOString() }
    if (updates.constraintText !== undefined) patch.constraint_text = updates.constraintText
    if (updates.category !== undefined) patch.category = updates.category || null
    if (updates.status !== undefined) patch.status = updates.status
    if (updates.ownerUserId !== undefined) patch.owner_user_id = updates.ownerUserId || null
    if (updates.dueDate !== undefined) patch.due_date = updates.dueDate || null
    if (updates.impactSeverity !== undefined) patch.impact_severity = updates.impactSeverity || null
    if (updates.notes !== undefined) patch.notes = updates.notes

    const { error } = await simDb.from('practice_constraints').update(patch).eq('id', constraintId)
    if (error) throw error
    return { success: true, error: null }
  } catch (error) {
    console.error('updateConstraint:', error)
    return { success: false, error: error.message || 'Failed to update constraint' }
  }
}

/**
 * @param {string} constraintId
 * @returns {Promise<{success: boolean, error: string|null}>}
 */
export async function deleteConstraint(constraintId) {
  try {
    const { error } = await simDb
      .from('practice_constraints')
      .update({ is_deleted: true, updated_at: new Date().toISOString() })
      .eq('id', constraintId)
    if (error) throw error
    return { success: true, error: null }
  } catch (error) {
    console.error('deleteConstraint:', error)
    return { success: false, error: error.message || 'Failed to delete constraint' }
  }
}

export default {
  listConstraints,
  getConstraint,
  createConstraint,
  updateConstraint,
  deleteConstraint,
}
