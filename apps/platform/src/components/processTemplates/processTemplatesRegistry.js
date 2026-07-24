/**
 * v629 Process Templates registry — groups, templates, registers, logs.
 * Single source of truth for Process Templates hub navigation.
 */

export const PROCESS_GROUP_IDS = [
  'pre-project',
  'initiating',
  'planning',
  'executing',
  'monitoring-controlling',
  'closing',
]

export const PROCESS_GROUPS = {
  'pre-project': {
    id: 'pre-project',
    label: 'Pre-Project',
    shortLabel: 'Pre-Project',
    color: 'slate',
    emoji: '📋',
    description: 'Documents before formal project authorisation.',
  },
  initiating: {
    id: 'initiating',
    label: 'Initiating',
    shortLabel: 'Initiating',
    color: 'purple',
    emoji: '🟣',
    description: 'Define and authorise the project.',
  },
  planning: {
    id: 'planning',
    label: 'Planning',
    shortLabel: 'Planning',
    color: 'blue',
    emoji: '🔵',
    description: 'Establish scope, schedule, cost, quality, and management plans.',
  },
  executing: {
    id: 'executing',
    label: 'Executing',
    shortLabel: 'Executing',
    color: 'green',
    emoji: '🟢',
    description: 'Perform work and deliver outputs.',
  },
  'monitoring-controlling': {
    id: 'monitoring-controlling',
    label: 'Monitoring & Controlling',
    shortLabel: 'Monitoring & Control',
    color: 'amber',
    emoji: '🟡',
    description: 'Track, review, and regulate progress and performance.',
  },
  closing: {
    id: 'closing',
    label: 'Closing',
    shortLabel: 'Closing',
    color: 'gray',
    emoji: '⚫',
    description: 'Finalise all activities and close the project.',
  },
}

/** @typedef {'new'|'existing'|'partial'} TemplateKind */

/**
 * Templates and documents in the hub.
 * kind=new → CRUD via process template services; kind=existing|partial → link only.
 */
