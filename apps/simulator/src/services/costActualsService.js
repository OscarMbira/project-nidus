import { simDb } from './supabaseClient'

/**
 * Cost Actuals Ledger — service (Simulator, v963 Phase 6). Mirrors
 * apps/platform/src/services/costActualsService.js against sim.cost_actuals.
 */

/**
 * @param {string} projectId - sim.practice_projects.id
 * @param {{ transactionType?: string }} [filters]
 * @returns {Promise<{success: boolean, data: array, error: string|null}>}
 */
export async function listCostActuals(projectId, filters = {}) {
  if (!projectId) return { success: true, data: [], error: null }
  try {
    let query = simDb
      .from('cost_actuals')
      .select('*')
      .eq('project_id', projectId)
      .eq('is_deleted', false)

    if (filters.transactionType) query = query.eq('transaction_type', filters.transactionType)

    const { data, error } = await query.order('transaction_date', { ascending: false })
    if (error) throw error
    return { success: true, data: data || [], error: null }
  } catch (error) {
    console.error('listCostActuals:', error)
    return { success: false, data: [], error: error.message || 'Failed to load cost actuals' }
  }
}

/**
 * @param {string} costActualId
 * @returns {Promise<{success: boolean, data: object|null, error: string|null}>}
 */
export async function getCostActual(costActualId) {
  if (!costActualId) return { success: true, data: null, error: null }
  try {
    const { data, error } = await simDb
      .from('cost_actuals')
      .select('*')
      .eq('id', costActualId)
      .eq('is_deleted', false)
      .maybeSingle()

    if (error) throw error
    return { success: true, data, error: null }
  } catch (error) {
    console.error('getCostActual:', error)
    return { success: false, data: null, error: error.message || 'Failed to load cost actual' }
  }
}

/**
 * @param {{ projectId: string, transactionType: string, amount: number, description?: string,
 *   transactionDate: string, category?: string }} params
 * @returns {Promise<{success: boolean, data: object|null, error: string|null}>}
 */
export async function createCostActual(params) {
  try {
    const { data: { user } } = await simDb.auth.getUser()
    const { data: userRecord } = user
      ? await simDb.from('users').select('id').eq('auth_user_id', user.id).eq('is_deleted', false).single()
      : { data: null }
    const currentUserId = userRecord?.id || null

    const { data, error } = await simDb
      .from('cost_actuals')
      .insert({
        project_id: params.projectId,
        transaction_type: params.transactionType,
        amount: params.amount,
        description: params.description || null,
        notes: params.notes || null,
        transaction_date: params.transactionDate,
        category: params.category || null,
        created_by: currentUserId,
        updated_by: currentUserId,
      })
      .select()
      .single()

    if (error) throw error
    return { success: true, data, error: null }
  } catch (error) {
    console.error('createCostActual:', error)
    return { success: false, data: null, error: error.message || 'Failed to create cost actual' }
  }
}

/**
 * @param {string} costActualId
 * @param {{ transactionType?: string, amount?: number, description?: string,
 *   transactionDate?: string, category?: string }} updates
 * @returns {Promise<{success: boolean, error: string|null}>}
 */
export async function updateCostActual(costActualId, updates) {
  try {
    const patch = { updated_at: new Date().toISOString() }
    if (updates.transactionType !== undefined) patch.transaction_type = updates.transactionType
    if (updates.amount !== undefined) patch.amount = updates.amount
    if (updates.description !== undefined) patch.description = updates.description
    if (updates.notes !== undefined) patch.notes = updates.notes
    if (updates.transactionDate !== undefined) patch.transaction_date = updates.transactionDate
    if (updates.category !== undefined) patch.category = updates.category

    const { error } = await simDb.from('cost_actuals').update(patch).eq('id', costActualId)
    if (error) throw error
    return { success: true, error: null }
  } catch (error) {
    console.error('updateCostActual:', error)
    return { success: false, error: error.message || 'Failed to update cost actual' }
  }
}

/**
 * @param {string} costActualId
 * @returns {Promise<{success: boolean, error: string|null}>}
 */
export async function deleteCostActual(costActualId) {
  try {
    const { error } = await simDb
      .from('cost_actuals')
      .update({ is_deleted: true, updated_at: new Date().toISOString() })
      .eq('id', costActualId)
    if (error) throw error
    return { success: true, error: null }
  } catch (error) {
    console.error('deleteCostActual:', error)
    return { success: false, error: error.message || 'Failed to delete cost actual' }
  }
}

export default {
  listCostActuals,
  getCostActual,
  createCostActual,
  updateCostActual,
  deleteCostActual,
}
