/**
 * Roles allowed to use organisation-wide PMO administration flows in the app
 * (e.g. Send Role Invitations, Assign Roles to Projects).
 *
 * Database seeds/policies sometimes use `pmo_admin`, other times `PMO Admin` or `PMO Admin`-like spacing.
 * Normalise so both match.
 */

/**
 * @param {string | null | undefined} roleName - roles.role_name from user_roles embed
 * @returns {boolean}
 */
export function matchesPmoSuiteAdminRole(roleName) {
  const raw = String(roleName ?? '').trim()
  if (!raw) return false
  const key = raw.toLowerCase().replace(/[\s-]+/g, '_')
  return (
    key === 'pmo_admin' ||
    key === 'org_admin' ||
    key === 'system_admin' ||
    key === 'super_admin'
  )
}
