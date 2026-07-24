/**
 * PID Interfaces Service
 * API functions for managing PID interfaces
 */

import { supabase } from './supabaseClient'

export async function addInterface(pidId, interfaceData) {
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
      .from('pid_interfaces')
      .select('display_order')
      .eq('pid_id', pidId)
      .eq('is_deleted', false)
      .order('display_order', { ascending: false })
      .limit(1)

    const nextOrder = existing && existing.length > 0
      ? existing[0].display_order + 1
      : 0

    const insertData = {
      ...interfaceData,
      pid_id: pidId,
      display_order: interfaceData.display_order ?? nextOrder,
      created_by: userData.id
    }

    const { data, error } = await supabase
      .from('pid_interfaces')
      .insert(insertData)
      .select('*')
      .single()

    if (error) throw error
    return { success: true, data }
  } catch (error) {
    console.error('Error adding interface:', error)
    return { success: false, error: error.message }
  }
}

export async function updateInterface(interfaceId, updates) {
  try {
    const { data, error } = await supabase
      .from('pid_interfaces')
      .update(updates)
      .eq('id', interfaceId)
      .select('*')
      .single()

    if (error) throw error
    return { success: true, data }
  } catch (error) {
    console.error('Error updating interface:', error)
    return { success: false, error: error.message }
  }
}

export async function deleteInterface(interfaceId) {
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
      .from('pid_interfaces')
      .update({
        is_deleted: true,
        deleted_at: new Date().toISOString(),
        deleted_by: userData.id
      })
      .eq('id', interfaceId)

    if (error) throw error
    return { success: true }
  } catch (error) {
    console.error('Error deleting interface:', error)
    return { success: false, error: error.message }
  }
}

export async function getInterfaces(pidId) {
  try {
    const { data, error } = await supabase
      .from('pid_interfaces')
      .select('*')
      .eq('pid_id', pidId)
      .eq('is_deleted', false)
      .order('display_order', { ascending: true })

    if (error) throw error
    return { success: true, data: data || [] }
  } catch (error) {
    console.error('Error fetching interfaces:', error)
    return { success: false, error: error.message }
  }
}
