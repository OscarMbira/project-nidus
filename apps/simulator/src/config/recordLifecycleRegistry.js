/**
 * Record lifecycle table registry — Category A/B mappings per v639 plan.
 * @see projectplan/v639_Record_Lifecycle_Management_Plan.md
 */

/** @typedef {'A'|'B'} LifecycleCategory */

/**
 * @typedef {Object} LifecycleTableConfig
 * @property {string} tableName
 * @property {string} label
 * @property {LifecycleCategory} category
 * @property {string} liveTable
 * @property {string} [historyTable]
 * @property {string} [archiveTable]
 * @property {string} [allView]
 */

/** @type {LifecycleTableConfig[]} */
export const LIFECYCLE_TABLE_REGISTRY = [
  { tableName: 'risks', label: 'Risks', category: 'A', liveTable: 'risks', historyTable: 'risks_history', archiveTable: 'risks_archive', allView: 'risks_all' },
  { tableName: 'issues', label: 'Issues', category: 'A', liveTable: 'issues', historyTable: 'issues_history', archiveTable: 'issues_archive', allView: 'issues_all' },
  { tableName: 'change_requests', label: 'Change Requests', category: 'A', liveTable: 'change_requests', historyTable: 'change_requests_history', archiveTable: 'change_requests_archive', allView: 'change_requests_all' },
  { tableName: 'tasks', label: 'Tasks', category: 'A', liveTable: 'tasks', historyTable: 'tasks_history', archiveTable: 'tasks_archive', allView: 'tasks_all' },
  { tableName: 'defects', label: 'Defects', category: 'A', liveTable: 'defects', historyTable: 'defects_history', archiveTable: 'defects_archive', allView: 'defects_all' },
  { tableName: 'projects', label: 'Projects', category: 'B', liveTable: 'projects' },
  { tableName: 'project_mandates', label: 'Project Mandates', category: 'B', liveTable: 'project_mandates' },
  { tableName: 'business_cases', label: 'Business Cases', category: 'B', liveTable: 'business_cases' },
  { tableName: 'work_packages', label: 'Work Packages', category: 'B', liveTable: 'work_packages' },
  { tableName: 'stage_plans', label: 'Stage Plans', category: 'B', liveTable: 'stage_plans' },
  { tableName: 'project_decisions', label: 'Decisions', category: 'B', liveTable: 'project_decisions' },
  { tableName: 'configuration_items', label: 'Configuration Items', category: 'B', liveTable: 'configuration_items' },
  { tableName: 'benefits_review_plans', label: 'Benefits Review Plans', category: 'B', liveTable: 'benefits_review_plans' },
  { tableName: 'highlight_reports', label: 'Highlight Reports', category: 'B', liveTable: 'highlight_reports' },
  { tableName: 'exception_reports', label: 'Exception Reports', category: 'B', liveTable: 'exception_reports' },
  { tableName: 'end_stage_reports', label: 'End Stage Reports', category: 'B', liveTable: 'end_stage_reports' },
  { tableName: 'lessons_reports', label: 'Lessons Reports', category: 'B', liveTable: 'lessons_reports' },
  { tableName: 'project_initiation_documents', label: 'Project Initiation Documents', category: 'B', liveTable: 'project_initiation_documents' },
  { tableName: 'product_descriptions', label: 'Product Descriptions', category: 'B', liveTable: 'product_descriptions' },
]

export const LIFECYCLE_STATUSES = ['live', 'unauthorised', 'history', 'archived']

export function getLifecycleTableConfig(tableName) {
  return LIFECYCLE_TABLE_REGISTRY.find((t) => t.tableName === tableName)
}

export function getLifecycleTableOptions() {
  return LIFECYCLE_TABLE_REGISTRY.map((t) => ({ value: t.tableName, label: t.label, category: t.category }))
}

export default LIFECYCLE_TABLE_REGISTRY
