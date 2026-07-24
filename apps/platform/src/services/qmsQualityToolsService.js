/**
 * QMS Quality Tools Service
 * API functions for managing tools and techniques
 */

import { supabase } from './supabaseClient'

/**
 * Add quality tool
 * @param {string} qmsId - QMS ID
 * @param {Object} toolData - Tool data
 * @returns {Promise<Object>} Created tool
 */
export async function addTool(qmsId, toolData) {
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
      .from('qms_tools_techniques')
      .select('display_order')
      .eq('qms_id', qmsId)
      .order('display_order', { ascending: false })
      .limit(1)

    const nextOrder = existing && existing.length > 0
      ? existing[0].display_order + 1
      : 0

    const insertData = {
      ...toolData,
      qms_id: qmsId,
      display_order: toolData.display_order ?? nextOrder,
      created_by: userData.id
    }

    const { data, error } = await supabase
      .from('qms_tools_techniques')
      .insert(insertData)
      .select('*')
      .single()

    if (error) throw error

    return data
  } catch (error) {
    console.error('Error adding quality tool:', error)
    throw error
  }
}

/**
 * Update quality tool
 * @param {string} toolId - Tool ID
 * @param {Object} updates - Updates to apply
 * @returns {Promise<Object>} Updated tool
 */
export async function updateTool(toolId, updates) {
  try {
    const updateData = {
      ...updates,
      updated_at: new Date().toISOString()
    }

    const { data, error } = await supabase
      .from('qms_tools_techniques')
      .update(updateData)
      .eq('id', toolId)
      .select('*')
      .single()

    if (error) throw error

    return data
  } catch (error) {
    console.error('Error updating quality tool:', error)
    throw error
  }
}

/**
 * Delete quality tool
 * @param {string} toolId - Tool ID
 * @returns {Promise<boolean>} Success
 */
export async function deleteTool(toolId) {
  try {
    const { error } = await supabase
      .from('qms_tools_techniques')
      .delete()
      .eq('id', toolId)

    if (error) throw error

    return true
  } catch (error) {
    console.error('Error deleting quality tool:', error)
    throw error
  }
}

/**
 * Get quality tools for QMS
 * @param {string} qmsId - QMS ID
 * @returns {Promise<Array>} Quality tools
 */
export async function getTools(qmsId) {
  try {
    const { data, error } = await supabase
      .from('qms_tools_techniques')
      .select('*')
      .eq('qms_id', qmsId)
      .order('display_order', { ascending: true })

    if (error) throw error

    return data || []
  } catch (error) {
    console.error('Error fetching quality tools:', error)
    throw error
  }
}

export default {
  addTool,
  updateTool,
  deleteTool,
  getTools
}
