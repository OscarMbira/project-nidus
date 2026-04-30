import { format } from 'date-fns'

export function formatProjectDate(value) {
  if (!value) return ''
  try {
    return format(new Date(value), 'yyyy-MM-dd')
  } catch {
    return ''
  }
}

/**
 * PostgREST may return a nested one-to-many row as a single object instead of a one-element array.
 * Always treat as an array before .find / .map.
 */
export function normalizeEmbeddedList(v) {
  if (v == null) return []
  return Array.isArray(v) ? v : [v]
}

/** Full wizard form shape aligned with ProjectsCreate / projects table columns */
export function getEmptyWizardFormData() {
  return {
    project_name: '',
    project_description: '',
    project_type_id: '',
    project_status_id: '',
    start_date: '',
    end_date: '',
    project_code: '',
    intake_status: 'draft',
    executive_user_id: '',
    executive_name: '',
    board_required: null,
    funding_authority_user_id: '',
    funding_authority_name: '',
    approving_authority_user_id: '',
    approving_authority_name: '',
    business_objective: '',
    strategic_alignment: '',
    expected_benefits_summary: '',
    benefit_owner_user_id: '',
    benefit_owner_name: '',
    delivery_methodology: 'Waterfall',
    lifecycle_template: '',
    stage_model: '',
    stage_gate_enforcement: 'required',
    tolerance_time_days: '',
    tolerance_cost_percentage: '',
    tolerance_scope_description: '',
    tolerance_quality_description: '',
    tolerance_risk_description: '',
    tolerance_benefits_description: '',
    budget_currency: 'USD',
    budget_type: '',
    budget_categories: [],
    budget_approval_status: '',
    initial_risk_rating: '',
    complexity_rating: '',
    delivery_complexity: '',
    regulatory_impact: null,
    data_sensitivity: '',
    estimated_effort: '',
    key_skills_required: '',
    external_vendors_required: null,
    mandate_status: '',
    business_case_status: '',
    rfp_reference: '',
    funding_approval_status: '',
    document_repository_url: '',
    methodology_id: '',
  }
}

/**
 * Map projects row + methodology + budget rows → wizard formData
 */
export function mapDbProjectToWizardForm(projectRow, methodologyId, budgetCategoryRows, legacyBudget) {
  const d = projectRow || {}
  const startSrc = d.planned_start_date || d.start_date
  const endSrc = d.planned_end_date || d.end_date

  let budgetCategories = (budgetCategoryRows || []).map((r) => ({
    category_name: r.category_name || '',
    amount: r.budget_amount != null ? Number(r.budget_amount) : '',
    funding_source_id: r.funding_source_id || '',
  }))

  if (budgetCategories.length === 0 && legacyBudget != null && Number(legacyBudget) > 0) {
    budgetCategories = [{ category_name: '', amount: Number(legacyBudget), funding_source_id: '' }]
  }

  return {
    ...getEmptyWizardFormData(),
    project_name: d.project_name || '',
    project_description: d.project_description || '',
    project_type_id: d.project_type_id || '',
    project_status_id: d.status_id || '',
    start_date: formatProjectDate(startSrc),
    end_date: formatProjectDate(endSrc),
    project_code: d.project_code || '',
    intake_status: d.intake_status || 'draft',
    executive_user_id: d.executive_user_id || '',
    executive_name: d.executive_name || '',
    board_required: d.board_required ?? null,
    funding_authority_user_id: d.funding_authority_user_id || '',
    funding_authority_name: d.funding_authority_name || '',
    approving_authority_user_id: d.approving_authority_user_id || '',
    approving_authority_name: d.approving_authority_name || '',
    business_objective: d.business_objective || '',
    strategic_alignment: d.strategic_alignment || '',
    expected_benefits_summary: d.expected_benefits_summary || '',
    benefit_owner_user_id: d.benefit_owner_user_id || '',
    benefit_owner_name: d.benefit_owner_name || '',
    delivery_methodology: d.delivery_methodology || 'Waterfall',
    lifecycle_template: d.lifecycle_template || '',
    stage_model: d.stage_model || '',
    stage_gate_enforcement: d.stage_gate_enforcement || 'required',
    tolerance_time_days: d.tolerance_time_days ?? '',
    tolerance_cost_percentage: d.tolerance_cost_percentage ?? '',
    tolerance_scope_description: d.tolerance_scope_description || '',
    tolerance_quality_description: d.tolerance_quality_description || '',
    tolerance_risk_description: d.tolerance_risk_description || '',
    tolerance_benefits_description: d.tolerance_benefits_description || '',
    budget_currency: d.budget_currency || 'USD',
    budget_type: d.budget_type || '',
    budget_categories: budgetCategories,
    budget_approval_status: d.budget_approval_status || '',
    initial_risk_rating: d.initial_risk_rating || '',
    complexity_rating: d.complexity_rating || '',
    delivery_complexity: d.delivery_complexity || '',
    regulatory_impact: d.regulatory_impact,
    data_sensitivity: d.data_sensitivity || '',
    estimated_effort: d.estimated_effort || '',
    key_skills_required: d.key_skills_required || '',
    external_vendors_required: d.external_vendors_required,
    mandate_status: d.mandate_status || '',
    business_case_status: d.business_case_status || '',
    rfp_reference: d.rfp_reference || '',
    funding_approval_status: d.funding_approval_status || '',
    document_repository_url: d.document_repository_url || '',
    methodology_id: methodologyId || '',
  }
}

