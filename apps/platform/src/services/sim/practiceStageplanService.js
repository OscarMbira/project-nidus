/**
 * Practice Stage Plan Service — CRUD for sim.practice_stage_plans
 */

import { simDb } from '../supabase/supabaseClient'

async function getCurrentUserId() {
  const { data: { user: authUser } } = await simDb.auth.getUser()
  if (!authUser) throw new Error('User not authenticated')
  const { data: userData, error } = await simDb
    .from('users')
    .select('id')
    .eq('auth_user_id', authUser.id)
    .single()
  if (error || !userData) throw new Error('User not found')
  return userData.id
}

export async function getPracticeStagePlansByProject(projectId) {
  try {
    const { data, error } = await simDb
      .from('practice_stage_plans')
      .select('*')
      .eq('practice_project_id', projectId)
      .eq('is_deleted', false)
      .order('stage_number', { ascending: true })
    if (error) throw error
    return { success: true, data: data || [] }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

export async function createPracticeStagePlan(projectId, stageNumber, planData) {
  try {
    const userId = await getCurrentUserId()

    const { data: existing } = await simDb
      .from('practice_stage_plans')
      .select('id')
      .eq('practice_project_id', projectId)
      .eq('stage_number', stageNumber)
      .eq('is_deleted', false)
      .maybeSingle()

    if (existing) {
      return { success: false, error: `A stage plan already exists for stage ${stageNumber}` }
    }

    if (!planData.practice_plan_id) {
      return { success: false, error: 'Project plan is required before creating a stage plan' }
    }

    const { data, error } = await simDb
      .from('practice_stage_plans')
      .insert({
        ...planData,
        practice_project_id: projectId,
        stage_number: stageNumber,
        user_id: userId,
        created_by: userId,
        updated_by: userId,
        status: planData.status || 'draft',
        version: planData.version || '1.0',
      })
      .select()
      .single()

    if (error) throw error
    return { success: true, data }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

export async function updatePracticeStagePlan(planId, updates) {
  try {
    const userId = await getCurrentUserId()
    const { data, error } = await simDb
      .from('practice_stage_plans')
      .update({ ...updates, updated_by: userId, updated_at: new Date().toISOString() })
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
  getPracticeStagePlansByProject,
  createPracticeStagePlan,
  updatePracticeStagePlan,
}
