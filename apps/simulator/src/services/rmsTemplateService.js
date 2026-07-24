/**
 * RMS Organization Templates Service
 * API functions for managing organization-level RMS templates
 */

import { platformDb } from './supabase/supabaseClient';

/**
 * Get templates for organization
 * @param {string} accountId - Account/Organization ID
 * @returns {Promise<Object>} Templates list
 */
export async function getTemplates(accountId) {
  try {
    const { data, error } = await platformDb
      .from('rms_organization_templates')
      .select('*')
      .eq('account_id', accountId)
      .eq('is_deleted', false)
      .order('is_default', { ascending: false })
      .order('template_name', { ascending: true });

    if (error) throw error;

    return { success: true, data: data || [] };
  } catch (error) {
    console.error('Error fetching RMS templates:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get default template for organization
 * @param {string} accountId - Account/Organization ID
 * @returns {Promise<Object>} Default template
 */
export async function getDefaultTemplate(accountId) {
  try {
    const { data, error } = await platformDb
      .from('rms_organization_templates')
      .select('*')
      .eq('account_id', accountId)
      .eq('is_default', true)
      .eq('is_deleted', false)
      .eq('is_active', true)
      .single();

    if (error && error.code !== 'PGRST116') throw error;

    return { success: true, data: data || null };
  } catch (error) {
    console.error('Error fetching default RMS template:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get template by ID
 * @param {string} templateId - Template ID
 * @returns {Promise<Object>} Template
 */
export async function getTemplateById(templateId) {
  try {
    const { data, error } = await platformDb
      .from('rms_organization_templates')
      .select('*')
      .eq('id', templateId)
      .eq('is_deleted', false)
      .single();

    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    console.error('Error fetching RMS template:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Create template
 * @param {string} accountId - Account/Organization ID
 * @param {Object} templateData - Template data
 * @returns {Promise<Object>} Created template
 */
export async function createTemplate(accountId, templateData) {
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

    const insertData = {
      ...templateData,
      account_id: accountId,
      created_by: userData.id,
      updated_by: userData.id
    };

    const { data, error } = await platformDb
      .from('rms_organization_templates')
      .insert(insertData)
      .select('*')
      .single();

    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    console.error('Error creating RMS template:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Update template
 * @param {string} templateId - Template ID
 * @param {Object} updates - Updates to apply
 * @returns {Promise<Object>} Updated template
 */
export async function updateTemplate(templateId, updates) {
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

    const updateData = {
      ...updates,
      updated_by: userData.id,
      updated_at: new Date().toISOString()
    };

    const { data, error } = await platformDb
      .from('rms_organization_templates')
      .update(updateData)
      .eq('id', templateId)
      .eq('is_deleted', false)
      .select('*')
      .single();

    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    console.error('Error updating RMS template:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Delete template
 * @param {string} templateId - Template ID
 * @returns {Promise<Object>} Success result
 */
export async function deleteTemplate(templateId) {
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

    const { error } = await platformDb
      .from('rms_organization_templates')
      .update({
        is_deleted: true,
        deleted_at: new Date().toISOString(),
        deleted_by: userData.id
      })
      .eq('id', templateId)
      .eq('is_deleted', false);

    if (error) throw error;

    return { success: true };
  } catch (error) {
    console.error('Error deleting RMS template:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Set template as default
 * @param {string} templateId - Template ID
 * @returns {Promise<Object>} Updated template
 */
export async function setAsDefault(templateId) {
  try {
    // Get template account_id
    const { data: template, error: templateError } = await platformDb
      .from('rms_organization_templates')
      .select('account_id')
      .eq('id', templateId)
      .eq('is_deleted', false)
      .single();

    if (templateError || !template) {
      return { success: false, error: 'Template not found' };
    }

    // Update template to be default (trigger will unset others)
    return await updateTemplate(templateId, {
      is_default: true
    });
  } catch (error) {
    console.error('Error setting default RMS template:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Create RMS from template
 * @param {string} projectId - Project ID
 * @param {string} templateId - Template ID
 * @returns {Promise<Object>} Created RMS
 */
export async function createRMSFromTemplate(projectId, templateId) {
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

    // Call database function
    const { data: rmsId, error } = await platformDb.rpc('create_rms_from_template', {
      p_project_id: projectId,
      p_template_id: templateId,
      p_user_id: userData.id
    });

    if (error) throw error;

    // Fetch the created RMS
    const { getRMSByProject } = await import('./riskManagementStrategyService');
    return await getRMSByProject(projectId);
  } catch (error) {
    console.error('Error creating RMS from template:', error);
    return { success: false, error: error.message };
  }
}
