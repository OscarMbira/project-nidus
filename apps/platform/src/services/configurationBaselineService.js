/**
 * Configuration Baseline Service
 * API functions for managing configuration baselines
 */

import { platformDb, supabase } from './supabaseClient';

/**
 * Create baseline
 * @param {string} projectId - Project ID
 * @param {string} baselineTypeId - Baseline type ID
 * @param {string} baselineName - Baseline name
 * @param {Array<string>} ciVersionIds - Configuration item version IDs
 * @returns {Promise<Object>} Created baseline
 */
export async function createBaseline(projectId, baselineTypeId, baselineName, ciVersionIds = []) {
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
    const { data: baselineId, error } = await platformDb.rpc('create_baseline', {
      p_project_id: projectId,
      p_baseline_type_id: baselineTypeId,
      p_baseline_name: baselineName,
      p_user_id: userRecord.id,
      p_ci_version_ids: ciVersionIds
    });

    if (error) throw error;

    return await getBaselineById(baselineId);
  } catch (error) {
    console.error('Error creating baseline:', error);
    throw error;
  }
}

/**
 * Get baseline by ID
 * @param {string} baselineId - Baseline ID
 * @returns {Promise<Object>} Baseline
 */
export async function getBaselineById(baselineId) {
  try {
    const { data, error } = await platformDb
      .from('configuration_baselines')
      .select(`
        *,
        project:project_id(id, project_name, project_code),
        cfg_ms:cfg_ms_id(id, cms_reference),
        baseline_type:baseline_type_id(id, baseline_type, baseline_type_code),
        created_by_user:created_by_user_id(id, full_name, email),
        approved_by_user:approved_by_user_id(id, full_name, email),
        change_request:change_request_id(id, change_request_number)
      `)
      .eq('id', baselineId)
      .eq('is_deleted', false)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching baseline by ID:', error);
    throw error;
  }
}

/**
 * Get baselines by project
 * @param {string} projectId - Project ID
 * @returns {Promise<Array>} Baselines
 */