export const PROCESS_TEMPLATES = [
  // Pre-Project
  { slug: 'business-case', label: 'Business Case', group: 'pre-project', kind: 'existing', paths: { pmo: '/pmo/initiation/business-case', pm: '/pm/initiation/business-case', simPmo: '/simulator/pmo/initiation/business-case', simPm: '/simulator/pm/initiation/business-case' } },
  { slug: 'benefits-realisation-plan', label: 'Benefits Realisation Plan', group: 'pre-project', kind: 'existing', paths: { pmo: '/pmo/initiation/benefits-review-plan', pm: '/pm/initiation/benefits-review-plan', simPmo: '/simulator/pmo/initiation/benefits-review-plan', simPm: '/simulator/pm/initiation/benefits-review-plan' } },
  { slug: 'project-mandate', label: 'Project Mandate / Charter', group: 'pre-project', kind: 'existing', paths: { pmo: '/pmo/governance/mandate', pm: '/pm/governance/mandate', simPmo: '/simulator/pmo/governance/mandate', simPm: '/simulator/pm/governance/mandate' } },

  // Initiating
  { slug: 'project-charter', label: 'Project Charter', group: 'initiating', kind: 'new', table: 'project_charters', refPrefix: 'PCH', titleField: 'title' },
  { slug: 'assumption-log', label: 'Assumption Log', group: 'initiating', kind: 'new', table: 'assumption_logs', refPrefix: 'ASM', titleField: 'title' },
  { slug: 'stakeholder-register', label: 'Stakeholder Register', group: 'initiating', kind: 'existing', paths: { pmo: '/pmo/oversight/stakeholder-register', pm: '/pm/controls/stakeholders', simPmo: '/simulator/pmo/oversight/stakeholder-register', simPm: '/simulator/pm/controls/stakeholders' } },
  { slug: 'project-brief', label: 'Project Brief', group: 'initiating', kind: 'existing', paths: { pmo: '/pmo/initiation/project-brief', pm: '/pm/initiation/project-brief', simPmo: '/simulator/pmo/initiation/project-brief', simPm: '/simulator/pm/initiation/project-brief' } },

  // Planning (new)
  { slug: 'project-management-plan', label: 'Project Management Plan', group: 'planning', kind: 'new', table: 'project_management_plans', refPrefix: 'PMP', titleField: 'title' },
  { slug: 'scope-management-plan', label: 'Scope Management Plan', group: 'planning', kind: 'existing', paths: { pmo: '/pmo/governance/scope-management-plan', pm: '/pm/governance/scope-management-plan', simPmo: '/simulator/pmo/governance/scope-management-plan', simPm: '/simulator/pm/governance/scope-management-plan' } },
  { slug: 'requirements-management-plan', label: 'Requirements Management Plan', group: 'planning', kind: 'new', table: 'requirements_management_plans', refPrefix: 'RMP', titleField: 'title' },
  { slug: 'requirements-documentation', label: 'Requirements Documentation', group: 'planning', kind: 'new', table: 'requirements_documentation', refPrefix: 'RDOC', titleField: 'title' },
  { slug: 'requirements-traceability-matrix', label: 'Requirements Traceability Matrix', group: 'planning', kind: 'existing', paths: { pmo: '/platform/scope/traceability', pm: '/pm/planning/traceability', simPmo: '/simulator/scope/traceability', simPm: '/simulator/pm/planning/traceability' } },
  { slug: 'project-scope-statement', label: 'Project Scope Statement', group: 'planning', kind: 'existing', paths: { pmo: '/pmo/planning/scope', pm: '/pm/planning/scope', simPmo: '/simulator/pmo/planning/scope', simPm: '/simulator/pm/planning/scope' } },
  { slug: 'wbs', label: 'Work Breakdown Structure (WBS)', group: 'planning', kind: 'existing', paths: { pmo: '/pmo/planning/pbs', pm: '/pm/planning/pbs', simPmo: '/simulator/pmo/planning/pbs', simPm: '/simulator/pm/planning/pbs' } },
  { slug: 'wbs-dictionary', label: 'WBS Dictionary', group: 'planning', kind: 'new', table: 'wbs_dictionary_entries', refPrefix: 'WBS-D', titleField: 'title', linkField: 'wbs_node_id' },
  { slug: 'schedule-management-plan', label: 'Schedule Management Plan', group: 'planning', kind: 'existing', paths: { pmo: '/pmo/planning/schedule-plan', pm: '/pm/planning/schedule-plan', simPmo: '/simulator/pmo/planning/schedule-plan', simPm: '/simulator/pm/planning/schedule-plan' } },
  { slug: 'activity-list', label: 'Activity List', group: 'planning', kind: 'existing', paths: { pmo: '/platform/schedule/activities', pm: '/pm/planning/activities', simPmo: '/simulator/schedule/activities', simPm: '/simulator/pm/planning/activities' } },
  { slug: 'activity-attributes', label: 'Activity Attributes', group: 'planning', kind: 'new', table: 'activity_attributes', refPrefix: 'AA', titleField: 'title', linkField: 'activity_id' },
  { slug: 'milestone-list', label: 'Milestone List', group: 'planning', kind: 'existing', paths: { pmo: '/platform/schedule/milestones', pm: '/pm/planning/milestones', simPmo: '/simulator/schedule/milestones', simPm: '/simulator/pm/planning/milestones' } },
  { slug: 'activity-resource-requirements', label: 'Activity Resource Requirements', group: 'planning', kind: 'new', table: 'activity_resource_requirements', refPrefix: 'ARR', titleField: 'title', linkField: 'activity_id' },
  { slug: 'resource-breakdown-structure', label: 'Resource Breakdown Structure (RBS)', group: 'planning', kind: 'new', table: 'resource_breakdown_structure', refPrefix: 'RBS', titleField: 'title' },
  { slug: 'activity-duration-estimates', label: 'Activity Duration Estimates', group: 'planning', kind: 'new', table: 'activity_duration_estimates', refPrefix: 'ADE', titleField: 'title', linkField: 'activity_id' },
  { slug: 'project-schedule', label: 'Project Schedule', group: 'planning', kind: 'existing', paths: { pmo: '/platform/schedule/gantt', pm: '/pm/planning/gantt', simPmo: '/simulator/schedule/gantt', simPm: '/simulator/pm/planning/gantt' } },
  { slug: 'cost-management-plan', label: 'Cost Management Plan', group: 'planning', kind: 'new', table: 'cost_management_plans', refPrefix: 'CMP', titleField: 'title' },
  { slug: 'activity-cost-estimates', label: 'Activity Cost Estimates', group: 'planning', kind: 'new', table: 'activity_cost_estimates', refPrefix: 'ACE', titleField: 'title', linkField: 'activity_id' },
  { slug: 'cost-baseline', label: 'Cost Baseline', group: 'planning', kind: 'new', table: 'cost_baselines', refPrefix: 'CBL', titleField: 'title' },
  { slug: 'quality-management-plan', label: 'Quality Management Plan', group: 'planning', kind: 'existing', paths: { pmo: '/pmo/governance/quality-strategy', pm: '/pm/governance/quality-strategy', simPmo: '/simulator/pmo/governance/quality-strategy', simPm: '/simulator/pm/governance/quality-strategy' } },
  { slug: 'resource-management-plan', label: 'Resource Management Plan', group: 'planning', kind: 'new', table: 'resource_management_plans', refPrefix: 'RMP2', titleField: 'title' },
  { slug: 'communications-management-plan', label: 'Communications Management Plan', group: 'planning', kind: 'existing', paths: { pmo: '/pmo/governance/communication-strategy', pm: '/pm/governance/communication-strategy', simPmo: '/simulator/pmo/governance/communication-strategy', simPm: '/simulator/pm/governance/communication-strategy' } },
  { slug: 'risk-management-plan', label: 'Risk Management Plan', group: 'planning', kind: 'existing', paths: { pmo: '/pmo/governance/risk-strategy', pm: '/pm/governance/risk-strategy', simPmo: '/simulator/pmo/governance/risk-strategy', simPm: '/simulator/pm/governance/risk-strategy' } },
  { slug: 'risk-register', label: 'Risk Register', group: 'planning', kind: 'existing', paths: { pmo: '/pmo/oversight/risk-register', pm: '/pm/controls/risks', simPmo: '/simulator/pmo/oversight/risk-register', simPm: '/simulator/pm/controls/risks' } },
  { slug: 'procurement-management-plan', label: 'Procurement Management Plan', group: 'planning', kind: 'new', table: 'procurement_management_plans', refPrefix: 'PRCMP', titleField: 'title' },
  { slug: 'stakeholder-engagement-plan', label: 'Stakeholder Engagement Plan', group: 'planning', kind: 'new', table: 'stakeholder_engagement_plans', refPrefix: 'SEP', titleField: 'title' },
  { slug: 'change-management-plan', label: 'Change Management Plan', group: 'planning', kind: 'existing', paths: { pmo: '/pmo/governance/change-management', pm: '/pm/governance/change-management', simPmo: '/simulator/pmo/governance/change-management', simPm: '/simulator/pm/governance/change-management' } },
  { slug: 'configuration-management-plan', label: 'Configuration Management Plan', group: 'planning', kind: 'existing', paths: { pmo: '/pmo/governance/configuration-strategy', pm: '/pm/governance/configuration-strategy', simPmo: '/simulator/pmo/governance/configuration-strategy', simPm: '/simulator/pm/governance/configuration-strategy' } },
  { slug: 'project-initiation-document', label: 'Project Initiation Document (PID)', group: 'planning', kind: 'existing', paths: { pmo: '/pmo/initiation/pid', pm: '/pm/initiation/pid', simPmo: '/simulator/pmo/initiation/pid', simPm: '/simulator/pm/initiation/pid' } },

  // Executing
  { slug: 'work-package', label: 'Work Package', group: 'executing', kind: 'partial', paths: { pmo: '/pmo/delivery/work-packages', pm: '/pm/delivery/work-packages', simPmo: '/simulator/pmo/delivery/work-packages', simPm: '/simulator/pm/delivery/work-packages' } },
  { slug: 'quality-checklists', label: 'Quality Checklists', group: 'executing', kind: 'new', table: 'quality_checklists', refPrefix: 'QCL', titleField: 'title', hasItems: true, itemsTable: 'quality_checklist_items' },
  { slug: 'issue-log', label: 'Issue Log', group: 'executing', kind: 'existing', paths: { pmo: '/pmo/oversight/issue-register', pm: '/pm/controls/issues', simPmo: '/simulator/pmo/oversight/issue-register', simPm: '/simulator/pm/controls/issues' } },
  { slug: 'change-request', label: 'Change Request', group: 'executing', kind: 'existing', paths: { pmo: '/pmo/oversight/change-requests', pm: '/pm/controls/changes', simPmo: '/simulator/pmo/oversight/change-requests', simPm: '/simulator/pm/controls/changes' } },
  { slug: 'team-performance-assessment', label: 'Team Performance Assessment', group: 'executing', kind: 'new', table: 'team_performance_assessments', refPrefix: 'TPA', titleField: 'title' },
  { slug: 'lessons-learned-register', label: 'Lessons Learned Register', group: 'executing', kind: 'existing', paths: { pmo: '/pmo/oversight/lessons-log', pm: '/pm/controls/lessons', simPmo: '/simulator/pmo/oversight/lessons-log', simPm: '/simulator/pm/controls/lessons' } },
  { slug: 'make-or-buy-decision', label: 'Make-or-Buy Decision Log', group: 'executing', kind: 'new', table: 'make_or_buy_decisions', refPrefix: 'MOB', titleField: 'title' },
  { slug: 'procurement-documents', label: 'Procurement Documents / RFP', group: 'executing', kind: 'existing', paths: { pmo: '/pmo/procurement/rfp', pm: '/pm/procurement/rfp', simPmo: '/simulator/pmo/procurement/rfp', simPm: '/simulator/pm/procurement/rfp' } },
  { slug: 'checkpoint-report', label: 'Checkpoint Report', group: 'executing', kind: 'existing', paths: { pmo: '/pmo/reporting/checkpoint-reports', pm: '/pm/reporting/checkpoint-reports', simPmo: '/simulator/pmo/reporting/checkpoint-reports', simPm: '/simulator/pm/reporting/checkpoint-reports' } },

  // Monitoring & Controlling
  { slug: 'highlight-report', label: 'Highlight Report', group: 'monitoring-controlling', kind: 'existing', paths: { pmo: '/pmo/reporting/highlight-reports', pm: '/pm/reporting/highlight-reports', simPmo: '/simulator/pmo/reporting/highlight-reports', simPm: '/simulator/pm/reporting/highlight-reports' } },
  { slug: 'exception-report', label: 'Exception Report', group: 'monitoring-controlling', kind: 'existing', paths: { pmo: '/pmo/reporting/exception-reports', pm: '/pm/reporting/exception-reports', simPmo: '/simulator/pmo/reporting/exception-reports', simPm: '/simulator/pm/reporting/exception-reports' } },
  { slug: 'end-stage-report', label: 'End Stage Report', group: 'monitoring-controlling', kind: 'existing', paths: { pmo: '/pmo/reporting/end-stage-reports', pm: '/pm/reporting/end-stage-reports', simPmo: '/simulator/pmo/reporting/end-stage-reports', simPm: '/simulator/pm/reporting/end-stage-reports' } },
  { slug: 'change-log', label: 'Change Log / Register', group: 'monitoring-controlling', kind: 'existing', paths: { pmo: '/pmo/oversight/change-log', pm: '/pm/controls/change-log', simPmo: '/simulator/pmo/oversight/change-log', simPm: '/simulator/pm/controls/change-log' } },
  { slug: 'delay-register', label: 'Delay Register', group: 'monitoring-controlling', kind: 'existing', paths: { pmo: '/pmo/oversight/delays', pm: '/pm/delays', simPmo: '/simulator/pmo/oversight/delays', simPm: '/simulator/pm/delays' } },
  { slug: 'decision-log', label: 'Decision Log', group: 'monitoring-controlling', kind: 'existing', paths: { pmo: '/platform/decision-log', pm: '/pm/controls/decisions', simPmo: '/simulator/decision-log', simPm: '/simulator/pm/controls/decisions' } },
  { slug: 'quality-register', label: 'Quality Register', group: 'monitoring-controlling', kind: 'existing', paths: { pmo: '/pmo/oversight/quality-register', pm: '/pm/controls/quality', simPmo: '/simulator/pmo/oversight/quality-register', simPm: '/simulator/pm/controls/quality' } },
  { slug: 'variance-analysis-report', label: 'Variance Analysis Report', group: 'monitoring-controlling', kind: 'new', table: 'variance_analysis_reports', refPrefix: 'VAR', titleField: 'title' },
  { slug: 'evm-status-report', label: 'Earned Value Status Report', group: 'monitoring-controlling', kind: 'new', table: 'evm_status_reports', refPrefix: 'EVM', titleField: 'title' },
  { slug: 'scope-acceptance-form', label: 'Scope Validation / Deliverable Acceptance', group: 'monitoring-controlling', kind: 'new', table: 'scope_acceptance_forms', refPrefix: 'SAF', titleField: 'title' },

  // Closing
  { slug: 'end-project-report', label: 'End Project Report', group: 'closing', kind: 'existing', paths: { pmo: '/pmo/closure/end-project-report', pm: '/pm/closure/end-project-report', simPmo: '/simulator/pmo/closure/end-project-report', simPm: '/simulator/pm/closure/end-project-report' } },
  { slug: 'lessons-learned-report', label: 'Lessons Learned Report', group: 'closing', kind: 'existing', paths: { pmo: '/pmo/closure/lessons-report', pm: '/pm/closure/lessons-report', simPmo: '/simulator/pmo/closure/lessons-report', simPm: '/simulator/pm/closure/lessons-report' } },
  { slug: 'benefits-realisation-review', label: 'Benefits Realisation Review', group: 'closing', kind: 'existing', paths: { pmo: '/pmo/closure/benefits-review', pm: '/pm/closure/benefits-review', simPmo: '/simulator/pmo/closure/benefits-review', simPm: '/simulator/pm/closure/benefits-review' } },
  { slug: 'project-closure-checklist', label: 'Project Closure Checklist', group: 'closing', kind: 'new', table: 'project_closure_checklists', refPrefix: 'PCL', titleField: 'title', hasItems: true, itemsTable: 'project_closure_checklist_items' },
  { slug: 'contract-closure-document', label: 'Contract Closure Document', group: 'closing', kind: 'new', table: 'contract_closure_documents', refPrefix: 'CCD', titleField: 'title' },
  { slug: 'daily-log', label: 'Daily Log', group: 'closing', kind: 'existing', paths: { pmo: '/pmo/oversight/daily-log', pm: '/pm/controls/daily-log', simPmo: '/simulator/pmo/oversight/daily-log', simPm: '/simulator/pm/controls/daily-log' } },
]

