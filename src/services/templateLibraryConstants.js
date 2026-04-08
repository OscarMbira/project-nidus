/** Master template type codes (aligned with v347 plan). */
export const TEMPLATE_TYPE_OPTIONS = [
  { code: 'risk_register', label: 'Risk Register' },
  { code: 'project_mandate', label: 'Project Mandate / Charter' },
  { code: 'project_brief', label: 'Project Brief' },
  { code: 'business_case', label: 'Business Case' },
  { code: 'benefits_review_plan', label: 'Benefits Review Plan' },
  { code: 'issue_log', label: 'Issue Log' },
  { code: 'quality_register', label: 'Quality Register' },
  { code: 'change_management', label: 'Change Management System' },
  { code: 'config_management', label: 'Configuration Management System' },
  { code: 'stakeholder_register', label: 'Stakeholder Register' },
  { code: 'communication_plan', label: 'Communication Management Plan' },
  { code: 'lessons_learned', label: 'Lessons Learned Log' },
  { code: 'work_package', label: 'Work Package' },
  { code: 'highlight_report', label: 'Highlight Report' },
  { code: 'checkpoint_report', label: 'Checkpoint Report' },
  { code: 'test_plan', label: 'Test Plan' },
  { code: 'generic', label: 'Generic / Custom' },
]

/** Minimal JSON schema hints per type (sections for form builder / preview). */
export function defaultContentSchemaForType(templateTypeCode) {
  const sections = [
    { key: 'overview', label: 'Overview', type: 'richtext' },
    { key: 'detail', label: 'Detail', type: 'richtext' },
  ]
  if (templateTypeCode === 'risk_register') {
    return {
      sections: [
        { key: 'purpose', label: 'Purpose', type: 'richtext' },
        { key: 'scope', label: 'Scope', type: 'richtext' },
        { key: 'risk_categories', label: 'Risk Categories', type: 'list' },
        { key: 'probability_scale', label: 'Probability Scale', type: 'table' },
        { key: 'impact_scale', label: 'Impact Scale', type: 'table' },
        { key: 'roles_responsibilities', label: 'Roles & Responsibilities', type: 'richtext' },
      ],
    }
  }
  return { sections }
}

export function emptyContentFromSchema(schema) {
  const out = {}
  const sections = schema?.sections || []
  sections.forEach((s) => {
    if (s.type === 'list') out[s.key] = []
    else if (s.type === 'table' || s.type === 'matrix') out[s.key] = []
    else out[s.key] = ''
  })
  return out
}
