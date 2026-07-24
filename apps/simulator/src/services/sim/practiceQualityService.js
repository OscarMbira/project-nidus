/**
 * Practice Quality Service
 * CRUD operations for practice quality register (sim schema)
 */

import { simDb } from '../supabase/supabaseClient'

async function getCurrentUserId() {
  const { data: { user: authUser } } = await simDb.auth.getUser()
  if (!authUser) throw new Error('User not authenticated')
  const { data: userData, error } = await simDb.from('users').select('id').eq('auth_user_id', authUser.id).single()
  if (error || !userData) throw new Error('User not found')
  return userData.id
}

export async function getPracticeQualityRegister(projectId, filters = {}) {
  try {
    let query = simDb.from('practice_quality_register').select('*').eq('practice_project_id', projectId).eq('is_deleted', false)
    if (filters.quality_status) query = query.eq('quality_status', filters.quality_status)
    if (filters.search) query = query.or(`product_name.ilike.%${filters.search}%,product_reference.ilike.%${filters.search}%`)
    const { data, error } = await query.order('created_at', { ascending: false })
    if (error) throw error
    return { success: true, data: data || [] }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

export async function getPracticeQualityActivityById(activityId) {
  try {
    const { data, error } = await simDb.from('practice_quality_activities').select('*').eq('id', activityId).single()
    if (error) throw error
    return { success: true, data }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

export async function createPracticeQualityItem(projectId, itemData) {
  try {
    const userId = await getCurrentUserId()
    const { data, error } = await simDb.from('practice_quality_register').insert({ ...itemData, practice_project_id: projectId, user_id: userId, created_by: userId, updated_by: userId }).select().single()
    if (error) throw error
    return { success: true, data }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

export async function updatePracticeQualityItem(itemId, updates) {
  try {
    const userId = await getCurrentUserId()
    const { data, error } = await simDb.from('practice_quality_register').update({ ...updates, updated_by: userId, updated_at: new Date().toISOString() }).eq('id', itemId).eq('user_id', userId).select().single()
    if (error) throw error
    return { success: true, data }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

export async function deletePracticeQualityItem(itemId) {
  try {
    const userId = await getCurrentUserId()
    const { data, error } = await simDb.from('practice_quality_register').update({ is_deleted: true, deleted_at: new Date().toISOString(), deleted_by: userId }).eq('id', itemId).eq('user_id', userId).select().single()
    if (error) throw error
    return { success: true, data }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

// ========== Practice Quality Reviews ==========
export async function getPracticeQualityReviews(filters = {}) {
  try {
    let query = simDb.from('practice_quality_reviews').select('*').eq('is_deleted', false)
    if (filters.practice_project_id) query = query.eq('practice_project_id', filters.practice_project_id)
    if (filters.review_status) query = query.eq('review_status', filters.review_status)
    const { data, error } = await query.order('planned_date', { ascending: false })
    if (error) throw error
    return { success: true, data: data || [] }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

export async function createPracticeQualityReview(projectId, reviewData) {
  try {
    const userId = await getCurrentUserId()
    const { data, error } = await simDb.from('practice_quality_reviews').insert({
      ...reviewData,
      practice_project_id: projectId,
      user_id: userId,
      created_by: userId,
      updated_by: userId
    }).select().single()
    if (error) throw error
    return { success: true, data }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

export async function updatePracticeQualityReview(reviewId, updates) {
  try {
    const userId = await getCurrentUserId()
    const { data, error } = await simDb.from('practice_quality_reviews').update({
      ...updates,
      updated_by: userId,
      updated_at: new Date().toISOString()
    }).eq('id', reviewId).eq('user_id', userId).select().single()
    if (error) throw error
    return { success: true, data }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

export async function deletePracticeQualityReview(reviewId) {
  try {
    const userId = await getCurrentUserId()
    const { data, error } = await simDb.from('practice_quality_reviews').update({
      is_deleted: true,
      deleted_at: new Date().toISOString(),
      deleted_by: userId
    }).eq('id', reviewId).eq('user_id', userId).select().single()
    if (error) throw error
    return { success: true, data }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

// ========== Practice Quality Inspections ==========
export async function getPracticeQualityInspections(filters = {}) {
  try {
    let query = simDb.from('practice_quality_inspections').select('*').eq('is_deleted', false)
    if (filters.practice_project_id) query = query.eq('practice_project_id', filters.practice_project_id)
    if (filters.inspection_result) query = query.eq('inspection_result', filters.inspection_result)
    const { data, error } = await query.order('inspection_date', { ascending: false })
    if (error) throw error
    return { success: true, data: data || [] }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

export async function createPracticeQualityInspection(projectId, inspectionData) {
  try {
    const userId = await getCurrentUserId()
    const { data, error } = await simDb.from('practice_quality_inspections').insert({
      ...inspectionData,
      practice_project_id: projectId,
      user_id: userId,
      created_by: userId,
      updated_by: userId
    }).select().single()
    if (error) throw error
    return { success: true, data }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

export async function updatePracticeQualityInspection(inspectionId, updates) {
  try {
    const userId = await getCurrentUserId()
    const { data, error } = await simDb.from('practice_quality_inspections').update({
      ...updates,
      updated_by: userId,
      updated_at: new Date().toISOString()
    }).eq('id', inspectionId).eq('user_id', userId).select().single()
    if (error) throw error
    return { success: true, data }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

export async function deletePracticeQualityInspection(inspectionId) {
  try {
    const userId = await getCurrentUserId()
    const { data, error } = await simDb.from('practice_quality_inspections').update({
      is_deleted: true,
      deleted_at: new Date().toISOString(),
      deleted_by: userId
    }).eq('id', inspectionId).eq('user_id', userId).select().single()
    if (error) throw error
    return { success: true, data }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

export default {
  getPracticeQualityRegister,
  getPracticeQualityActivityById,
  createPracticeQualityItem,
  updatePracticeQualityItem,
  deletePracticeQualityItem,
  getPracticeQualityReviews,
  createPracticeQualityReview,
  updatePracticeQualityReview,
  deletePracticeQualityReview,
  getPracticeQualityInspections,
  createPracticeQualityInspection,
  updatePracticeQualityInspection,
  deletePracticeQualityInspection
}
