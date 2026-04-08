/**
 * Practice Benefits Review Plan Service
 * CRUD operations for practice benefits review plans (sim schema)
 */

import { simDb } from '../supabase/supabaseClient'

async function getCurrentUserId() {
  const { data: { user: authUser } } = await simDb.auth.getUser()
  if (!authUser) throw new Error('User not authenticated')
  const { data: userData, error } = await simDb.from('users').select('id').eq('auth_user_id', authUser.id).single()
  if (error || !userData) throw new Error('User not found')
  return userData.id
}

/**
 * Get all practice benefits review plans (no projectId required — for PMO Simulator list).
 */
export async function getAllPracticeBenefitsReviewPlans(filters = {}) {
  try {
    let query = simDb
      .from('practice_benefits_review_plans')
      .select('*, practice_projects(project_name)')
      .eq('is_deleted', false)
    if (filters.status) query = query.eq('status', filters.status)
    if (filters.projectId) query = query.eq('practice_project_id', filters.projectId)
    const { data, error } = await query.order('created_at', { ascending: false })
    if (error) throw error
    return { success: true, data: data || [] }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

export async function getPracticeBenefitsReviewPlan(projectId) {
  try {
    const { data, error } = await simDb.from('practice_benefits_review_plans').select('*').eq('practice_project_id', projectId).eq('is_deleted', false).maybeSingle()
    if (error) throw error
    return { success: true, data }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

export async function getPracticeBenefitsReviewPlanById(planId) {
  try {
    const { data, error } = await simDb
      .from('practice_benefits_review_plans')
      .select('*, practice_projects(project_name)')
      .eq('id', planId)
      .eq('is_deleted', false)
      .single()
    if (error) throw error
    return { success: true, data }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

export async function createPracticeBenefitsReviewPlan(projectId, planData) {
  try {
    const userId = await getCurrentUserId()
    const { data, error } = await simDb.from('practice_benefits_review_plans').insert({ ...planData, practice_project_id: projectId, user_id: userId, created_by: userId }).select().single()
    if (error) throw error
    return { success: true, data }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

export async function updatePracticeBenefitsReviewPlan(planId, updates) {
  try {
    const userId = await getCurrentUserId()
    const { data, error } = await simDb.from('practice_benefits_review_plans').update({ ...updates, updated_at: new Date().toISOString() }).eq('id', planId).select().single()
    if (error) throw error
    return { success: true, data }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

export async function deletePracticeBenefitsReviewPlan(planId) {
  try {
    const userId = await getCurrentUserId()
    const { data, error } = await simDb
      .from('practice_benefits_review_plans')
      .update({ is_deleted: true, deleted_at: new Date().toISOString(), deleted_by: userId })
      .eq('id', planId)
      .select()
      .single()
    if (error) throw error
    return { success: true, data }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

export default {
  getAllPracticeBenefitsReviewPlans,
  getPracticeBenefitsReviewPlan,
  getPracticeBenefitsReviewPlanById,
  createPracticeBenefitsReviewPlan,
  updatePracticeBenefitsReviewPlan,
  deletePracticeBenefitsReviewPlan,
}
