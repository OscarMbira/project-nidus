/**
 * Simulator practice project memberships — sim schema only (simDb)
 */

import { simDb, platformDb } from '../supabase/supabaseClient'

const ASSIGNABLE_ROLE_NAMES = [
  'team_manager',
  'team_member',
  'project_assurance',
  'quality_assurance',
  'change_authority',
]

export function getSimAssignableRoles() {
  return ASSIGNABLE_ROLE_NAMES.map((role_name) => ({
    role_name,
    role_display_name: role_name
      .split('_')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' '),
  }))
}

/**
 * Practice projects the current user owns (creator)
 */
export async function getSimUserPracticeProjects() {
  try {
    const { data: authData } = await simDb.auth.getUser()
    const uid = authData?.user?.id
    if (!uid) return { success: false, data: [], error: 'Not authenticated' }

    const { data, error } = await simDb
      .from('practice_projects')
      .select('id, project_name, project_code')
      .eq('user_id', uid)
      .eq('is_deleted', false)
      .order('project_name', { ascending: true })

    if (error) throw error
    return { success: true, data: data || [], error: null }
  } catch (error) {
    console.error('getSimUserPracticeProjects:', error)
    return { success: false, data: [], error: error.message || 'Failed to load projects' }
  }
}

async function enrichMembersWithProfiles(rows) {
  const authIds = [...new Set((rows || []).map((r) => r.user_id).filter(Boolean))]
  if (!authIds.length) return rows || []

  const { data: users, error } = await platformDb
    .from('users')
    .select('id, full_name, email, auth_user_id')
    .in('auth_user_id', authIds)

  if (error) throw error
  const byAuth = new Map((users || []).map((u) => [u.auth_user_id, u]))

  return (rows || []).map((r) => ({
    ...r,
    profile: byAuth.get(r.user_id) || null,
  }))
}

export async function getSimProjectMembers(practiceProjectId) {
  try {
    const { data, error } = await simDb
      .from('practice_project_memberships')
      .select('id, practice_project_id, user_id, role_name, is_active, joined_at, created_at')
      .eq('practice_project_id', practiceProjectId)
      .eq('is_active', true)
      .order('joined_at', { ascending: false })

    if (error) throw error
    const enriched = await enrichMembersWithProfiles(data || [])
    return { success: true, data: enriched, error: null }
  } catch (error) {
    console.error('getSimProjectMembers:', error)
    return { success: false, data: [], error: error.message || 'Failed to load members' }
  }
}

export async function addSimProjectMember(practiceProjectId, authUserId, roleName) {
  try {
    if (!ASSIGNABLE_ROLE_NAMES.includes(roleName)) {
      return { success: false, error: 'Invalid role' }
    }

    const { data, error } = await simDb
      .from('practice_project_memberships')
      .insert({
        practice_project_id: practiceProjectId,
        user_id: authUserId,
        role_name: roleName,
        is_active: true,
      })
      .select()
      .single()

    if (error) throw error
    return { success: true, data, error: null }
  } catch (error) {
    console.error('addSimProjectMember:', error)
    return { success: false, data: null, error: error.message || 'Failed to add member' }
  }
}

export async function updateSimMemberRole(membershipId, roleName) {
  try {
    if (!ASSIGNABLE_ROLE_NAMES.includes(roleName)) {
      return { success: false, error: 'Invalid role' }
    }

    const { data, error } = await simDb
      .from('practice_project_memberships')
      .update({
        role_name: roleName,
        updated_at: new Date().toISOString(),
      })
      .eq('id', membershipId)
      .select()
      .single()

    if (error) throw error
    return { success: true, data, error: null }
  } catch (error) {
    console.error('updateSimMemberRole:', error)
    return { success: false, data: null, error: error.message || 'Failed to update role' }
  }
}

export async function removeSimProjectMember(membershipId) {
  try {
    const { data, error } = await simDb
      .from('practice_project_memberships')
      .update({
        is_active: false,
        left_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', membershipId)
      .select()
      .single()

    if (error) throw error
    return { success: true, data, error: null }
  } catch (error) {
    console.error('removeSimProjectMember:', error)
    return { success: false, data: null, error: error.message || 'Failed to remove member' }
  }
}

/**
 * Search platform users by email for adding to practice project (limited)
 */
export async function searchUsersForSimInvite(searchTerm, limit = 12) {
  try {
    const q = (searchTerm || '').trim()
    if (q.length < 2) return { success: true, data: [], error: null }

    const { data, error } = await platformDb
      .from('users')
      .select('id, full_name, email, auth_user_id')
      .eq('is_deleted', false)
      .ilike('email', `%${q.replace(/%/g, '')}%`)
      .limit(limit)

    if (error) throw error
    return { success: true, data: data || [], error: null }
  } catch (error) {
    console.error('searchUsersForSimInvite:', error)
    return { success: false, data: [], error: error.message || 'Search failed' }
  }
}
