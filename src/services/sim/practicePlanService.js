/**
 * Practice Plan Service
 * CRUD operations for practice project plans (sim schema)
 */

import { simDb } from '../supabase/supabaseClient'

async function getCurrentUserId() {
  const { data: { user: authUser } } = await simDb.auth.getUser()
  if (!authUser) throw new Error('User not authenticated')
  const { data: userData, error } = await simDb.from('users').select('id').eq('auth_user_id', authUser.id).single()
  if (error || !userData) throw new Error('User not found')
  return userData.id
}

export async function getPracticePlan(projectId) {
  try {
    const { data, error } = await simDb.from('practice_project_plans').select('*').eq('practice_project_id', projectId).eq('is_deleted', false).maybeSingle()
    if (error) throw error
    return { success: true, data }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

export async function createPracticePlan(projectId, planData) {
  try {
    const userId = await getCurrentUserId()
    const { data, error } = await simDb.from('practice_project_plans').insert({ ...planData, practice_project_id: projectId, user_id: userId, created_by: userId, updated_by: userId }).select().single()
    if (error) throw error
    return { success: true, data }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

export async function updatePracticePlan(planId, updates) {
  try {
    const userId = await getCurrentUserId()
    const { data, error } = await simDb.from('practice_project_plans').update({ ...updates, updated_by: userId, updated_at: new Date().toISOString() }).eq('id', planId).eq('user_id', userId).select().single()
    if (error) throw error
    return { success: true, data }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

export async function getPracticePlanMilestones(planId) {
  try {
    const { data, error } = await simDb.from('practice_plan_milestones').select('*').eq('practice_plan_id', planId).order('display_order', { ascending: true })
    if (error) throw error
    return { success: true, data: data || [] }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

export async function getPracticePlanResources(planId) {
  try {
    const { data, error } = await simDb.from('practice_plan_resources').select('*').eq('practice_plan_id', planId).order('display_order', { ascending: true })
    if (error) throw error
    return { success: true, data: data || [] }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

export default { getPracticePlan, createPracticePlan, updatePracticePlan, getPracticePlanMilestones, getPracticePlanResources }
