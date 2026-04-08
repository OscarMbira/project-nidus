/**
 * PPD Skills Service
 * API functions for managing required skills
 */

import { supabase } from './supabaseClient'

/**
 * Add skill
 * @param {string} ppdId - PPD ID
 * @param {Object} skillData - Skill data
 * @returns {Promise<Object>} Created skill
 */
export async function addSkill(ppdId, skillData) {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    const { data: userData } = await supabase
      .from('users')
      .select('id')
      .eq('auth_user_id', user.id)
      .single()

    if (!userData) throw new Error('User not found')

    // Get next display order
    const { data: existing } = await supabase
      .from('ppd_skills_required')
      .select('display_order')
      .eq('ppd_id', ppdId)
      .eq('is_deleted', false)
      .order('display_order', { ascending: false })
      .limit(1)

    const nextOrder = existing && existing.length > 0
      ? existing[0].display_order + 1
      : 0

    const insertData = {
      ...skillData,
      ppd_id: ppdId,
      display_order: skillData.display_order ?? nextOrder,
      created_by: userData.id
    }

    const { data, error } = await supabase
      .from('ppd_skills_required')
      .insert(insertData)
      .select('*')
      .single()

    if (error) throw error

    return data
  } catch (error) {
    console.error('Error adding skill:', error)
    throw error
  }
}

/**
 * Update skill
 * @param {string} skillId - Skill ID
 * @param {Object} updates - Updates to apply
 * @returns {Promise<Object>} Updated skill
 */
export async function updateSkill(skillId, updates) {
  try {
    const updateData = {
      ...updates,
      updated_at: new Date().toISOString()
    }

    const { data, error } = await supabase
      .from('ppd_skills_required')
      .update(updateData)
      .eq('id', skillId)
      .select('*')
      .single()

    if (error) throw error

    return data
  } catch (error) {
    console.error('Error updating skill:', error)
    throw error
  }
}

/**
 * Delete skill
 * @param {string} skillId - Skill ID
 * @returns {Promise<boolean>} Success
 */
export async function deleteSkill(skillId) {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    const { data: userData } = await supabase
      .from('users')
      .select('id')
      .eq('auth_user_id', user.id)
      .single()

    if (!userData) throw new Error('User not found')

    const { error } = await supabase
      .from('ppd_skills_required')
      .update({
        is_deleted: true,
        deleted_at: new Date().toISOString(),
        deleted_by: userData.id
      })
      .eq('id', skillId)

    if (error) throw error

    return true
  } catch (error) {
    console.error('Error deleting skill:', error)
    throw error
  }
}

/**
 * Get skills for PPD
 * @param {string} ppdId - PPD ID
 * @returns {Promise<Array>} Skills
 */
export async function getSkills(ppdId) {
  try {
    const { data, error } = await supabase
      .from('ppd_skills_required')
      .select('*')
      .eq('ppd_id', ppdId)
      .eq('is_deleted', false)
      .order('display_order', { ascending: true })

    if (error) throw error

    return data || []
  } catch (error) {
    console.error('Error fetching skills:', error)
    throw error
  }
}

/**
 * Get critical skills for PPD
 * @param {string} ppdId - PPD ID
 * @returns {Promise<Array>} Critical skills
 */
export async function getCriticalSkills(ppdId) {
  try {
    const { data, error } = await supabase
      .from('ppd_skills_required')
      .select('*')
      .eq('ppd_id', ppdId)
      .eq('is_critical', true)
      .eq('is_deleted', false)
      .order('display_order', { ascending: true })

    if (error) throw error

    return data || []
  } catch (error) {
    console.error('Error fetching critical skills:', error)
    throw error
  }
}

export default {
  addSkill,
  updateSkill,
  deleteSkill,
  getSkills,
  getCriticalSkills
}
