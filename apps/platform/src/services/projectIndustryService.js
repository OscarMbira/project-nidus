/**
 * Project multi-industry classification (v1106). A project can carry several industries, one
 * marked primary — mirrors organisationIndustryService.js's account_industries pattern at
 * project scope. Direct RLS-gated writes (public.project_industries, v1112) — no RPC.
 * projects.industry_category_id is kept in sync as the "primary industry" pointer so every
 * existing read site that selects that single column keeps working unchanged.
 */
import { platformDb } from './supabase/supabaseClient'

/**
 * @param {string} projectId
 * @returns {Promise<{success: boolean, data: array, error: string|null}>}
 *   data rows: { id, project_id, industry_category_id, is_primary, industry: { id, name } }
 */
export async function listProjectIndustries(projectId) {
  if (!projectId) return { success: true, data: [], error: null }
  try {
    const { data, error } = await platformDb
      .from('project_industries')
      .select('id, project_id, industry_category_id, is_primary, industry:industry_categories(id, name)')
      .eq('project_id', projectId)
      .order('is_primary', { ascending: false })

    if (error) throw error
    const rows = data || []
    rows.sort((a, b) => {
      if (a.is_primary !== b.is_primary) return a.is_primary ? -1 : 1
      return String(a.industry?.name || '').localeCompare(String(b.industry?.name || ''))
    })
    return { success: true, data: rows, error: null }
  } catch (error) {
    console.error('listProjectIndustries:', error)
    return { success: false, data: [], error: error.message || 'Failed to load project industries' }
  }
}

/**
 * Replaces the full set of a project's industries. Enforces "at least one row implies exactly
 * one primary" client-side: if picks are given with no primary marked, the first pick becomes
 * primary. Also keeps projects.industry_category_id in sync with the resulting primary (or NULL
 * when picks is empty) so existing single-column read sites keep working unchanged.
 * @param {string} projectId
 * @param {Array<{ industryCategoryId: string, isPrimary?: boolean }>} picks
 * @param {string|null} [userId] - public.users.id for the added_by audit column
 * @returns {Promise<{success: boolean, data: array, error: string|null}>}
 */
export async function replaceProjectIndustries(projectId, picks = [], userId = null) {
  try {
    if (!projectId) return { success: false, data: [], error: 'Project id is required' }

    const cleaned = (Array.isArray(picks) ? picks : [])
      .map((p) => ({ industryCategoryId: p?.industryCategoryId, isPrimary: !!p?.isPrimary }))
      .filter((p) => p.industryCategoryId)

    if (cleaned.length > 0 && !cleaned.some((p) => p.isPrimary)) {
      cleaned[0].isPrimary = true
    }
    // Only one row may be primary even if the caller ticked more than one.
    let primarySeen = false
    for (const p of cleaned) {
      if (p.isPrimary) {
        if (primarySeen) p.isPrimary = false
        else primarySeen = true
      }
    }

    const { data: existing, error: existingErr } = await platformDb
      .from('project_industries')
      .select('id, industry_category_id')
      .eq('project_id', projectId)
    if (existingErr) throw existingErr

    const keepIds = new Set(cleaned.map((p) => p.industryCategoryId))
    const toRemove = (existing || []).filter((r) => !keepIds.has(r.industry_category_id))
    if (toRemove.length > 0) {
      const { error } = await platformDb
        .from('project_industries')
        .delete()
        .in('id', toRemove.map((r) => r.id))
      if (error) throw error
    }

    for (const pick of cleaned) {
      const match = (existing || []).find((r) => r.industry_category_id === pick.industryCategoryId)
      if (match) {
        const { error } = await platformDb
          .from('project_industries')
          .update({ is_primary: pick.isPrimary })
          .eq('id', match.id)
        if (error) throw error
      } else {
        const { error } = await platformDb.from('project_industries').insert({
          project_id: projectId,
          industry_category_id: pick.industryCategoryId,
          is_primary: pick.isPrimary,
          added_by: userId || null,
        })
        if (error) throw error
      }
    }

    const primaryPick = cleaned.find((p) => p.isPrimary)
    const { error: syncErr } = await platformDb
      .from('projects')
      .update({ industry_category_id: primaryPick?.industryCategoryId || null })
      .eq('id', projectId)
    if (syncErr) throw syncErr

    return listProjectIndustries(projectId)
  } catch (error) {
    console.error('replaceProjectIndustries:', error)
    return { success: false, data: [], error: error.message || 'Failed to save project industries' }
  }
}

export default { listProjectIndustries, replaceProjectIndustries }
