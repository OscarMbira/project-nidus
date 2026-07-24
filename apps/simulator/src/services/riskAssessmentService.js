/**
 * Risk Assessment Service
 * Provides risk assessment functionality
 */

import { platformDb } from './supabase/supabaseClient';

/**
 * Assess a risk
 * @param {string} riskId - Risk ID
 * @param {Object} assessmentData - Assessment data
 * @returns {Promise<Object>} Assessment result
 */
export async function assessRisk(riskId, assessmentData) {
  try {
    const { data: { user } } = await platformDb.auth.getUser();
    if (!user) {
      return { success: false, error: 'User not authenticated' };
    }

    const { data: userRecord } = await platformDb
      .from('users')
      .select('id')
      .eq('auth_user_id', user.id)
      .eq('is_deleted', false)
      .single();

    if (!userRecord) {
      return { success: false, error: 'User record not found' };
    }

    // Create assessment record
    const { data: assessment, error: assessmentError } = await platformDb
      .from('risk_assessments')
      .insert({
        risk_id: riskId,
        assessment_date: assessmentData.assessment_date || new Date().toISOString().split('T')[0],
        assessment_type: assessmentData.assessment_type || 'periodic_review',
        assessed_by_user_id: userRecord.id,
        probability: assessmentData.probability,
        impact: assessmentData.impact,
        probability_rationale: assessmentData.probability_rationale,
        impact_rationale: assessmentData.impact_rationale,
        assessment_notes: assessmentData.notes,
        created_by: userRecord.id
      })
      .select()
      .single();

    if (assessmentError) throw assessmentError;

    return { success: true, data: assessment };
  } catch (error) {
    console.error('Error assessing risk:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Update pre-response assessment
 * @param {string} riskId - Risk ID
 * @param {Object} assessment - Assessment data
 * @returns {Promise<Object>} Update result
 */
export async function updatePreResponse(riskId, assessment) {
  try {
    const { data: { user } } = await platformDb.auth.getUser();
    if (!user) {
      return { success: false, error: 'User not authenticated' };
    }

    const { data: userRecord } = await platformDb
      .from('users')
      .select('id')
      .eq('auth_user_id', user.id)
      .eq('is_deleted', false)
      .single();

    if (!userRecord) {
      return { success: false, error: 'User record not found' };
    }

    const { data, error } = await platformDb
      .from('risks')
      .update({
        pre_probability: assessment.probability,
        pre_impact: assessment.impact,
        pre_probability_rationale: assessment.probability_rationale,
        pre_impact_rationale: assessment.impact_rationale,
        pre_cost_impact: assessment.cost_impact,
        pre_schedule_impact_days: assessment.schedule_impact_days,
        // Also update legacy fields
        probability: assessment.probability,
        impact: assessment.impact,
        updated_by: userRecord.id,
        updated_at: new Date().toISOString()
      })
      .eq('id', riskId)
      .select()
      .single();

    if (error) throw error;

    // Create assessment history record
    await assessRisk(riskId, {
      assessment_type: 'initial',
      probability: assessment.probability,
      impact: assessment.impact,
      probability_rationale: assessment.probability_rationale,
      impact_rationale: assessment.impact_rationale
    });

    return { success: true, data };
  } catch (error) {
    console.error('Error updating pre-response assessment:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Update post-response assessment
 * @param {string} riskId - Risk ID
 * @param {Object} assessment - Assessment data
 * @returns {Promise<Object>} Update result
 */
export async function updatePostResponse(riskId, assessment) {
  try {
    const { data: { user } } = await platformDb.auth.getUser();
    if (!user) {
      return { success: false, error: 'User not authenticated' };
    }

    const { data: userRecord } = await platformDb
      .from('users')
      .select('id')
      .eq('auth_user_id', user.id)
      .eq('is_deleted', false)
      .single();

    if (!userRecord) {
      return { success: false, error: 'User record not found' };
    }

    const { data, error } = await platformDb
      .from('risks')
      .update({
        post_probability: assessment.probability,
        post_impact: assessment.impact,
        post_probability_rationale: assessment.probability_rationale,
        post_impact_rationale: assessment.impact_rationale,
        post_cost_impact: assessment.cost_impact,
        post_schedule_impact_days: assessment.schedule_impact_days,
        updated_by: userRecord.id,
        updated_at: new Date().toISOString()
      })
      .eq('id', riskId)
      .select()
      .single();

    if (error) throw error;

    // Create assessment history record
    await assessRisk(riskId, {
      assessment_type: 'post_response',
      probability: assessment.probability,
      impact: assessment.impact,
      probability_rationale: assessment.probability_rationale,
      impact_rationale: assessment.impact_rationale
    });

    return { success: true, data };
  } catch (error) {
    console.error('Error updating post-response assessment:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get assessment history for a risk
 * @param {string} riskId - Risk ID
 * @returns {Promise<Object>} Assessment history
 */
export async function getAssessmentHistory(riskId) {
  try {
    const { data, error } = await platformDb
      .from('risk_assessments')
      .select(`
        *,
        assessed_by_user:assessed_by_user_id(id, full_name, email)
      `)
      .eq('risk_id', riskId)
      .eq('is_deleted', false)
      .order('assessment_date', { ascending: false });

    if (error) throw error;

    return { success: true, data: data || [] };
  } catch (error) {
    console.error('Error fetching assessment history:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Calculate risk score
 * @param {number} probability - Probability (1-5)
 * @param {number} impact - Impact (1-5)
 * @returns {Promise<Object>} Calculated score
 */
export async function calculateRiskScore(probability, impact) {
  try {
    const { data, error } = await platformDb.rpc('calculate_risk_score', {
      p_probability: probability,
      p_impact: impact
    });

    if (error) throw error;

    return { success: true, data: data?.[0] || null };
  } catch (error) {
    console.error('Error calculating risk score:', error);
    return { success: false, error: error.message };
  }
}
