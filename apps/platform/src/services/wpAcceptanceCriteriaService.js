/**
 * Work Package Acceptance Criteria Service
 * API functions for managing Work Package acceptance criteria
 */

import { supabase } from './supabaseClient'

export async function addAcceptanceCriterion(wpId, criterionData) {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    const { data: userData } = await supabase
      .from('users')
      .select('id')
      .eq('auth_user_id', user.id)
      .eq('is_deleted', false)
      .single()

    if (!userData) throw new Error('User not found')

    // Get next criteria number
    const { data: existing } = await supabase
      .from('wp_acceptance_criteria')
      .select('criteria_number')
      .eq('work_package_id', wpId)
      .eq('is_deleted', false)
      .order('criteria_number', { ascending: false })
      .limit(1)

    const nextNumber = existing && existing.length > 0
      ? existing[0].criteria_number + 1
      : 1

    const insertData = {
      ...criterionData,
      work_package_id: wpId,
      criteria_number: criterionData.criteria_number ?? nextNumber,
      display_order: criterionData.display_order ?? nextNumber - 1,
      created_by: userData.id,
      updated_by: userData.id
    }

    const { data, error } = await supabase
      .from('wp_acceptance_criteria')
      .insert(insertData)
      .select('*')
      .single()

    if (error) throw error
    return { success: true, data }
  } catch (error) {
    console.error('Error adding acceptance criterion:', error)
    return { success: false, error: error.message }
  }
}

export async function updateAcceptanceCriterion(criterionId, updates) {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    const { data: userData } = await supabase
      .from('users')
      .select('id')
      .eq('auth_user_id', user.id)
      .eq('is_deleted', false)
      .single()

    if (!userData) throw new Error('User not found')

    const updateData = {
      ...updates,
      updated_by: userData.id,
      updated_at: new Date().toISOString()
    }

    const { data, error } = await supabase
      .from('wp_acceptance_criteria')
      .update(updateData)
      .eq('id', criterionId)
      .select('*')
      .single()

    if (error) throw error
    return { success: true, data }
  } catch (error) {
    console.error('Error updating acceptance criterion:', error)
    return { success: false, error: error.message }
  }
}

export async function deleteAcceptanceCriterion(criterionId) {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    const { data: userData } = await supabase
      .from('users')
      .select('id')
      .eq('auth_user_id', user.id)
      .eq('is_deleted', false)
      .single()

    if (!userData) throw new Error('User not found')

    const { error } = await supabase
      .from('wp_acceptance_criteria')
      .update({
        is_deleted: true,
        deleted_at: new Date().toISOString(),
        deleted_by: userData.id
      })
      .eq('id', criterionId)

    if (error) throw error
    return { success: true }
  } catch (error) {
    console.error('Error deleting acceptance criterion:', error)
    return { success: false, error: error.message }
  }
}

export async function getAcceptanceCriteria(wpId) {
  try {
    const { data, error } = await supabase
      .from('wp_acceptance_criteria')
      .select('*')
      .eq('work_package_id', wpId)
      .eq('is_deleted', false)
      .order('display_order', { ascending: true })
      .order('criteria_number', { ascending: true })

    if (error) throw error
    return { success: true, data: data || [] }
  } catch (error) {
    console.error('Error fetching acceptance criteria:', error)
    return { success: false, error: error.message }
  }
}

export async function updateAcceptanceStatus(criterionId, status, acceptanceDate = null, acceptanceResult = null) {
  try {
    const updateData = {
      acceptance_status: status,
      updated_at: new Date().toISOString()
    }

    if (acceptanceDate) {
      updateData.acceptance_date = acceptanceDate
    }

    if (acceptanceResult) {
      updateData.acceptance_result = acceptanceResult
    }

    const { data, error } = await supabase
      .from('wp_acceptance_criteria')
      .update(updateData)
      .eq('id', criterionId)
      .select()
      .single()

    if (error) throw error
    return { success: true, data }
  } catch (error) {
    console.error('Error updating acceptance status:', error)
    return { success: false, error: error.message }
  }
}
