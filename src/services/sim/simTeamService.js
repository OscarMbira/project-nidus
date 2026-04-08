/**
 * Simulator practice teams — My Team / functional roles (v345)
 */

import { simDb, platformDb } from '../supabase/supabaseClient'

async function enrichAuthUsers(rows) {
  const authIds = [...new Set((rows || []).map((r) => r.user_id).filter(Boolean))]
  if (!authIds.length) return rows || []
  const { data: users, error } = await platformDb
    .from('users')
    .select('id, full_name, email, avatar_url, auth_user_id')
    .in('auth_user_id', authIds)
  if (error) throw error
  const byAuth = new Map((users || []).map((u) => [u.auth_user_id, u]))
  return (rows || []).map((r) => ({ ...r, profile: byAuth.get(r.user_id) || null }))
}

export async function getSimMyTeams() {
  try {
    const { data: authData } = await simDb.auth.getUser()
    const uid = authData?.user?.id
    if (!uid) return { success: false, data: [], error: 'Not authenticated' }

    const { data, error } = await simDb
      .from('practice_teams')
      .select(
        `
        id,
        team_name,
        team_description,
        team_type,
        practice_project_id,
        team_lead_user_id,
        team_status,
        practice_projects:practice_project_id ( id, project_name, project_code )
      `
      )
      .eq('team_lead_user_id', uid)
      .eq('is_deleted', false)
      .eq('team_status', 'active')
      .order('team_name', { ascending: true })

    if (error) throw error
    return { success: true, data: data || [] }
  } catch (error) {
    console.error('getSimMyTeams:', error)
    return { success: false, data: [], error: error.message }
  }
}

export async function getSimTeamMembers(practiceTeamId) {
  try {
    const { data, error } = await simDb
      .from('practice_team_members')
      .select(
        'id, practice_team_id, user_id, member_role, allocation_percentage, joined_at, left_at, is_active'
      )
      .eq('practice_team_id', practiceTeamId)
      .eq('is_active', true)
      .order('joined_at', { ascending: false })

    if (error) throw error
    const enriched = await enrichAuthUsers(data || [])
    return { success: true, data: enriched }
  } catch (error) {
    console.error('getSimTeamMembers:', error)
    return { success: false, data: [], error: error.message }
  }
}

export async function getSimAssignablePracticeMembers(practiceProjectId, practiceTeamId) {
  try {
    const { data: memberships, error: mErr } = await simDb
      .from('practice_project_memberships')
      .select('user_id')
      .eq('practice_project_id', practiceProjectId)
      .eq('is_active', true)

    if (mErr) throw mErr

    const { data: existing, error: eErr } = await simDb
      .from('practice_team_members')
      .select('user_id')
      .eq('practice_team_id', practiceTeamId)
      .eq('is_active', true)

    if (eErr) throw eErr

    const taken = new Set((existing || []).map((r) => r.user_id))
    const pool = (memberships || []).filter((m) => m.user_id && !taken.has(m.user_id))

    const authIds = pool.map((p) => p.user_id)
    if (!authIds.length) return { success: true, data: [] }

    const { data: users, error: uErr } = await platformDb
      .from('users')
      .select('id, full_name, email, avatar_url, auth_user_id')
      .in('auth_user_id', authIds)

    if (uErr) throw uErr
    const byAuth = new Map((users || []).map((u) => [u.auth_user_id, u]))

    const rows = pool.map((p) => ({
      user_id: p.user_id,
      profile: byAuth.get(p.user_id) || null,
    }))

    return { success: true, data: rows }
  } catch (error) {
    console.error('getSimAssignablePracticeMembers:', error)
    return { success: false, data: [], error: error.message }
  }
}

export async function addSimTeamMember(practiceTeamId, authUserId, memberRole, allocationPct) {
  try {
    const { data, error } = await simDb
      .from('practice_team_members')
      .insert({
        practice_team_id: practiceTeamId,
        user_id: authUserId,
        member_role: memberRole || null,
        allocation_percentage: allocationPct ?? 100,
        is_active: true,
      })
      .select()
      .single()

    if (error) throw error
    return { success: true, data }
  } catch (error) {
    console.error('addSimTeamMember:', error)
    return { success: false, data: null, error: error.message }
  }
}

export async function updateSimTeamMember(teamMemberId, memberRole, allocationPct) {
  try {
    const { data, error } = await simDb
      .from('practice_team_members')
      .update({
        member_role: memberRole,
        allocation_percentage: allocationPct,
        updated_at: new Date().toISOString(),
      })
      .eq('id', teamMemberId)
      .select()
      .single()

    if (error) throw error
    return { success: true, data }
  } catch (error) {
    console.error('updateSimTeamMember:', error)
    return { success: false, data: null, error: error.message }
  }
}

