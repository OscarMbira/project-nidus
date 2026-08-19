/**
 * PM dashboard role routing — governance/oversight-only project roles get the
 * read/oversight-oriented Governance Dashboard instead of the operational PM
 * Dashboard. Scoped to roles that operate above single-project, day-to-day
 * execution (per project_roles.role_description in the v91/v355 seed):
 *   - project_board_member ("Executive oversight and governance")
 *   - project_sponsor ("Project sponsorship and strategic direction")
 *   - portfolio_manager ("Portfolio-level oversight and project coordination" —
 *     coordinates priorities/scope/schedule across MULTIPLE projects, not
 *     single-project delivery tools like Daily Log or individual Work Packages)
 * Every other project role (Programme/Project Manager, Team Manager, Project/
 * Quality Assurance, Change Authority, Team Member) operates within a single
 * project's own delivery execution and keeps the operational dashboard.
 *
 * v902: source of truth moved to project_roles.is_governance_only (a real DB
 * column now, backfilled TRUE for the 3 roles below) so organisation-created
 * custom roles can opt into governance-only routing too — a brand-new custom
 * role's role_name can never appear in a hardcoded string Set. CurrentProjectContext
 * (Platform + Simulator) computes isGovernanceOnly per project from that column
 * via isGovernanceOnlyFromRoles() and PMDashboard.jsx reads it directly.
 * GOVERNANCE_ONLY_ROLE_KEYS/isGovernanceOnlyRole are kept as a fallback for any
 * caller that only has role-name strings and no DB flag available.
 */

/** Fallback only (see file header) — project roles that are purely governance/oversight. */
export const GOVERNANCE_ONLY_ROLE_KEYS = new Set(['project_board_member', 'project_sponsor', 'portfolio_manager'])

/**
 * Fallback only — TRUE when EVERY role key falls in GOVERNANCE_ONLY_ROLE_KEYS. Prefer
 * isGovernanceOnlyFromRoles() when project_roles.is_governance_only is available.
 * @param {string[]} roleKeys - raw project_roles.role_name values for the current project
 */
export function isGovernanceOnlyRole(roleKeys = []) {
  return roleKeys.length > 0 && roleKeys.every((k) => GOVERNANCE_ONLY_ROLE_KEYS.has(k))
}

/**
 * TRUE only when EVERY role the user holds on the current project has
 * is_governance_only = true — someone who is e.g. both Project Manager and Board
 * Member on the same project still needs the operational dashboard's tools.
 * @param {{is_governance_only?: boolean}[]} roles - project_roles rows (or {is_governance_only} shapes) held on the current project
 */
export function isGovernanceOnlyFromRoles(roles = []) {
  return roles.length > 0 && roles.every((r) => !!r?.is_governance_only)
}
