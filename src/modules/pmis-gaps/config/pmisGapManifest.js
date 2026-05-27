/**
 * v631 PMIS gap feature manifest — routes, tables, and metadata per gap.
 * @see projectplan/v631_PMIS_Gap_Analysis_Implementation_Plan.md
 */

/** @typedef {'pm'|'pmo'|'platform'|'simPm'|'simPmo'|'simGeneral'|'simTm'} RouteVariant */

/**
 * @typedef {Object} GapRouteDef
 * @property {string} path
 * @property {string} pageKey
 * @property {string} [label]
 */

/**
 * @typedef {Object} GapManifestEntry
 * @property {string} id
 * @property {string} title
 * @property {string} icon
 * @property {string} [primaryTable]
 * @property {Record<RouteVariant, string>} baseRoutes
 * @property {GapRouteDef[]} [subRoutes]
 */

/** @type {GapManifestEntry[]} */
export const PMIS_GAP_MANIFEST = [
  {
    id: 'GAP-01',
    title: 'Workflow Automation Engine',
    icon: 'zap',
    primaryTable: 'automation_rules',
    baseRoutes: {
      pm: '/pm/automations',
      pmo: '/pmo/admin/automations',
      platform: '/platform/automations',
      simPm: '/simulator/pm/automations',
      simPmo: '/simulator/pmo/admin/automations',
      simGeneral: '',
      simTm: '',
    },
    subRoutes: [
      { path: 'templates', pageKey: 'automation-templates', label: 'Template Library' },
      { path: 'log', pageKey: 'automation-log', label: 'Execution Log' },
    ],
  },
  {
    id: 'GAP-02',
    title: 'Global Search',
    icon: 'search',
    primaryTable: 'search_index',
    baseRoutes: {
      pm: '',
      pmo: '',
      platform: '',
      simPm: '',
      simPmo: '',
      simGeneral: '',
      simTm: '',
    },
  },
  {
    id: 'GAP-03',
    title: 'OKR & Goals',
    icon: 'target',
    primaryTable: 'objectives',
    baseRoutes: {
      pm: '/pm/okr',
      pmo: '/pmo/okr',
      platform: '/platform/okr',
      simPm: '/simulator/pm/okr',
      simPmo: '/simulator/pmo/okr',
      simGeneral: '/simulator/okr',
      simTm: '',
    },
    subRoutes: [
      { path: 'objectives', pageKey: 'okr-objectives', label: 'Objectives & Key Results' },
      { path: 'alignment', pageKey: 'okr-alignment', label: 'Alignment Map' },
      { path: 'checkins', pageKey: 'okr-checkins', label: 'OKR Check-ins' },
    ],
  },
  {
    id: 'GAP-04',
    title: 'Custom Fields Engine',
    icon: 'sliders-horizontal',
    primaryTable: 'custom_field_definitions',
    baseRoutes: {
      pm: '/pm/settings/custom-fields',
      pmo: '/pmo/admin/custom-fields',
      platform: '/platform/admin/custom-fields',
      simPm: '/simulator/pm/settings/custom-fields',
      simPmo: '/simulator/pmo/admin/custom-fields',
      simGeneral: '',
      simTm: '',
    },
  },
  {
    id: 'GAP-05',
    title: 'Workload Heatmap',
    icon: 'layout-grid',
    primaryTable: 'workload_capacity_settings',
    baseRoutes: {
      pm: '/pm/resources/workload',
      pmo: '/pmo/resources/workload',
      platform: '/platform/resources/workload',
      simPm: '/simulator/pm/resources/workload',
      simPmo: '/simulator/pmo/resources/workload',
      simGeneral: '',
      simTm: '/simulator/tm/workload',
    },
  },
  {
    id: 'GAP-06',
    title: 'Public Intake Forms',
    icon: 'file-input',
    primaryTable: 'intake_forms',
    baseRoutes: {
      pm: '/pm/settings/intake-forms',
      pmo: '/pmo/admin/intake-forms',
      platform: '/platform/intake-forms',
      simPm: '/simulator/pm/settings/intake-forms',
      simPmo: '/simulator/pmo/admin/intake-forms',
      simGeneral: '',
      simTm: '',
    },
    subRoutes: [
      { path: 'submissions', pageKey: 'intake-submissions', label: 'Form Submissions' },
    ],
  },
  {
    id: 'GAP-07',
    title: 'Client Portal',
    icon: 'globe',
    primaryTable: 'client_portal_configs',
    baseRoutes: {
      pm: '/pm/settings/client-portal',
      pmo: '/pmo/admin/client-portals',
      platform: '/platform/client-portal',
      simPm: '/simulator/pm/settings/client-portal',
      simPmo: '/simulator/pmo/admin/client-portals',
      simGeneral: '',
      simTm: '',
    },
  },
  {
    id: 'GAP-08',
    title: 'Recurring Tasks',
    icon: 'repeat',
    primaryTable: 'recurring_task_templates',
    baseRoutes: {
      pm: '/pm/settings/recurring-tasks',
      pmo: '',
      platform: '/platform/recurring-tasks',
      simPm: '/simulator/pm/settings/recurring-tasks',
      simPmo: '',
      simGeneral: '/simulator/planning/recurring-tasks',
      simTm: '/simulator/tm/recurring-tasks',
    },
  },
  {
    id: 'GAP-09',
    title: 'Universal Calendar',
    icon: 'calendar-days',
    primaryTable: 'calendar_event_overrides',
    baseRoutes: {
      pm: '/pm/calendar',
      pmo: '/pmo/calendar',
      platform: '/platform/calendar',
      simPm: '/simulator/pm/calendar',
      simPmo: '/simulator/pmo/calendar',
      simGeneral: '/simulator/calendar',
      simTm: '/simulator/tm/calendar',
    },
  },
  {
    id: 'GAP-10',
    title: 'RACI Matrix',
    icon: 'table-2',
    primaryTable: 'raci_matrices',
    baseRoutes: {
      pm: '/pm/resources/raci',
      pmo: '/pmo/resources/raci',
      platform: '/platform/planning/raci',
      simPm: '/simulator/pm/resources/raci',
      simPmo: '/simulator/pmo/resources/raci',
      simGeneral: '/simulator/planning/raci',
      simTm: '/simulator/tm/raci',
    },
  },
  {
    id: 'GAP-11',
    title: 'Skills Matrix',
    icon: 'book-marked',
    primaryTable: 'skill_catalog',
    baseRoutes: {
      pm: '/pm/resources/skills',
      pmo: '/pmo/resources/skills',
      platform: '/platform/resources/skills',
      simPm: '/simulator/pm/resources/skills',
      simPmo: '/simulator/pmo/resources/skills',
      simGeneral: '',
      simTm: '/simulator/tm/skills',
    },
  },
  {
    id: 'GAP-12',
    title: 'Procurement & Contracts',
    icon: 'shopping-cart',
    primaryTable: 'vendors',
    baseRoutes: {
      pm: '/pm/procurement/vendors',
      pmo: '/pmo/procurement/vendors',
      platform: '/platform/procurement',
      simPm: '/simulator/pm/procurement/vendors',
      simPmo: '/simulator/pmo/procurement/vendors',
      simGeneral: '',
      simTm: '',
    },
  },
  {
    id: 'GAP-13',
    title: 'Timesheet Approval',
    icon: 'clock',
    primaryTable: 'timesheet_approvals',
    baseRoutes: {
      pm: '/pm/resources/timesheet-approvals',
      pmo: '/pmo/resources/timesheet-approvals',
      platform: '/platform/timesheets/approvals',
      simPm: '/simulator/pm/resources/timesheet-approvals',
      simPmo: '/simulator/pmo/resources/timesheet-approvals',
      simGeneral: '',
      simTm: '',
    },
  },
  {
    id: 'GAP-14',
    title: 'S-Curve & Baselines',
    icon: 'line-chart',
    primaryTable: 'project_baselines',
    baseRoutes: {
      pm: '/pm/planning/s-curve',
      pmo: '/pmo/planning/s-curve',
      platform: '/platform/planning/s-curve',
      simPm: '/simulator/pm/planning/s-curve',
      simPmo: '/simulator/pmo/planning/s-curve',
      simGeneral: '',
      simTm: '',
    },
  },
  {
    id: 'GAP-15',
    title: 'Planning Poker',
    icon: 'gamepad-2',
    primaryTable: 'planning_poker_sessions',
    baseRoutes: {
      pm: '/pm/planning/planning-poker',
      pmo: '/pmo/planning/planning-poker',
      platform: '/platform/planning/planning-poker',
      simPm: '/simulator/pm/planning/planning-poker',
      simPmo: '/simulator/pmo/planning/planning-poker',
      simGeneral: '',
      simTm: '',
    },
  },
  {
    id: 'GAP-16',
    title: 'Dashboard Builder',
    icon: 'layout-grid',
    primaryTable: 'dashboards',
    baseRoutes: {
      pm: '/pm/dashboards/builder',
      pmo: '/pmo/dashboards/builder',
      platform: '/platform/dashboards/builder',
      simPm: '/simulator/pm/dashboards/builder',
      simPmo: '/simulator/pmo/dashboards/builder',
      simGeneral: '/simulator/dashboards/builder',
      simTm: '',
    },
  },
  {
    id: 'GAP-17',
    title: 'Portfolio Map',
    icon: 'map',
    primaryTable: 'portfolio_map_configs',
    baseRoutes: {
      pm: '/pm/strategy/portfolio-map',
      pmo: '/pmo/strategy/portfolio-map',
      platform: '/platform/strategy/portfolio-map',
      simPm: '',
      simPmo: '/simulator/pmo/strategy/portfolio-map',
      simGeneral: '',
      simTm: '',
    },
  },
  {
    id: 'GAP-18',
    title: 'Whiteboard',
    icon: 'pen-tool',
    primaryTable: 'whiteboards',
    baseRoutes: {
      pm: '/pm/collaboration/whiteboard',
      pmo: '/pmo/collaboration/whiteboard',
      platform: '/platform/collaboration/whiteboard',
      simPm: '/simulator/pm/collaboration/whiteboard',
      simPmo: '/simulator/pmo/collaboration/whiteboard',
      simGeneral: '/simulator/collaboration/whiteboard',
      simTm: '/simulator/tm/collaboration/whiteboard',
    },
  },
  {
    id: 'GAP-19',
    title: 'Guest Collaborator',
    icon: 'user-plus',
    primaryTable: 'guest_collaborators',
    baseRoutes: {
      pm: '/pm/settings/guest-access',
      pmo: '/pmo/admin/guest-access',
      platform: '/platform/admin/guest-access',
      simPm: '/simulator/pm/settings/guest-access',
      simPmo: '/simulator/pmo/admin/guest-access',
      simGeneral: '',
      simTm: '',
    },
  },
  {
    id: 'GAP-20',
    title: 'Training Tracker',
    icon: 'graduation-cap',
    primaryTable: 'training_certifications',
    baseRoutes: {
      pm: '/pm/resources/training',
      pmo: '/pmo/resources/training',
      platform: '/platform/resources/training',
      simPm: '/simulator/pm/resources/training',
      simPmo: '/simulator/pmo/resources/training',
      simGeneral: '',
      simTm: '/simulator/tm/training',
    },
  },
  {
    id: 'GAP-21',
    title: 'Notification Preferences',
    icon: 'bell',
    primaryTable: 'notification_preferences',
    baseRoutes: {
      pm: '/pm/settings/notifications',
      pmo: '/pmo/settings/notifications',
      platform: '/platform/settings/notifications',
      simPm: '/simulator/pm/settings/notifications',
      simPmo: '/simulator/pmo/settings/notifications',
      simGeneral: '/simulator/settings/notifications',
      simTm: '/simulator/tm/settings/notifications',
    },
  },
  {
    id: 'GAP-22',
    title: 'Project Clone',
    icon: 'copy',
    primaryTable: 'project_clone_jobs',
    baseRoutes: {
      pm: '/pm/settings/project-clone',
      pmo: '/pmo/admin/project-clone',
      platform: '/platform/admin/project-clone',
      simPm: '/simulator/pm/settings/project-clone',
      simPmo: '/simulator/pmo/admin/project-clone',
      simGeneral: '',
      simTm: '',
    },
  },
  {
    id: 'GAP-23',
    title: 'Scheduled Health Reports',
    icon: 'calendar-clock',
    primaryTable: 'scheduled_health_reports',
    baseRoutes: {
      pm: '/pm/reporting/scheduled',
      pmo: '/pmo/reporting/scheduled',
      platform: '/platform/reporting/scheduled',
      simPm: '/simulator/pm/reporting/scheduled',
      simPmo: '/simulator/pmo/reporting/scheduled',
      simGeneral: '/simulator/reporting/scheduled',
      simTm: '',
    },
  },
  {
    id: 'GAP-24',
    title: 'Mobile Quick Capture',
    icon: 'plus-circle',
    primaryTable: 'quick_capture_items',
    baseRoutes: {
      pm: '',
      pmo: '',
      platform: '',
      simPm: '',
      simPmo: '',
      simGeneral: '',
      simTm: '',
    },
  },
  {
    id: 'GAP-25',
    title: 'Integrations Hub',
    icon: 'plug',
    primaryTable: 'integration_catalog',
    baseRoutes: {
      pm: '/pm/integrations',
      pmo: '/pmo/admin/integrations',
      platform: '/platform/admin/integrations',
      simPm: '',
      simPmo: '/simulator/pmo/admin/integrations',
      simGeneral: '',
      simTm: '',
    },
    subRoutes: [
      { path: 'connections', pageKey: 'integrations-connections', label: 'My Connections' },
    ],
  },
  {
    id: 'GAP-26',
    title: 'Multiplayer Simulation',
    icon: 'users',
    primaryTable: 'multiplayer_sessions',
    baseRoutes: {
      pm: '',
      pmo: '',
      platform: '',
      simPm: '/simulator/team-mode/setup',
      simPmo: '/simulator/team-mode/setup',
      simGeneral: '/simulator/team-mode/setup',
      simTm: '/simulator/team-mode/setup',
    },
    subRoutes: [
      { path: 'active', pageKey: 'team-mode-active', label: 'Active Team Session' },
    ],
  },
  {
    id: 'GAP-27',
    title: 'Certification Exam Mode',
    icon: 'award',
    primaryTable: 'certification_exams',
    baseRoutes: {
      pm: '',
      pmo: '',
      platform: '',
      simPm: '',
      simPmo: '',
      simGeneral: '/simulator/exams',
      simTm: '/simulator/exams',
    },
    subRoutes: [
      { path: 'results', pageKey: 'exam-results', label: 'My Exam Results' },
      { path: 'certificates', pageKey: 'exam-certificates', label: 'Exam Certificates' },
    ],
  },
  {
    id: 'GAP-28',
    title: 'Scenario Marketplace',
    icon: 'store',
    primaryTable: 'scenario_marketplace_listings',
    baseRoutes: {
      pm: '',
      pmo: '',
      platform: '',
      simPm: '',
      simPmo: '',
      simGeneral: '/simulator/scenarios/marketplace',
      simTm: '/simulator/scenarios/marketplace',
    },
  },
  {
    id: 'GAP-29',
    title: 'Cross-Run Analytics',
    icon: 'bar-chart-2',
    primaryTable: 'cross_run_analytics',
    baseRoutes: {
      pm: '',
      pmo: '',
      platform: '',
      simPm: '',
      simPmo: '',
      simGeneral: '/simulator/profile/run-analytics',
      simTm: '/simulator/profile/run-analytics',
    },
    subRoutes: [
      { path: 'improvement', pageKey: 'improvement-insights', label: 'Improvement Insights' },
    ],
  },
]

