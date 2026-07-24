/**
 * CMS Communication Channels Service
 * API functions for managing communication channels
 */

import { platformDb, supabase } from './supabaseClient';

/**
 * Add communication channel
 * @param {string} cmsId - CMS ID
 * @param {Object} channelData - Channel data
 * @returns {Promise<Object>} Created channel
 */
export async function addChannel(cmsId, channelData) {
  try {
    // Get next display order
    const { data: existing } = await platformDb
      .from('cms_communication_channels')
      .select('display_order')
      .eq('cms_id', cmsId)
      .order('display_order', { ascending: false })
      .limit(1);

    const nextOrder = existing && existing.length > 0
      ? existing[0].display_order + 1
      : 0;

    const insertData = {
      ...channelData,
      cms_id: cmsId,
      display_order: channelData.display_order ?? nextOrder
    };

    const { data, error } = await platformDb
      .from('cms_communication_channels')
      .insert(insertData)
      .select('*')
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error adding channel:', error);
    throw error;
  }
}

/**
 * Update communication channel
 * @param {string} channelId - Channel ID
 * @param {Object} updates - Updates to apply
 * @returns {Promise<Object>} Updated channel
 */
export async function updateChannel(channelId, updates) {
  try {
    const { data, error } = await platformDb
      .from('cms_communication_channels')
      .update(updates)
      .eq('id', channelId)
      .select('*')
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error updating channel:', error);
    throw error;
  }
}

/**
 * Delete communication channel
 * @param {string} channelId - Channel ID
 * @returns {Promise<boolean>} Success
 */
export async function deleteChannel(channelId) {
  try {
    const { error } = await platformDb
      .from('cms_communication_channels')
      .delete()
      .eq('id', channelId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error deleting channel:', error);
    throw error;
  }
}

/**
 * Get channels for CMS
 * @param {string} cmsId - CMS ID
 * @returns {Promise<Array>} Channels
 */
export async function getChannels(cmsId) {
  try {
    const { data, error } = await platformDb
      .from('cms_communication_channels')
      .select('*')
      .eq('cms_id', cmsId)
      .order('display_order', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching channels:', error);
    throw error;
  }
}

/**
 * Get preferred channels for CMS
 * @param {string} cmsId - CMS ID
 * @returns {Promise<Array>} Preferred channels
 */
export async function getPreferredChannels(cmsId) {
  try {
    const { data, error } = await platformDb
      .from('cms_communication_channels')
      .select('*')
      .eq('cms_id', cmsId)
      .eq('is_preferred', true)
      .order('display_order', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching preferred channels:', error);
    throw error;
  }
}
