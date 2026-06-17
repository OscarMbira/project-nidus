/**
 * Canonical Process Templates sidebar codes (v629/v669).
 * Used by useMenu.js for classification salvage + display ordering — not runtime injection.
 */

export const PMO_PROCESS_TEMPLATES_MENU_CODES = new Set([
  'pmo_process_templates_section',
  'pmo_pt_hub',
  'pmo_pt_pre',
  'pmo_pt_init',
  'pmo_pt_plan',
  'pmo_pt_exec',
  'pmo_pt_mon',
  'pmo_pt_close',
  'pmo_pt_browse',
  'pmo_pt_manage',
  'pmo_pt_new',
  'pmo_pt_agile_section',
  'pmo_pt_product_backlog',
  'pmo_pt_sprint_planning',
  'pmo_pt_agile',
  'pmo_pt_story_map',
  'pmo_pt_sprint_metrics',
  'pmo_pt_releases',
  'pmo_pt_roadmap',
  'pmo_industry_templates',
  'pmo_industry_templates_new',
  'pmo_industry_templates_on_hold',
  'pmo_oversight_delay_templates',
  'pmo_pt_delay_templates',
  'plat_pt_delay_templates',
  'sim_pmo_oversight_delay_templates',
])

/** Legacy v407 rows — must never appear under Process Templates category. */
export const PROCESS_TEMPLATES_POLLUTION_CODES = new Set([
  'template_library',
  'template_library_browse',
  'template_library_manage',
  'template_library_new',
  'template_library_categories',
  'template_library_project_copies',
  'template_library_on_hold',
  'template_library_bulk',
  'template_library_notifications',
  'agile_templates',
])

export const PMO_PROCESS_TEMPLATES_SORT_ORDER = {
  pmo_pt_hub: 1,
  pmo_pt_pre: 2,
  pmo_pt_init: 3,
  pmo_pt_plan: 4,
  pmo_pt_exec: 5,
  pmo_pt_mon: 6,
  pmo_pt_close: 7,
  pmo_oversight_delay_templates: 8,
  pmo_pt_delay_templates: 8,
  plat_pt_delay_templates: 8,
  sim_pmo_oversight_delay_templates: 8,
  pmo_pt_browse: 20,
  pmo_pt_manage: 21,
  pmo_pt_new: 22,
  pmo_pt_agile_section: 30,
  pmo_pt_product_backlog: 31,
  pmo_pt_sprint_planning: 32,
  pmo_pt_agile: 33,
  pmo_pt_story_map: 34,
  pmo_pt_sprint_metrics: 35,
  pmo_pt_releases: 36,
  pmo_pt_roadmap: 37,
  pmo_industry_templates: 40,
  pmo_industry_templates_new: 41,
  pmo_industry_templates_on_hold: 42,
}

export const PMO_PROCESS_TEMPLATES_AGILE_CHILD_CODES = new Set([
  'pmo_pt_product_backlog',
  'pmo_pt_sprint_planning',
  'pmo_pt_agile',
  'pmo_pt_story_map',
  'pmo_pt_sprint_metrics',
  'pmo_pt_releases',
  'pmo_pt_roadmap',
])

export function isPmoProcessTemplateMenuCode(menuCode) {
  const code = String(menuCode || '').trim().toLowerCase()
  return PMO_PROCESS_TEMPLATES_MENU_CODES.has(code)
}

export function processTemplateSortKey(item) {
  const code = String(item?.menu_code || '').trim().toLowerCase()
  return PMO_PROCESS_TEMPLATES_SORT_ORDER[code] ?? item?.sort_order ?? 999
}
