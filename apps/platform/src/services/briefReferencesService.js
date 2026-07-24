/**
 * Brief References Service
 * Manages references for project briefs
 */

import { supabase } from './supabaseClient'

export async function getReferences(briefId) {
  try {
    const { data, error } = await supabase
      .from('brief_references')
      .select('*')
      .eq('brief_id', briefId)
      .order('display_order', { ascending: true })

    if (error) throw error
    return data || []
  } catch (error) {
    console.error('Error fetching references:', error)
    throw error
  }
}

export async function addReference(briefId, referenceData) {
  try {
    const { data, error } = await supabase
      .from('brief_references')
      .insert({
        brief_id: briefId,
        ...referenceData
      })
      .select()
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error adding reference:', error)
    throw error
  }
}

export async function deleteReference(referenceId) {
  try {
    const { error } = await supabase
      .from('brief_references')
      .delete()
      .eq('id', referenceId)

    if (error) throw error
  } catch (error) {
    console.error('Error deleting reference:', error)
    throw error
  }
}

export default {
  getReferences,
  addReference,
  deleteReference
}
