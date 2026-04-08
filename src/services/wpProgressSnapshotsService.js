/**
 * Work Package Progress Snapshots Service
 * API functions for managing Work Package progress snapshots
 */

import { supabase } from './supabaseClient'

export async function createProgressSnapshot(wpId, snapshotDate, progressData, userId) {
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
      .from('wp_progress_snapshots')
      .insert({
        work_package_id: wpId,
        snapshot_date: snapshotDate || new Date().toISOString().split('T')[0],
        progress_percentage: progressData.progress_percentage || 0,
        progress_indicator: progressData.progress_indicator,
        effort_completed: progressData.effort_completed,
        cost_incurred: progressData.cost_incurred,
        schedule_variance_days: progressData.schedule_variance_days,
        progress_notes: progressData.progress_notes,
        created_by: userId || userData.id
      })
      .select(`
        *,
        created_by_user:created_by(id, full_name, email)
      `)
      .single()

    if (error) throw error
    return { success: true, data }
  } catch (error) {
    console.error('Error creating progress snapshot:', error)
    return { success: false, error: error.message }
  }
}

export async function getProgressSnapshots(wpId) {
  try {
    const { data, error } = await supabase
      .from('wp_progress_snapshots')
      .select(`
        *,
        created_by_user:created_by(id, full_name, email)
      `)
      .eq('work_package_id', wpId)
      .order('snapshot_date', { ascending: false })
      .order('created_at', { ascending: false })

    if (error) throw error
    return { success: true, data: data || [] }
  } catch (error) {
    console.error('Error fetching progress snapshots:', error)
    return { success: false, error: error.message }
  }
}

export async function getProgressTrend(wpId, startDate, endDate) {
  try {
    const { data, error } = await supabase
      .from('wp_progress_snapshots')
      .select('*')
      .eq('work_package_id', wpId)
      .gte('snapshot_date', startDate)
      .lte('snapshot_date', endDate)
      .order('snapshot_date', { ascending: true })

    if (error) throw error
    return { success: true, data: data || [] }
  } catch (error) {
    console.error('Error fetching progress trend:', error)
    return { success: false, error: error.message }
  }
}
