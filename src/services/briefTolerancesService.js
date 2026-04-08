/**
 * Brief Tolerances Service
 * Manages project tolerances for briefs
 */

import { supabase } from './supabaseClient'

export async function getTolerances(briefId) {
  try {
    const { data, error } = await supabase
      .from('brief_tolerances')
      .select('*')
      .eq('brief_id', briefId)
      .order('display_order', { ascending: true })

    if (error) throw error
    return data || []
  } catch (error) {
    console.error('Error fetching tolerances:', error)
    throw error
  }
}

export async function addTolerance(briefId, toleranceData) {
  try {
    const { data, error } = await supabase
      .from('brief_tolerances')
      .insert({
        brief_id: briefId,
        ...toleranceData
      })
      .select()
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error adding tolerance:', error)
    throw error
  }
}

export async function updateTolerance(toleranceId, updates) {
  try {
    const { data, error } = await supabase
      .from('brief_tolerances')
      .update(updates)
      .eq('id', toleranceId)
      .select()
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error updating tolerance:', error)
    throw error
  }
}

export async function deleteTolerance(toleranceId) {
  try {
    const { error } = await supabase
      .from('brief_tolerances')
      .delete()
      .eq('id', toleranceId)

    if (error) throw error
  } catch (error) {
    console.error('Error deleting tolerance:', error)
    throw error
  }
}

export default {
  getTolerances,
  addTolerance,
  updateTolerance,
  deleteTolerance
}