export const PROCESS_REGISTERS = {
  initiating: [
    { label: 'Stakeholder Register', paths: { pmo: '/pmo/oversight/stakeholder-register', pm: '/pm/controls/stakeholders', simPmo: '/simulator/pmo/oversight/stakeholder-register', simPm: '/simulator/pm/controls/stakeholders' } },
    { label: 'Risk Register (initial)', paths: { pmo: '/pmo/oversight/risk-register', pm: '/pm/controls/risks', simPmo: '/simulator/pmo/oversight/risk-register', simPm: '/simulator/pm/controls/risks' } },
    { label: 'Daily Log', paths: { pmo: '/pmo/oversight/daily-log', pm: '/pm/controls/daily-log', simPmo: '/simulator/pmo/oversight/daily-log', simPm: '/simulator/pm/controls/daily-log' } },
  ],
  planning: [
    { label: 'Risk Register', paths: { pmo: '/pmo/oversight/risk-register', pm: '/pm/controls/risks', simPmo: '/simulator/pmo/oversight/risk-register', simPm: '/simulator/pm/controls/risks' } },
    { label: 'Requirements Traceability Matrix', paths: { pmo: '/platform/scope/traceability', pm: '/pm/planning/traceability', simPmo: '/simulator/scope/traceability', simPm: '/simulator/pm/planning/traceability' } },
    { label: 'Decision Log', paths: { pmo: '/platform/decision-log', pm: '/pm/controls/decisions', simPmo: '/simulator/decision-log', simPm: '/simulator/pm/controls/decisions' } },
  ],
  executing: [
    { label: 'Issue Register', paths: { pmo: '/pmo/oversight/issue-register', pm: '/pm/controls/issues', simPmo: '/simulator/pmo/oversight/issue-register', simPm: '/simulator/pm/controls/issues' } },
    { label: 'Change Log', paths: { pmo: '/pmo/oversight/change-log', pm: '/pm/controls/change-log', simPmo: '/simulator/pmo/oversight/change-log', simPm: '/simulator/pm/controls/change-log' } },
    { label: 'Quality Register', paths: { pmo: '/pmo/oversight/quality-register', pm: '/pm/controls/quality', simPmo: '/simulator/pmo/oversight/quality-register', simPm: '/simulator/pm/controls/quality' } },
    { label: 'Daily Log', paths: { pmo: '/pmo/oversight/daily-log', pm: '/pm/controls/daily-log', simPmo: '/simulator/pmo/oversight/daily-log', simPm: '/simulator/pm/controls/daily-log' } },
  ],
  'monitoring-controlling': [
    { label: 'Delay Register', paths: { pmo: '/pmo/oversight/delays', pm: '/pm/delays', simPmo: '/simulator/pmo/oversight/delays', simPm: '/simulator/pm/delays' } },
    { label: 'Change Register', paths: { pmo: '/pmo/oversight/change-requests', pm: '/pm/controls/changes', simPmo: '/simulator/pmo/oversight/change-requests', simPm: '/simulator/pm/controls/changes' } },
    { label: 'Issue Register', paths: { pmo: '/pmo/oversight/issue-register', pm: '/pm/controls/issues', simPmo: '/simulator/pmo/oversight/issue-register', simPm: '/simulator/pm/controls/issues' } },
    { label: 'Decision Log', paths: { pmo: '/platform/decision-log', pm: '/pm/controls/decisions', simPmo: '/simulator/decision-log', simPm: '/simulator/pm/controls/decisions' } },
  ],
  closing: [
    { label: 'Lessons Log', paths: { pmo: '/pmo/oversight/lessons-log', pm: '/pm/controls/lessons', simPmo: '/simulator/pmo/oversight/lessons-log', simPm: '/simulator/pm/controls/lessons' } },
    { label: 'Benefits Register', paths: { pmo: '/platform/benefits', pm: '/pm/controls/benefits', simPmo: '/simulator/benefits', simPm: '/simulator/pm/controls/benefits' } },
    { label: 'Final Risk Register', paths: { pmo: '/pmo/oversight/risk-register', pm: '/pm/controls/risks', simPmo: '/simulator/pmo/oversight/risk-register', simPm: '/simulator/pm/controls/risks' } },
  ],
}

