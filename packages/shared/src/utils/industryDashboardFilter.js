/**
 * v1341 (D3) — industry filter for the PMO and Portfolio dashboards. Outside a project the
 * sidebar shows core items only; the industry view lives on these dashboards instead.
 * A composite project (several industries) counts under each of its industries
 * (Consolidated_Role_Menus_Proposal.md §8.1).
 */
import { platformDb } from '@nidus/supabase'

/**
 * Pure: group projects by industry.
 * @param {Array<{ id: string, industry_category_id?: string|null }>} projects
 * @param {Array<{ project_id: string, industry_category_id: string }>} projectIndustries
 * @param {Array<{ id: string, name: string }>} industries   the organisation's active industries
 * @returns {{ byIndustry: Map<string, string[]>, untagged: string[], counts: Array<{ id: string, name: string, count: number }> }}
 */
export function groupProjectsByIndustry(projects = [], projectIndustries = [], industries = []) {
  const tagsByProject = new Map()
  for (const row of projectIndustries || []) {
    if (!row?.project_id || !row?.industry_category_id) continue
    if (!tagsByProject.has(row.project_id)) tagsByProject.set(row.project_id, new Set())
    tagsByProject.get(row.project_id).add(row.industry_category_id)
  }
  const byIndustry = new Map((industries || []).map((i) => [i.id, []]))
  const untagged = []
  for (const p of projects || []) {
    let tags = tagsByProject.get(p.id)
    if ((!tags || tags.size === 0) && p.industry_category_id) tags = new Set([p.industry_category_id])
    if (!tags || tags.size === 0) {
      untagged.push(p.id)
      continue
    }
    for (const t of tags) {
      if (!byIndustry.has(t)) continue // industry not active for the organisation
      byIndustry.get(t).push(p.id)
    }
  }
  const counts = (industries || []).map((i) => ({ id: i.id, name: i.name, count: (byIndustry.get(i.id) || []).length }))
  return { byIndustry, untagged, counts }
}

/** The organisation's industries, projects and project industry tags (one parallel batch). */
export async function loadOrganisationIndustryProjects(accountId) {
  if (!accountId) return { industries: [], projects: [], projectIndustries: [] }
  const [indRes, projRes] = await Promise.all([
    platformDb
      .from('account_industries')
      .select('industry_category_id, is_primary, industry_categories(id, name)')
      .eq('account_id', accountId),
    platformDb
      .from('projects')
      .select('id, project_name, project_code, industry_category_id, record_status, is_deleted')
      .eq('account_id', accountId)
      .eq('is_deleted', false),
  ])
  if (indRes.error) throw indRes.error
  if (projRes.error) throw projRes.error
  const projects = (projRes.data || []).filter((p) => p.record_status !== 'archived')
  const industries = (indRes.data || [])
    .filter((r) => r.industry_categories?.id && r.industry_categories?.name !== 'Cross-Industry')
    .sort((a, b) => Number(!!b.is_primary) - Number(!!a.is_primary) || a.industry_categories.name.localeCompare(b.industry_categories.name))
    .map((r) => ({ id: r.industry_categories.id, name: r.industry_categories.name }))
  let projectIndustries = []
  const ids = projects.map((p) => p.id)
  for (let i = 0; i < ids.length; i += 200) {
    const { data, error } = await platformDb
      .from('project_industries')
      .select('project_id, industry_category_id')
      .in('project_id', ids.slice(i, i + 200))
    if (error) break
    projectIndustries = projectIndustries.concat(data || [])
  }
  return { industries, projects, projectIndustries }
}
