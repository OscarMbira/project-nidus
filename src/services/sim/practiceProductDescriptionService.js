/**
 * Practice Product Description Service
 * CRUD operations for practice product descriptions (sim schema)
 */

import { simDb } from '../supabase/supabaseClient'

async function getCurrentUserId() {
  const { data: { user: authUser } } = await simDb.auth.getUser()
  if (!authUser) throw new Error('User not authenticated')
  const { data: userData, error } = await simDb.from('users').select('id').eq('auth_user_id', authUser.id).single()
  if (error || !userData) throw new Error('User not found')
  return userData.id
}

export async function getPracticeProductDescriptions(projectId, filters = {}) {
  try {
    let query = simDb.from('practice_product_descriptions').select('*').eq('practice_project_id', projectId).eq('is_deleted', false)
    if (filters.status) query = query.eq('status', filters.status)
    const { data, error } = await query.order('created_at', { ascending: false })
    if (error) throw error
    return { success: true, data: data || [] }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

export async function getPracticePPD(projectId) {
  try {
    const { data, error } = await simDb.from('practice_project_product_descriptions').select('*').eq('practice_project_id', projectId).eq('is_deleted', false).maybeSingle()
    if (error) throw error
    return { success: true, data }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

export async function getPracticePSA(projectId, filters = {}) {
  try {
    let query = simDb.from('practice_product_status_accounts').select('*').eq('practice_project_id', projectId).eq('is_deleted', false)
    if (filters.report_date) query = query.eq('report_date', filters.report_date)
    const { data, error } = await query.order('report_date', { ascending: false })
    if (error) throw error
    return { success: true, data: data || [] }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

export async function createPracticeProductDescription(projectId, pdData) {
  try {
    const userId = await getCurrentUserId()
    const { data, error } = await simDb.from('practice_product_descriptions').insert({ ...pdData, practice_project_id: projectId, user_id: userId, created_by: userId }).select().single()
    if (error) throw error
    return { success: true, data }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

export async function createPracticePPD(projectId, ppdData) {
  try {
    const userId = await getCurrentUserId()
    const { data, error } = await simDb.from('practice_project_product_descriptions').insert({ ...ppdData, practice_project_id: projectId, user_id: userId, created_by: userId }).select().single()
    if (error) throw error
    return { success: true, data }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

export async function createPracticePSA(projectId, psaData) {
  try {
    const userId = await getCurrentUserId()
    const { data, error } = await simDb.from('practice_product_status_accounts').insert({ ...psaData, practice_project_id: projectId, user_id: userId, created_by: userId }).select().single()
    if (error) throw error
    return { success: true, data }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

export default { getPracticeProductDescriptions, getPracticePPD, getPracticePSA, createPracticeProductDescription, createPracticePPD, createPracticePSA }
