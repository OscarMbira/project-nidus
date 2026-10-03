/**
 * PID Team Structure Service
 * Uses public.pid_team_structure (v214) — not pid_team_members.
 */

import { supabase } from './supabaseClient'

const TABLE = 'pid_team_structure'

/**
 * Get team structure for a PID
 * @returns {{ success: boolean, data: Array, error?: string }}
 */
export const getTeamStructure = async (pidId) => {
  try {
    const { data, error } = await supabase
      .from(TABLE)
      .select('*')
      .eq('pid_id', pidId)
      .eq('is_deleted', false)
      .order('role_type', { ascending: true })
      .order('display_order', { ascending: true })
      .order('created_at', { ascending: true })

    if (error) throw error
    return { success: true, data: data || [] }
  } catch (error) {
    console.error('Error fetching team structure:', error)
    return { success: false, data: [], error: error.message }
  }
}

/**
 * Add team member / role row to PID
 */
export const addTeamMember = async (pidId, memberData) => {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    const { data: userData } = await supabase
      .from('users')
      .select('id')
      .eq('auth_user_id', user.id)
      .eq('is_deleted', false)
      .maybeSingle()

    if (!userData) throw new Error('User not found')

    const row = {
      pid_id: pidId,
      role_name: memberData.role_name || memberData.role || 'Team Member',
      role_description: memberData.role_description || null,
      assigned_user_id: memberData.assigned_user_id || memberData.user_id || null,
      assigned_user_name: memberData.assigned_user_name || memberData.full_name || null,
      role_type: memberData.role_type || 'project_management',
      responsibilities: memberData.responsibilities || null,
      authority_level: memberData.authority_level || null,
      display_order: memberData.display_order ?? 0,
      created_by: userData.id,
      updated_by: userData.id,
    }

    const { data, error } = await supabase
      .from(TABLE)
      .insert(row)
      .select('*')
      .single()

    if (error) throw error
    return { success: true, data }
  } catch (error) {
    console.error('Error adding team member:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Update team member
 */
export const updateTeamMember = async (memberId, memberData) => {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    const { data: userData } = await supabase
      .from('users')
      .select('id')
      .eq('auth_user_id', user.id)
      .eq('is_deleted', false)
      .maybeSingle()

    if (!userData) throw new Error('User not found')

    const patch = {
      updated_by: userData.id,
      updated_at: new Date().toISOString(),
    }
    if (memberData.role_name !== undefined) patch.role_name = memberData.role_name
    if (memberData.role_description !== undefined) patch.role_description = memberData.role_description
    if (memberData.assigned_user_id !== undefined || memberData.user_id !== undefined) {
      patch.assigned_user_id = memberData.assigned_user_id ?? memberData.user_id
    }
    if (memberData.assigned_user_name !== undefined) patch.assigned_user_name = memberData.assigned_user_name
    if (memberData.role_type !== undefined) patch.role_type = memberData.role_type
    if (memberData.responsibilities !== undefined) patch.responsibilities = memberData.responsibilities
    if (memberData.authority_level !== undefined) patch.authority_level = memberData.authority_level
    if (memberData.display_order !== undefined) patch.display_order = memberData.display_order

    const { data, error } = await supabase
      .from(TABLE)
      .update(patch)
      .eq('id', memberId)
      .select('*')
      .single()

    if (error) throw error
    return { success: true, data }
  } catch (error) {
    console.error('Error updating team member:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Remove team member (soft delete)
 */
export const removeTeamMember = async (memberId) => {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    const { data: userData } = await supabase
      .from('users')
      .select('id')
      .eq('auth_user_id', user.id)
      .eq('is_deleted', false)
      .maybeSingle()

    if (!userData) throw new Error('User not found')

    const { error } = await supabase
      .from(TABLE)
      .update({
        is_deleted: true,
        deleted_by: userData.id,
        deleted_at: new Date().toISOString(),
      })
      .eq('id', memberId)

    if (error) throw error
    return { success: true }
  } catch (error) {
    console.error('Error removing team member:', error)
    return { success: false, error: error.message }
  }
}

export default {
  getTeamStructure,
  addTeamMember,
  updateTeamMember,
  removeTeamMember,
}
