/**
 * Work Package Status History Service
 * API functions for managing Work Package status history
 */

import { supabase } from './supabaseClient'

export async function getStatusHistory(wpId) {
  try {
    const { data, error } = await supabase
      .from('wp_status_history')
      .select(`
        *,
        changed_by:status_changed_by(id, full_name, email)
      `)
      .eq('work_package_id', wpId)
      .order('status_change_date', { ascending: false })
      .order('created_at', { ascending: false })

    if (error) throw error
    return { success: true, data: data || [] }
  } catch (error) {
    console.error('Error fetching status history:', error)
    return { success: false, error: error.message }
  }
}

export async function getStatusHistoryByDateRange(wpId, startDate, endDate) {
  try {
    const { data, error } = await supabase
      .from('wp_status_history')
      .select(`
        *,
        changed_by:status_changed_by(id, full_name, email)
      `)
      .eq('work_package_id', wpId)
      .gte('status_change_date', startDate)
      .lte('status_change_date', endDate)
      .order('status_change_date', { ascending: false })
      .order('created_at', { ascending: false })

    if (error) throw error
    return { success: true, data: data || [] }
  } catch (error) {
    console.error('Error fetching status history by date range:', error)
    return { success: false, error: error.message }
  }
}

export async function addStatusChange(wpId, previousStatus, newStatus, reason, userId) {
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

    const { data, error } = await supabase
      .from('wp_status_history')
      .insert({
        work_package_id: wpId,
        previous_status: previousStatus,
        new_status: newStatus,
        status_change_date: new Date().toISOString().split('T')[0],
        status_changed_by: userId || userData.id,
        status_change_reason: reason
      })
      .select(`
        *,
        changed_by:status_changed_by(id, full_name, email)
      `)
      .single()

    if (error) throw error
    return { success: true, data }
  } catch (error) {
    console.error('Error adding status change:', error)
    return { success: false, error: error.message }
  }
}
