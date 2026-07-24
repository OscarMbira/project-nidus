/**
 * PID Reporting Arrangements Service
 * API functions for managing PID reporting arrangements
 */

import { supabase } from './supabaseClient'

export async function addReportingArrangement(pidId, arrangementData) {
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

    // Get next display order
    const { data: existing } = await supabase
      .from('pid_reporting_arrangements')
      .select('display_order')
      .eq('pid_id', pidId)
      .eq('is_deleted', false)
      .order('display_order', { ascending: false })
      .limit(1)

    const nextOrder = existing && existing.length > 0
      ? existing[0].display_order + 1
      : 0

    const insertData = {
      ...arrangementData,
      pid_id: pidId,
      display_order: arrangementData.display_order ?? nextOrder,
      created_by: userData.id,
      updated_by: userData.id
    }

    const { data, error } = await supabase
      .from('pid_reporting_arrangements')
      .insert(insertData)
      .select(`
        *,
        report_owner_user:report_owner(id, full_name, email)
      `)
      .single()

    if (error) throw error
    return { success: true, data }
  } catch (error) {
    console.error('Error adding reporting arrangement:', error)
    return { success: false, error: error.message }
  }
}

export async function updateReportingArrangement(arrangementId, updates) {
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
      .from('pid_reporting_arrangements')
      .update(updateData)
      .eq('id', arrangementId)
      .select(`
        *,
        report_owner_user:report_owner(id, full_name, email)
      `)
      .single()

    if (error) throw error
    return { success: true, data }
  } catch (error) {
    console.error('Error updating reporting arrangement:', error)
    return { success: false, error: error.message }
  }
}

export async function deleteReportingArrangement(arrangementId) {
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
      .from('pid_reporting_arrangements')
      .update({
        is_deleted: true,
        deleted_at: new Date().toISOString(),
        deleted_by: userData.id
      })
      .eq('id', arrangementId)

    if (error) throw error
    return { success: true }
  } catch (error) {
    console.error('Error deleting reporting arrangement:', error)
    return { success: false, error: error.message }
  }
}

export async function getReportingArrangements(pidId) {
  try {
    const { data, error } = await supabase
      .from('pid_reporting_arrangements')
      .select(`
        *,
        report_owner_user:report_owner(id, full_name, email)
      `)
      .eq('pid_id', pidId)
      .eq('is_deleted', false)
      .order('display_order', { ascending: true })

    if (error) throw error
    return { success: true, data: data || [] }
  } catch (error) {
    console.error('Error fetching reporting arrangements:', error)
    return { success: false, error: error.message }
  }
}
