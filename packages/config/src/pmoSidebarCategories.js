/**
 * PMO sidebar category definitions — presentation grouping for useMenu transforms.
 * @see projectplan/v638_Unified_Sidebar_Menu_Implementation_Plan.md Phase 2.2
 * @see projectplan/v671_Methodology_Aware_Menu_Rationalisation_Plan.md
 */

export {
  METHODOLOGY_TRACK_DEFS,
  TRACK_CHILD_CATEGORY_IDS,
} from './methodologyMenuUtils.js'

/** Nested under "Portfolio & Delivery" (not top-level sidebar rows). */
export const DELIVERY_MANAGEMENT_SUB_DEFS = [
  { id: 'pmo-cat-portfolio', label: 'Portfolio', order: 1 },
  { id: 'pmo-cat-programme', label: 'Programme', order: 2 },
  { id: 'pmo-cat-planning', label: 'Planning Intelligence', order: 3 },
  { id: 'pmo-cat-projects', label: 'Projects', order: 4 },
  { id: 'pmo-cat-project-oversight', label: 'Project Oversight', order: 5 },
  { id: 'pmo-cat-delivery-controls', label: 'Delivery Controls', order: 6 },
]

/** Top-level PM layout sidebar rows (v681 plat_sec_universal + cross-framework footer). */
export const PM_CATEGORY_DEFS = [
  { id: 'plat_pm_dashboard', label: 'Dashboard', order: 10 },
  { id: 'plat_pm_ai', label: 'AI Assistant', order: 15 },
  { id: 'plat_grp_pm_projects', label: 'Projects', order: 20 },
  { id: 'plat_grp_pm_tasks', label: 'Tasks', order: 30 },
  { id: 'plat_grp_pm_teams', label: 'Teams', order: 40 },
  { id: 'plat_pm_calendar', label: 'Calendar', order: 50 },
  { id: 'plat_grp_pm_controls', label: 'Controls & Registers', order: 60 },
  { id: 'plat_grp_pm_stakeholders', label: 'Stakeholders', order: 70 },
  { id: 'plat_pm_quality_testing', label: 'Quality & Testing', order: 80 },
  { id: 'plat_grp_pm_reporting', label: 'Reporting & Analytics', order: 90 },
  { id: 'plat_grp_pm_financial', label: 'Financial', order: 100 },
  { id: 'plat_grp_pm_auth', label: 'Authorisation', order: 110 },
  { id: 'plat_sec_cross_fw', label: 'Cross-Framework', order: 120, menuIcon: 'grid' },
  { id: 'pmo-cat-knowledge-assets', label: 'Knowledge & Resources', order: 130 },
  { id: 'pmo-cat-email-notifications', label: 'Email & Notifications', order: 140 },
  { id: 'pmo-cat-help', label: 'Help', order: 150 },
  { id: 'pmo-cat-support', label: 'Support', order: 160 },
]

export const PMO_CATEGORY_DEFS = [
  { id: 'pmo-cat-exec', label: 'Executive Overview', order: 1 },
  // v719: Portfolio, Programme, Planning Intelligence + Projects/Oversight → Portfolio & Delivery
  { id: 'pmo-cat-project-delivery', label: 'Portfolio & Delivery', order: 2, menuIcon: 'briefcase' },
  /* Financial items route to Reporting & Intelligence; Risk/Quality items route to Project Delivery */
  /* initiation + governance live under methodology track wrappers (methodologyMenuUtils) */
  /* process template library leaves live under Knowledge & Operations (v718) */
  { id: 'pmo-cat-reporting-intelligence', label: 'Reporting & Intelligence', order: 6 },
  { id: 'pmo-cat-workflows-approvals', label: 'Workflows & Governance', order: 7 },
  { id: 'pmo-cat-teams', label: 'People & Resources', order: 8 },
  { id: 'pmo-cat-stakeholders', label: 'Stakeholders', order: 9 },
  { id: 'pmo-cat-knowledge-assets', label: 'Knowledge & Operations', order: 10 },
  { id: 'pmo-cat-audit-compliance', label: 'Audit Trail & Compliance', order: 11 },
  { id: 'pmo-cat-email-notifications', label: 'Email & Notifications', order: 12 },
  { id: 'pmo-cat-account-subscription', label: 'Account & Subscription', order: 12.5 },
  { id: 'pmo-cat-admin', label: 'Administration', order: 13 },
  { id: 'pmo-cat-system-admin', label: 'System Administration', order: 14 },
  { id: 'pmo-cat-help', label: 'Help', order: 15 },
  { id: 'pmo-cat-support', label: 'Support', order: 16 },
]

