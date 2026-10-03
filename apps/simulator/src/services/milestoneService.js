import { simDb } from './supabaseClient'

/**
 * Milestone Register — service (Simulator, v966 Phase 11). Mirrors
 * apps/platform/src/services/milestoneService.js against sim.milestones
 * (SQL/v966w_phase11_milestones_schema.sql / v966x RLS), scoped to sim.practice_projects.
 */

const SELECT_COLUMNS = `
  id, project_id, milestone_name, description, target_date, forecast_date, actual_date,
  status, owner_user_id, sequence_order, notes,
  created_at, created_by, updated_at, updated_by,
  owner:owner_user_id (id, full_name, email)
`

export const MILESTONE_STATUSES = ['planned', 'at_risk', 'achieved', 'missed', 'slipped']

/**
 * @param {string} projectId - sim.practice_projects.id
 * @returns {Promise<{success: boolean, data: array, error: string|null}>}
 */
export async function listMilestones(projectId) {
  if (!projectId) return { success: true, data: [], error: null }
  try {
    const { data, error } = await simDb
      .from('milestones')
      .select(SELECT_COLUMNS)
      .eq('project_id', projectId)
      .eq('is_deleted', false)
      .order('sequence_order', { ascending: true })
      .order('target_date', { ascending: true })

    if (error) throw error
    return { success: true, data: data || [], error: null }
  } catch (error) {
    console.error('listMilestones:', error)
    return { success: false, data: [], error: error.message || 'Failed to load milestones' }
  }
}

/**
 * @param {string} milestoneId
 * @returns {Promise<{success: boolean, data: object|null, error: string|null}>}
 */
export async function getMilestone(milestoneId) {
  if (!milestoneId) return { success: true, data: null, error: null }
  try {
    const { data, error } = await simDb
      .from('milestones')
      .select(SELECT_COLUMNS)
      .eq('id', milestoneId)
      .eq('is_deleted', false)
      .maybeSingle()

    if (error) throw error
    return { success: true, data, error: null }
  } catch (error) {
    console.error('getMilestone:', error)
    return { success: false, data: null, error: error.message || 'Failed to load milestone' }
  }
}

/**
 * @param {{ projectId: string, milestoneName: string, description?: string, targetDate: string,
 *   forecastDate?: string, actualDate?: string, status?: string, ownerUserId?: string,
 *   sequenceOrder?: number, notes?: string }} params
 * @returns {Promise<{success: boolean, data: object|null, error: string|null}>}
 */
export async function createMilestone(params) {
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
      .from('milestones')
      .insert({
        project_id: params.projectId,
        milestone_name: params.milestoneName,
        description: params.description || null,
        target_date: params.targetDate,
        forecast_date: params.forecastDate || params.targetDate || null,
        actual_date: params.actualDate || null,
        status: params.status || 'planned',
        owner_user_id: params.ownerUserId || currentUserId,
        sequence_order: params.sequenceOrder ?? 0,
        notes: params.notes || null,
        created_by: currentUserId,
        updated_by: currentUserId,
      })
      .select(SELECT_COLUMNS)
      .single()

    if (error) throw error
    return { success: true, data, error: null }
  } catch (error) {
    console.error('createMilestone:', error)
    return { success: false, data: null, error: error.message || 'Failed to create milestone' }
  }
}

/**
 * @param {string} milestoneId
 * @param {{ milestoneName?: string, description?: string, targetDate?: string,
 *   forecastDate?: string, actualDate?: string, status?: string, ownerUserId?: string,
 *   sequenceOrder?: number, notes?: string }} updates
 * @returns {Promise<{success: boolean, error: string|null}>}
 */
export async function updateMilestone(milestoneId, updates) {
  try {
    const patch = { updated_at: new Date().toISOString() }
    if (updates.milestoneName !== undefined) patch.milestone_name = updates.milestoneName
    if (updates.description !== undefined) patch.description = updates.description
    if (updates.targetDate !== undefined) patch.target_date = updates.targetDate
    if (updates.forecastDate !== undefined) patch.forecast_date = updates.forecastDate
    if (updates.actualDate !== undefined) patch.actual_date = updates.actualDate
    if (updates.status !== undefined) patch.status = updates.status
    if (updates.ownerUserId !== undefined) patch.owner_user_id = updates.ownerUserId
    if (updates.sequenceOrder !== undefined) patch.sequence_order = updates.sequenceOrder
    if (updates.notes !== undefined) patch.notes = updates.notes

    const { error } = await simDb.from('milestones').update(patch).eq('id', milestoneId)
    if (error) throw error
    return { success: true, error: null }
  } catch (error) {
    console.error('updateMilestone:', error)
    return { success: false, error: error.message || 'Failed to update milestone' }
  }
}

/**
 * @param {string} milestoneId
 * @returns {Promise<{success: boolean, error: string|null}>}
 */
export async function deleteMilestone(milestoneId) {
  try {
    const { error } = await simDb
      .from('milestones')
      .update({ is_deleted: true, updated_at: new Date().toISOString() })
      .eq('id', milestoneId)
    if (error) throw error
    return { success: true, error: null }
  } catch (error) {
    console.error('deleteMilestone:', error)
    return { success: false, error: error.message || 'Failed to delete milestone' }
  }
}

/**
 * @param {string} projectId - sim.practice_projects.id
 * @returns {Promise<{success: boolean, data: object, error: string|null}>}
 */
export async function getMilestoneSummary(projectId) {
  const empty = { total: 0, planned: 0, at_risk: 0, achieved: 0, missed: 0, slipped: 0 }
  if (!projectId) return { success: true, data: empty, error: null }
  try {
    const { data, error } = await simDb
      .from('milestones')
      .select('status')
      .eq('project_id', projectId)
      .eq('is_deleted', false)

    if (error) throw error
    const summary = { ...empty }
    for (const row of data || []) {
      summary.total += 1
      if (summary[row.status] !== undefined) summary[row.status] += 1
    }
    return { success: true, data: summary, error: null }
  } catch (error) {
    console.error('getMilestoneSummary:', error)
    return { success: false, data: empty, error: error.message || 'Failed to load milestone summary' }
  }
}

/**
 * @param {string} projectId - sim.practice_projects.id
 * @param {number} [limit]
 * @returns {Promise<{success: boolean, data: array, error: string|null}>}
 */
export async function getUpcomingMilestones(projectId, limit = 5) {
  if (!projectId) return { success: true, data: [], error: null }
  try {
    const { data, error } = await simDb
      .from('milestones')
      .select('id, milestone_name, target_date, forecast_date, status')
      .eq('project_id', projectId)
      .eq('is_deleted', false)
      .not('status', 'in', '(achieved)')
      .order('target_date', { ascending: true })
      .limit(limit)

    if (error) throw error
    return { success: true, data: data || [], error: null }
  } catch (error) {
    console.error('getUpcomingMilestones:', error)
    return { success: false, data: [], error: error.message || 'Failed to load upcoming milestones' }
  }
}

export default {
  MILESTONE_STATUSES,
  listMilestones,
  getMilestone,
  createMilestone,
  updateMilestone,
  deleteMilestone,
  getMilestoneSummary,
  getUpcomingMilestones,
}
