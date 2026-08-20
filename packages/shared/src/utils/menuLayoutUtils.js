import { resolvePmProfile } from '@nidus/config/methodologyMenuUtils'
import { platformDb } from '@nidus/supabase'

export const PMO_LAYOUT_ROLES = new Set([
  'pmo_admin',
  'system_admin',
  'account_owner',
  'super_admin',
  'org_admin',
])

export const PM_LAYOUT_ROLES = new Set([
  'project_manager',
  'programme_manager',
  'portfolio_manager',
  'team_manager',
  'pm_project_manager',
  'pm_programme_manager',
  'pm_portfolio_manager',
  'pm_team_manager',
  'executive',
  'project_sponsor',
  'project_board_member',
  'project_assurance',
  'quality_assurance',
  'change_authority',
  'stakeholder',
  'viewer',
])

export const TM_LEAD_ROLES = new Set(['team_lead'])
export const TM_LAYOUT_ROLES = new Set(['team_member', 'team_lead'])

function normalizeRoleName(roleName) {
  return String(roleName || '').trim().toLowerCase().replace(/\s+/g, '_')
}

/**
 * Derive sidebar layout scope from the current URL when the layout wrapper
 * does not pass an explicit scope.
 * @param {string} pathname
 * @returns {'pm' | 'pmo' | 'tm' | null}
 */
export function inferLayoutScopeFromPathname(pathname = '') {
  const p = String(pathname || '').toLowerCase()
  if (p.startsWith('/simulator/pmo')) return 'pmo'
  if (p.startsWith('/simulator/pm')) return 'pm'
  if (p.startsWith('/pm/') || p === '/pm') return 'pm'
  if (
    p.startsWith('/platform/') ||
    p.startsWith('/app/') ||
    p.startsWith('/pmo/')
  ) {
    return 'pmo'
  }
  return null
}

export const MENU_LAYOUT_SCOPE_SESSION_KEY = 'nidus_menu_layout_scope'

/** In-memory role cache so Layout can pick PM shell before the menu hook finishes loading. */
let _cachedUserMenuRoles = { userId: null, roleNames: [], primaryScope: null }

export function cacheUserMenuRoles(userId, roleNames = []) {
  const names = (roleNames || []).map(normalizeRoleName)
  const hasPmo = names.some((r) => PMO_LAYOUT_ROLES.has(r))
  const hasPm = names.some((r) => PM_LAYOUT_ROLES.has(r))
  let primaryScope = 'pmo'
  if (hasPm && !hasPmo) primaryScope = 'pm'
  else if (hasPm && hasPmo) primaryScope = readPersistedMenuLayoutScope() || 'pmo'
  _cachedUserMenuRoles = { userId, roleNames: roleNames || [], primaryScope }
}

export function getCachedUserMenuRoles(userId) {
  if (userId && _cachedUserMenuRoles.userId === userId) return _cachedUserMenuRoles
  return null
}

export function clearCachedUserMenuRoles() {
  _cachedUserMenuRoles = { userId: null, roleNames: [], primaryScope: null }
}

/** PM-only users always use PM sidebar; dual-role users honour persisted context. */
export function resolvePrimaryLayoutScopeFromRoles(roleNames = []) {
  const names = (roleNames || []).map(normalizeRoleName)
  const hasPmo = names.some((r) => PMO_LAYOUT_ROLES.has(r))
  const hasPm = names.some((r) => PM_LAYOUT_ROLES.has(r))
  if (hasPm && !hasPmo) return 'pm'
  if (hasPmo && !hasPm) return 'pmo'
  return null
}

export function persistMenuLayoutScope(scope) {
  if (scope === 'pm' || scope === 'pmo' || scope === 'tm') {
    try {
      sessionStorage.setItem(MENU_LAYOUT_SCOPE_SESSION_KEY, scope)
      localStorage.setItem(MENU_LAYOUT_SCOPE_SESSION_KEY, scope)
    } catch {
      // ignore
    }
  }
}