/**
 * Columns added in SQL v264 / v266 — older DBs may lack them; PostgREST then errors on UPDATE.
 * See SQL/v484_projects_wizard_columns_if_missing.sql
 */
export const OPTIONAL_PROJECT_WIZARD_DB_COLUMNS = [
  'executive_name',
  'funding_authority_name',
  'approving_authority_name',
  'benefit_owner_name',
  'tolerance_quality_description',
  'tolerance_risk_description',
  'tolerance_benefits_description',
]

/** Strip optional columns for retry when schema cache has no such columns. */
export function omitOptionalProjectWizardColumns(payload) {
  if (!payload || typeof payload !== 'object') return payload
  const out = { ...payload }
  for (const k of OPTIONAL_PROJECT_WIZARD_DB_COLUMNS) {
    delete out[k]
  }
  return out
}

/**
 * PostgREST / Supabase: unknown column or schema cache out of date.
 * Error shape varies (message/details/hint/code or nested); stringify defensively.
 */
export function isSchemaCacheColumnError(err) {
  if (err == null) return false
  let m = ''
  if (typeof err === 'string') m = err
  else if (typeof err === 'object') {
    m = [err.message, err.details, err.hint, err.code, err.status, err.statusText]
      .filter(Boolean)
      .join(' ')
    try {
      m += ' ' + JSON.stringify(err)
    } catch {
      /* ignore */
    }
  } else {
    m = String(err)
  }
  return (
    /schema cache/i.test(m) ||
    /could not find the/i.test(m) ||
    /unknown column|column.*does not exist|no such column/i.test(m) ||
    /PGRST204|PGRST202/i.test(m) ||
    /executive_name|funding_authority_name|approving_authority_name|benefit_owner_name/i.test(m)
  )
}

/** Build supabase update payload from wizard form (matches ProjectsCreate projectData). */
export function wizardFormToProjectUpdatePayload(formData, userId) {
  const cats = formData.budget_categories || []
  const sum = cats.reduce((s, c) => s + (Number(c.amount) || 0), 0)
  return {
    project_name: formData.project_name,
    project_description: formData.project_description || null,
    project_code: formData.project_code || null,
    project_type_id: formData.project_type_id,
    status_id: formData.project_status_id,
    planned_start_date: formData.start_date || null,
    planned_end_date: formData.end_date || null,
    intake_status: formData.intake_status || 'draft',
    executive_user_id: formData.executive_user_id || null,
    executive_name: formData.executive_name || null,
    board_required: formData.board_required,
    funding_authority_user_id: formData.funding_authority_user_id || null,
    funding_authority_name: formData.funding_authority_name || null,
    approving_authority_user_id: formData.approving_authority_user_id || null,
    approving_authority_name: formData.approving_authority_name || null,
    business_objective: formData.business_objective || null,
    strategic_alignment: formData.strategic_alignment || null,
    expected_benefits_summary: formData.expected_benefits_summary || null,
    benefit_owner_user_id: formData.benefit_owner_user_id || null,
    benefit_owner_name: formData.benefit_owner_name || null,
    delivery_methodology: formData.delivery_methodology || null,
    lifecycle_template: formData.lifecycle_template || null,
    stage_model: formData.stage_model || null,
    stage_gate_enforcement: formData.stage_gate_enforcement || 'required',
    tolerance_time_days: (formData.tolerance_time_days || '').toString().trim() || null,
    tolerance_cost_percentage: (formData.tolerance_cost_percentage || '').toString().trim() || null,
    tolerance_scope_description: formData.tolerance_scope_description || null,
    tolerance_quality_description: formData.tolerance_quality_description || null,
    tolerance_risk_description: formData.tolerance_risk_description || null,
    tolerance_benefits_description: formData.tolerance_benefits_description || null,
    budget_currency: formData.budget_currency || 'USD',
    budget_type: formData.budget_type || null,
    budget_amount: sum > 0 ? sum : null,
    budget_approval_status: formData.budget_approval_status || null,
    initial_risk_rating: formData.initial_risk_rating || null,
    complexity_rating: formData.complexity_rating || null,
    delivery_complexity: formData.delivery_complexity || null,
    regulatory_impact: formData.regulatory_impact,
    data_sensitivity: formData.data_sensitivity || null,
    estimated_effort: formData.estimated_effort || null,
    key_skills_required: formData.key_skills_required || null,
    external_vendors_required: formData.external_vendors_required,
    mandate_status: formData.mandate_status || null,
    business_case_status: formData.business_case_status || null,
    rfp_reference: formData.rfp_reference || null,
    funding_approval_status: formData.funding_approval_status || null,
    document_repository_url: formData.document_repository_url || null,
    ...(userId ? { updated_by: userId } : {}),
  }
}
