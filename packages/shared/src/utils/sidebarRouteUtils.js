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
  return pathname.startsWith(`${pathNoHash}/`)
}
