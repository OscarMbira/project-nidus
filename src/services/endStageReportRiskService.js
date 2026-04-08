/**
 * End Stage Report Risk Service
 * Manages risk review tracking
 */

import { supabase } from './supabaseClient'

/**
 * Add Risk Review
 * @param {string} reportId - Report ID
 * @param {Object} riskData - Risk data
 * @returns {Promise<Object>} Created risk review
 */
export async function addRiskReview(reportId, riskData) {
  try {
    const { data: userData } = await supabase.auth.getUser()
    if (!userData?.user) {
      throw new Error('User not authenticated')
    }

    const insertData = {
      end_stage_report_id: reportId,
      risk_id: riskData.risk_id || null,
      risk_title: riskData.risk_title || 'Unnamed Risk',
      risk_description: riskData.risk_description || null,
      risk_status: riskData.risk_status || 'carried-forward',
      original_probability: riskData.original_probability || null,
      current_probability: riskData.current_probability || null,
      original_impact: riskData.original_impact || null,
      current_impact: riskData.current_impact || null,
      risk_response_actions: riskData.risk_response_actions || null,
      effectiveness_of_response: riskData.effectiveness_of_response || null,
      lessons_from_risk: riskData.lessons_from_risk || null,
      display_order: riskData.display_order || 0
    }

    const { data, error } = await supabase
      .from('end_stage_report_risk_review')
      .insert(insertData)
      .select()
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error adding risk review:', error)
    throw error
  }
}

/**
 * Update Risk Review
 * @param {string} riskReviewId - Risk review ID
 * @param {Object} updates - Fields to update
 * @returns {Promise<Object>} Updated risk review
 */
export async function updateRiskReview(riskReviewId, updates) {
  try {
    const { data: userData } = await supabase.auth.getUser()
    if (!userData?.user) {
      throw new Error('User not authenticated')
    }

    const { data, error } = await supabase
      .from('end_stage_report_risk_review')
      .update(updates)
      .eq('id', riskReviewId)
      .select()
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error updating risk review:', error)
    throw error
  }
}

/**
 * Delete Risk Review
 * @param {string} riskReviewId - Risk review ID
 * @returns {Promise<void>}
 */
export async function deleteRiskReview(riskReviewId) {
  try {
    const { error } = await supabase
      .from('end_stage_report_risk_review')
      .delete()
      .eq('id', riskReviewId)

    if (error) throw error
  } catch (error) {
    console.error('Error deleting risk review:', error)
    throw error
  }
}

/**
 * Get Risk Reviews
 * @param {string} reportId - Report ID
 * @returns {Promise<Array>} Risk reviews
 */
export async function getRiskReviews(reportId) {
  try {
    const { data, error } = await supabase
      .from('end_stage_report_risk_review')
      .select('*')
      .eq('end_stage_report_id', reportId)
      .order('display_order', { ascending: true })

    if (error) throw error
    return data || []
  } catch (error) {
    console.error('Error fetching risk reviews:', error)
    throw error
  }
}

/**
 * Sync Risks from Register
 * @param {string} reportId - Report ID
 * @returns {Promise<Array>} Synced risks
 */
export async function syncRisksFromRegister(reportId) {
  try {
    // Get report to find project
    const { data: report } = await supabase
      .from('end_stage_reports')
      .select('project_id')
      .eq('id', reportId)
      .single()

    if (!report) throw new Error('Report not found')

    // Get active risks for the project
    const { data: risks, error: risksError } = await supabase
      .from('risks')
      .select('*')
      .eq('project_id', report.project_id)
      .eq('is_deleted', false)
      .in('status', ['open', 'mitigating', 'monitoring'])

    if (risksError && risksError.code !== 'PGRST116') {
      throw risksError
    }

    const syncedRisks = []
    for (const risk of risks || []) {
      try {
        // Check if risk review already exists
        const { data: existing } = await supabase
          .from('end_stage_report_risk_review')
          .select('id')
          .eq('end_stage_report_id', reportId)
          .eq('risk_id', risk.id)
          .single()

        if (!existing) {
          const review = await addRiskReview(reportId, {
            risk_id: risk.id,
            risk_title: risk.risk_title || risk.title,
            risk_description: risk.risk_description || risk.description,
            risk_status: 'carried-forward',
            original_probability: risk.probability,
            current_probability: risk.probability,
            original_impact: risk.impact,
            current_impact: risk.impact
          })
          syncedRisks.push(review)
        }
      } catch (err) {
        console.error(`Error syncing risk ${risk.id}:`, err)
      }
    }

    return syncedRisks
  } catch (error) {
    console.error('Error syncing risks from register:', error)
    throw error
  }
}

/**
 * Update Risk Statuses
 * @param {string} reportId - Report ID
 * @param {Array<Object>} statusUpdates - Array of {riskReviewId, risk_status} objects
 * @returns {Promise<Array>} Updated risk reviews
 */
export async function updateRiskStatuses(reportId, statusUpdates) {
  try {
    const updatedRisks = []
    
    for (const update of statusUpdates) {
      try {
        const updated = await updateRiskReview(update.riskReviewId, {
          risk_status: update.risk_status,
          current_probability: update.current_probability,
          current_impact: update.current_impact
        })
        updatedRisks.push(updated)
      } catch (err) {
        console.error(`Error updating risk review ${update.riskReviewId}:`, err)
      }
    }

    return updatedRisks
  } catch (error) {
    console.error('Error updating risk statuses:', error)
    throw error
  }
}
