/**
 * Practice PID Service
 * CRUD operations for practice project initiation documents (sim schema)
 */

import { simDb } from '../supabase/supabaseClient'

async function getCurrentUserId() {
  const { data: { user: authUser } } = await simDb.auth.getUser()
  if (!authUser) throw new Error('User not authenticated')
  const { data: userData, error } = await simDb.from('users').select('id').eq('auth_user_id', authUser.id).single()
  if (error || !userData) throw new Error('User not found')
  return userData.id
}

export async function getPracticePIDs(projectId) {
  try {
    const { data, error } = await simDb.from('practice_project_initiation_documents').select('*').eq('practice_project_id', projectId).eq('is_deleted', false)
    if (error) throw error
    return { success: true, data: data || [] }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

export async function getPracticePIDById(pidId) {
  try {
    const { data, error } = await simDb.from('practice_project_initiation_documents').select('*').eq('id', pidId).eq('is_deleted', false).single()
    if (error) throw error
    return { success: true, data }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

export async function createPracticePID(projectId, pidData) {
  try {
    const userId = await getCurrentUserId()
    const { data, error } = await simDb.from('practice_project_initiation_documents').insert({ ...pidData, practice_project_id: projectId, user_id: userId, created_by: userId, updated_by: userId }).select().single()
    if (error) throw error
    return { success: true, data }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

export async function updatePracticePID(pidId, updates) {
  try {
    const userId = await getCurrentUserId()
    const { data, error } = await simDb.from('practice_project_initiation_documents').update({ ...updates, updated_by: userId, updated_at: new Date().toISOString() }).eq('id', pidId).eq('user_id', userId).select().single()
    if (error) throw error
    return { success: true, data }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

export async function deletePracticePID(pidId) {
  try {
    const userId = await getCurrentUserId()
    const { data, error } = await simDb.from('practice_project_initiation_documents').update({ is_deleted: true, deleted_at: new Date().toISOString(), deleted_by: userId }).eq('id', pidId).eq('user_id', userId).select().single()
    if (error) throw error
    return { success: true, data }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

export default { getPracticePIDs, getPracticePIDById, createPracticePID, updatePracticePID, deletePracticePID }
