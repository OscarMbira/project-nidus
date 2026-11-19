import { platformDb } from '@nidus/supabase'

/**
 * Project Details (Project Setup) — read-only summary of the project record (v1344 A1).
 * The project wizard (ProjectsEdit) is the only editor; this service only reads.
 */
const FIELDS = [
  'id, project_name, project_code, project_description, project_objectives, success_criteria',
  'project_classification, delivery_methodology, delivery_methodology_track, billing_type, priority, health_status',
  'status_id, budget_currency, budget_amount, budget_type',
  'planned_start_date, planned_end_date, actual_start_date, actual_end_date',
  'project_manager_user_id, executive_user_id, executive_name',
  'funding_authority_user_id, funding_authority_name, approving_authority_user_id, approving_authority_name',
  'benefit_owner_user_id, benefit_owner_name',
  'lifecycle_template, stage_model, delivery_complexity, initial_risk_rating',
  'created_at, updated_at, created_by',
].join(', ')

/** Older databases may lack some optional columns — fall back to the original field set. */
const BASE_FIELDS = 'id, project_name, project_code, project_description, project_objectives, success_criteria, project_classification, delivery_methodology, billing_type, status_id, budget_currency, created_at, updated_at, created_by'

function isNoRowError(error) {
  return error?.code === 'PGRST116' || /multiple \(or no\) rows/i.test(String(error?.message || ''))
}

function isMissingColumnError(error) {
  return error?.code === '42703' || error?.code === 'PGRST204' || /column .* does not exist/i.test(String(error?.message || ''))
}

/** Name for a person column: the users row when linked, else the free-text name. */
export function personLabel(usersById, userId, freeTextName) {
  const u = userId ? usersById.get(userId) : null
  return (u && (u.full_name || u.email)) || freeTextName || ''
}

export async function getProjectDetails(projectId) {
  if (!projectId) throw new Error('No project selected.')

  let res = await platformDb.from('projects').select(FIELDS).eq('id', projectId).maybeSingle()
  if (res.error && isMissingColumnError(res.error)) {
    res = await platformDb.from('projects').select(BASE_FIELDS).eq('id', projectId).maybeSingle()
  }
  const { data, error } = res
  if (error) {
    if (isNoRowError(error)) throw new Error('Project not found.')
    throw error
  }
  if (!data) throw new Error('Project not found.')

  const personIds = [...new Set([
    data.project_manager_user_id, data.executive_user_id, data.funding_authority_user_id,
    data.approving_authority_user_id, data.benefit_owner_user_id,
  ].filter(Boolean))]

  // Independent lookups in parallel (rule 66).
  const [industries, status, people] = await Promise.all([
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
    personIds.length
      ? platformDb.from('users').select('id, full_name, email').in('id', personIds).then((r) => (r.error ? [] : (r.data || [])))
      : Promise.resolve([]),
  ])

  const sortedIndustries = industries
    .filter((r) => r.industry_categories)
    .map((r) => ({ id: r.industry_categories.id, name: r.industry_categories.name, is_primary: !!r.is_primary }))
    .sort((a, b) => (b.is_primary ? 1 : 0) - (a.is_primary ? 1 : 0))

  const industry = sortedIndustries.find((i) => i.is_primary) || sortedIndustries[0] || null
  const usersById = new Map(people.map((u) => [u.id, u]))

  return {
    ...data,
    industry,
    industries: sortedIndustries,
    status,
    people: {
      projectManager: personLabel(usersById, data.project_manager_user_id, ''),
      executive: personLabel(usersById, data.executive_user_id, data.executive_name),
      fundingAuthority: personLabel(usersById, data.funding_authority_user_id, data.funding_authority_name),
      approvingAuthority: personLabel(usersById, data.approving_authority_user_id, data.approving_authority_name),
      benefitOwner: personLabel(usersById, data.benefit_owner_user_id, data.benefit_owner_name),
    },
  }
}
