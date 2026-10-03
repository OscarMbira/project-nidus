/**
 * "Add from Built-in Roles" — practice project role library service (v1105, Simulator).
 * Mirrors apps/platform/src/services/projectRoleLibraryService.js: lists the same role catalog
 * Manage Roles clones from (built-in + this organisation's own custom roles, public schema) and
 * copies selected roles into a practice project's Practice Project Roles & Skills catalog
 * (sim.practice_project_functional_roles). Skills entered on the picker are saved to the
 * practice project copy only; for a custom org role whose own skills are blank, they are also
 * backfilled onto that role via the guarded `fill_org_custom_role_skills_if_blank` RPC — a
 * built-in role is never written to from here.
 */

import { simDb } from '../supabase/supabaseClient'
import { getCloneSourceRoles, fillOrgCustomRoleSkillsIfBlank } from '../organisationCustomRoleService'
import { getCurrentUserAccountId } from '@nidus/shared/utils/accountResolution'

/**
 * Built-in + this organisation's own active custom roles, for the "Add from Built-in Roles"
 * picker. Reuses the same source Manage Roles clones from (getCloneSourceRoles) so the two
 * stay in sync automatically.
 * @returns {Promise<{success: boolean, data: array, accountId: string|null, error: string|null}>}
 */
export async function listRoleLibrary() {
  try {
    const accountId = await getCurrentUserAccountId()
    if (!accountId) return { success: false, data: [], accountId: null, error: 'Could not resolve your organisation' }

    const res = await getCloneSourceRoles(accountId)
    if (!res.success) return { success: false, data: [], accountId, error: res.error }

    return { success: true, data: res.data, accountId, error: null }
  } catch (error) {
    console.error('listRoleLibrary (sim):', error)
    return { success: false, data: [], accountId: null, error: error.message || 'Failed to load role library' }
  }
}

/**
 * Adds selected library roles to a practice project's Roles & Skills catalog. Each pick becomes
 * a practice_project_functional_roles row (insert, or reactivate + refresh if a matching label
 * already exists but was previously removed); rows already active are skipped. For a custom org
 * role (accountId set) whose own role_skills is blank, the entered skills are also backfilled
 * onto that role (never for a built-in role).
 * @param {string} practiceProjectId
 * @param {Array<{projectRoleId: string, roleName: string, skills: string, isCustom: boolean}>} picks
 * @returns {Promise<{success: boolean, added: number, error: string|null}>}
 */
export async function addRolesFromLibrary(practiceProjectId, picks = []) {
  try {
    if (!practiceProjectId) return { success: false, added: 0, error: 'Practice project id is required' }
    const cleaned = (picks || [])
      .map((p) => ({
        projectRoleId: p.projectRoleId,
        roleName: String(p.roleName || '').trim(),
        skills: String(p.skills || '').trim(),
        isCustom: !!p.isCustom,
      }))
      .filter((p) => p.roleName && p.skills)
    if (!cleaned.length) return { success: false, added: 0, error: 'Select at least one role and enter its skills' }

    const { data: existingRows, error: existingErr } = await simDb
      .from('practice_project_functional_roles')
      .select('id, role_label, is_active')
      .eq('practice_project_id', practiceProjectId)
    if (existingErr) throw existingErr
    const existingByLabel = new Map(
      (existingRows || []).map((r) => [String(r.role_label || '').toLowerCase(), r]),
    )

    const { data: maxRow } = await simDb
      .from('practice_project_functional_roles')
      .select('sort_order')
      .eq('practice_project_id', practiceProjectId)
      .order('sort_order', { ascending: false })
      .limit(1)
      .maybeSingle()
    let sortOrder = (maxRow?.sort_order ?? 0) + 10

    let added = 0
    for (const pick of cleaned) {
      const match = existingByLabel.get(pick.roleName.toLowerCase())
      if (match?.is_active) continue // already in the catalog — skip silently, picker marks it disabled

      if (match) {
        const { error } = await simDb
          .from('practice_project_functional_roles')
          .update({
            role_label: pick.roleName,
            required_skills: pick.skills,
            source_project_role_id: pick.projectRoleId || null,
            is_active: true,
            updated_at: new Date().toISOString(),
          })
          .eq('id', match.id)
        if (error) throw error
      } else {
        const { error } = await simDb.from('practice_project_functional_roles').insert({
          practice_project_id: practiceProjectId,
          role_label: pick.roleName,
          required_skills: pick.skills,
          source_project_role_id: pick.projectRoleId || null,
          sort_order: sortOrder,
          is_active: true,
        })
        if (error) throw error
        sortOrder += 10
      }
      added += 1

      if (pick.isCustom && pick.projectRoleId) {
        // Best-effort — a custom role that already has skills is a guarded no-op server-side.
        await fillOrgCustomRoleSkillsIfBlank(pick.projectRoleId, pick.skills)
      }
    }

    return { success: true, added, error: null }
  } catch (error) {
    console.error('addRolesFromLibrary (sim):', error)
    return { success: false, added: 0, error: error.message || 'Failed to add roles' }
  }
}

export default { listRoleLibrary, addRolesFromLibrary }
