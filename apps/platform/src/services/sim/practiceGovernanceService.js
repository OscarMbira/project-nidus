/**
 * Practice Governance Service
 * CRUD operations for practice governance decisions and document register (sim schema)
 */

import { simDb } from '../supabase/supabaseClient'

async function getCurrentUserId() {
  const { data: { user: authUser } } = await simDb.auth.getUser()
  if (!authUser) throw new Error('User not authenticated')
  const { data: userData, error } = await simDb.from('users').select('id').eq('auth_user_id', authUser.id).single()
  if (error || !userData) throw new Error('User not found')
  return userData.id
}

export async function getPracticeGovernanceDecisions(projectId, filters = {}) {
  try {
    let query = simDb.from('practice_governance_decisions').select('*').eq('practice_project_id', projectId).eq('is_deleted', false)
    if (filters.status) query = query.eq('status', filters.status)
    if (filters.decision_type) query = query.eq('decision_type', filters.decision_type)
    const { data, error } = await query.order('decision_date', { ascending: false })
    if (error) throw error
    return { success: true, data: data || [] }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

export async function getPracticeDocumentRegister(projectId, filters = {}) {
  try {
    let query = simDb.from('practice_document_register').select('*').eq('practice_project_id', projectId).eq('is_deleted', false)
    if (filters.document_type) query = query.eq('document_type', filters.document_type)
    if (filters.document_status) query = query.eq('document_status', filters.document_status)
    const { data, error } = await query.order('created_at', { ascending: false })
    if (error) throw error
    return { success: true, data: data || [] }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

export async function createPracticeGovernanceDecision(projectId, decisionData) {
  try {
    const userId = await getCurrentUserId()
    const { data, error } = await simDb.from('practice_governance_decisions').insert({ ...decisionData, practice_project_id: projectId, user_id: userId, created_by: userId }).select().single()
    if (error) throw error
    return { success: true, data }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

export async function createPracticeDocumentRegister(projectId, documentData) {
  try {
    const userId = await getCurrentUserId()
    const { data, error } = await simDb.from('practice_document_register').insert({ ...documentData, practice_project_id: projectId, user_id: userId, created_by: userId }).select().single()
    if (error) throw error
    return { success: true, data }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

export default { getPracticeGovernanceDecisions, getPracticeDocumentRegister, createPracticeGovernanceDecision, createPracticeDocumentRegister }
