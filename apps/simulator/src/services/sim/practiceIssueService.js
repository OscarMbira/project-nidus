/**
 * Practice Issue Service
 * CRUD operations for practice issues (sim schema)
 */

import { simDb } from '../supabase/supabaseClient'

async function getCurrentUserId() {
  const { data: { user: authUser } } = await simDb.auth.getUser()
  if (!authUser) throw new Error('User not authenticated')
  const { data: userData, error } = await simDb.from('users').select('id').eq('auth_user_id', authUser.id).single()
  if (error || !userData) throw new Error('User not found')
  return userData.id
}

export async function getPracticeIssues(projectId, filters = {}) {
  try {
    let query = simDb.from('practice_issues').select('*').eq('practice_project_id', projectId).eq('is_deleted', false)
    if (filters.status) query = query.eq('status', filters.status)
    if (filters.priority) query = query.eq('priority', filters.priority)
    if (filters.search) query = query.or(`issue_title.ilike.%${filters.search}%,issue_description.ilike.%${filters.search}%`)
    const { data, error } = await query.order('created_at', { ascending: false })
    if (error) throw error
    return { success: true, data: data || [] }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

export async function getPracticeIssueById(issueId) {
  try {
    const { data, error } = await simDb.from('practice_issues').select('*').eq('id', issueId).eq('is_deleted', false).single()
    if (error) throw error
    return { success: true, data }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

export async function createPracticeIssue(projectId, issueData) {
  try {
    const userId = await getCurrentUserId()
    const { data, error } = await simDb.from('practice_issues').insert({ ...issueData, practice_project_id: projectId, user_id: userId, created_by: userId, updated_by: userId }).select().single()
    if (error) throw error
    return { success: true, data }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

export async function updatePracticeIssue(issueId, updates) {
  try {
    const userId = await getCurrentUserId()
    const { data, error } = await simDb.from('practice_issues').update({ ...updates, updated_by: userId, updated_at: new Date().toISOString() }).eq('id', issueId).eq('user_id', userId).select().single()
    if (error) throw error
    return { success: true, data }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

export async function deletePracticeIssue(issueId) {
  try {
    const userId = await getCurrentUserId()
    const { data, error } = await simDb.from('practice_issues').update({ is_deleted: true, deleted_at: new Date().toISOString(), deleted_by: userId }).eq('id', issueId).eq('user_id', userId).select().single()
    if (error) throw error
    return { success: true, data }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

export default { getPracticeIssues, getPracticeIssueById, createPracticeIssue, updatePracticeIssue, deletePracticeIssue }
