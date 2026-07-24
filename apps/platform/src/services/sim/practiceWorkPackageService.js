/**
 * Practice Work Package Service
 * CRUD operations for practice work packages (sim schema)
 */

import { simDb } from '../supabase/supabaseClient'

async function getCurrentUserId() {
  const { data: { user: authUser } } = await simDb.auth.getUser()
  if (!authUser) throw new Error('User not authenticated')
  const { data: userData, error } = await simDb.from('users').select('id').eq('auth_user_id', authUser.id).single()
  if (error || !userData) throw new Error('User not found')
  return userData.id
}

export async function getPracticeWorkPackages(projectId, filters = {}) {
  try {
    let query = simDb.from('practice_work_packages').select('*').eq('practice_project_id', projectId).eq('is_deleted', false)
    if (filters.status) query = query.eq('status', filters.status)
    const { data, error } = await query.order('created_at', { ascending: false })
    if (error) throw error
    return { success: true, data: data || [] }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

export async function getPracticeWorkPackageById(wpId) {
  try {
    const { data, error } = await simDb.from('practice_work_packages').select('*').eq('id', wpId).eq('is_deleted', false).single()
    if (error) throw error
    return { success: true, data }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

export async function createPracticeWorkPackage(projectId, wpData) {
  try {
    const userId = await getCurrentUserId()
    const { data, error } = await simDb.from('practice_work_packages').insert({ ...wpData, practice_project_id: projectId, user_id: userId, created_by: userId, updated_by: userId }).select().single()
    if (error) throw error
    return { success: true, data }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

export async function updatePracticeWorkPackage(wpId, updates) {
  try {
    const userId = await getCurrentUserId()
    const { data, error } = await simDb.from('practice_work_packages').update({ ...updates, updated_by: userId, updated_at: new Date().toISOString() }).eq('id', wpId).eq('user_id', userId).select().single()
    if (error) throw error
    return { success: true, data }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

export async function deletePracticeWorkPackage(wpId) {
  try {
    const userId = await getCurrentUserId()
    const { data, error } = await simDb.from('practice_work_packages').update({ is_deleted: true, deleted_at: new Date().toISOString(), deleted_by: userId }).eq('id', wpId).eq('user_id', userId).select().single()
    if (error) throw error
    return { success: true, data }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

export default { getPracticeWorkPackages, getPracticeWorkPackageById, createPracticeWorkPackage, updatePracticeWorkPackage, deletePracticeWorkPackage }
