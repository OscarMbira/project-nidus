/**
 * End Project Report Objectives Review Service
 * Manages objectives performance review
 */

import { supabase } from './supabaseClient'

/**
 * Add Objective Review
 * @param {string} reportId - Report ID
 * @param {Object} objectiveData - Objective review data
 * @returns {Promise<Object>} Created objective review
 */
export async function addObjectiveReview(reportId, objectiveData) {
  try {
    const { data: userData } = await supabase.auth.getUser()
    if (!userData?.user) {
      throw new Error('User not authenticated')
    }

    // Calculate if within tolerance
    let withinTolerance = true
    let variance = null

    if (objectiveData.original_target && objectiveData.actual_value) {
      const original = parseFloat(objectiveData.original_target)
      const actual = parseFloat(objectiveData.actual_value)
      variance = actual - original

      if (objectiveData.tolerance_plus && objectiveData.tolerance_minus) {
        const upperBound = original + objectiveData.tolerance_plus
        const lowerBound = original - objectiveData.tolerance_minus
        withinTolerance = actual >= lowerBound && actual <= upperBound
      }
    }

    const insertData = {
      end_project_report_id: reportId,
      objective_area: objectiveData.objective_area,
      objective_description: objectiveData.objective_description,
      original_target: objectiveData.original_target || null,
      tolerance_plus: objectiveData.tolerance_plus || null,
      tolerance_minus: objectiveData.tolerance_minus || null,
      actual_value: objectiveData.actual_value || null,
      variance: variance,
      within_tolerance: withinTolerance,
      performance_rating: objectiveData.performance_rating || null,
      strategy_effectiveness: objectiveData.strategy_effectiveness || null,
      controls_effectiveness: objectiveData.controls_effectiveness || null,
      notes: objectiveData.notes || null,
      display_order: objectiveData.display_order || 0
    }

    const { data, error } = await supabase
      .from('end_project_report_objectives_review')
      .insert(insertData)
      .select()
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error adding objective review:', error)
    throw error
  }
}

/**
 * Update Objective Review
 * @param {string} objectiveReviewId - Objective review ID
 * @param {Object} updates - Fields to update
 * @returns {Promise<Object>} Updated objective review
 */
export async function updateObjectiveReview(objectiveReviewId, updates) {
  try {
    const { data: userData } = await supabase.auth.getUser()
    if (!userData?.user) {
      throw new Error('User not authenticated')
    }

    // Recalculate tolerance if values changed
    if (updates.original_target !== undefined || updates.actual_value !== undefined) {
      const { data: current } = await supabase
        .from('end_project_report_objectives_review')
        .select('original_target, actual_value, tolerance_plus, tolerance_minus')
        .eq('id', objectiveReviewId)
        .single()

      const original = parseFloat(updates.original_target ?? current?.original_target)
      const actual = parseFloat(updates.actual_value ?? current?.actual_value)
      const tolerancePlus = updates.tolerance_plus ?? current?.tolerance_plus
      const toleranceMinus = updates.tolerance_minus ?? current?.tolerance_minus

      if (original && actual) {
        updates.variance = actual - original

        if (tolerancePlus && toleranceMinus) {
          const upperBound = original + tolerancePlus
          const lowerBound = original - toleranceMinus
          updates.within_tolerance = actual >= lowerBound && actual <= upperBound
        }
      }
    }

    const { data, error } = await supabase
      .from('end_project_report_objectives_review')
      .update(updates)
      .eq('id', objectiveReviewId)
      .select()
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error updating objective review:', error)
    throw error
  }
}

/**
 * Delete Objective Review
 * @param {string} objectiveReviewId - Objective review ID
 * @returns {Promise<void>}
 */
export async function deleteObjectiveReview(objectiveReviewId) {
  try {
    const { error } = await supabase
      .from('end_project_report_objectives_review')
      .delete()
      .eq('id', objectiveReviewId)

    if (error) throw error
  } catch (error) {
    console.error('Error deleting objective review:', error)
    throw error
  }
}

/**
 * Get Tolerance Performance
 * @param {string} reportId - Report ID
 * @returns {Promise<Array>} Objectives review data
 */
export async function getTolerancePerformance(reportId) {
  try {
    const { data, error } = await supabase
      .from('end_project_report_objectives_review')
      .select('*')
      .eq('end_project_report_id', reportId)
      .order('display_order', { ascending: true })

    if (error) throw error
    return data || []
  } catch (error) {
    console.error('Error fetching tolerance performance:', error)
    throw error
  }
}
