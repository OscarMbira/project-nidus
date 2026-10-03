/**
 * Skill Matrix — Simulator (v1109). Mirrors apps/platform/src/services/teamSkillsService.js
 * against sim.skill_categories/skill_catalog/member_skills (SQL/v963r, RLS broadened in
 * SQL/v1130). member_skills.user_id references auth.users(id) directly — matches
 * simDb.auth.getUser().id as-is.
 */
import { simDb, platformDb } from '../supabase/supabaseClient'

/**
 * Active practice-project members with both their internal id and auth uid.
 */
export async function listPracticeProjectTeamMembers(practiceProjectId) {
  if (!practiceProjectId) return { success: true, data: [] }
  try {
    const { data: memberships, error } = await simDb
      .from('practice_project_memberships')
      .select('user_id')
      .eq('practice_project_id', practiceProjectId)
      .eq('is_active', true)
    if (error) throw error

    const authIds = [...new Set((memberships || []).map((m) => m.user_id).filter(Boolean))]
    if (authIds.length === 0) return { success: true, data: [] }

    const { data: users, error: usersErr } = await platformDb
      .from('users')
      .select('id, auth_user_id, full_name, email, avatar_url')
      .in('auth_user_id', authIds)
    if (usersErr) throw usersErr

    return {
      success: true,
      data: (users || []).map((u) => ({
        userId: u.id,
        authUserId: u.auth_user_id,
        fullName: u.full_name,
        email: u.email,
        avatarUrl: u.avatar_url,
      })),
    }
  } catch (error) {
    console.error('listPracticeProjectTeamMembers:', error)
    return { success: false, data: [], error: error.message }
  }
}

export async function listSkillCategories() {
  try {
    const { data, error } = await simDb.from('skill_categories').select('*').eq('is_deleted', false).order('sort_order')
    if (error) throw error
    return { success: true, data: data || [] }
  } catch (error) {
    console.error('listSkillCategories:', error)
    return { success: false, data: [], error: error.message }
  }
}

export async function listSkillCatalog() {
  try {
    const { data, error } = await simDb
      .from('skill_catalog')
      .select('*, category:skill_categories(category_name)')
      .eq('is_deleted', false)
      .order('skill_name')
    if (error) throw error
    return { success: true, data: data || [] }
  } catch (error) {
    console.error('listSkillCatalog:', error)
    return { success: false, data: [], error: error.message }
  }
}

/**
 * PMO-Admin-only — RLS also enforces this, this is the service-level guard.
 * Unlike public.skill_catalog, sim.skill_catalog has no account_id column — it tracks
 * provenance via created_by instead (confirmed against SQL/v963r).
 */
export async function addSkillToCatalog(categoryId, skillName) {
  try {
    const { data: { user } } = await simDb.auth.getUser()
    const { data, error } = await simDb
      .from('skill_catalog')
      .insert({ created_by: user?.id || null, category_id: categoryId || null, skill_name: skillName })
      .select()
      .single()
    if (error) throw error
    return { success: true, data }
  } catch (error) {
    console.error('addSkillToCatalog:', error)
    return { success: false, error: error.message }
  }
}

/** All member_skills rows for the given practice project's active team members. */
export async function listMemberSkills(practiceProjectId) {
  const membersRes = await listPracticeProjectTeamMembers(practiceProjectId)
  if (!membersRes.success) return { success: false, data: [], error: membersRes.error }
  const authIds = membersRes.data.map((m) => m.authUserId)
  if (authIds.length === 0) return { success: true, data: [] }

  try {
    const { data, error } = await simDb
      .from('member_skills')
      .select('*, skill:skill_catalog(skill_name, category_id)')
      .in('user_id', authIds)
      .eq('is_deleted', false)
    if (error) throw error

    const byAuthId = new Map(membersRes.data.map((m) => [m.authUserId, m]))
    return {
      success: true,
      data: (data || []).map((row) => ({ ...row, member: byAuthId.get(row.user_id) || null })),
    }
  } catch (error) {
    console.error('listMemberSkills:', error)
    return { success: false, data: [], error: error.message }
  }
}

export async function upsertMemberSkill(authUserId, skillId, competencyLevel, notes = null) {
  try {
    const { data, error } = await simDb
      .from('member_skills')
      .upsert(
        {
          user_id: authUserId,
          skill_id: skillId,
          competency_level: competencyLevel,
          assessed_at: new Date().toISOString().slice(0, 10),
          notes,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,skill_id' },
      )
      .select()
      .single()
    if (error) throw error
    return { success: true, data }
  } catch (error) {
    console.error('upsertMemberSkill:', error)
    return { success: false, error: error.message }
  }
}

export async function deleteMemberSkill(id) {
  try {
    const { error } = await simDb.from('member_skills').update({ is_deleted: true }).eq('id', id)
    if (error) throw error
    return { success: true }
  } catch (error) {
    console.error('deleteMemberSkill:', error)
    return { success: false, error: error.message }
  }
}

export default {
  listPracticeProjectTeamMembers,
  listSkillCategories,
  listSkillCatalog,
  addSkillToCatalog,
  listMemberSkills,
  upsertMemberSkill,
  deleteMemberSkill,
}
