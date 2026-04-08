/**
 * PID Team Structure Service
 * Service for managing team structure within PIDs
 */

import { supabase } from './supabaseClient'

/**
 * Get team structure for a PID
 */
export const getTeamStructure = async (pidId) => {
  try {
    const { data, error } = await supabase
      .from('pid_team_members')
      .select(`
        *,
        user:user_id (id, email, full_name)
      `)
      .eq('pid_id', pidId)
      .eq('is_deleted', false)
      .order('role_type', { ascending: true })
      .order('created_at', { ascending: true })

    if (error) throw error
    return data || []
  } catch (error) {
    console.error('Error fetching team structure:', error)
    return []
  }
}

/**
 * Add team member to PID
 */
export const addTeamMember = async (pidId, memberData) => {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    const { data, error } = await supabase
      .from('pid_team_members')
      .insert({
        pid_id: pidId,
        ...memberData,
        created_by: user.id
      })
      .select()
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

    const { data, error } = await supabase
      .from('pid_team_members')
      .update({
        ...memberData,
        updated_by: user.id,
        updated_at: new Date().toISOString()
      })
      .eq('id', memberId)
      .select()
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

    const { error } = await supabase
      .from('pid_team_members')
      .update({
        is_deleted: true,
        deleted_by: user.id,
        deleted_at: new Date().toISOString()
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
  removeTeamMember
}
