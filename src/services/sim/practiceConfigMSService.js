/**
 * Practice Configuration Management Strategy Service
 * CRUD operations for practice Config MS (sim schema)
 */

import { simDb } from '../supabase/supabaseClient'

async function getCurrentUserId() {
  const { data: { user: authUser } } = await simDb.auth.getUser()
  if (!authUser) throw new Error('User not authenticated')
  const { data: userData, error } = await simDb.from('users').select('id').eq('auth_user_id', authUser.id).single()
  if (error || !userData) throw new Error('User not found')
  return userData.id
}

export async function getPracticeConfigMS(projectId) {
  try {
    const { data, error } = await simDb.from('practice_configuration_management_strategies').select('*').eq('practice_project_id', projectId).eq('is_deleted', false).maybeSingle()
    if (error) throw error
    return { success: true, data }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

export async function createPracticeConfigMS(projectId, configMsData) {
  try {
    const userId = await getCurrentUserId()
    const { data, error } = await simDb.from('practice_configuration_management_strategies').insert({ ...configMsData, practice_project_id: projectId, user_id: userId, created_by: userId }).select().single()
    if (error) throw error
    return { success: true, data }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

export async function updatePracticeConfigMS(configMsId, updates) {
  try {
    const userId = await getCurrentUserId()
    const { data, error } = await simDb.from('practice_configuration_management_strategies').update({ ...updates, updated_at: new Date().toISOString() }).eq('id', configMsId).eq('user_id', userId).select().single()
    if (error) throw error
    return { success: true, data }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

export async function getPracticeConfigItems(projectId, filters = {}) {
  try {
    let query = simDb.from('practice_configuration_item_records').select('*').eq('practice_project_id', projectId).eq('is_deleted', false)
    if (filters.status) query = query.eq('status', filters.status)
    const { data, error } = await query.order('created_at', { ascending: false })
    if (error) throw error
    return { success: true, data: data || [] }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

export async function createPracticeConfigItem(projectId, itemData) {
  try {
    const userId = await getCurrentUserId()
    const { data, error } = await simDb.from('practice_configuration_item_records').insert({ ...itemData, practice_project_id: projectId, user_id: userId, created_by: userId }).select().single()
    if (error) throw error
    return { success: true, data }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

export default { getPracticeConfigMS, createPracticeConfigMS, updatePracticeConfigMS, getPracticeConfigItems, createPracticeConfigItem }