export async function removeSimTeamMember(teamMemberId) {
  try {
    const { error } = await simDb
      .from('practice_team_members')
      .update({
        is_active: false,
        left_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', teamMemberId)

    if (error) throw error
    return { success: true }
  } catch (error) {
    console.error('removeSimTeamMember:', error)
    return { success: false, error: error.message }
  }
}

export async function getSimTeamFunctionalRoles(practiceTeamId) {
  try {
    const { data, error } = await simDb
      .from('practice_team_functional_roles')
      .select('id, practice_team_id, role_label, sort_order, is_active')
      .eq('practice_team_id', practiceTeamId)
      .eq('is_active', true)
      .order('sort_order', { ascending: true })

    if (error) throw error
    return { success: true, data: data || [] }
  } catch (error) {
    console.error('getSimTeamFunctionalRoles:', error)
    return { success: false, data: [], error: error.message }
  }
}

export async function addSimTeamFunctionalRole(practiceTeamId, roleLabel) {
  try {
    const label = (roleLabel || '').trim()
    if (!label) return { success: false, error: 'Role label is required' }

    const { data, error } = await simDb
      .from('practice_team_functional_roles')
      .insert({
        practice_team_id: practiceTeamId,
        role_label: label,
        sort_order: 999,
        is_active: true,
      })
      .select()
      .single()

    if (error) throw error
    return { success: true, data }
  } catch (error) {
    console.error('addSimTeamFunctionalRole:', error)
    return { success: false, data: null, error: error.message }
  }
}

export async function updateSimTeamFunctionalRole(roleId, roleLabel) {
  try {
    const label = (roleLabel || '').trim()
    if (!label) return { success: false, error: 'Role label is required' }

    const { data, error } = await simDb
      .from('practice_team_functional_roles')
      .update({ role_label: label, updated_at: new Date().toISOString() })
      .eq('id', roleId)
      .select()
      .single()

    if (error) throw error
    return { success: true, data }
  } catch (error) {
    console.error('updateSimTeamFunctionalRole:', error)
    return { success: false, data: null, error: error.message }
  }
}

export async function deleteSimTeamFunctionalRole(practiceTeamId, roleId) {
  try {
    const { data: fr, error: fe } = await simDb
      .from('practice_team_functional_roles')
      .select('role_label')
      .eq('id', roleId)
      .eq('practice_team_id', practiceTeamId)
      .maybeSingle()

    if (fe) throw fe
    if (!fr?.role_label) return { success: false, error: 'Role not found' }

    const { count, error: cErr } = await simDb
      .from('practice_team_members')
      .select('*', { count: 'exact', head: true })
      .eq('practice_team_id', practiceTeamId)
      .eq('is_active', true)
      .eq('member_role', fr.role_label)

    if (cErr) throw cErr
    if ((count || 0) > 0) {
      return {
        success: false,
        error: 'Cannot delete: members use this functional role',
      }
    }

    const { error: de } = await simDb.from('practice_team_functional_roles').delete().eq('id', roleId)
    if (de) throw de
    return { success: true }
  } catch (error) {
    console.error('deleteSimTeamFunctionalRole:', error)
    return { success: false, error: error.message }
  }
}

/** PMO-style: all practice teams for simulator owner scope — limited to teams user can see via RLS */
/**
 * Sum allocation % for an auth user across active practice team memberships (optional UI warning).
 * @param {string} authUserId — auth.users.id
 * @param {string|null} excludeTeamMemberId — exclude this membership row when editing
 */
export async function getSimUserTotalTeamAllocation(authUserId, excludeTeamMemberId = null) {
  try {
    let q = simDb
      .from('practice_team_members')
      .select('allocation_percentage')
      .eq('user_id', authUserId)
      .eq('is_active', true)

    if (excludeTeamMemberId) {
      q = q.neq('id', excludeTeamMemberId)
    }

    const { data, error } = await q
    if (error) throw error

    const total = (data || []).reduce((s, r) => s + Number(r.allocation_percentage || 0), 0)
    return { success: true, total }
  } catch (error) {
    console.error('getSimUserTotalTeamAllocation:', error)
    return { success: false, total: 0, error: error.message }
  }
}

export async function getSimAllTeamsWithMembers() {
  try {
    const { data: teams, error: te } = await simDb
      .from('practice_teams')
      .select(
        `
        id,
        team_name,
        team_type,
        practice_project_id,
        team_lead_user_id,
        team_status,
        practice_projects:practice_project_id ( project_name, project_code )
      `
      )
      .eq('is_deleted', false)
      .eq('team_status', 'active')
      .order('team_name', { ascending: true })

    if (te) throw te
    const list = teams || []
    if (!list.length) return { success: true, data: [] }

    const ids = list.map((t) => t.id)
    const { data: members, error: me } = await simDb
      .from('practice_team_members')
      .select('id, practice_team_id, user_id, member_role, allocation_percentage, joined_at')
      .in('practice_team_id', ids)
      .eq('is_active', true)

    if (me) throw me

    const { data: roles, error: re } = await simDb
      .from('practice_team_functional_roles')
      .select('id, practice_team_id, role_label, sort_order')
      .in('practice_team_id', ids)
      .eq('is_active', true)

    if (re) throw re

    const memEnriched = await enrichAuthUsers(members || [])

    const group = (rows, key) => {
      const m = new Map()
      for (const r of rows || []) {
        const k = r[key]
        if (!m.has(k)) m.set(k, [])
        m.get(k).push(r)
      }
      return m
    }

    const mm = group(memEnriched, 'practice_team_id')
    const rm = group(roles, 'practice_team_id')

    return {
      success: true,
      data: list.map((t) => ({
        ...t,
        members: mm.get(t.id) || [],
        functionalRoles: rm.get(t.id) || [],
      })),
    }
  } catch (error) {
    console.error('getSimAllTeamsWithMembers:', error)
    return { success: false, data: [], error: error.message }
  }
}
