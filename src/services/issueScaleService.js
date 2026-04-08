import { supabase } from './supabaseClient';

/**
 * Issue Scale Service - API functions for Issue Priority and Severity Scales
 * Handles configurable scales per organisation
 */

/**
 * Get priority scales for an organisation
 * @param {string} organisationId - Organisation (account) ID
 * @returns {Promise<Array>} Array of priority scales
 */
export async function getPriorityScales(organisationId) {
  try {
    const { data, error } = await supabase
      .from('issue_priority_scales')
      .select('*')
      .eq('organisation_id', organisationId)
      .eq('is_active', true)
      .order('scale_order', { ascending: true });

    if (error) throw error;

    return data || [];
  } catch (error) {
    console.error('Error fetching priority scales:', error);
    throw error;
  }
}

/**
 * Get severity scales for an organisation
 * @param {string} organisationId - Organisation (account) ID
 * @returns {Promise<Array>} Array of severity scales
 */
export async function getSeverityScales(organisationId) {
  try {
    const { data, error } = await supabase
      .from('issue_severity_scales')
      .select('*')
      .eq('organisation_id', organisationId)
      .eq('is_active', true)
      .order('scale_order', { ascending: true });

    if (error) throw error;

    return data || [];
  } catch (error) {
    console.error('Error fetching severity scales:', error);
    throw error;
  }
}

/**
 * Update priority scales for an organisation
 * @param {string} organisationId - Organisation (account) ID
 * @param {Array} scales - Array of scale objects
 * @returns {Promise<Array>} Updated scales
 */
export async function updatePriorityScales(organisationId, scales) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Delete existing scales for this organisation
    await supabase
      .from('issue_priority_scales')
      .delete()
      .eq('organisation_id', organisationId);

    // Insert new scales
    const scalesToInsert = scales.map(scale => ({
      ...scale,
      organisation_id: organisationId
    }));

    const { data, error } = await supabase
      .from('issue_priority_scales')
      .insert(scalesToInsert)
      .select();

    if (error) throw error;

    return data || [];
  } catch (error) {
    console.error('Error updating priority scales:', error);
    throw error;
  }
}

/**
 * Update severity scales for an organisation
 * @param {string} organisationId - Organisation (account) ID
 * @param {Array} scales - Array of scale objects
 * @returns {Promise<Array>} Updated scales
 */
export async function updateSeverityScales(organisationId, scales) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Delete existing scales for this organisation
    await supabase
      .from('issue_severity_scales')
      .delete()
      .eq('organisation_id', organisationId);

    // Insert new scales
    const scalesToInsert = scales.map(scale => ({
      ...scale,
      organisation_id: organisationId
    }));

    const { data, error } = await supabase
      .from('issue_severity_scales')
      .insert(scalesToInsert)
      .select();

    if (error) throw error;

    return data || [];
  } catch (error) {
    console.error('Error updating severity scales:', error);
    throw error;
  }
}

/**
 * Update both priority and severity scales
 * @param {string} organisationId - Organisation (account) ID
 * @param {Object} scales - Object with priorityScales and severityScales arrays
 * @returns {Promise<Object>} Updated scales
 */
export async function updateScales(organisationId, scales) {
  try {
    const [priorityScales, severityScales] = await Promise.all([
      scales.priorityScales 
        ? updatePriorityScales(organisationId, scales.priorityScales)
        : Promise.resolve([]),
      scales.severityScales
        ? updateSeverityScales(organisationId, scales.severityScales)
        : Promise.resolve([])
    ]);

    return {
      priorityScales,
      severityScales
    };
  } catch (error) {
    console.error('Error updating scales:', error);
    throw error;
  }
}

/**
 * Get default priority scales (if organisation doesn't have custom scales)
 * @returns {Array} Default priority scales
 */
export function getDefaultPriorityScales() {
  return [
    { scale_value: 'critical', scale_label: 'Critical', scale_order: 1, description: 'Immediate action required', response_time: 'Immediate', color_code: '#dc2626' },
    { scale_value: 'high', scale_label: 'High', scale_order: 2, description: 'Action within 24 hours', response_time: '24 hours', color_code: '#ea580c' },
    { scale_value: 'medium', scale_label: 'Medium', scale_order: 3, description: 'Action within 1 week', response_time: '1 week', color_code: '#ca8a04' },
    { scale_value: 'low', scale_label: 'Low', scale_order: 4, description: 'Action when resources available', response_time: 'As available', color_code: '#65a30d' }
  ];
}

/**
 * Get default severity scales (if organisation doesn't have custom scales)
 * @returns {Array} Default severity scales
 */
export function getDefaultSeverityScales() {
  return [
    { scale_value: 'critical', scale_label: 'Critical', scale_order: 1, description: 'System-wide impact', impact_description: 'Complete system failure or major business impact', color_code: '#dc2626' },
    { scale_value: 'major', scale_label: 'Major', scale_order: 2, description: 'Significant impact', impact_description: 'Major functionality affected', color_code: '#ea580c' },
    { scale_value: 'moderate', scale_label: 'Moderate', scale_order: 3, description: 'Moderate impact', impact_description: 'Some functionality affected', color_code: '#ca8a04' },
    { scale_value: 'minor', scale_label: 'Minor', scale_order: 4, description: 'Minimal impact', impact_description: 'Minor functionality affected', color_code: '#65a30d' }
  ];
}

export default {
  getPriorityScales,
  getSeverityScales,
  updatePriorityScales,
  updateSeverityScales,
  updateScales,
  getDefaultPriorityScales,
  getDefaultSeverityScales
};
