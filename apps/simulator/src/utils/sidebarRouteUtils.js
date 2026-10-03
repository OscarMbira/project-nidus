/**
 * Resolves DB menu route_path tokens using the current URL.
 * - __PROJECT__ → segment from /platform/projects/:key/... (UUID or project_code; callers resolve to UUID if needed)
 * - __PRACTICE__ → segment from /simulator/practice-projects/:key/... (UUID or practice_code)
 */

import { normalizeDashboardTab } from './pmoDashboardTabs'

const PLATFORM_PROJECT_RE = /\/platform\/projects\/([^/]+)/i
const PM_DASHBOARD_PROJECT_RE = /\/pm\/projects\/([^/]+)/i
const SIM_PRACTICE_RE = /\/simulator\/practice-projects\/([^/]+)/i

export function extractPlatformProjectId(pathname) {
  if (!pathname) return null
  const m = pathname.match(PLATFORM_PROJECT_RE)
  const id = m?.[1]
  if (!id || id === 'create' || id === 'new' || id === 'on-hold') return null
  return id
}

export function extractPmDashboardProjectId(pathname) {
  if (!pathname) return null
  const m = pathname.match(PM_DASHBOARD_PROJECT_RE)
  const id = m?.[1]
  if (!id || id === 'create' || id === 'new') return null
  return id
}

export function extractPracticeProjectId(pathname) {
  if (!pathname) return null
  const m = pathname.match(SIM_PRACTICE_RE)
  const id = m?.[1]
  if (!id || id === 'create') return null
  return id
}

/**
 * @param {string|null|undefined} routePath — raw menu_items.route_path
 * @param {string} pathname — location.pathname
 * @returns {string} resolved path safe for <Link to=...>
 */
export function resolveMenuRoutePath(routePath, pathname) {
  if (!routePath || typeof routePath !== 'string') return routePath || '#'

  const normalizedRoute = routePath.startsWith('/app/projects/')
    ? routePath.replace(/^\/app\/projects/, '/platform/projects')
    : routePath

  const platformPid = extractPlatformProjectId(pathname)
  if (platformPid && normalizedRoute.includes('/platform/projects/')) {
    return normalizedRoute
      .replaceAll('__PROJECT__', platformPid)
      .replaceAll(':projectId', platformPid)
      .replaceAll('/:id/', `/${platformPid}/`)
  }
  const pmDashPid = extractPmDashboardProjectId(pathname)
  if (pmDashPid && normalizedRoute.includes('/pm/projects/')) {
    return normalizedRoute
      .replaceAll(':projectId', pmDashPid)
      .replaceAll('/:id/', `/${pmDashPid}/`)
  }
  if (normalizedRoute.includes('/pm/projects/') && normalizedRoute.includes(':projectId')) {
    return '/pm/dashboard'
  }

  if (normalizedRoute.includes('__PROJECT__') || normalizedRoute.includes(':projectId')) {
    return '/platform/projects'
  }

  const practicePid = extractPracticeProjectId(pathname)
  if (practicePid && routePath.includes('/simulator/practice-projects/')) {
    return routePath
      .replaceAll('__PRACTICE__', practicePid)
      .replaceAll('/:id/', `/${practicePid}/`)
  }
  if (routePath.includes('__PRACTICE__')) {
    return '/simulator/practice-projects'
  }

  return normalizedRoute
}

/** PM layout entry points — keep PM users on /pm/* dashboards where possible. */
const PM_LAYOUT_ROUTE_REWRITES = {
  '/platform/dashboard': '/pm/dashboard',
  '/platform/executive/dashboard': '/pm/dashboard',
}

/**
 * Resolve menu link targets for the active sidebar layout.
 * Shared /platform/* pages stay on the same URL but PM dashboard links use /pm/dashboard.
 */
export function resolveMenuRoutePathForLayout(routePath, pathname, layout = null) {
  const resolved = resolveMenuRoutePath(routePath, pathname)
  if (layout !== 'pm') return resolved
  const base = String(resolved || '').split('?')[0]
  return PM_LAYOUT_ROUTE_REWRITES[base] || resolved
}