export function readPersistedMenuLayoutScope() {
  try {
    const scope =
      sessionStorage.getItem(MENU_LAYOUT_SCOPE_SESSION_KEY) ||
      localStorage.getItem(MENU_LAYOUT_SCOPE_SESSION_KEY)
    return scope === 'pm' || scope === 'pmo' || scope === 'tm' ? scope : null
  } catch {
    return null
  }
}

export function clearPersistedMenuLayoutScope() {
  try {
    sessionStorage.removeItem(MENU_LAYOUT_SCOPE_SESSION_KEY)
    localStorage.removeItem(MENU_LAYOUT_SCOPE_SESSION_KEY)
  } catch {
    // ignore
  }
  clearCachedUserMenuRoles()
}

/** PM delivery pages live under /platform/* but must keep the PM sidebar. */
const PM_SHARED_PLATFORM_PREFIXES = [
  '/platform/projects',
  '/platform/tasks',
  '/platform/teams',
  '/platform/calendar',
  '/platform/risks',
  '/platform/issues',
  '/platform/reports',
  '/platform/analytics',
  '/platform/stakeholders',
  '/platform/expenses',
  '/platform/daily-log',
  '/platform/lessons',
  '/platform/templates',
  '/platform/documents',
  '/platform/testing',
  '/platform/change',
  '/platform/delays',
  '/platform/eef',
  '/platform/resources',
  '/platform/my-team',
  '/platform/project-users',
  '/platform/financial-reports',
  '/platform/report-builder',
  '/platform/ai-assistant',
  '/platform/scope',
  '/platform/pid',
  '/platform/brief',
  '/platform/itto',
  '/platform/product-descriptions',
  '/platform/document-governance',
  '/platform/decision-log',
  '/platform/work-authorisation',
  '/platform/stage-gates',
  '/platform/governance',
  '/platform/structured',
  '/platform/org-knowledge',
  '/platform/mandates',
  '/platform/story-map',
  '/platform/releases',
  '/platform/forms',
  '/platform/authorisation',
  '/app/project-users',
  '/app/project-members',
]

const PMO_ONLY_PLATFORM_PREFIXES = [
  '/pmo/',
  '/platform/portfolio',
  '/platform/programme',
  '/platform/benefits',
  '/platform/pmo-admin',
  '/platform/subscription',
  '/platform/organisation',
  '/platform/strategy',
  '/platform/pmo/',
  '/platform/settings',
  '/platform/admin/',
]

export function isSharedPmPlatformPath(pathname = '') {
  const p = String(pathname || '').toLowerCase()
  if (p.startsWith('/pm/') || p === '/pm') return true
  return PM_SHARED_PLATFORM_PREFIXES.some((prefix) => p.startsWith(prefix))
}

export function isPmoOnlyPlatformPath(pathname = '') {
  const p = String(pathname || '').toLowerCase()
  // Shared by PMO Admin and the 4 manager creator tiers (v902). Keep PM users
  // on the PM sidebar instead of swapping them onto the PMO People & Resources tree.
  if (p.startsWith('/platform/admin/manage-roles')) return false
  return PMO_ONLY_PLATFORM_PREFIXES.some((prefix) => p.startsWith(prefix))
}

/**
 * Resolve active sidebar layout scope from layout wrapper prop, URL, session, and roles.
 * PM users keep the PM sidebar on all non-PMO-admin platform routes.
 */
