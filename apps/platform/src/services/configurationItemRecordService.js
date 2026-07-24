/**
 * Configuration Item Record Service
 * Provides CRUD operations for Configuration Items
 */

import { platformDb, supabase } from './supabaseClient';

/**
 * Get Configuration Item by ID
 * @param {string} itemId - Configuration Item ID
 * @returns {Promise<Object>} Configuration Item
 */
export async function getConfigurationItemById(itemId) {
  try {
    const { data, error } = await platformDb
      .from('configuration_items')
      .select(`
        *,
        project:project_id(id, project_name, project_code),
        cfg_ms:cfg_ms_id(id, cms_reference),
        product:product_id(id, product_name),
        item_type:item_type_id(id, item_type_name, item_type_code),
        current_status:current_status_id(id, status_name, status_code),
        version_scheme:version_scheme_id(id, procedure_name, version_scheme),
        identification_method:identification_method_id(id, method_name, method_type),
        current_baseline:current_baseline_id(id, baseline_identifier, baseline_name),
        latest_version:latest_version_id(id, version_number),
        created_by_user:created_by(id, full_name, email),
        updated_by_user:updated_by(id, full_name, email)
      `)
      .eq('id', itemId)
      .eq('is_deleted', false)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching Configuration Item by ID:', error);
    throw error;
  }
}

/**
 * Get Configuration Items by Project
 * @param {string} projectId - Project ID
 * @returns {Promise<Array>} Configuration Items
 */
export async function getConfigurationItemsByProject(projectId) {
  try {
    const { data, error } = await platformDb
      .from('configuration_items')
      .select(`
        *,
        project:project_id(id, project_name, project_code),
        product:product_id(id, product_name),
        item_type:item_type_id(id, item_type_name),
        current_status:current_status_id(id, status_name, status_code),
        latest_version:latest_version_id(id, version_number)
      `)
      .eq('project_id', projectId)
      .eq('is_deleted', false)
      .order('configuration_item_identifier', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching Configuration Items by project:', error);
    throw error;
  }
}

/**
 * Get Configuration Items by Strategy
 * @param {string} cfgMsId - Configuration Management Strategy ID
 * @returns {Promise<Array>} Configuration Items
 */
export async function getConfigurationItemsByStrategy(cfgMsId) {
  try {
    const { data, error } = await platformDb
      .from('configuration_items')
      .select(`
        *,
        project:project_id(id, project_name, project_code),
        product:product_id(id, product_name),
        item_type:item_type_id(id, item_type_name),
        current_status:current_status_id(id, status_name, status_code)
      `)
      .eq('cfg_ms_id', cfgMsId)
      .eq('is_deleted', false)
      .order('configuration_item_identifier', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching Configuration Items by strategy:', error);
    throw error;
  }
}

/**
 * Create Configuration Item (using database function)
 * @param {string} projectId - Project ID
 * @param {string} itemName - Item name
 * @returns {Promise<Object>} Created Configuration Item
 */
export async function createConfigurationItem(projectId, itemName) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data: userRecord } = await platformDb
      .from('users')
      .select('id')
      .eq('auth_user_id', user.id)
      .eq('is_deleted', false)
      .single();

    if (!userRecord) throw new Error('User record not found');

    // Call database function
    const { data: ciId, error } = await platformDb.rpc('create_configuration_item', {
      p_project_id: projectId,
      p_item_name: itemName,
      p_user_id: userRecord.id
    });

    if (error) throw error;

    // Fetch the created Configuration Item
    return await getConfigurationItemById(ciId);
  } catch (error) {
    console.error('Error creating Configuration Item:', error);
    throw error;
  }
}

/**
 * Create Configuration Item (manual)
 * @param {string} projectId - Project ID
 * @param {string} cfgMsId - Configuration Management Strategy ID
 * @param {Object} itemData - Item data
 * @returns {Promise<Object>} Created Configuration Item
 */
export async function createConfigurationItemManual(projectId, cfgMsId, itemData) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data: userRecord } = await platformDb
      .from('users')
      .select('id')
      .eq('auth_user_id', user.id)
      .eq('is_deleted', false)
      .single();

    if (!userRecord) throw new Error('User record not found');

    const insertData = {
      ...itemData,
      project_id: projectId,
      cfg_ms_id: cfgMsId,
      created_by: userRecord.id,
      updated_by: userRecord.id,
      current_version: itemData.current_version || '1.0'
    };

    const { data, error } = await platformDb
      .from('configuration_items')
      .insert(insertData)
      .select(`
        *,
        project:project_id(id, project_name, project_code),
        cfg_ms:cfg_ms_id(id, cms_reference),
        created_by_user:created_by(id, full_name, email),
        updated_by_user:updated_by(id, full_name, email)
      `)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error creating Configuration Item:', error);
    throw error;
  }
}

/**
 * Update Configuration Item
 * @param {string} itemId - Configuration Item ID
 * @param {Object} updates - Fields to update
 * @returns {Promise<Object>} Updated Configuration Item
 */
export async function updateConfigurationItem(itemId, updates) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data: userRecord } = await platformDb
      .from('users')
      .select('id')
      .eq('auth_user_id', user.id)
      .eq('is_deleted', false)
      .single();

    if (!userRecord) throw new Error('User record not found');

    const updateData = {
      ...updates,
      updated_by: userRecord.id
    };

    const { data, error } = await platformDb
      .from('configuration_items')
      .update(updateData)
      .eq('id', itemId)
      .select(`
        *,
        project:project_id(id, project_name, project_code),
        cfg_ms:cfg_ms_id(id, cms_reference),
        product:product_id(id, product_name),
        item_type:item_type_id(id, item_type_name),
        current_status:current_status_id(id, status_name, status_code),
        updated_by_user:updated_by(id, full_name, email)
      `)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error updating Configuration Item:', error);
    throw error;
  }
}

/**
 * Delete Configuration Item (soft delete - only if not in baseline)
 * @param {string} itemId - Configuration Item ID
 * @returns {Promise<Object>} Deletion result
 */
export async function deleteConfigurationItem(itemId) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data: userRecord } = await platformDb
      .from('users')
      .select('id')
      .eq('auth_user_id', user.id)
      .eq('is_deleted', false)
      .single();

    if (!userRecord) throw new Error('User record not found');

    // Check if item is in baseline
    const { data: item } = await platformDb
      .from('configuration_items')
      .select('is_in_baseline')
      .eq('id', itemId)
      .single();

    if (item?.is_in_baseline) {
      throw new Error('Cannot delete Configuration Item that is included in a baseline');
    }

    const { error } = await platformDb
      .from('configuration_items')
      .update({
        is_deleted: true,
        deleted_at: new Date().toISOString(),
        deleted_by: userRecord.id
      })
      .eq('id', itemId);

    if (error) throw error;

    return { success: true };
  } catch (error) {
    console.error('Error deleting Configuration Item:', error);
    throw error;
  }
}

/**
 * Generate identifier for Configuration Item
 * @param {string} projectId - Project ID
 * @param {string} itemTypeCode - Item type code (optional)
 * @returns {Promise<string>} Generated identifier
 */
export async function generateIdentifier(projectId, itemTypeCode = 'CI') {
  try {
    const { data, error } = await platformDb.rpc('generate_ci_identifier', {
      p_project_id: projectId,
      p_item_type_code: itemTypeCode
    });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error generating identifier:', error);
    throw error;
  }
}
