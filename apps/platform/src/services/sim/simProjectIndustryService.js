/**
 * Practice project multi-industry classification (v1106). Simulator parity for
 * apps/platform/src/services/projectIndustryService.js against sim.practice_project_industries
 * (SQL/v1113_sim_practice_project_industries_schema.sql). New capability — practice projects had
 * no industry field before this, so there is no legacy single column to keep in sync.
 */
import { simDb } from '../supabaseClient'

/**
 * @param {string} practiceProjectId
 * @returns {Promise<{success: boolean, data: array, error: string|null}>}
 *   data rows: { id, practice_project_id, industry_category_id, is_primary, industry: { id, name } }
 */
export async function listPracticeProjectIndustries(practiceProjectId) {
  if (!practiceProjectId) return { success: true, data: [], error: null }
  try {
    const { data, error } = await simDb
      .from('practice_project_industries')
      .select('id, practice_project_id, industry_category_id, is_primary, industry:industry_categories(id, name)')
      .eq('practice_project_id', practiceProjectId)
      .order('is_primary', { ascending: false })

    if (error) throw error
    const rows = data || []
    rows.sort((a, b) => {
      if (a.is_primary !== b.is_primary) return a.is_primary ? -1 : 1
      return String(a.industry?.name || '').localeCompare(String(b.industry?.name || ''))
    })
    return { success: true, data: rows, error: null }
  } catch (error) {
    console.error('listPracticeProjectIndustries:', error)
    return { success: false, data: [], error: error.message || 'Failed to load practice project industries' }
  }
}

/**
 * Replaces the full set of a practice project's industries. Enforces "at least one row implies
 * exactly one primary" client-side: if picks are given with no primary marked, the first pick
 * becomes primary.
 * @param {string} practiceProjectId
 * @param {Array<{ industryCategoryId: string, isPrimary?: boolean }>} picks
 * @param {string|null} [userId] - public.users.id for the added_by audit column
 * @returns {Promise<{success: boolean, data: array, error: string|null}>}
 */
export async function replacePracticeProjectIndustries(practiceProjectId, picks = [], userId = null) {
  try {
    if (!practiceProjectId) return { success: false, data: [], error: 'Practice project id is required' }

    const cleaned = (Array.isArray(picks) ? picks : [])
      .map((p) => ({ industryCategoryId: p?.industryCategoryId, isPrimary: !!p?.isPrimary }))
      .filter((p) => p.industryCategoryId)

    if (cleaned.length > 0 && !cleaned.some((p) => p.isPrimary)) {
      cleaned[0].isPrimary = true
    }
    let primarySeen = false
    for (const p of cleaned) {
      if (p.isPrimary) {
        if (primarySeen) p.isPrimary = false
        else primarySeen = true
      }
    }

    const { data: existing, error: existingErr } = await simDb
      .from('practice_project_industries')
      .select('id, industry_category_id')
      .eq('practice_project_id', practiceProjectId)
    if (existingErr) throw existingErr

    const keepIds = new Set(cleaned.map((p) => p.industryCategoryId))
    const toRemove = (existing || []).filter((r) => !keepIds.has(r.industry_category_id))
    if (toRemove.length > 0) {
      const { error } = await simDb
        .from('practice_project_industries')
        .delete()
        .in('id', toRemove.map((r) => r.id))
      if (error) throw error
    }

    for (const pick of cleaned) {
      const match = (existing || []).find((r) => r.industry_category_id === pick.industryCategoryId)
      if (match) {
        const { error } = await simDb
          .from('practice_project_industries')
          .update({ is_primary: pick.isPrimary })
          .eq('id', match.id)
        if (error) throw error
      } else {
        const { error } = await simDb.from('practice_project_industries').insert({
          practice_project_id: practiceProjectId,
          industry_category_id: pick.industryCategoryId,
          is_primary: pick.isPrimary,
          added_by: userId || null,
        })
        if (error) throw error
      }
    }

    return listPracticeProjectIndustries(practiceProjectId)
  } catch (error) {
    console.error('replacePracticeProjectIndustries:', error)
    return { success: false, data: [], error: error.message || 'Failed to save practice project industries' }
  }
}

export default { listPracticeProjectIndustries, replacePracticeProjectIndustries }