function searchParamsMatch(currentSearch, expectedQueryWithoutLeadingQm) {
  const exp = new URLSearchParams(String(expectedQueryWithoutLeadingQm || '').replace(/^\?/, ''))
  const cur = new URLSearchParams(String(currentSearch || '').replace(/^\?/, ''))
  for (const [k, v] of exp.entries()) {
    if (cur.get(k) !== v) return false
  }
  return true
}

/**
 * @param {string} pathname — location.pathname (no query)
 * @param {string} resolvedPath — may include ?tab=… for PMO dashboard deep links
 * @param {string} [search] — location.search (e.g. ?tab=projects)
 */
export function menuPathIsActive(pathname, resolvedPath, search = '') {
  if (!resolvedPath || resolvedPath === '#' || resolvedPath === '/platform/projects' || resolvedPath === '/simulator/practice-projects') {
    return false
  }
  const hashIdx = resolvedPath.indexOf('#')
  const pathNoHash = hashIdx >= 0 ? resolvedPath.slice(0, hashIdx) : resolvedPath
  const qIdx = pathNoHash.indexOf('?')
  if (qIdx >= 0) {
    const base = pathNoHash.slice(0, qIdx)
    const qs = pathNoHash.slice(qIdx + 1)
    if (pathname !== base) return false
    return searchParamsMatch(search, qs)
  }
  if (pathname === pathNoHash) {
    // Multiple sidebar links share /platform/dashboard; only Overview should match the bare path.
    if (pathname === '/platform/dashboard') {
      return normalizeDashboardTab(new URLSearchParams(String(search || '').replace(/^\?/, '')).get('tab')) === 'overview'
    }
    // v851/v852: bare parents stay inactive when a Forms|Templates leaf (?domainGroup=) owns the URL.
    const cur = new URLSearchParams(String(search || '').replace(/^\?/, ''))
    if (cur.get('domainGroup')) {
      return false
    }
    return true
  }
  // Prefix match for nested pages (e.g. …/requirements → …/requirements/new).
  // Organizational Templates menu uses hub /platform/templates (redirects to organisational
  // with project context). That hub must NOT stay active for peer leaf /templates/project,
  // and must stay inactive when a Forms|Templates (?domainGroup=) child owns the URL.
  const curSearch = new URLSearchParams(String(search || '').replace(/^\?/, ''))
  const domainGroupOwnsHighlight = Boolean(curSearch.get('domainGroup'))
  if (pathNoHash === '/platform/templates') {
    if (domainGroupOwnsHighlight) return false
    return (
      pathname === '/platform/templates/organisational' ||
      pathname.startsWith('/platform/templates/organisational/')
    )
  }
  if (pathNoHash === '/simulator/pm/templates') {
    if (domainGroupOwnsHighlight) return false
    return (
      pathname === '/simulator/pm/templates/organisational' ||
      pathname.startsWith('/simulator/pm/templates/organisational/')
    )
  }
  // Testing > Test Planning targets the bare /platform/testing dashboard route, but every other
  // Testing sidebar leaf is ALSO nested under /platform/testing/* — siblings in the menu tree,
  // not descendants of Test Planning.
  if (pathNoHash === '/platform/testing') {
    return pathname === '/platform/testing'
  }
  // Resources > Resource Directory vs sibling Resource Calendar at /platform/resources/calendar.
  if (pathNoHash === '/platform/resources') {
    return pathname === '/platform/resources'
  }
  return pathname.startsWith(`${pathNoHash}/`)
}

/** sessionStorage key — which dual-location leaf the user last clicked. */
export const SIDEBAR_LAST_ACTIVE_MENU_KEY = 'nidus:sidebar:lastActiveMenuKey'

/**
 * Canonical winners for deliberate dual-location leaves (same route_path, two parents).
 * On a cold load / hard refresh with no click memory, prefer the primary register home
 * (RAID) over the Planning second-location alias.
 */
const CANONICAL_ACTIVE_MENU_CODES = new Set([
  'plat_pm_assumptions_reg',
  'plat_pm_dependencies_reg',
])

export function getSidebarMenuNodeKey(menuItem) {
  return menuItem?.id ?? menuItem?.menu_code ?? String(menuItem?.menu_label ?? '')
}

function getSidebarSessionStorage() {
  try {
    if (typeof globalThis !== 'undefined' && globalThis.sessionStorage) {
      return globalThis.sessionStorage
    }
  } catch {
    /* private mode / blocked storage */
  }
  return null
}

