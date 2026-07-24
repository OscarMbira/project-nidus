/**
 * End Project Report Business Case Review Service
 * Manages business case benefits review and comparison
 */

import { supabase } from './supabaseClient'

/**
 * Add Benefit Review
 * @param {string} reportId - Report ID
 * @param {Object} benefitData - Benefit review data
 * @returns {Promise<Object>} Created benefit review
 */
export async function addBenefitReview(reportId, benefitData) {
  try {
    const { data: userData } = await supabase.auth.getUser()
    if (!userData?.user) {
      throw new Error('User not authenticated')
    }

    // Calculate variance if both values exist
    let variance = null
    let variancePercentage = null
    if (benefitData.original_target_value && benefitData.actual_value) {
      variance = benefitData.actual_value - benefitData.original_target_value
      if (benefitData.original_target_value > 0) {
        variancePercentage = (variance / benefitData.original_target_value) * 100
      }
    }

    const insertData = {
      end_project_report_id: reportId,
      business_case_id: benefitData.business_case_id || null,
      benefit_id: benefitData.benefit_id || null,
      benefit_description: benefitData.benefit_description,
      benefit_type: benefitData.benefit_type,
      original_target_value: benefitData.original_target_value || null,
      actual_value: benefitData.actual_value || null,
      variance: variance,
      variance_percentage: variancePercentage,
      measurement_unit: benefitData.measurement_unit || null,
      realization_date: benefitData.realization_date || null,
      is_post_project: benefitData.is_post_project || false,
      deviation_description: benefitData.deviation_description || null,
      deviation_reason: benefitData.deviation_reason || null,
      owner_id: benefitData.owner_id || null,
      notes: benefitData.notes || null,
      display_order: benefitData.display_order || 0
    }

    const { data, error } = await supabase
      .from('end_project_report_business_case_review')
      .insert(insertData)
      .select(`
        *,
        owner:owner_id(id, full_name, email),
        business_case:business_case_id(id, business_case_title),
        benefit:benefit_id(id, benefit_description)
      `)
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error adding benefit review:', error)
    throw error
  }
}

/**
 * Update Benefit Review
 * @param {string} benefitReviewId - Benefit review ID
 * @param {Object} updates - Fields to update
 * @returns {Promise<Object>} Updated benefit review
 */
export async function updateBenefitReview(benefitReviewId, updates) {
  try {
    const { data: userData } = await supabase.auth.getUser()
    if (!userData?.user) {
      throw new Error('User not authenticated')
    }

    // Recalculate variance if values changed
    if (updates.original_target_value !== undefined || updates.actual_value !== undefined) {
      const { data: current } = await supabase
        .from('end_project_report_business_case_review')
        .select('original_target_value, actual_value')
        .eq('id', benefitReviewId)
        .single()

      const original = updates.original_target_value ?? current?.original_target_value
      const actual = updates.actual_value ?? current?.actual_value

      if (original && actual) {
        updates.variance = actual - original
        if (original > 0) {
          updates.variance_percentage = (updates.variance / original) * 100
        }
      }
    }

    const { data, error } = await supabase
      .from('end_project_report_business_case_review')
      .update(updates)
      .eq('id', benefitReviewId)
      .select(`
        *,
        owner:owner_id(id, full_name, email),
        business_case:business_case_id(id, business_case_title),
        benefit:benefit_id(id, benefit_description)
      `)
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error updating benefit review:', error)
    throw error
  }
}

/**
 * Delete Benefit Review
 * @param {string} benefitReviewId - Benefit review ID
 * @returns {Promise<void>}
 */
export async function deleteBenefitReview(benefitReviewId) {
  try {
    const { error } = await supabase
      .from('end_project_report_business_case_review')
      .delete()
      .eq('id', benefitReviewId)

    if (error) throw error
  } catch (error) {
    console.error('Error deleting benefit review:', error)
    throw error
  }
}

/**
 * Get Benefits Comparison
 * @param {string} reportId - Report ID
 * @returns {Promise<Object>} Comparison data
 */
export async function getBenefitsComparison(reportId) {
  try {
    const { data: reviews, error } = await supabase
      .from('end_project_report_business_case_review')
      .select(`
        *,
        owner:owner_id(id, full_name, email),
        business_case:business_case_id(id, business_case_title),
        benefit:benefit_id(id, benefit_description)
      `)
      .eq('end_project_report_id', reportId)
      .order('display_order', { ascending: true })

    if (error) throw error

    // Get variance summary
    const { calculateBenefitsVariance } = await import('./endProjectReportService')
    const variance = await calculateBenefitsVariance(reportId)

    return {
      reviews: reviews || [],
      variance: variance,
      summary: {
        total_expected: variance?.total_expected || 0,
        total_achieved: variance?.total_achieved || 0,
        total_residual: variance?.total_residual || 0,
        variance: variance?.variance || 0,
        variance_percentage: variance?.variance_percentage || 0
      }
    }
  } catch (error) {
    console.error('Error fetching benefits comparison:', error)
    throw error
  }
}

/**
 * Link to Business Case
 * @param {string} benefitReviewId - Benefit review ID
 * @param {string} businessCaseId - Business case ID
 * @param {string} benefitId - Benefit ID (optional)
 * @returns {Promise<Object>} Updated benefit review
 */
export async function linkToBusinessCase(benefitReviewId, businessCaseId, benefitId = null) {
  try {
    const { data, error } = await supabase
      .from('end_project_report_business_case_review')
      .update({
        business_case_id: businessCaseId,
        benefit_id: benefitId
      })
      .eq('id', benefitReviewId)
      .select(`
        *,
        business_case:business_case_id(id, business_case_title),
        benefit:benefit_id(id, benefit_description)
      `)
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error linking to business case:', error)
    throw error
  }
}
