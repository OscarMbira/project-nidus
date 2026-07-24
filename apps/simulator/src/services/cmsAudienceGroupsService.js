/**
 * CMS Audience Groups Service
 * API functions for managing audience groups
 */

import { platformDb } from './supabaseClient';

/**
 * Add audience group
 * @param {string} cmsId - CMS ID
 * @param {Object} groupData - Group data
 * @returns {Promise<Object>} Created group
 */
export async function addAudienceGroup(cmsId, groupData) {
  try {
    const { data: existing } = await platformDb
      .from('cms_audience_groups')
      .select('display_order')
      .eq('cms_id', cmsId)
      .order('display_order', { ascending: false })
      .limit(1);

    const nextOrder = existing && existing.length > 0
      ? existing[0].display_order + 1
      : 0;

    const insertData = {
      ...groupData,
      cms_id: cmsId,
      display_order: groupData.display_order ?? nextOrder
    };

    const { data, error } = await platformDb
      .from('cms_audience_groups')
      .insert(insertData)
      .select('*')
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error adding audience group:', error);
    throw error;
  }
}

/**
 * Update audience group
 * @param {string} groupId - Group ID
 * @param {Object} updates - Updates to apply
 * @returns {Promise<Object>} Updated group
 */
export async function updateAudienceGroup(groupId, updates) {
  try {
    const { data, error } = await platformDb
      .from('cms_audience_groups')
      .update(updates)
      .eq('id', groupId)
      .select('*')
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error updating audience group:', error);
    throw error;
  }
}

/**
 * Delete audience group
 * @param {string} groupId - Group ID
 * @returns {Promise<boolean>} Success
 */
export async function deleteAudienceGroup(groupId) {
  try {
    const { error } = await platformDb
      .from('cms_audience_groups')
      .delete()
      .eq('id', groupId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error deleting audience group:', error);
    throw error;
  }
}

/**
 * Get audience groups for CMS
 * @param {string} cmsId - CMS ID
 * @returns {Promise<Array>} Audience groups
 */
export async function getAudienceGroups(cmsId) {
  try {
    const { data, error } = await platformDb
      .from('cms_audience_groups')
      .select('*')
      .eq('cms_id', cmsId)
      .order('display_order', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching audience groups:', error);
    throw error;
  }
}

/**
 * Get groups by type
 * @param {string} cmsId - CMS ID
 * @param {string} groupType - Group type
 * @returns {Promise<Array>} Filtered groups
 */
export async function getGroupsByType(cmsId, groupType) {
  try {
    const { data, error } = await platformDb
      .from('cms_audience_groups')
      .select('*')
      .eq('cms_id', cmsId)
      .eq('group_type', groupType)
      .order('display_order', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching groups by type:', error);
    throw error;
  }
}