/** Legacy registry category ids → canonical pmo-cat-* ids used by useMenu. */
export const REGISTRY_CATEGORY_ALIASES = {
  'pmo-cat-governance': 'pmo-cat-workflows-approvals',
  'pmo-cat-oversight': 'pmo-cat-reporting-intelligence',
  'pmo-cat-delivery': 'pmo-cat-agile-lean',
  'pmo-cat-strategy': 'pmo-cat-knowledge-assets',
}

const ALL_CATEGORY_IDS = new Set([
  ...PMO_CATEGORY_DEFS.map((c) => c.id),
  ...DELIVERY_MANAGEMENT_SUB_DEFS.map((s) => s.id),
  // Retained for matchCategory routing even though they no longer appear in PMO_CATEGORY_DEFS
  'pmo-cat-financial-commercial',
  'pmo-cat-risk-issues-quality',
  'pmo-cat-delivery-management',
  'pmo-cat-agile-lean',
  'pmo-cat-standards-based',
  'pmo-cat-initiation',
  'pmo-cat-governance-standards',
  'pmo-cat-process-templates',
])

/**
 * Map registry category hints to a sidebar bucket that will render.
 * @param {string|null|undefined} categoryId
 * @returns {string}
 */
export function resolveRegistryCategoryId(categoryId) {
  const raw = String(categoryId || '').trim()
  if (!raw) return 'pmo-cat-admin'
  const aliased = REGISTRY_CATEGORY_ALIASES[raw] || raw
  return ALL_CATEGORY_IDS.has(aliased) ? aliased : 'pmo-cat-admin'
}

export const PMO_CATEGORY_FALLBACKS = {
  'pmo-cat-exec': { label: 'PMO Dashboard', path: '/platform/dashboard' },
  'pmo-cat-project-delivery': { label: 'Portfolio & Delivery', path: '/platform/portfolio' },
  'pmo-cat-portfolio': { label: 'Portfolio View', path: '/platform/portfolio' },
  'pmo-cat-programme': { label: 'Programme View', path: '/platform/programme' },
  'pmo-cat-projects': { label: 'My Projects', path: '/platform/projects' },
  'pmo-cat-agile-lean': { label: 'Scrum of Scrums', path: '/platform/projects/:projectId/scrum/scrum-of-scrums' },
  'pmo-cat-project-oversight': { label: 'Project Oversight View', path: '/platform/dashboard' },
  'pmo-cat-delivery-controls': { label: 'Delivery Controls View', path: '/platform/dashboard' },
  'pmo-cat-financial-commercial': { label: 'Financial View', path: '/platform/financial-reports' },
  'pmo-cat-risk-issues-quality': { label: 'Risk & Quality View', path: '/pmo/oversight/risk-register' },
  'pmo-cat-governance-standards': { label: 'Governance View', path: '/pmo/governance/mandate' },
  'pmo-cat-initiation': { label: 'Project Mandate', path: '/platform/mandates/list' },
  'pmo-cat-standards-based': { label: 'Process Group Forms', path: '/platform/projects' },
  'pmo-cat-process-templates': { label: 'Hub Overview', path: '/pmo/process-templates' },
  'pmo-cat-reporting-intelligence': { label: 'Reporting View', path: '/platform/reports' },
  'pmo-cat-workflows-approvals': { label: 'Pending Approvals', path: '/pmo/forms?status=in_review' },
  'pmo-cat-teams': { label: 'Manager assignments', path: '/platform/pmo-admin/manager-assignments' },
  'pmo-cat-stakeholders': { label: 'Stakeholder Register', path: '/platform/stakeholders/register' },
  'pmo-cat-knowledge-assets': { label: 'Org Knowledge Hub', path: '/platform/org-knowledge' },
  'pmo-cat-audit-compliance': { label: 'Compliance View', path: '/platform/reports' },
  'pmo-cat-email-notifications': { label: 'Email Settings', path: '/platform/admin/email-settings' },
  'pmo-cat-admin': { label: 'Organisation Settings', path: '/platform/pmo-admin/settings' },
  'pmo-cat-system-admin': { label: 'Platform Settings', path: '/platform/settings' },
  'pmo-cat-help': { label: 'Help Centre', path: '/help' },
  'pmo-cat-support': { label: 'Support', path: '/support' },
}
