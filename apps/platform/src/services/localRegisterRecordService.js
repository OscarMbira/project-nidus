/**
 * Local Register Engine — record CRUD (v931). Generic across every register (system-defined
 * and member-created alike) — parameterized entirely by registerId, no per-register service.
 * RLS (SQL/v931_local_register_engine_schema.sql) inherits access from the owning register's
 * scope; this file does not duplicate that check client-side.
 */

import { supabase } from './supabaseClient'
import { submitForAuthorisation, getApprovalChain } from './recordLifecycleService'

/**
 * @param {string} registerId
 * @param {{ scopeLevel?: string, scopeEntityId?: string }} [scopeFilter] - required for
 *   system-defined registers (they carry no scope of their own, v932, so records from every
 *   project/org using them would otherwise mix together undifferentiated); optional for
 *   member-created registers, which are already tied to one entity.
 * @returns {Promise<{success: boolean, data: array, error: string|null}>}
 */
export async function listRecords(registerId, scopeFilter = {}) {
  if (!registerId) return { success: true, data: [], error: null }
  try {
    let query = supabase
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
    const { data, error } = await supabase
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
 *   recordProjectId?: string, accountId?: string }} params - exactly one of
 *   recordPortfolioId/recordProgrammeId/recordProjectId must match the owning register's
 *   scope_level (v932 — required for system-defined registers, which carry no scope of their
 *   own; for member-created registers the caller should pass through the register's own
 *   scope_*_id). accountId is required (v937) — submit_for_authorisation() reads it directly
 *   off this table; pass the creating user's own resolved account (getCurrentUserAccountId()),
 *   not derived from the scope entity (portfolios/programmes carry no account_id of their own).
 * @returns {Promise<{success: boolean, data: object|null, error: string|null}>}
 */
export async function createRecord(registerId, params) {
  try {
    // Every record starts 'live' (the table default) regardless of whether its register
    // requires approval — matches how every other lifecycle table works: submitForAuthorisation()
    // below is what actually transitions a record to 'unauthorised' AND creates the
    // record_authorisation_requests row the approval queue reads from. Setting the status flag
    // directly at insert (an earlier, incorrect version of this function did that) would leave a
    // record permanently invisible to any approver, since nothing would have created a request
    // for it.
    const { data, error } = await supabase
      .from('local_register_records')
      .insert({
        register_id: registerId,
        display_id: '', // blank — Admin ID Generation trigger assigns it (rule 16.2)
        account_id: params.accountId || null,
        project_id: params.recordProjectId || null,
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

    const { error } = await supabase.from('local_register_records').update(patch).eq('id', recordId)
    if (error) throw error
    return { success: true, error: null }
  } catch (error) {
    console.error('updateRecord:', error)
    return { success: false, error: error.message || 'Failed to update record' }
  }
}

/**
 * Soft delete — matches the codebase's dominant is_deleted convention (no hard DELETE policy
 * exists for this table, see SQL/v931_local_register_engine_schema.sql).
 * @param {string} recordId
 * @returns {Promise<{success: boolean, error: string|null}>}
 */
export async function deleteRecord(recordId) {
  try {
    const { error } = await supabase
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

/**
 * Submits a record for authorisation — the actual transition to 'unauthorised' plus the
 * record_authorisation_requests row(s) the approval queue (pmo/authorisation/queue,
 * pm/authorisation/queue — already generic across every lifecycle table, no Local-Register-
 * specific queue UI needed) reads from. Only meaningful for a record whose parent register has
 * requires_approval = true and whose record_status is currently 'live'.
 * @param {string} recordId
 * @param {string} [notes]
 * @returns {Promise<{success: boolean, submissionBatchId: string|null, error: string|null}>}
 */
/**
 * The configured approval chain for local_register_records at this account/project — shown in
 * AuthorisationRequestModal (mode="submit") before the user confirms. Empty array means either
 * no chain configured yet (a PMO Admin sets this up at pmo/authorisation/configure) or approval
 * is effectively disabled for this scope — submitForAuthorisation() itself already handles that
 * case gracefully (auto-validates instead of creating a pending request), this is read-only
 * display.
 * @param {string} accountId
 * @param {string|null} projectId
 * @returns {Promise<{success: boolean, data: array, error: string|null}>}
 */
export async function getRecordApprovalChain(accountId, projectId) {
  try {
    const data = await getApprovalChain(accountId, projectId, 'local_register_records')
    return { success: true, data: data || [], error: null }
  } catch (error) {
    console.error('getRecordApprovalChain:', error)
    return { success: false, data: [], error: error.message || 'Failed to load approval chain' }
  }
}

export async function submitRecordForAuthorisation(recordId, notes) {
  try {
    const submissionBatchId = await submitForAuthorisation('local_register_records', recordId, recordId, notes || null)
    return { success: true, submissionBatchId, error: null }
  } catch (error) {
    console.error('submitRecordForAuthorisation:', error)
    return { success: false, submissionBatchId: null, error: error.message || 'Failed to submit for authorisation' }
  }
}

export default {
  listRecords,
  getRecord,
  createRecord,
  updateRecord,
  deleteRecord,
  getRecordApprovalChain,
  submitRecordForAuthorisation,
}