export function resolveMenuLayoutScope(layoutScopeProp, pathname = '', roleNames = null) {
  if (layoutScopeProp) {
    persistMenuLayoutScope(layoutScopeProp)
    return layoutScopeProp
  }

  const fromPath = inferLayoutScopeFromPathname(pathname)
  if (fromPath === 'pm') {
    persistMenuLayoutScope('pm')
    return 'pm'
  }

  if (isPmoOnlyPlatformPath(pathname)) {
    persistMenuLayoutScope('pmo')
    return 'pmo'
  }

  // Prefer explicit arg; otherwise reuse whatever useMenu already cached so Layout can pick
  // the correct shell before (or without) being passed role names.
  const cachedNames = _cachedUserMenuRoles.roleNames
  const names = Array.isArray(roleNames)
    ? roleNames
    : (Array.isArray(cachedNames) && cachedNames.length ? cachedNames : [])
  const primaryFromRoles = names.length ? resolvePrimaryLayoutScopeFromRoles(names) : null
  if (primaryFromRoles === 'pm') {
    persistMenuLayoutScope('pm')
    return 'pm'
  }
  if (primaryFromRoles === 'pmo') {
    return 'pmo'
  }

  const persisted = readPersistedMenuLayoutScope()
  if (persisted === 'pm' && !isPmoOnlyPlatformPath(pathname)) {
    return 'pm'
  }
  if (persisted === 'pmo') {
    return 'pmo'
  }

  // Shared PM delivery URLs under /platform/* default to PM sidebar unless PMO context is explicit.
  if (isSharedPmPlatformPath(pathname) && !isPmoOnlyPlatformPath(pathname)) {
    persistMenuLayoutScope('pm')
    return 'pm'
  }

  if (fromPath === 'pmo') return 'pmo'
  if (persisted) return persisted
  return 'pmo'
}

/** Whether the current URL should render inside PMLayout (PM sidebar shell). */
export function shouldUsePmLayoutShell(pathname = '', roleNames = null) {
  const scope = resolveMenuLayoutScope(null, pathname, roleNames)
  return scope === 'pm'
}

/**
 * Resolve sidebar layout type from role names, optionally overridden by the
 * active layout wrapper / route (pm vs pmo vs tm).
 *
 * @param {string[]} roleNames
 * @param {{ layoutPreference?: 'pm' | 'pmo' | 'tm' | null }} [options]
 */
export function resolveLayoutType(roleNames = [], { layoutPreference = null } = {}) {
  const names = roleNames.map(normalizeRoleName)
  const hasPmo = names.some((r) => PMO_LAYOUT_ROLES.has(r))
  const hasPm = names.some((r) => PM_LAYOUT_ROLES.has(r))
  const hasTmLead = names.some((r) => TM_LEAD_ROLES.has(r))
  const hasTm = names.some((r) => TM_LAYOUT_ROLES.has(r))

  if (layoutPreference === 'pm') {
    return { layout: 'pm', isLead: false, pmProfile: resolvePmProfile(names), roleNames: names }
  }
  if (layoutPreference === 'pmo') {
    return { layout: 'pmo', isLead: false, pmProfile: null, roleNames: names }
  }
  if (layoutPreference === 'tm') {
    return { layout: 'tm', isLead: hasTmLead, pmProfile: null, roleNames: names }
  }

  if (hasPmo) {
    return { layout: 'pmo', isLead: false, pmProfile: null, roleNames: names }
  }
  if (hasTmLead) {
    return { layout: 'tm', isLead: true, pmProfile: null, roleNames: names }
  }
  if (hasTm) {
    return { layout: 'tm', isLead: false, pmProfile: null, roleNames: names }
  }
  return { layout: 'pm', isLead: false, pmProfile: resolvePmProfile(names), roleNames: names }
}

/**
 * Limit menu role assignments to roles relevant for the active layout scope.
 * Prevents dual-role users from seeing PMO items on /pm/* routes (and vice versa).
 *
 * @param {{ id: string, role_name: string }[]} roleRows
 * @param {'pm' | 'pmo' | 'tm' | null} layoutPreference
 */
