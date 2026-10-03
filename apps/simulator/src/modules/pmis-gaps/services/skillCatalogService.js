/**
 * Skills Matrix (GAP-11, v963 Phase 18) — Simulator mirror of Platform's
 * skillCatalogService.js, on sim.skill_catalog / sim.skill_categories /
 * sim.member_skills / sim.skill_requirements / sim.skill_endorsements.
 * See SQL/v963r_pmis_gap_phase18_skills_matrix_sim_and_rls.sql.
 *
 * Deliberate schema adaptation, not a literal 1:1 mirror: Simulator has no
 * organisation/accounts concept at the schema level, so there is no `accountId`
 * parameter anywhere in this file (Platform's version threads one through every
 * call). sim.skill_categories/sim.skill_catalog are shared reference content
 * (readable by all, writable by whoever created the row via `created_by`).
 * sim.member_skills is single-user-owned (RLS: `user_id = auth.uid()` for ALL
 * operations, no cross-user read) — so the "account members" competency matrix
 * concept doesn't carry over; listMemberSkills()/upsertMemberSkill() operate on
 * the CURRENT user only, and SkillCompetencyMatrixPage renders a one-row
 * self-assessment grid instead of Platform's multi-member matrix.
 */
import { simDb } from '@nidus/supabase'
import { getGapRecord } from './gapDataService'

function db() {
  return simDb
}

async function currentUserId() {
  const {
    data: { user },
  } = await db().auth.getUser()
  return user?.id || null
}

export const COMPETENCY_LEVELS = [
  { value: 1, label: '1 — Novice' },
  { value: 2, label: '2 — Beginner' },
  { value: 3, label: '3 — Competent' },
  { value: 4, label: '4 — Proficient' },
  { value: 5, label: '5 — Expert' },
]

// ── Categories ───────────────────────────────────────────────────────────────

export async function listCategories() {
  const { data, error } = await db()
    .from('skill_categories')
    .select('*')
    .eq('is_deleted', false)
    .order('sort_order', { ascending: true })
  if (error) throw error
  return data || []
}

export async function createCategory({ categoryName, categoryCode, sortOrder = 0 }) {
  if (!categoryName?.trim()) throw new Error('Category name is required')
  const userId = await currentUserId()
  const { data, error } = await db()
    .from('skill_categories')
    .insert({ created_by: userId, category_name: categoryName.trim(), category_code: categoryCode || null, sort_order: sortOrder })
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

export async function listSkills() {
  const { data, error } = await db()
    .from('skill_catalog')
    .select('*, skill_categories(category_name)')
    .eq('is_deleted', false)
    .order('skill_name', { ascending: true })
  if (error) throw error
  return (data || []).map((row) => ({ ...row, category_name: row.skill_categories?.category_name || null }))
}

export async function getSkill(id) {
  return getGapRecord('skill_catalog', id, { sim: true })
}

export async function createSkill({ categoryId, skillName, skillCode, description }) {
  if (!skillName?.trim()) throw new Error('Skill name is required')
  const userId = await currentUserId()
  const { data, error } = await db()
    .from('skill_catalog')
    .insert({
      created_by: userId,
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

// ── Member competency (self-assessment only — see file header) ─────────────

/** Always just the current user — sim.member_skills RLS has no cross-user read. */
export async function listAccountMembers() {
  const {
    data: { user },
  } = await db().auth.getUser()
  if (!user) return []
  return [{ id: user.id, full_name: user.email || 'You', email: user.email }]
}

export async function listMemberSkills() {
  const userId = await currentUserId()
  if (!userId) return []
  const { data, error } = await db().from('member_skills').select('*').eq('user_id', userId).eq('is_deleted', false)
  if (error) throw error
  return data || []
}

export async function upsertMemberSkill({ userId, skillId, competencyLevel, assessedAt, notes }) {
  if (!userId || !skillId) throw new Error('userId and skillId are required')
  const { data, error } = await db()
    .from('member_skills')
    .upsert(
      {
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
  return getGapRecord('skill_requirements', id, { sim: true })
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