export async function getBaselinesByProject(projectId) {
  try {
    const { data, error } = await platformDb
      .from('configuration_baselines')
      .select(`
        *,
        baseline_type:baseline_type_id(id, baseline_type, baseline_type_code),
        created_by_user:created_by_user_id(id, full_name, email),
        approved_by_user:approved_by_user_id(id, full_name, email)
      `)
      .eq('project_id', projectId)
      .eq('is_deleted', false)
      .order('baseline_date', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching baselines by project:', error);
    throw error;
  }
}

/**
 * Get baselines by type
 * @param {string} projectId - Project ID
 * @param {string} baselineTypeCode - Baseline type code
 * @returns {Promise<Array>} Baselines
 */
export async function getBaselinesByType(projectId, baselineTypeCode) {
  try {
    const { data, error } = await platformDb
      .from('configuration_baselines')
      .select(`
        *,
        baseline_type:baseline_type_id(id, baseline_type, baseline_type_code),
        created_by_user:created_by_user_id(id, full_name, email)
      `)
      .eq('project_id', projectId)
      .eq('baseline_type_code', baselineTypeCode)
      .eq('is_deleted', false)
      .order('baseline_date', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching baselines by type:', error);
    throw error;
  }
}

/**
 * Get current baseline of specified type
 * @param {string} projectId - Project ID
 * @param {string} baselineTypeCode - Baseline type code
 * @returns {Promise<Object|null>} Current baseline
 */
export async function getCurrentBaseline(projectId, baselineTypeCode) {
  try {
    const { data: baselineId, error } = await platformDb.rpc('get_current_baseline', {
      p_project_id: projectId,
      p_baseline_type_code: baselineTypeCode
    });

    if (error) throw error;
    if (!baselineId) return null;

    return await getBaselineById(baselineId);
  } catch (error) {
    console.error('Error fetching current baseline:', error);
    throw error;
  }
}

/**
 * Update baseline
 * @param {string} baselineId - Baseline ID
 * @param {Object} updates - Updates to apply
 * @returns {Promise<Object>} Updated baseline
 */
export async function updateBaseline(baselineId, updates) {
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
      .from('configuration_baselines')
      .update(updateData)
      .eq('id', baselineId)
      .select(`
        *,
        project:project_id(id, project_name, project_code),
        baseline_type:baseline_type_id(id, baseline_type, baseline_type_code),
        updated_by_user:updated_by(id, full_name, email)
      `)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error updating baseline:', error);
    throw error;
  }
}

/**
 * Approve baseline
 * @param {string} baselineId - Baseline ID
 * @param {string} approverId - Approver user ID
 * @param {string} comments - Approval comments (optional)
 * @returns {Promise<Object>} Updated baseline
 */
export async function approveBaseline(baselineId, approverId, comments = null) {
  try {
    return await updateBaseline(baselineId, {
      approved_by_user_id: approverId,
      approval_date: new Date().toISOString().split('T')[0],
      approval_status: 'approved',
      approval_comments: comments,
      baseline_status: 'approved',
      is_current_baseline: true
    });
  } catch (error) {
    console.error('Error approving baseline:', error);
    throw error;
  }
}

/**
 * Get baseline items
 * @param {string} baselineId - Baseline ID
 * @returns {Promise<Array>} Baseline items
 */
export async function getBaselineItems(baselineId) {
  try {
    const { data, error } = await platformDb
      .from('configuration_baseline_items')
      .select(`
        *,
        configuration_item:configuration_item_id(id, configuration_item_identifier, item_name),
        version:version_id(id, version_number, version_date),
        included_by:included_by_user_id(id, full_name, email)
      `)
      .eq('baseline_id', baselineId)
      .order('included_date', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching baseline items:', error);
    throw error;
  }
}

/**
 * Add item to baseline
 * @param {string} baselineId - Baseline ID
 * @param {string} ciVersionId - Configuration item version ID
 * @returns {Promise<Object>} Created baseline item
 */
export async function addItemToBaseline(baselineId, ciVersionId) {
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

    // Get configuration item ID from version
    const { data: version } = await platformDb
      .from('configuration_item_versions')
      .select('configuration_item_id')
      .eq('id', ciVersionId)
      .single();

    if (!version) throw new Error('Version not found');

    const { data, error } = await platformDb
      .from('configuration_baseline_items')
      .insert({
        baseline_id: baselineId,
        configuration_item_id: version.configuration_item_id,
        version_id: ciVersionId,
        included_by_user_id: userRecord.id
      })
      .select(`
        *,
        configuration_item:configuration_item_id(id, configuration_item_identifier, item_name),
        version:version_id(id, version_number)
      `)
      .single();

    if (error) throw error;

    // Update version
    await platformDb
      .from('configuration_item_versions')
      .update({
        is_in_baseline: true,
        baseline_id: baselineId,
        baseline_date: new Date().toISOString().split('T')[0]
      })
      .eq('id', ciVersionId);

    // Update configuration item
    await platformDb
      .from('configuration_items')
      .update({
        is_in_baseline: true,
        current_baseline_id: baselineId
      })
      .eq('id', version.configuration_item_id);

    return data;
  } catch (error) {
    console.error('Error adding item to baseline:', error);
    throw error;
  }
}

/**
 * Remove item from baseline
 * @param {string} baselineId - Baseline ID
 * @param {string} configurationItemId - Configuration Item ID
 * @returns {Promise<boolean>} Success
 */
export async function removeItemFromBaseline(baselineId, configurationItemId) {
  try {
    // Get version ID before deleting
    const { data: baselineItem } = await platformDb
      .from('configuration_baseline_items')
      .select('version_id')
      .eq('baseline_id', baselineId)
      .eq('configuration_item_id', configurationItemId)
      .single();

    // Delete baseline item
    const { error } = await platformDb
      .from('configuration_baseline_items')
      .delete()
      .eq('baseline_id', baselineId)
      .eq('configuration_item_id', configurationItemId);

    if (error) throw error;

    // Update version if exists
    if (baselineItem?.version_id) {
      await platformDb
        .from('configuration_item_versions')
        .update({
          is_in_baseline: false,
          baseline_id: null,
          baseline_date: null
        })
        .eq('id', baselineItem.version_id);
    }

    // Update configuration item
    await platformDb
      .from('configuration_items')
      .update({
        is_in_baseline: false,
        current_baseline_id: null
      })
      .eq('id', configurationItemId);

    return true;
  } catch (error) {
    console.error('Error removing item from baseline:', error);
    throw error;
  }
}

/**
 * Compare two baselines
 * @param {string} baselineId1 - First baseline ID
 * @param {string} baselineId2 - Second baseline ID
 * @returns {Promise<Array>} Differences
 */
export async function compareBaselines(baselineId1, baselineId2) {
  try {
    const { data, error } = await platformDb.rpc('get_baseline_differences', {
      p_baseline_id_1: baselineId1,
      p_baseline_id_2: baselineId2
    });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error comparing baselines:', error);
    throw error;
  }
}
