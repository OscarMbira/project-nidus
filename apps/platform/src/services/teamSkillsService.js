/**
 * Skill Matrix (v1109). Wires Teams.jsx's Skill Matrix tab to skill_categories/skill_catalog/
 * member_skills (SQL/v643/v644, RLS broadened in SQL/v1129). member_skills.user_id references
 * auth.users(id) directly (not public.users.id) — matches supabase.auth.getUser().id as-is.
 */
import { platformDb as supabase } from './supabaseClient'

/**
 * Active project members with both their internal id and auth uid — the join needed to match
 * member_skills.user_id (auth uid) back to a displayable person.
 */
export async function listProjectTeamMembers(projectId) {
  if (!projectId) return { success: true, data: [] }
  try {
    const { data, error } = await supabase
      .from('project_memberships')
      .select('user_id, users:users!project_memberships_user_id_fkey ( id, auth_user_id, full_name, email, avatar_url )')
      .eq('project_id', projectId)
      .eq('is_active', true)
    if (error) throw error
    return {
      success: true,
      data: (data || [])
        .filter((r) => r.users?.auth_user_id)
        .map((r) => ({
          userId: r.users.id,
          authUserId: r.users.auth_user_id,
          fullName: r.users.full_name,
          email: r.users.email,
          avatarUrl: r.users.avatar_url,
        })),
    }
  } catch (error) {
    console.error('listProjectTeamMembers:', error)
    return { success: false, data: [], error: error.message }
  }
}

export async function listSkillCategories() {
  try {
    const { data, error } = await supabase
      .from('skill_categories')
      .select('*')
      .eq('is_deleted', false)
      .order('sort_order')
    if (error) throw error
    return { success: true, data: data || [] }
  } catch (error) {
    console.error('listSkillCategories:', error)
    return { success: false, data: [], error: error.message }
  }
}

export async function listSkillCatalog() {
  try {
    const { data, error } = await supabase
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

/** PMO-Admin-only — RLS also enforces this, this is the service-level guard. */
export async function addSkillCategory(accountId, categoryName) {
  try {
    const { data, error } = await supabase
      .from('skill_categories')
      .insert({ account_id: accountId, category_name: categoryName })
      .select()
      .single()
    if (error) throw error
    return { success: true, data }
  } catch (error) {
    console.error('addSkillCategory:', error)
    return { success: false, error: error.message }
  }
}

export async function addSkillToCatalog(accountId, categoryId, skillName) {
  try {
    const { data, error } = await supabase
      .from('skill_catalog')
      .insert({ account_id: accountId, category_id: categoryId || null, skill_name: skillName })
      .select()
      .single()
    if (error) throw error
    return { success: true, data }
  } catch (error) {
    console.error('addSkillToCatalog:', error)
    return { success: false, error: error.message }
  }
}

/** All member_skills rows for the given project's active team members. */
export async function listMemberSkills(projectId) {
  const membersRes = await listProjectTeamMembers(projectId)
  if (!membersRes.success) return { success: false, data: [], error: membersRes.error }
  const authIds = membersRes.data.map((m) => m.authUserId)
  if (authIds.length === 0) return { success: true, data: [] }

  try {
    const { data, error } = await supabase
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

/** Add/update the current (or, as PMO Admin, any) user's competency for a skill. */
export async function upsertMemberSkill(accountId, authUserId, skillId, competencyLevel, notes = null) {
  try {
    const { data, error } = await supabase
      .from('member_skills')
      .upsert(
        {
          account_id: accountId,
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
    const { error } = await supabase.from('member_skills').update({ is_deleted: true }).eq('id', id)
    if (error) throw error
    return { success: true }
  } catch (error) {
    console.error('deleteMemberSkill:', error)
    return { success: false, error: error.message }
  }
}

export default {
  listProjectTeamMembers,
  listSkillCategories,
  listSkillCatalog,
  addSkillCategory,
  addSkillToCatalog,
  listMemberSkills,
  upsertMemberSkill,
  deleteMemberSkill,
}