/** @param {string} gapId */
export function getGapById(gapId) {
  return PMIS_GAP_MANIFEST.find((g) => g.id === gapId)
}

/** Collect all non-empty route paths for App.jsx registration */
export function getAllGapRoutePaths() {
  const paths = new Set()
  for (const gap of PMIS_GAP_MANIFEST) {
    for (const route of Object.values(gap.baseRoutes)) {
      if (route) paths.add(route.replace(/^\//, ''))
    }
    for (const variant of Object.values(gap.baseRoutes)) {
      if (!variant || !gap.subRoutes) continue
      for (const sub of gap.subRoutes) {
        const base = variant.replace(/\/$/, '')
        paths.add(`${base.replace(/^\//, '')}/${sub.path}`)
      }
    }
  }
  // Procurement sub-routes
  ;[
    'pm/procurement/vendors', 'pm/procurement/requests', 'pm/procurement/orders',
    'pm/procurement/contracts', 'pm/procurement/invoices',
    'pmo/procurement/vendors', 'pmo/procurement/requests', 'pmo/procurement/orders',
    'pmo/procurement/contracts', 'pmo/procurement/invoices',
    'simulator/pm/procurement/vendors', 'simulator/pmo/procurement/vendors',
  ].forEach((p) => paths.add(p))
  return [...paths]
}

export default PMIS_GAP_MANIFEST
