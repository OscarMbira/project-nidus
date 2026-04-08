/**
 * Practice End Stage Report Service
 * CRUD operations for practice end stage reports (sim schema)
 */

import { simDb } from '../supabase/supabaseClient'

async function getCurrentUserId() {
  const { data: { user: authUser } } = await simDb.auth.getUser()
  if (!authUser) throw new Error('User not authenticated')
  const { data: userData, error } = await simDb.from('users').select('id').eq('auth_user_id', authUser.id).single()
  if (error || !userData) throw new Error('User not found')
  return userData.id
}

export async function getPracticeEndStageReports(projectId, filters = {}) {
  try {
    let query = simDb.from('practice_end_stage_reports').select('*').eq('practice_project_id', projectId)
    if (filters.stage_id) query = query.eq('practice_stage_id', filters.stage_id)
    if (filters.status) query = query.eq('status', filters.status)
    const { data, error } = await query.order('report_date', { ascending: false })
    if (error) throw error
    return { success: true, data: data || [] }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

export async function createPracticeEndStageReport(projectId, reportData) {
  try {
    const userId = await getCurrentUserId()
    const { data, error } = await simDb.from('practice_end_stage_reports').insert({ ...reportData, practice_project_id: projectId, user_id: userId, created_by: userId }).select().single()
    if (error) throw error
    return { success: true, data }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

export async function updatePracticeEndStageReport(reportId, updates) {
  try {
    const userId = await getCurrentUserId()
    const { data, error } = await simDb.from('practice_end_stage_reports').update({ ...updates, updated_at: new Date().toISOString() }).eq('id', reportId).eq('user_id', userId).select().single()
    if (error) throw error
    return { success: true, data }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

export default { getPracticeEndStageReports, createPracticeEndStageReport, updatePracticeEndStageReport }
