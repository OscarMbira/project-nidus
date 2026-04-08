/**
 * Risk Scale Service
 * Provides risk scale configuration functionality
 */

import { platformDb } from './supabase/supabaseClient';

/**
 * Get probability scales for an organization
 * @param {string} organisationId - Organisation ID (account_id)
 * @returns {Promise<Object>} Probability scales
 */
export async function getProbabilityScales(organisationId) {
  try {
    const { data, error } = await platformDb
      .from('risk_probability_scales')
      .select('*')
      .eq('organisation_id', organisationId)
      .eq('is_active', true)
      .order('scale_value', { ascending: true });

    if (error) throw error;

    return { success: true, data: data || [] };
  } catch (error) {
    console.error('Error fetching probability scales:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get impact scales for an organization
 * @param {string} organisationId - Organisation ID (account_id)
 * @returns {Promise<Object>} Impact scales
 */
export async function getImpactScales(organisationId) {
  try {
    const { data, error } = await platformDb
      .from('risk_impact_scales')
      .select('*')
      .eq('organisation_id', organisationId)
      .eq('is_active', true)
      .order('scale_value', { ascending: true });

    if (error) throw error;

    return { success: true, data: data || [] };
  } catch (error) {
    console.error('Error fetching impact scales:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get matrix thresholds for an organization
 * @param {string} organisationId - Organisation ID (account_id)
 * @returns {Promise<Object>} Matrix thresholds
 */
export async function getMatrixThresholds(organisationId) {
  try {
    const { data, error } = await platformDb
      .from('risk_matrix_thresholds')
      .select('*')
      .eq('organisation_id', organisationId)
      .eq('is_active', true)
      .order('min_score', { ascending: true });

    if (error) throw error;

    return { success: true, data: data || [] };
  } catch (error) {
    console.error('Error fetching matrix thresholds:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get risk categories for an organization
 * @param {string} organisationId - Organisation ID (account_id)
 * @returns {Promise<Object>} Risk categories
 */
export async function getCategories(organisationId) {
  try {
    const { data, error } = await platformDb
      .from('risk_categories')
      .select('*')
      .eq('organisation_id', organisationId)
      .eq('is_active', true)
      .order('display_order', { ascending: true });

    if (error) throw error;

    return { success: true, data: data || [] };
  } catch (error) {
    console.error('Error fetching categories:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Update scales for an organization
 * @param {string} organisationId - Organisation ID (account_id)
 * @param {Object} scales - Scale configuration
 * @returns {Promise<Object>} Update result
 */
export async function updateScales(organisationId, scales) {
  try {
    const { data: { user } } = await platformDb.auth.getUser();
    if (!user) {
      return { success: false, error: 'User not authenticated' };
    }

    // Update probability scales
    if (scales.probability_scales) {
      for (const scale of scales.probability_scales) {
        const { error } = await platformDb
          .from('risk_probability_scales')
          .upsert({
            organisation_id: organisationId,
            scale_value: scale.scale_value,
            scale_label: scale.scale_label,
            percentage_range_min: scale.percentage_range_min,
            percentage_range_max: scale.percentage_range_max,
            description: scale.description,
            color_code: scale.color_code,
            is_active: true
          }, {
            onConflict: 'organisation_id,scale_value'
          });

        if (error) throw error;
      }
    }

    // Update impact scales
    if (scales.impact_scales) {
      for (const scale of scales.impact_scales) {
        const { error } = await platformDb
          .from('risk_impact_scales')
          .upsert({
            organisation_id: organisationId,
            scale_value: scale.scale_value,
            scale_label: scale.scale_label,
            cost_range_min: scale.cost_range_min,
            cost_range_max: scale.cost_range_max,
            schedule_range_min_days: scale.schedule_range_min_days,
            schedule_range_max_days: scale.schedule_range_max_days,
            quality_impact_description: scale.quality_impact_description,
            description: scale.description,
            color_code: scale.color_code,
            is_active: true
          }, {
            onConflict: 'organisation_id,scale_value'
          });

        if (error) throw error;
      }
    }

    // Update matrix thresholds
    if (scales.matrix_thresholds) {
      for (const threshold of scales.matrix_thresholds) {
        const { error } = await platformDb
          .from('risk_matrix_thresholds')
          .upsert({
            organisation_id: organisationId,
            min_score: threshold.min_score,
            max_score: threshold.max_score,
            risk_level: threshold.risk_level,
            risk_level_label: threshold.risk_level_label,
            color_code: threshold.color_code,
            required_action: threshold.required_action,
            escalation_required: threshold.escalation_required,
            review_frequency_days: threshold.review_frequency_days,
            is_active: true
          });

        if (error) throw error;
      }
    }

    return { success: true };
  } catch (error) {
    console.error('Error updating scales:', error);
    return { success: false, error: error.message };
  }
}
