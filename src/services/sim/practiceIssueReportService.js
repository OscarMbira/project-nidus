/**
 * Practice Issue Report Service
 * CRUD operations for practice issue reports (sim schema)
 */

import { simDb } from '../supabase/supabaseClient'

async function getCurrentUserId() {
  const { data: { user: authUser } } = await simDb.auth.getUser()
  if (!authUser) throw new Error('User not authenticated')
  const { data: userData, error } = await simDb.from('users').select('id').eq('auth_user_id', authUser.id).single()
  if (error || !userData) throw new Error('User not found')
  return userData.id
}

export async function getPracticeIssueReports(projectId, filters = {}) {
  try {
    let query = simDb.from('practice_issue_reports').select('*').eq('practice_project_id', projectId)
    if (filters.report_status) query = query.eq('report_status', filters.report_status)
    const { data, error } = await query.order('report_date', { ascending: false })
    if (error) throw error
    return { success: true, data: data || [] }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

export async function createPracticeIssueReport(projectId, reportData) {
  try {
    const userId = await getCurrentUserId()
    const { data, error } = await simDb.from('practice_issue_reports').insert({ ...reportData, practice_project_id: projectId, user_id: userId, created_by: userId }).select().single()
    if (error) throw error
    return { success: true, data }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

export async function updatePracticeIssueReport(reportId, updates) {
  try {
    const userId = await getCurrentUserId()
    const { data, error } = await simDb.from('practice_issue_reports').update({ ...updates, updated_at: new Date().toISOString() }).eq('id', reportId).eq('user_id', userId).select().single()
    if (error) throw error
    return { success: true, data }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

export default { getPracticeIssueReports, createPracticeIssueReport, updatePracticeIssueReport }
