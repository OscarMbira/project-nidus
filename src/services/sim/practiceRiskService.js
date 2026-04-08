/**
 * Practice Risk Service
 * CRUD operations for practice risks (sim schema)
 */

import { simDb } from '../supabase/supabaseClient'

async function getCurrentUserId() {
  const { data: { user: authUser } } = await simDb.auth.getUser()
  if (!authUser) throw new Error('User not authenticated')
  const { data: userData, error } = await simDb.from('users').select('id').eq('auth_user_id', authUser.id).single()
  if (error || !userData) throw new Error('User not found')
  return userData.id
}

export async function getPracticeRisks(projectId, filters = {}) {
  try {
    let query = simDb.from('practice_risks').select('*').eq('practice_project_id', projectId).eq('is_deleted', false)
    if (filters.status) query = query.eq('status', filters.status)
    if (filters.risk_level) query = query.eq('risk_level', filters.risk_level)
    if (filters.search) query = query.or(`risk_title.ilike.%${filters.search}%,risk_description.ilike.%${filters.search}%`)
    const { data, error } = await query.order('risk_score', { ascending: false })
    if (error) throw error
    return { success: true, data: data || [] }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

export async function getPracticeRiskById(riskId) {
  try {
    const { data, error } = await simDb.from('practice_risks').select('*').eq('id', riskId).eq('is_deleted', false).single()
    if (error) throw error
    return { success: true, data }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

export async function createPracticeRisk(projectId, riskData) {
  try {
    const userId = await getCurrentUserId()
    const { data, error } = await simDb.from('practice_risks').insert({ ...riskData, practice_project_id: projectId, user_id: userId, created_by: userId, updated_by: userId }).select().single()
    if (error) throw error
    return { success: true, data }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

export async function updatePracticeRisk(riskId, updates) {
  try {
    const userId = await getCurrentUserId()
    const { data, error } = await simDb.from('practice_risks').update({ ...updates, updated_by: userId, updated_at: new Date().toISOString() }).eq('id', riskId).eq('user_id', userId).select().single()
    if (error) throw error
    return { success: true, data }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

export async function deletePracticeRisk(riskId) {
  try {
    const userId = await getCurrentUserId()
    const { data, error } = await simDb.from('practice_risks').update({ is_deleted: true, deleted_at: new Date().toISOString(), deleted_by: userId }).eq('id', riskId).eq('user_id', userId).select().single()
    if (error) throw error
    return { success: true, data }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

export default { getPracticeRisks, getPracticeRiskById, createPracticeRisk, updatePracticeRisk, deletePracticeRisk }
