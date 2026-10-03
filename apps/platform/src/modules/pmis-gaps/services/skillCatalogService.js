/**
 * Skills Matrix (GAP-11, v963 Phase 18) — org-wide skill catalog + 1-5 competency matrix
 * (public.skill_catalog / skill_categories / member_skills / skill_requirements /
 * skill_endorsements). Fully separate from `resource_skills` / ResourceSkills.jsx (a simpler,
 * free-text per-resource skill list) — not touched here.
 *
 * None of these tables have created_by/updated_by columns, so writes use direct queries rather
 * than gapDataService's generic create/updateGapRecord (which would inject those columns and
 * error). Reads reuse listGapRecords/getGapRecord.
 */
import { platformDb } from '@nidus/supabase'
import { getCurrentUserAccountId } from '@nidus/shared/utils/accountResolution'
import { listGapRecords, getGapRecord } from './gapDataService'

function db() {
  return platformDb
}

export const COMPETENCY_LEVELS = [
  { value: 1, label: '1 — Novice' },
  { value: 2, label: '2 — Beginner' },
  { value: 3, label: '3 — Competent' },
  { value: 4, label: '4 — Proficient' },
  { value: 5, label: '5 — Expert' },
]

// ── Categories ───────────────────────────────────────────────────────────────

export async function listCategories(accountId) {
  const { data, error } = await db()
    .from('skill_categories')
    .select('*')
    .eq('account_id', accountId)
    .eq('is_deleted', false)
    .order('sort_order', { ascending: true })
  if (error) throw error
  return data || []
}

export async function createCategory({ accountId, categoryName, categoryCode, sortOrder = 0 }) {
  if (!categoryName?.trim()) throw new Error('Category name is required')
  const { data, error } = await db()
    .from('skill_categories')
    .insert({ account_id: accountId, category_name: categoryName.trim(), category_code: categoryCode || null, sort_order: sortOrder })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteCategory(id) {
  const { error } = await db().from('skill_categories').update({ is_deleted: true, updated_at: new Date().toISOString() }).eq('id', id)
  if (error) throw error
}

// ── Catalog (skills) ─────────────────────────────────────────────────────────

export async function listSkills(accountId) {
  const { data, error } = await db()
    .from('skill_catalog')
    .select('*, skill_categories(category_name)')
    .eq('account_id', accountId)
    .eq('is_deleted', false)
    .order('skill_name', { ascending: true })
  if (error) throw error
  return (data || []).map((row) => ({ ...row, category_name: row.skill_categories?.category_name || null }))
}

export async function getSkill(id) {
  return getGapRecord('skill_catalog', id)
}

export async function createSkill({ accountId, categoryId, skillName, skillCode, description }) {
  if (!skillName?.trim()) throw new Error('Skill name is required')
  const { data, error } = await db()
    .from('skill_catalog')
    .insert({
      account_id: accountId,
      category_id: categoryId || null,
      skill_name: skillName.trim(),
      skill_code: skillCode || null,
      description: description || null,
    })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateSkill(id, { categoryId, skillName, skillCode, description }) {
  if (!skillName?.trim()) throw new Error('Skill name is required')
  const { data, error } = await db()
    .from('skill_catalog')
    .update({
      category_id: categoryId || null,
      skill_name: skillName.trim(),
      skill_code: skillCode || null,
      description: description || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteSkill(id) {
  const { error } = await db().from('skill_catalog').update({ is_deleted: true, updated_at: new Date().toISOString() }).eq('id', id)
  if (error) throw error
}

// ── Member competency matrix ────────────────────────────────────────────────

/** Members of the account, resolved via project membership (users has no account_id column). */
export async function listAccountMembers(accountId) {
  const { data: projects } = await db().from('projects').select('id').eq('account_id', accountId).eq('is_deleted', false)
  const projectIds = (projects || []).map((p) => p.id)
  if (!projectIds.length) return []
  const { data: memberships } = await db().from('user_projects').select('user_id').in('project_id', projectIds).eq('is_deleted', false)
  const userIds = [...new Set((memberships || []).map((m) => m.user_id))]
  if (!userIds.length) return []
  const { data: users, error } = await db().from('users').select('id, full_name, email').in('id', userIds).order('full_name', { ascending: true })
  if (error) throw error
  return users || []
}

export async function listMemberSkills(accountId) {
  const { data, error } = await db().from('member_skills').select('*').eq('account_id', accountId).eq('is_deleted', false)
  if (error) throw error
  return data || []
}

export async function upsertMemberSkill({ accountId, userId, skillId, competencyLevel, assessedAt, notes }) {
  if (!userId || !skillId) throw new Error('userId and skillId are required')
  const { data, error } = await db()
    .from('member_skills')
    .upsert(
      {
        account_id: accountId,
        user_id: userId,
        skill_id: skillId,
        competency_level: competencyLevel,
        assessed_at: assessedAt || null,
        notes: notes || null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,skill_id' }
    )
    .select()
    .single()
  if (error) throw error
  return data
}

// ── Requirements ─────────────────────────────────────────────────────────────

export async function listRequirements({ projectId } = {}) {
  let q = db().from('skill_requirements').select('*, skill_catalog(skill_name)').eq('is_deleted', false)
  if (projectId) q = q.eq('project_id', projectId)
  const { data, error } = await q.order('created_at', { ascending: false })
  if (error) throw error
  return (data || []).map((row) => ({ ...row, skill_name: row.skill_catalog?.skill_name || null }))
}

export async function getRequirement(id) {
  return getGapRecord('skill_requirements', id)
}

export async function createRequirement({ projectId, entityType, entityId, skillId, requiredLevel }) {
  if (!entityType || !entityId || !skillId) throw new Error('entityType, entityId and skillId are required')
  const { data, error } = await db()
    .from('skill_requirements')
    .insert({
      project_id: projectId || null,
      entity_type: entityType,
      entity_id: entityId,
      skill_id: skillId,
      required_level: requiredLevel || 3,
    })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateRequirement(id, { projectId, entityType, entityId, skillId, requiredLevel }) {
  const { data, error } = await db()
    .from('skill_requirements')
    .update({
      project_id: projectId || null,
      entity_type: entityType,
      entity_id: entityId,
      skill_id: skillId,
      required_level: requiredLevel || 3,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteRequirement(id) {
  const { error } = await db().from('skill_requirements').update({ is_deleted: true, updated_at: new Date().toISOString() }).eq('id', id)
  if (error) throw error
}

export { getCurrentUserAccountId, listGapRecords }

export default {
  COMPETENCY_LEVELS,
  listCategories,
  createCategory,
  deleteCategory,
  listSkills,
  getSkill,
  createSkill,
  updateSkill,
  deleteSkill,
  listAccountMembers,
  listMemberSkills,
  upsertMemberSkill,
  listRequirements,
  getRequirement,
  createRequirement,
  updateRequirement,
  deleteRequirement,
}
