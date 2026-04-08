/**
 * Configuration Item Version Service
 * API functions for managing configuration item versions
 */

import { platformDb, supabase } from './supabaseClient';

/**
 * Create new version of configuration item
 * @param {string} itemId - Configuration Item ID
 * @param {Object} versionData - Version data
 * @returns {Promise<Object>} Created version
 */
export async function createVersion(itemId, versionData) {
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

    // Use database function
    const { data: versionId, error } = await platformDb.rpc('create_ci_version', {
      p_configuration_item_id: itemId,
      p_version_number: versionData.version_number,
      p_user_id: userRecord.id
    });

    if (error) throw error;

    // Update version with additional data if provided
    if (versionData.version_label || versionData.version_notes || versionData.release_notes || versionData.change_request_id) {
      await platformDb
        .from('configuration_item_versions')
        .update({
          version_label: versionData.version_label,
          version_notes: versionData.version_notes,
          release_notes: versionData.release_notes,
          change_request_id: versionData.change_request_id,
          change_authorization: versionData.change_authorization,
          storage_location: versionData.storage_location,
          repository_commit: versionData.repository_commit,
          document_url: versionData.document_url,
          content_hash: versionData.content_hash,
          file_size: versionData.file_size,
          file_type: versionData.file_type,
          checksum: versionData.checksum
        })
        .eq('id', versionId);
    }

    return await getVersionById(versionId);
  } catch (error) {
    console.error('Error creating version:', error);
    throw error;
  }
}

/**
 * Get version by ID
 * @param {string} versionId - Version ID
 * @returns {Promise<Object>} Version
 */
export async function getVersionById(versionId) {
  try {
    const { data, error } = await platformDb
      .from('configuration_item_versions')
      .select(`
        *,
        configuration_item:configuration_item_id(id, configuration_item_identifier, item_name),
        status:status_id(id, status_name, status_code),
        change_request:change_request_id(id, change_request_number),
        baseline:baseline_id(id, baseline_identifier, baseline_name),
        created_by_user:version_created_by(id, full_name, email)
      `)
      .eq('id', versionId)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching version by ID:', error);
    throw error;
  }
}

/**
 * Get versions by Configuration Item
 * @param {string} itemId - Configuration Item ID
 * @returns {Promise<Array>} Versions
 */
export async function getVersionsByItem(itemId) {
  try {
    const { data, error } = await platformDb
      .from('configuration_item_versions')
      .select(`
        *,
        status:status_id(id, status_name, status_code),
        change_request:change_request_id(id, change_request_number),
        baseline:baseline_id(id, baseline_identifier),
        created_by_user:version_created_by(id, full_name, email)
      `)
      .eq('configuration_item_id', itemId)
      .order('version_date', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching versions by item:', error);
    throw error;
  }
}

/**
 * Get current version of Configuration Item
 * @param {string} itemId - Configuration Item ID
 * @returns {Promise<Object|null>} Current version
 */
export async function getCurrentVersion(itemId) {
  try {
    const { data, error } = await platformDb
      .from('configuration_item_versions')
      .select(`
        *,
        status:status_id(id, status_name, status_code),
        change_request:change_request_id(id, change_request_number),
        baseline:baseline_id(id, baseline_identifier),
        created_by_user:version_created_by(id, full_name, email)
      `)
      .eq('configuration_item_id', itemId)
      .eq('is_current_version', true)
      .maybeSingle();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching current version:', error);
    throw error;
  }
}

/**
 * Get version history for Configuration Item
 * @param {string} itemId - Configuration Item ID
 * @returns {Promise<Array>} Version history
 */
export async function getVersionHistory(itemId) {
  try {
    const { data, error } = await platformDb.rpc('get_ci_version_history', {
      p_configuration_item_id: itemId
    });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching version history:', error);
    throw error;
  }
}

/**
 * Set current version
 * @param {string} itemId - Configuration Item ID
 * @param {string} versionId - Version ID to set as current
 * @returns {Promise<Object>} Updated version
 */
export async function setCurrentVersion(itemId, versionId) {
  try {
    // Unset all current versions for this item
    await platformDb
      .from('configuration_item_versions')
      .update({ is_current_version: false })
      .eq('configuration_item_id', itemId);

    // Set new current version
    const { data, error } = await platformDb
      .from('configuration_item_versions')
      .update({ is_current_version: true })
      .eq('id', versionId)
      .select(`
        *,
        configuration_item:configuration_item_id(id, configuration_item_identifier, item_name)
      `)
      .single();

    if (error) throw error;

    // Update configuration item
    await platformDb
      .from('configuration_items')
      .update({
        current_version: data.version_number,
        latest_version_id: versionId
      })
      .eq('id', itemId);

    return data;
  } catch (error) {
    console.error('Error setting current version:', error);
    throw error;
  }
}
