/** Manager roles — v593 formal appointment flow */
export const MANAGER_APPOINTMENT_ROLES = new Set([
  'project_manager',
  'programme_manager',
  'portfolio_manager',
  'pm_project_manager',
  'pm_programme_manager',
])

/** Team-level roles — team member appointment extension */
export const TEAM_MEMBER_APPOINTMENT_ROLES = new Set([
  'team_member',
  'team_lead',
  'developer',
  'analyst',
  'designer',
  'tester',
  'subject_matter_expert',
  'support',
  'pm_team_member',
  'pm_team_manager',
])

export const DECLINE_REASON_OPTIONS = [
  { value: 'unavailable', label: 'Unavailable' },
  { value: 'skills_mismatch', label: 'Skills mismatch' },
  { value: 'conflict_of_interest', label: 'Conflict of interest' },
  { value: 'overloaded', label: 'Overloaded' },
  { value: 'other', label: 'Other' },
]

export const TIME_COMMITMENT_OPTIONS = [25, 50, 75, 100]

export const REPORTING_FREQUENCY_OPTIONS = [
  { value: 'weekly', label: 'Weekly' },
  { value: 'fortnightly', label: 'Fortnightly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'as_required', label: 'As required' },
]

export const WORKING_ARRANGEMENT_OPTIONS = [
  { value: 'remote', label: 'Remote' },
  { value: 'onsite', label: 'Onsite' },
  { value: 'hybrid', label: 'Hybrid' },
]

/**
 * @param {string|null|undefined} roleName
 */
export function isManagerAppointmentRole(roleName) {
  if (!roleName) return false
  const n = String(roleName).trim().toLowerCase()
  return MANAGER_APPOINTMENT_ROLES.has(n)
}

/**
 * @param {string|null|undefined} roleName
 */
export function isTeamMemberAppointmentRole(roleName) {
  if (!roleName) return false
  const n = String(roleName).trim().toLowerCase()
  return TEAM_MEMBER_APPOINTMENT_ROLES.has(n)
}

/**
 * Normalise legacy role aliases to appointment manager_role_name.
 * @param {string|null|undefined} roleName
 */
export function normalizeManagerRoleName(roleName) {
  const n = String(roleName || '').trim().toLowerCase()
  if (n === 'pm_project_manager') return 'project_manager'
  if (n === 'pm_programme_manager') return 'programme_manager'
  if (MANAGER_APPOINTMENT_ROLES.has(n)) {
    if (n === 'portfolio_manager') return 'portfolio_manager'
    if (n === 'programme_manager') return 'programme_manager'
    return 'project_manager'
  }
  return n
}

/**
 * @param {'project'|'programme'|'portfolio'} entityType
 */
export function managerRoleForEntityType(entityType) {
  if (entityType === 'programme') return 'programme_manager'
  if (entityType === 'portfolio') return 'portfolio_manager'
  return 'project_manager'
}
