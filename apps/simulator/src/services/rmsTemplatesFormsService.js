/**
 * RMS Templates & Forms Service
 * API functions for managing risk management templates and forms
 */

import { platformDb } from './supabase/supabaseClient';

/**
 * Add template or form
 * @param {string} rmsId - RMS ID
 * @param {Object} templateData - Template data
 * @returns {Promise<Object>} Created template
 */
export async function addTemplate(rmsId, templateData) {
  try {
    const { data: { user } } = await platformDb.auth.getUser();
    if (!user) {
      return { success: false, error: 'User not authenticated' };
    }

    const { data: userData, error: userError } = await platformDb
      .from('users')
      .select('id')
      .eq('auth_user_id', user.id)
      .eq('is_deleted', false)
      .single();

    if (userError || !userData) {
      return { success: false, error: 'User not found' };
    }

    // Get next display order
    const { data: existing } = await platformDb
      .from('rms_templates_forms')
      .select('display_order')
      .eq('rms_id', rmsId)
      .order('display_order', { ascending: false })
      .limit(1);

    const nextOrder = existing && existing.length > 0
      ? existing[0].display_order + 1
      : 0;

    const insertData = {
      ...templateData,
      rms_id: rmsId,
      display_order: templateData.display_order ?? nextOrder,
      created_by: userData.id
    };

    const { data, error } = await platformDb
      .from('rms_templates_forms')
      .insert(insertData)
      .select('*')
      .single();

    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    console.error('Error adding template:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Update template or form
 * @param {string} templateId - Template ID
 * @param {Object} updates - Updates to apply
 * @returns {Promise<Object>} Updated template
 */
export async function updateTemplate(templateId, updates) {
  try {
    const { data, error } = await platformDb
      .from('rms_templates_forms')
      .update(updates)
      .eq('id', templateId)
      .select('*')
      .single();

    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    console.error('Error updating template:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Delete template or form
 * @param {string} templateId - Template ID
 * @returns {Promise<Object>} Success result
 */
export async function deleteTemplate(templateId) {
  try {
    const { error } = await platformDb
      .from('rms_templates_forms')
      .delete()
      .eq('id', templateId);

    if (error) throw error;

    return { success: true };
  } catch (error) {
    console.error('Error deleting template:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get templates for RMS
 * @param {string} rmsId - RMS ID
 * @returns {Promise<Object>} Templates list
 */
export async function getTemplates(rmsId) {
  try {
    const { data, error } = await platformDb
      .from('rms_templates_forms')
      .select('*')
      .eq('rms_id', rmsId)
      .order('display_order', { ascending: true });

    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    console.error('Error fetching templates:', error);
    return { success: false, error: error.message };
  }
}
