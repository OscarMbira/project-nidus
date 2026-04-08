/**
 * Product Description Skills Required Service
 * API functions for managing PD development skills
 */

import { supabase } from './supabaseClient';

/**
 * Add Skill
 * @param {string} pdId - Product Description ID
 * @param {Object} skillData - Skill data
 * @returns {Promise<Object>} Created skill
 */
export async function addSkill(pdId, skillData) {
  try {
    const { data: { user } } = await platformDb.auth.getUser();
    if (!user) {
      return { success: false, error: 'User not authenticated' };
    }

    // Get next display order
    const { data: existing } = await platformDb
      .from('pd_skills_required')
      .select('display_order')
      .eq('product_description_id', pdId)
      .order('display_order', { ascending: false })
      .limit(1);

    const nextOrder = existing && existing.length > 0
      ? existing[0].display_order + 1
      : 0;

    const { data: userData } = await supabase
      .from('users')
      .select('id')
      .eq('auth_user_id', user.id)
      .eq('is_deleted', false)
      .single();

    const insertData = {
      ...skillData,
      product_description_id: pdId,
      display_order: skillData.display_order ?? nextOrder,
      created_by: userData.id
    };

    const { data, error } = await supabase
      .from('pd_skills_required')
      .insert(insertData)
      .select('*')
      .single();

    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    console.error('Error adding skill:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Update Skill
 * @param {string} skillId - Skill ID
 * @param {Object} updates - Updates to apply
 * @returns {Promise<Object>} Updated skill
 */
export async function updateSkill(skillId, updates) {
  try {
    const { data, error } = await supabase
      .from('pd_skills_required')
      .update(updates)
      .eq('id', skillId)
      .select('*')
      .single();

    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    console.error('Error updating skill:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Delete Skill
 * @param {string} skillId - Skill ID
 * @returns {Promise<Object>} Deletion result
 */
export async function deleteSkill(skillId) {
  try {
    const { data: { user } } = await platformDb.auth.getUser();
    if (!user) {
      return { success: false, error: 'User not authenticated' };
    }

    const { data: userData } = await supabase
      .from('users')
      .select('id')
      .eq('auth_user_id', user.id)
      .eq('is_deleted', false)
      .single();

    const { error } = await platformDb
      .from('pd_skills_required')
      .update({
        is_deleted: true,
        deleted_at: new Date().toISOString(),
        deleted_by: userData.id
      })
      .eq('id', skillId);

    if (error) throw error;

    return { success: true };
  } catch (error) {
    console.error('Error deleting skill:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get Skills
 * @param {string} pdId - Product Description ID
 * @returns {Promise<Object>} Skills array
 */
export async function getSkills(pdId) {
  try {
    const { data, error } = await supabase
      .from('pd_skills_required')
      .select('*')
      .eq('product_description_id', pdId)
      .eq('is_deleted', false)
      .order('display_order', { ascending: true });

    if (error) throw error;

    return { success: true, data: data || [] };
  } catch (error) {
    console.error('Error getting skills:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get Critical Skills
 * @param {string} pdId - Product Description ID
 * @returns {Promise<Object>} Critical skills array
 */
export async function getCriticalSkills(pdId) {
  try {
    const { data, error } = await supabase
      .from('pd_skills_required')
      .select('*')
      .eq('product_description_id', pdId)
      .eq('is_critical', true)
      .eq('is_deleted', false)
      .order('display_order', { ascending: true });

    if (error) throw error;

    return { success: true, data: data || [] };
  } catch (error) {
    console.error('Error getting critical skills:', error);
    return { success: false, error: error.message };
  }
}
