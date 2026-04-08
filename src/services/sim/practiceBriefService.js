/**
 * Practice Brief Service
 * CRUD operations for practice project briefs (sim schema)
 */

import { simDb } from '../supabase/supabaseClient'

async function getCurrentUserId() {
  const { data: { user: authUser } } = await simDb.auth.getUser()
  if (!authUser) throw new Error('User not authenticated')
  const { data: userData, error } = await simDb.from('users').select('id').eq('auth_user_id', authUser.id).single()
  if (error || !userData) throw new Error('User not found')
  return userData.id
}

export async function getPracticeBriefs(projectId, filters = {}) {
  try {
    let query = simDb.from('practice_project_briefs').select('*').eq('practice_project_id', projectId).eq('is_deleted', false)
    if (filters.status) query = query.eq('is_approved', filters.status === 'approved')
    const { data, error } = await query.order('created_at', { ascending: false })
    if (error) throw error
    return { success: true, data: data || [] }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

export async function getPracticeBriefById(briefId) {
  try {
    const { data, error } = await simDb.from('practice_project_briefs').select('*').eq('id', briefId).eq('is_deleted', false).single()
    if (error) throw error
    return { success: true, data }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

export async function createPracticeBrief(projectId, briefData) {
  try {
    const userId = await getCurrentUserId()
    const { data, error } = await simDb.from('practice_project_briefs').insert({ ...briefData, practice_project_id: projectId, user_id: userId, created_by: userId, updated_by: userId }).select().single()
    if (error) throw error
    return { success: true, data }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

export async function updatePracticeBrief(briefId, updates) {
  try {
    const userId = await getCurrentUserId()
    const { data, error } = await simDb.from('practice_project_briefs').update({ ...updates, updated_by: userId, updated_at: new Date().toISOString() }).eq('id', briefId).eq('user_id', userId).select().single()
    if (error) throw error
    return { success: true, data }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

export async function deletePracticeBrief(briefId) {
  try {
    const userId = await getCurrentUserId()
    const { data, error } = await simDb.from('practice_project_briefs').update({ is_deleted: true, deleted_at: new Date().toISOString(), deleted_by: userId }).eq('id', briefId).eq('user_id', userId).select().single()
    if (error) throw error
    return { success: true, data }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

export default { getPracticeBriefs, getPracticeBriefById, createPracticeBrief, updatePracticeBrief, deletePracticeBrief }
