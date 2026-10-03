import { platformDb } from '@nidus/supabase'

const FIELDS = 'id, project_name, project_code, project_description, project_objectives, success_criteria, project_classification, delivery_methodology, billing_type, status_id, budget_currency, created_at, updated_at, created_by'

function isNoRowError(error) {
  return error?.code === 'PGRST116' || /multiple \(or no\) rows/i.test(String(error?.message || ''))
}

export async function getProjectDetails(projectId) {
  if (!projectId) throw new Error('No project selected.')

  const { data, error } = await platformDb
    .from('projects')
    .select(FIELDS)
    .eq('id', projectId)
    .maybeSingle()

  if (error) {
    if (isNoRowError(error)) throw new Error('Project not found.')
    throw error
  }
  if (!data) throw new Error('Project not found.')

  // No confirmed FK relationship for PostgREST to embed (status_id) — resolve separately
  // rather than risk a 400 on the whole query. Industries (v1106) come from project_industries.
  const [industries, status] = await Promise.all([
    platformDb
      .from('project_industries')
      .select('is_primary, industry_categories(id, name)')
      .eq('project_id', projectId)
      .then((r) => (r.error ? [] : (r.data || []))),
    data.status_id
      ? platformDb
          .from('project_statuses')
          .select('id, status_name')
          .eq('id', data.status_id)
          .maybeSingle()
          .then((r) => (r.error && !isNoRowError(r.error) ? null : r.data))
      : Promise.resolve(null),
  ])

  const sortedIndustries = industries
    .filter((r) => r.industry_categories)
    .map((r) => ({ id: r.industry_categories.id, name: r.industry_categories.name, is_primary: !!r.is_primary }))
    .sort((a, b) => (b.is_primary ? 1 : 0) - (a.is_primary ? 1 : 0))

  const industry = sortedIndustries.find((i) => i.is_primary) || sortedIndustries[0] || null

  return { ...data, industry, industries: sortedIndustries, status }
}

export async function updateProjectDetails(projectId, fields) {
  if (!projectId) throw new Error('No project selected.')

  const payload = {
    project_description: fields.project_description ?? null,
    project_objectives: fields.project_objectives ?? null,
    success_criteria: fields.success_criteria ?? null,
    project_classification: fields.project_classification || null,
    delivery_methodology: fields.delivery_methodology || null,
    billing_type: fields.billing_type || null,
    updated_at: new Date().toISOString(),
  }

  const { data, error } = await platformDb
    .from('projects')
    .update(payload)
    .eq('id', projectId)
    .select(FIELDS)
    .maybeSingle()

  // RLS often returns 0 rows (not a thrown DB exception) when the caller can SELECT but not UPDATE.
  if (error) {
    if (isNoRowError(error)) {
      throw new Error('Could not save — you may not have permission to update this project.')
    }
    throw error
  }

  if (!data) {
    // Distinguish "no permission / 0 rows updated" from "project vanished".
    const stillReadable = await getProjectDetails(projectId).catch(() => null)
    if (stillReadable) {
      throw new Error('Could not save — you may not have permission to update this project.')
    }
    throw new Error('Project not found or could not be updated.')
  }

  return data
}
