/**
 * Practice Business Case Service
 * CRUD operations for practice business cases (sim schema)
 */

import { simDb } from '../supabase/supabaseClient'

async function getCurrentUserId() {
  const { data: { user: authUser } } = await simDb.auth.getUser()
  if (!authUser) throw new Error('User not authenticated')
  const { data: userData, error } = await simDb.from('users').select('id').eq('auth_user_id', authUser.id).single()
  if (error || !userData) throw new Error('User not found')
  return userData.id
}

/**
 * Get all practice business cases (no projectId filter — for PMO Simulator list)
 */
export async function getAllPracticeBCs(filters = {}) {
  try {
    let query = simDb
      .from('practice_business_cases')
      .select('*, practice_projects(project_name)')
      .eq('is_deleted', false)
    if (filters.status) query = query.eq('lifecycle_stage', filters.status)
    if (filters.projectId) query = query.eq('practice_project_id', filters.projectId)
    const { data, error } = await query.order('created_at', { ascending: false })
    if (error) throw error
    return { success: true, data: data || [] }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

/**
 * Get practice business cases for a specific project
 */
export async function getPracticeBusinessCases(projectId, filters = {}) {
  return getAllPracticeBCs({ ...filters, projectId })
}

export async function getPracticeBusinessCaseById(caseId) {
  try {
    const { data, error } = await simDb
      .from('practice_business_cases')
      .select('*, practice_projects(project_name)')
      .eq('id', caseId)
      .eq('is_deleted', false)
      .single()
    if (error) throw error
    return { success: true, data }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

export async function createPracticeBusinessCase(projectId, caseData) {
  try {
    const userId = await getCurrentUserId()
    const insertData = {
      ...caseData,
      practice_project_id: projectId || null,
      user_id: userId,
      created_by: userId,
      updated_by: userId,
      lifecycle_stage: 'draft',
    }
    const { data, error } = await simDb
      .from('practice_business_cases')
      .insert(insertData)
      .select()
      .single()
    if (error) throw error
    return { success: true, data }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

export async function updatePracticeBusinessCase(caseId, updates) {
  try {
    const userId = await getCurrentUserId()
    const { data, error } = await simDb
      .from('practice_business_cases')
      .update({ ...updates, updated_by: userId, updated_at: new Date().toISOString() })
      .eq('id', caseId)
      .select()
      .single()
    if (error) throw error
    return { success: true, data }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

export async function deletePracticeBusinessCase(caseId) {
  try {
    const userId = await getCurrentUserId()
    const { data, error } = await simDb
      .from('practice_business_cases')
      .update({ is_deleted: true, deleted_at: new Date().toISOString(), deleted_by: userId })
      .eq('id', caseId)
      .select()
      .single()
    if (error) throw error
    return { success: true, data }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

/**
 * Get approval status for a practice business case (sim table has is_approved, approved_by, approved_at).
 */
export async function getApprovalStatus(caseId) {
  try {
    const { data, error } = await simDb
      .from('practice_business_cases')
      .select('is_approved, approved_by, approved_at, lifecycle_stage')
      .eq('id', caseId)
      .eq('is_deleted', false)
      .single()
    if (error || !data) return { success: false, error: error?.message || 'Not found' }
    const status = data.is_approved
      ? [{ status: 'approved', approved_at: data.approved_at, approved_by: data.approved_by }]
      : [{ status: data.lifecycle_stage || 'draft', approved_at: null, approved_by: null }]
    return { success: true, data: status }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

/**
 * Get revision history (sim table has document_version, updated_at — no separate revisions table).
 */
export async function getRevisionHistory(caseId) {
  try {
    const { data, error } = await simDb
      .from('practice_business_cases')
      .select('document_version, updated_at, updated_by')
      .eq('id', caseId)
      .eq('is_deleted', false)
      .single()
    if (error || !data) return { success: false, error: error?.message || 'Not found' }
    const history = [{ version: data.document_version || 1, updated_at: data.updated_at, updated_by: data.updated_by }]
    return { success: true, data: history }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

export default {
  getAllPracticeBCs,
  getPracticeBusinessCases,
  getPracticeBusinessCaseById,
  createPracticeBusinessCase,
  updatePracticeBusinessCase,
  deletePracticeBusinessCase,
  getApprovalStatus,
  getRevisionHistory,
}
