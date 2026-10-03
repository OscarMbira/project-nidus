import { supabase } from './supabaseClient'
import { createRisk } from './riskService'
import { createIssue } from './issueService'
import { getOrCreateIssueRegister } from './issueRegisterService'

/**
 * Assumptions Register — service (v963, Phase 3).
 *
 * public.assumptions already existed (SQL/v26_risk_management.sql, part of the RAID log
 * feature) with its own validation lifecycle under different column names
 * (assumption_title/assumption_description/status/validation_notes) before this feature was
 * built. Rather than run a second, colliding "assumptions" concept, this service targets v26's
 * real table — it only adds converted_to_risk_id/converted_to_issue_id (SQL/v963b), the one
 * genuinely new capability (a real FK back to the risk/issue an assumption became, instead of
 * duplicating its text with no traceability back).
 *
 * The three Assumptions Register pages (List/Detail/Form) were built against a simpler
 * assumption_text/validation_status/notes shape (v963); this service maps between the two: every
 * read aliases assumption_description -> assumption_text and validation_notes -> notes.
 *
 * v1100 enrichment: the UI now exposes v26's real owner_user_id/impact_severity/next_review_date
 * columns (previously left unused by the v963 simplified form) and the real 4-value `status`
 * column (active/validated/invalidated/closed) directly — the earlier 3-value UI mapping
 * (unvalidated/validated/invalidated) is retired; `validation_status` in the UI shape now just
 * carries the raw DB status value. assumption_title (v26 NOT NULL) is auto-derived from the
 * assumption text; identified_by_user_id (v26 NOT NULL) is set to the current user, same as
 * owner_user_id defaults to the current user when not supplied.
 */

const SELECT_COLUMNS = `
  id, project_id, assumption_code, assumption_description, status, validation_notes,
  owner_user_id, impact_severity, next_review_date, converted_to_risk_id, converted_to_issue_id,
  created_at, created_by, updated_at, updated_by,
  owner:owner_user_id (id, full_name, email),
  created_by_user:created_by (id, full_name, email),
  updated_by_user:updated_by (id, full_name, email)
`

/** List view only. Skips the created-by / updated-by joins the table does not render. */
const LIST_COLUMNS = `
  id, assumption_description, status, owner_user_id, impact_severity, next_review_date, created_at,
  owner:owner_user_id (id, full_name)
`

const SELECT_COLUMNS_WITH_PROJECT = `${SELECT_COLUMNS}, project:project_id (id, project_name, project_code)`

/** Map a raw public.assumptions row (v26 columns) to the shape the pages expect. */
function toUiRow(row) {
  if (!row) return row
  const { assumption_description, status, validation_notes, ...rest } = row
  return {
    ...rest,
    assumption_text: assumption_description,
    validation_status: status,
    notes: validation_notes,
  }
}

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
export async function listAssumptions(projectId) {
  if (!projectId) return { success: true, data: [], error: null }
  try {
    const { data, error } = await supabase
      .from('assumptions')
      .select(LIST_COLUMNS)
      .eq('project_id', projectId)
      .eq('is_deleted', false)
      .order('created_at', { ascending: true })

    if (error) throw error
    return { success: true, data: (data || []).map(toUiRow), error: null }
  } catch (error) {
    console.error('listAssumptions:', error)
    return { success: false, data: [], error: error.message || 'Failed to load assumptions' }
  }
}

/**
 * @param {string} assumptionId
 * @returns {Promise<{success: boolean, data: object|null, error: string|null}>}
 */
export async function getAssumption(assumptionId) {
  if (!assumptionId) return { success: true, data: null, error: null }
  try {
    const { data, error } = await supabase
      .from('assumptions')
      .select(SELECT_COLUMNS_WITH_PROJECT)
      .eq('id', assumptionId)
      .eq('is_deleted', false)
      .maybeSingle()

    if (error) throw error
    return { success: true, data: toUiRow(data), error: null }
  } catch (error) {
    console.error('getAssumption:', error)
    return { success: false, data: null, error: error.message || 'Failed to load assumption' }
  }
}

/**
 * @param {{ projectId: string, assumptionText: string, validationStatus?: string,
 *   ownerUserId?: string, impactSeverity?: string, nextReviewDate?: string, notes?: string }} params
 * @returns {Promise<{success: boolean, data: object|null, error: string|null}>}
 */
export async function createAssumption(params) {
  try {
    const currentUserId = await getCurrentAppUserId()
    const text = params.assumptionText || ''
    const { data, error } = await supabase
      .from('assumptions')
      .insert({
        project_id: params.projectId,
        assumption_title: text.slice(0, 200),
        assumption_description: text,
        status: params.validationStatus || 'active',
        owner_user_id: params.ownerUserId || currentUserId,
        impact_severity: params.impactSeverity || null,
        next_review_date: params.nextReviewDate || null,
        identified_by_user_id: currentUserId,
        validation_notes: params.notes || null,
        created_by: currentUserId,
        updated_by: currentUserId,
      })
      .select(SELECT_COLUMNS)
      .single()

    if (error) throw error

    // The Admin ID trigger writes assumption_code in a follow-up UPDATE, so
    // INSERT … RETURNING does not include it. Read the row again.
    const { data: fresh, error: freshError } = await supabase
      .from('assumptions')
      .select(SELECT_COLUMNS)
      .eq('id', data.id)
      .single()
    if (freshError) throw freshError
    return { success: true, data: toUiRow(fresh), error: null }
  } catch (error) {
    console.error('createAssumption:', error)
    return { success: false, data: null, error: error.message || 'Failed to create assumption' }
  }
}

