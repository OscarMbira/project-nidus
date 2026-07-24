/**
 * Central registry for all federated modules (v731).
 * Used by scaffold scripts, moduleConfig, CI workflows, and dev port assignment.
 */

/** @typedef {{ federationName: string, folder: string, packageName: string, port: number, envKey: string, displayName: string, routePrefix?: string }} ModuleDef */

/** @type {ModuleDef[]} */
export const PLATFORM_MODULES = [
  { federationName: 'planning_hub', folder: 'planning-hub', packageName: '@nidus/planning-hub', port: 5201, envKey: 'VITE_MODULE_PLANNING_HUB_URL', displayName: 'Planning Hub', routePrefix: '/app/planning' },
  { federationName: 'risk_module', folder: 'risk-module', packageName: '@nidus/risk-module', port: 5202, envKey: 'VITE_MODULE_RISK_URL', displayName: 'Risk', routePrefix: '/app/risks' },
  { federationName: 'quality_module', folder: 'quality-module', packageName: '@nidus/quality-module', port: 5203, envKey: 'VITE_MODULE_QUALITY_URL', displayName: 'Quality', routePrefix: '/app/quality' },
  { federationName: 'financial_module', folder: 'financial-module', packageName: '@nidus/financial-module', port: 5204, envKey: 'VITE_MODULE_FINANCIAL_URL', displayName: 'Financial', routePrefix: '/app/financial' },
  { federationName: 'change_module', folder: 'change-module', packageName: '@nidus/change-module', port: 5205, envKey: 'VITE_MODULE_CHANGE_URL', displayName: 'Change', routePrefix: '/app/change' },
  { federationName: 'stakeholder_module', folder: 'stakeholder-module', packageName: '@nidus/stakeholder-module', port: 5206, envKey: 'VITE_MODULE_STAKEHOLDER_URL', displayName: 'Stakeholder', routePrefix: '/app/stakeholders' },
  { federationName: 'delays_module', folder: 'delays-module', packageName: '@nidus/delays-module', port: 5207, envKey: 'VITE_MODULE_DELAYS_URL', displayName: 'Delays', routePrefix: '/app/delays' },
  { federationName: 'stage_gates_module', folder: 'stage-gates-module', packageName: '@nidus/stage-gates-module', port: 5208, envKey: 'VITE_MODULE_STAGE_GATES_URL', displayName: 'Stage Gates', routePrefix: '/app/stage-gates' },
  { federationName: 'pmo_module', folder: 'pmo-module', packageName: '@nidus/pmo-module', port: 5209, envKey: 'VITE_MODULE_PMO_URL', displayName: 'PMO', routePrefix: '/app/pmo' },
  { federationName: 'portfolio_module', folder: 'portfolio-module', packageName: '@nidus/portfolio-module', port: 5210, envKey: 'VITE_MODULE_PORTFOLIO_URL', displayName: 'Portfolio', routePrefix: '/app/portfolio' },
  { federationName: 'programme_module', folder: 'programme-module', packageName: '@nidus/programme-module', port: 5211, envKey: 'VITE_MODULE_PROGRAMME_URL', displayName: 'Programme', routePrefix: '/app/programme' },
  { federationName: 'benefits_module', folder: 'benefits-module', packageName: '@nidus/benefits-module', port: 5212, envKey: 'VITE_MODULE_BENEFITS_URL', displayName: 'Benefits', routePrefix: '/app/benefits' },
  { federationName: 'issues_module', folder: 'issues-module', packageName: '@nidus/issues-module', port: 5213, envKey: 'VITE_MODULE_ISSUES_URL', displayName: 'Issues', routePrefix: '/app/issues' },
  { federationName: 'communications_module', folder: 'communications-module', packageName: '@nidus/communications-module', port: 5214, envKey: 'VITE_MODULE_COMMUNICATIONS_URL', displayName: 'Communications', routePrefix: '/app/communications' },
  { federationName: 'reports_module', folder: 'reports-module', packageName: '@nidus/reports-module', port: 5215, envKey: 'VITE_MODULE_REPORTS_URL', displayName: 'Reports', routePrefix: '/app/reports' },
  { federationName: 'admin_module', folder: 'admin-module', packageName: '@nidus/admin-module', port: 5216, envKey: 'VITE_MODULE_ADMIN_URL', displayName: 'Admin', routePrefix: '/app/admin' },
]

/** @type {ModuleDef[]} */
export const SIMULATOR_MODULES = [
  { federationName: 'sim_planning_module', folder: 'sim-planning-module', packageName: '@nidus/sim-planning-module', port: 5301, envKey: 'VITE_MODULE_SIM_PLANNING_URL', displayName: 'Sim Planning', routePrefix: '/simulator/planning' },
  { federationName: 'sim_risk_module', folder: 'sim-risk-module', packageName: '@nidus/sim-risk-module', port: 5302, envKey: 'VITE_MODULE_SIM_RISK_URL', displayName: 'Sim Risk', routePrefix: '/simulator/risks' },
  { federationName: 'sim_quality_module', folder: 'sim-quality-module', packageName: '@nidus/sim-quality-module', port: 5303, envKey: 'VITE_MODULE_SIM_QUALITY_URL', displayName: 'Sim Quality', routePrefix: '/simulator/quality' },
  { federationName: 'sim_pmo_module', folder: 'sim-pmo-module', packageName: '@nidus/sim-pmo-module', port: 5304, envKey: 'VITE_MODULE_SIM_PMO_URL', displayName: 'Sim PMO', routePrefix: '/simulator/pmo' },
  { federationName: 'sim_scenarios_module', folder: 'sim-scenarios-module', packageName: '@nidus/sim-scenarios-module', port: 5305, envKey: 'VITE_MODULE_SIM_SCENARIOS_URL', displayName: 'Sim Scenarios', routePrefix: '/simulator/scenarios' },
  { federationName: 'sim_leaderboard_module', folder: 'sim-leaderboard-module', packageName: '@nidus/sim-leaderboard-module', port: 5306, envKey: 'VITE_MODULE_SIM_LEADERBOARD_URL', displayName: 'Sim Leaderboard', routePrefix: '/simulator/leaderboard' },
  { federationName: 'sim_admin_module', folder: 'sim-admin-module', packageName: '@nidus/sim-admin-module', port: 5307, envKey: 'VITE_MODULE_SIM_ADMIN_URL', displayName: 'Sim Admin', routePrefix: '/simulator/admin' },
]

export const ALL_MODULES = [...PLATFORM_MODULES, ...SIMULATOR_MODULES]

export function getModuleByFolder(folder) {
  return ALL_MODULES.find((m) => m.folder === folder)
}

export function getDefaultModuleUrl(port) {
  return `http://localhost:${port}`
}
