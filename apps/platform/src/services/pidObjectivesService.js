/**
 * PID Objectives Service
 * API functions for managing PID objectives
 */

import { supabase } from './supabaseClient'

export async function addObjective(pidId, objectiveData) {
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
      ...objectiveData,
      pid_id: pidId,
      created_by: userData.id,
      updated_by: userData.id
    }

    const { data, error } = await supabase
      .from('pid_objectives')
      .insert(insertData)
      .select('*')
      .single()

    if (error) throw error
    return { success: true, data }
  } catch (error) {
    console.error('Error adding objective:', error)
    return { success: false, error: error.message }
  }
}

export async function updateObjective(objectiveId, updates) {
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
      .from('pid_objectives')
      .update(updateData)
      .eq('id', objectiveId)
      .select('*')
      .single()

    if (error) throw error
    return { success: true, data }
  } catch (error) {
    console.error('Error updating objective:', error)
    return { success: false, error: error.message }
  }
}

export async function deleteObjective(objectiveId) {
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
      .from('pid_objectives')
      .update({
        is_deleted: true,
        deleted_at: new Date().toISOString(),
        deleted_by: userData.id
      })
      .eq('id', objectiveId)

    if (error) throw error
    return { success: true }
  } catch (error) {
    console.error('Error deleting objective:', error)
    return { success: false, error: error.message }
  }
}

export async function getObjectives(pidId) {
  try {
    const { data, error } = await supabase
      .from('pid_objectives')
      .select('*')
      .eq('pid_id', pidId)
      .eq('is_deleted', false)
      .order('display_order', { ascending: true })
      .order('objective_number', { ascending: true })

    if (error) throw error
    return { success: true, data: data || [] }
  } catch (error) {
    console.error('Error fetching objectives:', error)
    return { success: false, error: error.message }
  }
}
