/**
 * Practice End Project Report Service
 * CRUD operations for practice end project reports (sim schema)
 */

import { simDb } from '../supabase/supabaseClient'

async function getCurrentUserId() {
  const { data: { user: authUser } } = await simDb.auth.getUser()
  if (!authUser) throw new Error('User not authenticated')
  const { data: userData, error } = await simDb.from('users').select('id').eq('auth_user_id', authUser.id).single()
  if (error || !userData) throw new Error('User not found')
  return userData.id
}

export async function getPracticeEndProjectReports(projectId) {
  try {
    const { data, error } = await simDb.from('practice_end_project_reports').select('*').eq('practice_project_id', projectId).order('report_date', { ascending: false })
    if (error) throw error
    return { success: true, data: data || [] }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

export async function createPracticeEndProjectReport(projectId, reportData) {
  try {
    const userId = await getCurrentUserId()
    const { data, error } = await simDb.from('practice_end_project_reports').insert({ ...reportData, practice_project_id: projectId, user_id: userId, created_by: userId }).select().single()
    if (error) throw error
    return { success: true, data }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

export async function updatePracticeEndProjectReport(reportId, updates) {
  try {
    const userId = await getCurrentUserId()
    const { data, error } = await simDb.from('practice_end_project_reports').update({ ...updates, updated_at: new Date().toISOString() }).eq('id', reportId).eq('user_id', userId).select().single()
    if (error) throw error
    return { success: true, data }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

export default { getPracticeEndProjectReports, createPracticeEndProjectReport, updatePracticeEndProjectReport }
