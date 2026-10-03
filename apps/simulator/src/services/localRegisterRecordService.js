/**
 * Local Register Engine — record CRUD (Simulator, v938). Every record — whether its parent
 * register is system-defined (public.local_registers) or member-created (sim.local_registers)
 * — is stored in the single sim.local_register_records table, distinguished by
 * is_system_register. See SQL/v938_sim_local_register_engine_schema.sql.
 *
 * Deliberately NOT wired to public.transition_record_status()/record-lifecycle
 * (submit-for-authorisation, approval chains): that mechanism is an organisational-governance
 * feature keyed to public.accounts/public.projects, and Simulator's practice hierarchy has no
 * account-scoped authorisation queue for a record to land in. record_status here stays a plain
 * display field, same as any other Simulator practice record.
 */

import { simDb } from './supabaseClient'

/**
 * @param {string} registerId
 * @param {{ scopeLevel?: string, scopeEntityId?: string }} [scopeFilter] - required for
 *   system-defined registers (they carry no scope of their own) so records from every practice
 *   project/programme/portfolio using them don't mix together undifferentiated; optional for
 *   member-created registers, which are already tied to one entity.
 * @returns {Promise<{success: boolean, data: array, error: string|null}>}
 */
export async function listRecords(registerId, scopeFilter = {}) {
  if (!registerId) return { success: true, data: [], error: null }
  try {
    let query = simDb
      .from('local_register_records')
      .select('*')
      .eq('register_id', registerId)
      .eq('is_deleted', false)

    const { scopeLevel, scopeEntityId } = scopeFilter
    if (scopeEntityId) {
      if (scopeLevel === 'portfolio') query = query.eq('record_portfolio_id', scopeEntityId)
      else if (scopeLevel === 'programme') query = query.eq('record_programme_id', scopeEntityId)
      else if (scopeLevel === 'project') query = query.eq('record_project_id', scopeEntityId)
    }

    const { data, error } = await query.order('created_at', { ascending: true })
    if (error) throw error
    return { success: true, data: data || [], error: null }
  } catch (error) {
    console.error('listRecords:', error)
    return { success: false, data: [], error: error.message || 'Failed to load records' }
  }
}

/**
 * @param {string} recordId
 * @returns {Promise<{success: boolean, data: object|null, error: string|null}>}
 */
export async function getRecord(recordId) {
  if (!recordId) return { success: true, data: null, error: null }
  try {
    const { data, error } = await simDb
      .from('local_register_records')
      .select('*')
      .eq('id', recordId)
      .maybeSingle()
    if (error) throw error
    return { success: true, data, error: null }
  } catch (error) {
    console.error('getRecord:', error)
    return { success: false, data: null, error: error.message || 'Failed to load record' }
  }
}

/**
 * @param {string} registerId
 * @param {{ title: string, description?: string, status: string, ownerUserId?: string,
 *   fieldValues?: object, recordPortfolioId?: string, recordProgrammeId?: string,
 *   recordProjectId?: string, isSystemRegister?: boolean }} params - isSystemRegister must match
 *   whether registerId came from public.local_registers (true) or sim.local_registers (false) —
 *   pass through register.is_system_defined from getRegisterDefinition().
 * @returns {Promise<{success: boolean, data: object|null, error: string|null}>}
 */
export async function createRecord(registerId, params) {
  try {
    const { data, error } = await simDb
      .from('local_register_records')
      .insert({
        register_id: registerId,
        is_system_register: !!params.isSystemRegister,
        display_id: '', // blank — Admin ID Generation trigger assigns it (rule 16.2)
        title: params.title,
        description: params.description || null,
        status: params.status,
        owner_user_id: params.ownerUserId || null,
        field_values: params.fieldValues || {},
        record_portfolio_id: params.recordPortfolioId || null,
        record_programme_id: params.recordProgrammeId || null,
        record_project_id: params.recordProjectId || null,
      })
      .select()
      .single()
    if (error) throw error
    return { success: true, data, error: null }
  } catch (error) {
    console.error('createRecord:', error)
    return { success: false, data: null, error: error.message || 'Failed to create record' }
  }
}

/**
 * @param {string} recordId
 * @param {{ title?: string, description?: string, status?: string, ownerUserId?: string,
 *   fieldValues?: object }} updates
 * @returns {Promise<{success: boolean, error: string|null}>}
 */
export async function updateRecord(recordId, updates) {
  try {
    const patch = {}
    if (updates.title !== undefined) patch.title = updates.title
    if (updates.description !== undefined) patch.description = updates.description
    if (updates.status !== undefined) patch.status = updates.status
    if (updates.ownerUserId !== undefined) patch.owner_user_id = updates.ownerUserId
    if (updates.fieldValues !== undefined) patch.field_values = updates.fieldValues
    patch.updated_at = new Date().toISOString()

    const { error } = await simDb.from('local_register_records').update(patch).eq('id', recordId)
    if (error) throw error
    return { success: true, error: null }
  } catch (error) {
    console.error('updateRecord:', error)
    return { success: false, error: error.message || 'Failed to update record' }
  }
}

/**
 * Soft delete — matches the codebase's dominant is_deleted convention.
 * @param {string} recordId
 * @returns {Promise<{success: boolean, error: string|null}>}
 */
export async function deleteRecord(recordId) {
  try {
    const { error } = await simDb
      .from('local_register_records')
      .update({ is_deleted: true, updated_at: new Date().toISOString() })
      .eq('id', recordId)
    if (error) throw error
    return { success: true, error: null }
  } catch (error) {
    console.error('deleteRecord:', error)
    return { success: false, error: error.message || 'Failed to delete record' }
  }
}

export default {
  listRecords,
  getRecord,
  createRecord,
  updateRecord,
  deleteRecord,
}
