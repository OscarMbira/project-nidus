/**
 * PID Dependencies Service
 * API functions for managing PID dependencies
 */

import { supabase } from './supabaseClient'

export async function addDependency(pidId, dependencyData) {
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
      .from('pid_dependencies')
      .select('display_order')
      .eq('pid_id', pidId)
      .eq('is_deleted', false)
      .order('display_order', { ascending: false })
      .limit(1)

    const nextOrder = existing && existing.length > 0
      ? existing[0].display_order + 1
      : 0

    const insertData = {
      ...dependencyData,
      pid_id: pidId,
      display_order: dependencyData.display_order ?? nextOrder,
      created_by: userData.id,
      updated_by: userData.id
    }

    const { data, error } = await supabase
      .from('pid_dependencies')
      .insert(insertData)
      .select('*')
      .single()

    if (error) throw error
    return { success: true, data }
  } catch (error) {
    console.error('Error adding dependency:', error)
    return { success: false, error: error.message }
  }
}

export async function updateDependency(dependencyId, updates) {
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
      .from('pid_dependencies')
      .update(updateData)
      .eq('id', dependencyId)
      .select('*')
      .single()

    if (error) throw error
    return { success: true, data }
  } catch (error) {
    console.error('Error updating dependency:', error)
    return { success: false, error: error.message }
  }
}

export async function deleteDependency(dependencyId) {
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
      .from('pid_dependencies')
      .update({
        is_deleted: true,
        deleted_at: new Date().toISOString(),
        deleted_by: userData.id
      })
      .eq('id', dependencyId)

    if (error) throw error
    return { success: true }
  } catch (error) {
    console.error('Error deleting dependency:', error)
    return { success: false, error: error.message }
  }
}

export async function getDependencies(pidId) {
  try {
    const { data, error } = await supabase
      .from('pid_dependencies')
      .select('*')
      .eq('pid_id', pidId)
      .eq('is_deleted', false)
      .order('display_order', { ascending: true })

    if (error) throw error
    return { success: true, data: data || [] }
  } catch (error) {
    console.error('Error fetching dependencies:', error)
    return { success: false, error: error.message }
  }
}