/**
 * @param {string} assumptionId
 * @param {{ assumptionText?: string, validationStatus?: string, ownerUserId?: string,
 *   impactSeverity?: string, nextReviewDate?: string, notes?: string }} updates
 * @returns {Promise<{success: boolean, error: string|null}>}
 */
export async function updateAssumption(assumptionId, updates) {
  try {
    const currentUserId = await getCurrentAppUserId()
    const patch = { updated_by: currentUserId, updated_at: new Date().toISOString() }
    if (updates.assumptionText !== undefined) {
      patch.assumption_description = updates.assumptionText
      patch.assumption_title = String(updates.assumptionText || '').slice(0, 200)
    }
    if (updates.validationStatus !== undefined) patch.status = updates.validationStatus
    if (updates.ownerUserId !== undefined) patch.owner_user_id = updates.ownerUserId
    if (updates.impactSeverity !== undefined) patch.impact_severity = updates.impactSeverity || null
    if (updates.nextReviewDate !== undefined) patch.next_review_date = updates.nextReviewDate || null
    if (updates.notes !== undefined) patch.validation_notes = updates.notes
    if (updates.convertedToRiskId !== undefined) patch.converted_to_risk_id = updates.convertedToRiskId
    if (updates.convertedToIssueId !== undefined) patch.converted_to_issue_id = updates.convertedToIssueId

    const { error } = await supabase.from('assumptions').update(patch).eq('id', assumptionId)
    if (error) throw error

    const { data, error: readError } = await supabase
      .from('assumptions')
      .select(SELECT_COLUMNS)
      .eq('id', assumptionId)
      .single()
    if (readError) throw readError
    return { success: true, data: toUiRow(data), error: null }
  } catch (error) {
    console.error('updateAssumption:', error)
    return { success: false, error: error.message || 'Failed to update assumption' }
  }
}

/**
 * Soft delete (matches the codebase's dominant is_deleted convention).
 * @param {string} assumptionId
 * @returns {Promise<{success: boolean, error: string|null}>}
 */
export async function deleteAssumption(assumptionId) {
  try {
    const currentUserId = await getCurrentAppUserId()
    const { error } = await supabase
      .from('assumptions')
      .update({ is_deleted: true, updated_by: currentUserId, updated_at: new Date().toISOString() })
      .eq('id', assumptionId)
    if (error) throw error
    return { success: true, error: null }
  } catch (error) {
    console.error('deleteAssumption:', error)
    return { success: false, error: error.message || 'Failed to delete assumption' }
  }
}

/**
 * Converts an assumption into a new Risk, sets converted_to_risk_id, and marks the assumption
 * invalidated — a real FK link rather than duplicating the assumption's text with no
 * traceability back (plan Phase 3's "link from Risk/Issue conversion" requirement). Reuses
 * riskService.createRisk() (which auto-creates the project's risk_register_id when absent)
 * rather than inserting into `risks` directly.
 * @param {string} assumptionId
 * @param {string} projectId
 * @param {string} assumptionText
 * @returns {Promise<{success: boolean, data: object|null, error: string|null}>}
 */
export async function convertAssumptionToRisk(assumptionId, projectId, assumptionText) {
  try {
    const riskResult = await createRisk({
      project_id: projectId,
      risk_title: `Assumption invalidated: ${String(assumptionText || '').slice(0, 150)}`,
      risk_description: assumptionText,
    })
    if (!riskResult.success) throw new Error(riskResult.error || 'Failed to create risk')

    const updateResult = await updateAssumption(assumptionId, {
      convertedToRiskId: riskResult.data.id,
      validationStatus: 'invalidated',
    })
    if (!updateResult.success) throw new Error(updateResult.error)

    return { success: true, data: riskResult.data, error: null }
  } catch (error) {
    console.error('convertAssumptionToRisk:', error)
    return { success: false, data: null, error: error.message || 'Failed to convert assumption to risk' }
  }
}

/**
 * Converts an assumption into a new Issue, sets converted_to_issue_id, and marks the assumption
 * invalidated. Resolves (or creates) the project's issue register first via
 * issueRegisterService.getOrCreateIssueRegister(), same as the Issues page does.
 * @param {string} assumptionId
 * @param {string} projectId
 * @param {string} assumptionText
 * @returns {Promise<{success: boolean, data: object|null, error: string|null}>}
 */
export async function convertAssumptionToIssue(assumptionId, projectId, assumptionText) {
  try {
    const register = await getOrCreateIssueRegister(projectId)
    const registerId = register?.id || register?.data?.id
    if (!registerId) throw new Error('Could not resolve an issue register for this project')

    const issue = await createIssue(registerId, {
      issue_title: `Assumption invalidated: ${String(assumptionText || '').slice(0, 150)}`,
      issue_description: assumptionText,
    })

    const updateResult = await updateAssumption(assumptionId, {
      convertedToIssueId: issue.id,
      validationStatus: 'invalidated',
    })
    if (!updateResult.success) throw new Error(updateResult.error)

    return { success: true, data: issue, error: null }
  } catch (error) {
    console.error('convertAssumptionToIssue:', error)
    return { success: false, data: null, error: error.message || 'Failed to convert assumption to issue' }
  }
}

export default {
  listAssumptions,
  getAssumption,
  createAssumption,
  updateAssumption,
  deleteAssumption,
  convertAssumptionToRisk,
  convertAssumptionToIssue,
}
