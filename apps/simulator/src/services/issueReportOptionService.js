import { supabase } from './supabaseClient';

/**
 * Issue Report Option Service - API functions for Issue Report Options
 * Handles options analysis for Issue Reports
 */

/**
 * Add an option to an Issue Report
 * @param {string} reportId - Report ID
 * @param {Object} optionData - Option data
 * @returns {Promise<Object>} Created option
 */
export async function addOption(reportId, optionData) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data: userData } = await supabase
      .from('users')
      .select('id')
      .eq('auth_user_id', user.id)
      .single();

    if (!userData) throw new Error('User not found');

    // Get next option number if not provided
    if (!optionData.option_number) {
      const { data: existingOptions } = await supabase
        .from('issue_report_options')
        .select('option_number')
        .eq('issue_report_id', reportId)
        .order('option_number', { ascending: false })
        .limit(1);

      optionData.option_number = existingOptions && existingOptions.length > 0
        ? existingOptions[0].option_number + 1
        : 1;
    }

    // Get display_order if not provided
    if (optionData.display_order === undefined) {
      const { data: existingOptions } = await supabase
        .from('issue_report_options')
        .select('display_order')
        .eq('issue_report_id', reportId)
        .order('display_order', { ascending: false })
        .limit(1);

      optionData.display_order = existingOptions && existingOptions.length > 0
        ? existingOptions[0].display_order + 1
        : 0;
    }

    const insertData = {
      ...optionData,
      issue_report_id: reportId,
      created_by: userData.id,
      updated_by: userData.id
    };

    const { data, error } = await supabase
      .from('issue_report_options')
      .insert(insertData)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error adding option:', error);
    throw error;
  }
}

/**
 * Update an option
 * @param {string} optionId - Option ID
 * @param {Object} updates - Fields to update
 * @returns {Promise<Object>} Updated option
 */
export async function updateOption(optionId, updates) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data: userData } = await supabase
      .from('users')
      .select('id')
      .eq('auth_user_id', user.id)
      .single();

    if (!userData) throw new Error('User not found');

    const updateData = {
      ...updates,
      updated_by: userData.id
    };

    const { data, error } = await supabase
      .from('issue_report_options')
      .update(updateData)
      .eq('id', optionId)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error updating option:', error);
    throw error;
  }
}

/**
 * Delete an option
 * @param {string} optionId - Option ID
 * @returns {Promise<void>}
 */
export async function deleteOption(optionId) {
  try {
    const { error } = await supabase
      .from('issue_report_options')
      .delete()
      .eq('id', optionId);

    if (error) throw error;
  } catch (error) {
    console.error('Error deleting option:', error);
    throw error;
  }
}

/**
 * Get all options for a report
 * @param {string} reportId - Report ID
 * @returns {Promise<Array>} Array of options
 */
export async function getOptions(reportId) {
  try {
    const { data, error } = await supabase
      .from('issue_report_options')
      .select('*')
      .eq('issue_report_id', reportId)
      .order('display_order', { ascending: true })
      .order('option_number', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching options:', error);
    throw error;
  }
}

/**
 * Set recommended option (unset others)
 * @param {string} reportId - Report ID
 * @param {string} optionId - Option ID to set as recommended
 * @returns {Promise<Object>} Updated option
 */
export async function setRecommendedOption(reportId, optionId) {
  try {
    // First, unset all recommended options for this report
    const { error: unsetError } = await supabase
      .from('issue_report_options')
      .update({ is_recommended: false })
      .eq('issue_report_id', reportId)
      .eq('is_recommended', true);

    if (unsetError) throw unsetError;

    // Then set the specified option as recommended
    return await updateOption(optionId, { is_recommended: true });
  } catch (error) {
    console.error('Error setting recommended option:', error);
    throw error;
  }
}

/**
 * Reorder options
 * @param {string} reportId - Report ID
 * @param {Array} optionOrders - Array of {id, display_order}
 * @returns {Promise<void>}
 */
export async function reorderOptions(reportId, optionOrders) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data: userData } = await supabase
      .from('users')
      .select('id')
      .eq('auth_user_id', user.id)
      .single();

    if (!userData) throw new Error('User not found');

    // Update each option's display_order
    const updates = optionOrders.map(({ id, display_order }) =>
      supabase
        .from('issue_report_options')
        .update({ display_order, updated_by: userData.id })
        .eq('id', id)
        .eq('issue_report_id', reportId)
    );

    const results = await Promise.all(updates);
    const errors = results.filter(r => r.error);

    if (errors.length > 0) {
      throw new Error('Error reordering options: ' + errors[0].error.message);
    }
  } catch (error) {
    console.error('Error reordering options:', error);
    throw error;
  }
}

export default {
  addOption,
  updateOption,
  deleteOption,
  getOptions,
  setRecommendedOption,
  reorderOptions
};
