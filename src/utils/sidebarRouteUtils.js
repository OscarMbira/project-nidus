/**
 * Resolves DB menu route_path tokens using the current URL.
 * - __PROJECT__ → UUID from /platform/projects/:id/...
 * - __PRACTICE__ → UUID from /simulator/practice-projects/:id/...
 */

const PLATFORM_PROJECT_RE = /\/platform\/projects\/([^/]+)/i
const SIM_PRACTICE_RE = /\/simulator\/practice-projects\/([^/]+)/i

export function extractPlatformProjectId(pathname) {
  if (!pathname) return null
  const m = pathname.match(PLATFORM_PROJECT_RE)
  const id = m?.[1]
  if (!id || id === 'create' || id === 'new' || id === 'on-hold') return null
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

  if (routePath.includes('__PROJECT__')) {
    const pid = extractPlatformProjectId(pathname)
    if (pid) return routePath.replaceAll('__PROJECT__', pid)
    return '/platform/projects'
  }

  if (routePath.includes('__PRACTICE__')) {
    const pid = extractPracticeProjectId(pathname)
    if (pid) return routePath.replaceAll('__PRACTICE__', pid)
    return '/simulator/practice-projects'
  }

  return routePath
}

export function menuPathIsActive(pathname, resolvedPath) {
  if (!resolvedPath || resolvedPath === '#' || resolvedPath === '/platform/projects' || resolvedPath === '/simulator/practice-projects') {
    return false
  }
  if (pathname === resolvedPath) return true
  return pathname.startsWith(`${resolvedPath}/`)
}
