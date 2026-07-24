/**
 * Brief Objectives Service
 * Manages SMART objectives for project briefs
 */

import { supabase } from './supabaseClient'

/**
 * Add objective to brief
 * @param {string} briefId - Brief ID
 * @param {Object} objectiveData - Objective data
 * @returns {Promise<Object>} Created objective
 */
export async function addObjective(briefId, objectiveData) {
  try {
    const payload = {
      brief_id: briefId,
      objective_text: objectiveData.objective_text,
      objective_type: objectiveData.objective_type,
      is_specific: objectiveData.is_specific || false,
      is_measurable: objectiveData.is_measurable || false,
      is_achievable: objectiveData.is_achievable || false,
      is_realistic: objectiveData.is_realistic || false,
      is_time_bound: objectiveData.is_time_bound || false,
      smart_validation_notes: objectiveData.smart_validation_notes || null,
      target_value: objectiveData.target_value || null,
      target_date: objectiveData.target_date || null,
      display_order: objectiveData.display_order || 0
    }

    const { data, error } = await supabase
      .from('brief_objectives')
      .insert(payload)
      .select()
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error adding objective:', error)
    throw error
  }
}

/**
 * Update objective
 * @param {string} objectiveId - Objective ID
 * @param {Object} updates - Fields to update
 * @returns {Promise<Object>} Updated objective
 */
export async function updateObjective(objectiveId, updates) {
  try {
    const { data, error } = await supabase
      .from('brief_objectives')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', objectiveId)
      .select()
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error updating objective:', error)
    throw error
  }
}

/**
 * Delete objective
 * @param {string} objectiveId - Objective ID
 * @returns {Promise<void>}
 */
export async function deleteObjective(objectiveId) {
  try {
    const { error } = await supabase
      .from('brief_objectives')
      .delete()
      .eq('id', objectiveId)

    if (error) throw error
  } catch (error) {
    console.error('Error deleting objective:', error)
    throw error
  }
}

/**
 * Get objectives for a brief
 * @param {string} briefId - Brief ID
 * @returns {Promise<Array>} Array of objectives
 */
export async function getObjectives(briefId) {
  try {
    const { data, error } = await supabase
      .from('brief_objectives')
      .select('*')
      .eq('brief_id', briefId)
      .order('display_order', { ascending: true })

    if (error) throw error
    return data || []
  } catch (error) {
    console.error('Error fetching objectives:', error)
    throw error
  }
}

/**
 * Validate SMART criteria for an objective
 * @param {string} objectiveId - Objective ID
 * @returns {Promise<Object>} Validation result
 */
export async function validateSMART(objectiveId) {
  try {
    const { data, error } = await supabase.rpc('validate_smart_objectives', {
      p_brief_id: null // We need brief_id, so get objective first
    })

    if (error) throw error

    // Get the objective to find its brief_id
    const { data: objective } = await supabase
      .from('brief_objectives')
      .select('brief_id')
      .eq('id', objectiveId)
      .single()

    if (!objective) throw new Error('Objective not found')

    // Now validate all objectives for this brief
    const { data: validationData, error: validationError } = await supabase.rpc('validate_smart_objectives', {
      p_brief_id: objective.brief_id
    })

    if (validationError) throw validationError

    // Find the specific objective in results
    const result = validationData.find(v => v.objective_id === objectiveId)
    return result || { objective_id: objectiveId, is_smart: false, missing_criteria: [], recommendations: 'Objective not found in validation results' }
  } catch (error) {
    console.error('Error validating SMART:', error)
    throw error
  }
}

/**
 * Validate all objectives for a brief
 * @param {string} briefId - Brief ID
 * @returns {Promise<Array>} Array of validation results
 */
export async function validateAllSMART(briefId) {
  try {
    const { data, error } = await supabase.rpc('validate_smart_objectives', {
      p_brief_id: briefId
    })

    if (error) throw error
    return data || []
  } catch (error) {
    console.error('Error validating SMART objectives:', error)
    throw error
  }
}

export default {
  addObjective,
  updateObjective,
  deleteObjective,
  getObjectives,
  validateSMART,
  validateAllSMART
}
