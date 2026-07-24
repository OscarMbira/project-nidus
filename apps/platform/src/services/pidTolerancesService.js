/**
 * PID Tolerances Service
 * API functions for managing PID tolerances
 */

import { supabase } from './supabaseClient'

export async function addTolerance(pidId, toleranceData) {
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

    const insertData = {
      ...toleranceData,
      pid_id: pidId,
      created_by: userData.id,
      updated_by: userData.id
    }

    const { data, error } = await supabase
      .from('pid_tolerances')
      .insert(insertData)
      .select('*')
      .single()

    if (error) throw error
    return { success: true, data }
  } catch (error) {
    console.error('Error adding tolerance:', error)
    return { success: false, error: error.message }
  }
}

export async function updateTolerance(toleranceId, updates) {
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
      .from('pid_tolerances')
      .update(updateData)
      .eq('id', toleranceId)
      .select('*')
      .single()

    if (error) throw error
    return { success: true, data }
  } catch (error) {
    console.error('Error updating tolerance:', error)
    return { success: false, error: error.message }
  }
}

export async function deleteTolerance(toleranceId) {
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
      .from('pid_tolerances')
      .update({
        is_deleted: true,
        deleted_at: new Date().toISOString(),
        deleted_by: userData.id
      })
      .eq('id', toleranceId)

    if (error) throw error
    return { success: true }
  } catch (error) {
    console.error('Error deleting tolerance:', error)
    return { success: false, error: error.message }
  }
}

export async function getTolerances(pidId) {
  try {
    const { data, error } = await supabase
      .from('pid_tolerances')
      .select('*')
      .eq('pid_id', pidId)
      .eq('is_deleted', false)
      .order('display_order', { ascending: true })

    if (error) throw error
    return { success: true, data: data || [] }
  } catch (error) {
    console.error('Error fetching tolerances:', error)
    return { success: false, error: error.message }
  }
}
