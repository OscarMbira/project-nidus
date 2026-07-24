/**
 * Practice Quality Management Strategy Service
 * CRUD operations for practice QMS (sim schema)
 */

import { simDb } from '../supabase/supabaseClient'

async function getCurrentUserId() {
  const { data: { user: authUser } } = await simDb.auth.getUser()
  if (!authUser) throw new Error('User not authenticated')
  const { data: userData, error } = await simDb.from('users').select('id').eq('auth_user_id', authUser.id).single()
  if (error || !userData) throw new Error('User not found')
  return userData.id
}

export async function getPracticeQMS(projectId) {
  try {
    const { data, error } = await simDb.from('practice_quality_management_strategies').select('*').eq('practice_project_id', projectId).maybeSingle()
    if (error) throw error
    return { success: true, data }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

export async function createPracticeQMS(projectId, qmsData) {
  try {
    const userId = await getCurrentUserId()
    const { data, error } = await simDb.from('practice_quality_management_strategies').insert({ ...qmsData, practice_project_id: projectId, user_id: userId, created_by: userId }).select().single()
    if (error) throw error
    return { success: true, data }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

export async function updatePracticeQMS(qmsId, updates) {
  try {
    const userId = await getCurrentUserId()
    const { data, error } = await simDb.from('practice_quality_management_strategies').update({ ...updates, updated_at: new Date().toISOString() }).eq('id', qmsId).eq('user_id', userId).select().single()
    if (error) throw error
    return { success: true, data }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

export default { getPracticeQMS, createPracticeQMS, updatePracticeQMS }
