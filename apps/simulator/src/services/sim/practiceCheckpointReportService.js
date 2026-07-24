/**
 * Practice Checkpoint Report Service
 * CRUD operations for practice checkpoint reports (sim schema)
 */

import { simDb } from '../supabase/supabaseClient'

async function getCurrentUserId() {
  const { data: { user: authUser } } = await simDb.auth.getUser()
  if (!authUser) throw new Error('User not authenticated')
  const { data: userData, error } = await simDb.from('users').select('id').eq('auth_user_id', authUser.id).single()
  if (error || !userData) throw new Error('User not found')
  return userData.id
}

export async function getPracticeCheckpointReports(projectId, filters = {}) {
  try {
    let query = simDb.from('practice_checkpoint_reports').select('*').eq('practice_project_id', projectId)
    if (filters.status) query = query.eq('status', filters.status)
    const { data, error } = await query.order('checkpoint_date', { ascending: false })
    if (error) throw error
    return { success: true, data: data || [] }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

export async function createPracticeCheckpointReport(projectId, reportData) {
  try {
    const userId = await getCurrentUserId()
    const { data, error } = await simDb.from('practice_checkpoint_reports').insert({ ...reportData, practice_project_id: projectId, user_id: userId, created_by: userId }).select().single()
    if (error) throw error
    return { success: true, data }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

export async function updatePracticeCheckpointReport(reportId, updates) {
  try {
    const userId = await getCurrentUserId()
    const { data, error } = await simDb.from('practice_checkpoint_reports').update({ ...updates, updated_at: new Date().toISOString() }).eq('id', reportId).eq('user_id', userId).select().single()
    if (error) throw error
    return { success: true, data }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

export default { getPracticeCheckpointReports, createPracticeCheckpointReport, updatePracticeCheckpointReport }