export function persistLastActiveMenuKey(menuItemOrKey) {
  const storage = getSidebarSessionStorage()
  if (!storage) return
  const key =
    typeof menuItemOrKey === 'string'
      ? menuItemOrKey
      : menuItemOrKey?.menu_code || menuItemOrKey?.id || getSidebarMenuNodeKey(menuItemOrKey)
  if (!key) return
  try {
    storage.setItem(SIDEBAR_LAST_ACTIVE_MENU_KEY, String(key))
  } catch {
    /* ignore quota / private mode */
  }
}

export function readLastActiveMenuKey() {
  const storage = getSidebarSessionStorage()
  if (!storage) return null
  try {
    return storage.getItem(SIDEBAR_LAST_ACTIVE_MENU_KEY)
  } catch {
    return null
  }
}

function leafMatchesLastActiveKey(node, lastActiveKey) {
  if (!lastActiveKey || !node) return false
  return (
    node.menu_code === lastActiveKey ||
    node.id === lastActiveKey ||
    getSidebarMenuNodeKey(node) === lastActiveKey
  )
}

/**
 * Collect every menu leaf whose route matches the current location (dual-location pages
 * like Planning Assumptions + Assumptions Register both appear here).
 */
export function collectActiveMenuLeaves(items = [], location = {}, layout = null) {
  const pathname = location.pathname || ''
  const search = location.search || ''
  const leaves = []

  const walk = (nodes, ancestors) => {
    for (const node of nodes || []) {
      const nextAncestors = [...ancestors, node]
      if (node.route_path) {
        const resolved = resolveMenuRoutePathForLayout(node.route_path, pathname, layout)
        if (menuPathIsActive(pathname, resolved, search)) {
          leaves.push({ node, ancestors: nextAncestors })
        }
      }
      if (node.children?.length) walk(node.children, nextAncestors)
    }
  }
  walk(items, [])
  return leaves
}

/**
 * Pick exactly one active leaf when several menu rows share the same route.
 * Preference order: last clicked → under expanded top-level section → canonical dual
 * primary → first in tree order.
 *
 * @returns {string|null} getSidebarMenuNodeKey of the winning leaf
 */
export function resolvePreferredActiveMenuKey(
  items = [],
  location = {},
  { layout = null, expandedSectionKey = null, lastActiveKey = null } = {}
) {
  const matches = collectActiveMenuLeaves(items, location, layout)
  if (matches.length === 0) return null
  if (matches.length === 1) return getSidebarMenuNodeKey(matches[0].node)

  const remembered = lastActiveKey ?? readLastActiveMenuKey()
  if (remembered) {
    const hit = matches.find(({ node }) => leafMatchesLastActiveKey(node, remembered))
    if (hit) return getSidebarMenuNodeKey(hit.node)
  }

  if (expandedSectionKey) {
    const underExpanded = matches.find(
      ({ ancestors }) => ancestors[0] && getSidebarMenuNodeKey(ancestors[0]) === expandedSectionKey
    )
    if (underExpanded) return getSidebarMenuNodeKey(underExpanded.node)
  }

  const canonical = matches.find(({ node }) => CANONICAL_ACTIVE_MENU_CODES.has(node.menu_code))
  if (canonical) return getSidebarMenuNodeKey(canonical.node)

  return getSidebarMenuNodeKey(matches[0].node)
}

/** Top-level menu key that contains the preferred active leaf (for accordion auto-expand). */
export function findTopLevelKeyForActiveMenu(items = [], preferredActiveKey) {
  if (!preferredActiveKey) return null
  for (const item of items) {
    if (getSidebarMenuNodeKey(item) === preferredActiveKey) return getSidebarMenuNodeKey(item)
    if (menuNodeContainsKey(item, preferredActiveKey)) return getSidebarMenuNodeKey(item)
  }
  return null
}

export function menuNodeContainsKey(node, preferredActiveKey) {
  if (!node || !preferredActiveKey) return false
  if (getSidebarMenuNodeKey(node) === preferredActiveKey) return true
  return (node.children || []).some((child) => menuNodeContainsKey(child, preferredActiveKey))
}
