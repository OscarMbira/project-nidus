import { supabase } from './supabaseClient'

/**
 * Cost Actuals Ledger — service (v963, Phase 6). A general transaction ledger of actual costs,
 * commitments, and accruals against a project's budget — distinct from the EVM-snapshot
 * mechanism (projectCostService.js / project_evm_snapshots). Not linked to any vendor/invoice
 * table (Procurement is out of scope for this initiative). See
 * SQL/v963d_cost_actuals_ledger_schema.sql.
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
 * @param {{ transactionType?: string }} [filters]
 * @returns {Promise<{success: boolean, data: array, error: string|null}>}
 */
export async function listCostActuals(projectId, filters = {}) {
  if (!projectId) return { success: true, data: [], error: null }
  try {
    let query = supabase
      .from('cost_actuals')
      .select(`*, created_by_user:created_by (id, full_name, email)`)
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
    const { data, error } = await supabase
      .from('cost_actuals')
      .select(`*, created_by_user:created_by (id, full_name, email), updated_by_user:updated_by (id, full_name, email), project:project_id (id, project_name, project_code)`)
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
    const currentUserId = await getCurrentAppUserId()
    const { data, error } = await supabase
      .from('cost_actuals')
      .insert({
        project_id: params.projectId,
        transaction_type: params.transactionType,
        amount: params.amount,
        description: params.description || null,
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
    const currentUserId = await getCurrentAppUserId()
    const patch = { updated_by: currentUserId, updated_at: new Date().toISOString() }
    if (updates.transactionType !== undefined) patch.transaction_type = updates.transactionType
    if (updates.amount !== undefined) patch.amount = updates.amount
    if (updates.description !== undefined) patch.description = updates.description
    if (updates.transactionDate !== undefined) patch.transaction_date = updates.transactionDate
    if (updates.category !== undefined) patch.category = updates.category

    const { error } = await supabase.from('cost_actuals').update(patch).eq('id', costActualId)
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
    const currentUserId = await getCurrentAppUserId()
    const { error } = await supabase
      .from('cost_actuals')
      .update({ is_deleted: true, updated_by: currentUserId, updated_at: new Date().toISOString() })
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
