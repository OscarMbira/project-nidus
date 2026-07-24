/**
 * Practice Team Service
 * CRUD operations for practice teams (sim schema)
 */

import { simDb } from '../supabase/supabaseClient'

async function getCurrentUserId() {
  const { data: { user: authUser } } = await simDb.auth.getUser()
  if (!authUser) throw new Error('User not authenticated')
  const { data: userData, error } = await simDb.from('users').select('id').eq('auth_user_id', authUser.id).single()
  if (error || !userData) throw new Error('User not found')
  return userData.id
}

export async function getPracticeTeams(projectId, filters = {}) {
  try {
    let query = simDb.from('practice_teams').select('*').eq('practice_project_id', projectId).eq('is_deleted', false)
    if (filters.team_status) query = query.eq('team_status', filters.team_status)
    const { data, error } = await query.order('created_at', { ascending: false })
    if (error) throw error
    return { success: true, data: data || [] }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

export async function getPracticeTeamMembers(teamId) {
  try {
    const { data, error } = await simDb.from('practice_team_members').select('*').eq('practice_team_id', teamId).eq('is_active', true).order('joined_at', { ascending: false })
    if (error) throw error
    return { success: true, data: data || [] }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

export async function createPracticeTeam(projectId, teamData) {
  try {
    const userId = await getCurrentUserId()
    const { data, error } = await simDb.from('practice_teams').insert({ ...teamData, practice_project_id: projectId, user_id: userId, created_by: userId }).select().single()
    if (error) throw error
    return { success: true, data }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

export async function addPracticeTeamMember(teamId, userId, memberData = {}) {
  try {
    const { data, error } = await simDb.from('practice_team_members').upsert({ practice_team_id: teamId, user_id: userId, ...memberData, is_active: true }, { onConflict: 'practice_team_id,user_id' }).select().single()
    if (error) throw error
    return { success: true, data }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

export async function removePracticeTeamMember(teamId, userId) {
  try {
    const { data, error } = await simDb.from('practice_team_members').update({ is_active: false, left_at: new Date().toISOString() }).eq('practice_team_id', teamId).eq('user_id', userId).select().single()
    if (error) throw error
    return { success: true, data }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

export default { getPracticeTeams, getPracticeTeamMembers, createPracticeTeam, addPracticeTeamMember, removePracticeTeamMember }
