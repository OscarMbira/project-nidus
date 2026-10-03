import { supabase } from './supabaseClient'

/**
 * Constraints Register — service (v1100/v1103). Fresh table (public.constraints_register), so
 * unlike assumptionService.js there is no legacy-column mapping: the DB shape is the UI shape.
 */

const SELECT_COLUMNS = `
  id, project_id, constraint_text, category, status, due_date, impact_severity, notes,
  owner_user_id, created_at, created_by, updated_at, updated_by,
  owner:owner_user_id (id, full_name, email),
  created_by_user:created_by (id, full_name, email),
  updated_by_user:updated_by (id, full_name, email)
`

const SELECT_COLUMNS_WITH_PROJECT = `${SELECT_COLUMNS}, project:project_id (id, project_name, project_code)`

/**
 * Resolve the public.users row id for the signed-in user (auth.users.id -> public.users.id).
 * @returns {Promise<string>}
 */
async function getCurrentAppUserId() {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('User not authenticated')

  const { data: userRecord, error } = await supabase
    .from('users')
    .select('id')
    .eq('auth_user_id', user.id)
    .eq('is_deleted', false)
    .single()

  if (error || !userRecord) throw new Error('User record not found')
  return userRecord.id
}

/**
 * @param {string} projectId
 * @returns {Promise<{success: boolean, data: array, error: string|null}>}
 */
export async function listConstraints(projectId) {
  if (!projectId) return { success: true, data: [], error: null }
  try {
    const { data, error } = await supabase
      .from('constraints_register')
      .select(SELECT_COLUMNS)
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
    const { data, error } = await supabase
      .from('constraints_register')
      .select(SELECT_COLUMNS_WITH_PROJECT)
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
    const currentUserId = await getCurrentAppUserId()
    const { data, error } = await supabase
      .from('constraints_register')
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
      .select(SELECT_COLUMNS)
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
    const currentUserId = await getCurrentAppUserId()
    const patch = { updated_by: currentUserId, updated_at: new Date().toISOString() }
    if (updates.constraintText !== undefined) patch.constraint_text = updates.constraintText
    if (updates.category !== undefined) patch.category = updates.category || null
    if (updates.status !== undefined) patch.status = updates.status
    if (updates.ownerUserId !== undefined) patch.owner_user_id = updates.ownerUserId || null
    if (updates.dueDate !== undefined) patch.due_date = updates.dueDate || null
    if (updates.impactSeverity !== undefined) patch.impact_severity = updates.impactSeverity || null
    if (updates.notes !== undefined) patch.notes = updates.notes

    const { error } = await supabase.from('constraints_register').update(patch).eq('id', constraintId)
    if (error) throw error
    return { success: true, error: null }
  } catch (error) {
    console.error('updateConstraint:', error)
    return { success: false, error: error.message || 'Failed to update constraint' }
  }
}

/**
 * Soft delete (matches the codebase's dominant is_deleted convention).
 * @param {string} constraintId
 * @returns {Promise<{success: boolean, error: string|null}>}
 */
export async function deleteConstraint(constraintId) {
  try {
    const currentUserId = await getCurrentAppUserId()
    const { error } = await supabase
      .from('constraints_register')
      .update({ is_deleted: true, updated_by: currentUserId, updated_at: new Date().toISOString() })
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
