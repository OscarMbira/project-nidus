import { simDb } from './supabaseClient'

/**
 * Assumptions Register — service (Simulator, v963 Phase 3). Mirrors
 * apps/platform/src/services/assumptionService.js against sim.assumptions
 * (SQL/v963b_assumptions_register_schema.sql) instead of public.assumptions.
 *
 * Risk/Issue conversion writes directly to sim.practice_risks / sim.practice_issues via simDb
 * here, rather than delegating to this app's own riskService.js/issueService.js — riskService.js
 * imports platformDb (not simDb) for its base client, which would write a converted risk into
 * the wrong (public) schema from inside the Simulator app; this file avoids inheriting that.
 */

/**
 * @param {string} projectId - sim.practice_projects.id
 * @returns {Promise<{success: boolean, data: array, error: string|null}>}
 */
export async function listAssumptions(projectId) {
  if (!projectId) return { success: true, data: [], error: null }
  try {
    const { data, error } = await simDb
      .from('assumptions')
      .select(`
        *,
        owner:owner_user_id (id, full_name, email)
      `)
      .eq('project_id', projectId)
      .eq('is_deleted', false)
      .order('created_at', { ascending: true })

    if (error) throw error
    return { success: true, data: data || [], error: null }
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
    const { data, error } = await simDb
      .from('assumptions')
      .select(`*, owner:owner_user_id (id, full_name, email)`)
      .eq('id', assumptionId)
      .eq('is_deleted', false)
      .maybeSingle()

    if (error) throw error
    return { success: true, data, error: null }
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
      .from('assumptions')
      .insert({
        project_id: params.projectId,
        assumption_text: params.assumptionText,
        validation_status: params.validationStatus || 'active',
        owner_user_id: params.ownerUserId || currentUserId,
        impact_severity: params.impactSeverity || null,
        next_review_date: params.nextReviewDate || null,
        notes: params.notes || null,
        created_by: currentUserId,
        updated_by: currentUserId,
      })
      .select()
      .single()

    if (error) throw error

    const { data: fresh, error: freshError } = await simDb
      .from('assumptions')
      .select('*, owner:owner_user_id (id, full_name, email)')
      .eq('id', data.id)
      .single()
    if (freshError) throw freshError
    return { success: true, data: fresh, error: null }
  } catch (error) {
    console.error('createAssumption:', error)
    return { success: false, data: null, error: error.message || 'Failed to create assumption' }
  }
}

/**
 * @param {string} assumptionId
 * @param {{ assumptionText?: string, validationStatus?: string, ownerUserId?: string,
 *   impactSeverity?: string, nextReviewDate?: string, notes?: string, convertedToRiskId?: string,
 *   convertedToIssueId?: string }} updates
 * @returns {Promise<{success: boolean, error: string|null}>}
 */
export async function updateAssumption(assumptionId, updates) {
  try {
    const patch = { updated_at: new Date().toISOString() }
    if (updates.assumptionText !== undefined) patch.assumption_text = updates.assumptionText
    if (updates.validationStatus !== undefined) patch.validation_status = updates.validationStatus
    if (updates.ownerUserId !== undefined) patch.owner_user_id = updates.ownerUserId
    if (updates.impactSeverity !== undefined) patch.impact_severity = updates.impactSeverity || null
    if (updates.nextReviewDate !== undefined) patch.next_review_date = updates.nextReviewDate || null
    if (updates.notes !== undefined) patch.notes = updates.notes
    if (updates.convertedToRiskId !== undefined) patch.converted_to_risk_id = updates.convertedToRiskId
    if (updates.convertedToIssueId !== undefined) patch.converted_to_issue_id = updates.convertedToIssueId

    const { error } = await simDb.from('assumptions').update(patch).eq('id', assumptionId)
    if (error) throw error

    const { data, error: readError } = await simDb
      .from('assumptions')
      .select('*, owner:owner_user_id (id, full_name, email)')
      .eq('id', assumptionId)
      .single()
    if (readError) throw readError
    return { success: true, data, error: null }
  } catch (error) {
    console.error('updateAssumption:', error)
    return { success: false, error: error.message || 'Failed to update assumption' }
  }
}

/**
 * @param {string} assumptionId
 * @returns {Promise<{success: boolean, error: string|null}>}
 */
export async function deleteAssumption(assumptionId) {
  try {
    const { error } = await simDb
      .from('assumptions')
      .update({ is_deleted: true, updated_at: new Date().toISOString() })
      .eq('id', assumptionId)
    if (error) throw error
    return { success: true, error: null }
  } catch (error) {
    console.error('deleteAssumption:', error)
    return { success: false, error: error.message || 'Failed to delete assumption' }
  }
}

/**
 * @param {string} assumptionId
 * @param {string} projectId - sim.practice_projects.id
 * @param {string} assumptionText
 * @returns {Promise<{success: boolean, data: object|null, error: string|null}>}
 */
export async function convertAssumptionToRisk(assumptionId, projectId, assumptionText) {
  try {
    const { data: risk, error: riskError } = await simDb
      .from('practice_risks')
      .insert({
        practice_project_id: projectId,
        risk_title: `Assumption invalidated: ${String(assumptionText || '').slice(0, 150)}`,
        risk_description: assumptionText,
      })
      .select()
      .single()
    if (riskError) throw riskError

    const updateResult = await updateAssumption(assumptionId, {
      convertedToRiskId: risk.id,
      validationStatus: 'invalidated',
    })
    if (!updateResult.success) throw new Error(updateResult.error)

    return { success: true, data: risk, error: null }
  } catch (error) {
    console.error('convertAssumptionToRisk:', error)
    return { success: false, data: null, error: error.message || 'Failed to convert assumption to risk' }
  }
}

/**
 * @param {string} assumptionId
 * @param {string} projectId - sim.practice_projects.id
 * @param {string} assumptionText
 * @returns {Promise<{success: boolean, data: object|null, error: string|null}>}
 */
export async function convertAssumptionToIssue(assumptionId, projectId, assumptionText) {
  try {
    const { data: issue, error: issueError } = await simDb
      .from('practice_issues')
      .insert({
        practice_project_id: projectId,
        issue_title: `Assumption invalidated: ${String(assumptionText || '').slice(0, 150)}`,
        issue_description: assumptionText,
      })
      .select()
      .single()
    if (issueError) throw issueError

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
