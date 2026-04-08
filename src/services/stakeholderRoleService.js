/**
 * Stakeholder Role Service
 * Service for managing stakeholder roles lookup data
 */

import { supabase } from './supabaseClient'

/**
 * Get all active stakeholder roles for dropdown
 * @returns {Promise<Array>} Array of role objects
 */
export const getActiveRoles = async () => {
  try {
    // Let RLS policy handle filtering - just fetch all accessible rows
    const { data, error } = await supabase
      .from('stakeholder_roles')
      .select('id, role_name, role_code, role_category, description, is_active, is_deleted')
      .order('display_order', { ascending: true })
      .order('role_name', { ascending: true })

    if (error) {
      // Check if table doesn't exist
      if (error.code === '42P01' || error.message?.includes('does not exist')) {
        console.warn('stakeholder_roles table does not exist. Please run SQL/v256_stakeholder_roles_table.sql')
      }
      console.error('Supabase error:', error.code, error.message, error.details)
      throw error
    }

    // Transform to format expected by SearchableSelect
    return (data || []).map(role => ({
      value: role.role_name,
      label: role.role_name,
      code: role.role_code,
      category: role.role_category,
      description: role.description
    }))
  } catch (error) {
    console.error('Error fetching stakeholder roles:', error)
    console.error('If the table does not exist, please run: SQL/v256_stakeholder_roles_table.sql')
    return []
  }
}

/**
 * Get roles grouped by category
 * @returns {Promise<Object>} Object with categories as keys
 */
export const getRolesGroupedByCategory = async () => {
  try {
    const roles = await getActiveRoles()

    const grouped = roles.reduce((acc, role) => {
      const category = role.category || 'Other'
      if (!acc[category]) {
        acc[category] = []
      }
      acc[category].push(role)
      return acc
    }, {})

    return grouped
  } catch (error) {
    console.error('Error fetching grouped roles:', error)
    return {}
  }
}

/**
 * Search roles by name
 * @param {string} query - Search query
 * @returns {Promise<Array>} Filtered roles
 */
export const searchRoles = async (query) => {
  try {
    if (!query || query.length < 2) {
      return getActiveRoles()
    }

    const { data, error } = await supabase
      .from('stakeholder_roles')
      .select('id, role_name, role_code, role_category, description')
      .eq('is_active', true)
      .eq('is_deleted', false)
      .or(`role_name.ilike.%${query}%,role_code.ilike.%${query}%`)
      .order('display_order', { ascending: true })
      .limit(20)

    if (error) throw error

    return (data || []).map(role => ({
      value: role.role_name,
      label: role.role_name,
      code: role.role_code,
      category: role.role_category,
      description: role.description
    }))
  } catch (error) {
    console.error('Error searching stakeholder roles:', error)
    return []
  }
}

/**
 * Get a single role by ID
 * @param {string} id - Role ID
 * @returns {Promise<Object|null>} Role object or null
 */
export const getRoleById = async (id) => {
  try {
    const { data, error } = await supabase
      .from('stakeholder_roles')
      .select('*')
      .eq('id', id)
      .eq('is_deleted', false)
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error fetching role by ID:', error)
    return null
  }
}

/**
 * Get a role by name
 * @param {string} name - Role name
 * @returns {Promise<Object|null>} Role object or null
 */
export const getRoleByName = async (name) => {
  try {
    const { data, error } = await supabase
      .from('stakeholder_roles')
      .select('*')
      .eq('role_name', name)
      .eq('is_deleted', false)
      .single()

    if (error && error.code !== 'PGRST116') throw error
    return data || null
  } catch (error) {
    console.error('Error fetching role by name:', error)
    return null
  }
}

/**
 * Create a new role (admin only)
 * @param {Object} roleData - Role data
 * @returns {Promise<Object>} Result object
 */
export const createRole = async (roleData) => {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    const { data, error } = await supabase
      .from('stakeholder_roles')
      .insert({
        ...roleData,
        created_by: user.id
      })
      .select()
      .single()

    if (error) throw error
    return { success: true, data }
  } catch (error) {
    console.error('Error creating stakeholder role:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Update a role (admin only)
 * @param {string} id - Role ID
 * @param {Object} roleData - Updated role data
 * @returns {Promise<Object>} Result object
 */
export const updateRole = async (id, roleData) => {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    const { data, error } = await supabase
      .from('stakeholder_roles')
      .update({
        ...roleData,
        updated_by: user.id,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return { success: true, data }
  } catch (error) {
    console.error('Error updating stakeholder role:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Soft delete a role (admin only)
 * @param {string} id - Role ID
 * @returns {Promise<Object>} Result object
 */
export const deleteRole = async (id) => {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    const { error } = await supabase
      .from('stakeholder_roles')
      .update({
        is_deleted: true,
        deleted_by: user.id,
        deleted_at: new Date().toISOString()
      })
      .eq('id', id)

    if (error) throw error
    return { success: true }
  } catch (error) {
    console.error('Error deleting stakeholder role:', error)
    return { success: false, error: error.message }
  }
}

export default {
  getActiveRoles,
  getRolesGroupedByCategory,
  searchRoles,
  getRoleById,
  getRoleByName,
  createRole,
  updateRole,
  deleteRole
}