export function filterRolesForLayout(roleRows = [], layoutPreference = null) {
  if (!layoutPreference || !Array.isArray(roleRows) || roleRows.length === 0) return roleRows

  let allowed = null
  if (layoutPreference === 'pm') {
    allowed = PM_LAYOUT_ROLES
  } else if (layoutPreference === 'pmo') {
    allowed = PMO_LAYOUT_ROLES
  } else if (layoutPreference === 'tm') {
    allowed = new Set([...TM_LAYOUT_ROLES, ...TM_LEAD_ROLES])
  }
  if (!allowed) return roleRows

  const filtered = roleRows.filter((row) => allowed.has(normalizeRoleName(row?.role_name)))
  return filtered.length > 0 ? filtered : roleRows
}

/** Stable module / cache partition key for a user + layout scope. */
export function menuStateKey(userId, layoutScope) {
  if (!userId || !layoutScope) return null
  return `${userId}:${layoutScope}`
}

/**
 * Fetch this auth user's role names from the DB (users -> user_roles -> roles).
 * Single source of truth — useMenu.js forks call this instead of keeping a private copy.
 */
export async function fetchUserRoleNamesForAuthUser(authUser) {
  if (!authUser?.id) return []
  const { data: userRow } = await platformDb
    .from('users')
    .select('id')
    .eq('auth_user_id', authUser.id)
    .maybeSingle()
  if (!userRow?.id) return []

  const { data: roleRows } = await platformDb
    .from('user_roles')
    .select('role_id, is_deleted, is_active')
    .eq('user_id', userRow.id)
    .eq('is_active', true)

  const roleIds = (roleRows || [])
    .filter((ur) => !ur.is_deleted)
    .map((ur) => ur.role_id)
    .filter(Boolean)
  if (roleIds.length === 0) return []

  const { data: roleDetails } = await platformDb
    .from('roles')
    .select('role_name')
    .in('id', roleIds)

  return (roleDetails || []).map((r) => r.role_name).filter(Boolean)
}

/**
 * Resolve every layout scope ('pmo' | 'pm' | 'tm') this auth user's roles actually grant.
 * Cache-first (reuses whatever useMenu.js already populated via cacheUserMenuRoles) so a
 * warm in-app navigation never re-hits the DB. A user can hold more than one scope (e.g. a
 * dual PM + PMO Admin account) — callers should treat this as "any of these", not pick one.
 */
export async function resolveUserRoleScopes(authUser) {
  if (!authUser?.id) return []
  const cached = getCachedUserMenuRoles(authUser.id)
  const roleNames = cached ? cached.roleNames : await fetchUserRoleNamesForAuthUser(authUser)
  if (!cached) cacheUserMenuRoles(authUser.id, roleNames)

  const names = (roleNames || []).map(normalizeRoleName)
  const scopes = []
  if (names.some((r) => PMO_LAYOUT_ROLES.has(r))) scopes.push('pmo')
  if (names.some((r) => PM_LAYOUT_ROLES.has(r))) scopes.push('pm')
  if (names.some((r) => TM_LAYOUT_ROLES.has(r))) scopes.push('tm')
  return scopes
}

/**
 * Fine-grained role check — does this user hold ANY of the exact role names given? Narrower
 * than resolveUserRoleScopes()/PMO_LAYOUT_ROLES: used by pages that must gate on a specific
 * role (e.g. Form Template Builder is `pmo_admin`-suite-only, not "any PMO-scope role" —
 * `account_owner` has the PMO sidebar but is deliberately not in this narrower set).
 * @param {object} authUser
 * @param {string[]} roleNames - exact role names to match against (case/spacing-insensitive)
 */
export async function userHasAnyRole(authUser, roleNames = []) {
  if (!authUser?.id || roleNames.length === 0) return false
  const cached = getCachedUserMenuRoles(authUser.id)
  const userRoleNames = cached ? cached.roleNames : await fetchUserRoleNamesForAuthUser(authUser)
  if (!cached) cacheUserMenuRoles(authUser.id, userRoleNames)

  const wanted = new Set(roleNames.map(normalizeRoleName))
  return (userRoleNames || []).some((r) => wanted.has(normalizeRoleName(r)))
}