export const PROCESS_LOGS = {
  initiating: [],
  planning: [],
  executing: [],
  'monitoring-controlling': [],
  closing: [],
}

export function getTemplatesByGroup(groupId) {
  return PROCESS_TEMPLATES.filter((t) => t.group === groupId)
}

export function getNewTemplates() {
  return PROCESS_TEMPLATES.filter((t) => t.kind === 'new')
}

export function getTemplateBySlug(slug) {
  return PROCESS_TEMPLATES.find((t) => t.slug === slug) || null
}

export function resolvePath(entry, roleKey) {
  if (!entry?.paths) return null
  return entry.paths[roleKey] || entry.paths.pm || null
}

export function getHubBasePath(roleKey) {
  const bases = {
    pmo: '/pmo/process-templates',
    pm: '/pm/process-templates',
    simPmo: '/simulator/pmo/process-templates',
    simPm: '/simulator/pm/process-templates',
  }
  return bases[roleKey] || '/pm/process-templates'
}

export function getTemplateListPath(roleKey, slug) {
  return `${getHubBasePath(roleKey)}/t/${slug}`
}

export const ROLE_KEYS = {
  pmo: 'pmo',
  pm: 'pm',
  simPmo: 'simPmo',
  simPm: 'simPm',
}

export function roleKeyFromPath(pathname) {
  if (pathname.startsWith('/simulator/pmo/')) return 'simPmo'
  if (pathname.startsWith('/simulator/pm/')) return 'simPm'
  if (pathname.startsWith('/pmo/')) return 'pmo'
  return 'pm'
}

export function isSimRoleKey(roleKey) {
  return roleKey === 'simPmo' || roleKey === 'simPm'
}
