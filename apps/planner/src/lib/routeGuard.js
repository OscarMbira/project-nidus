/**
 * v1239 Slice 5.4 — which /app routes a planner user may open. A route is allowed when its
 * section (the segment after /app) is a section of at least one sidebar item the user is
 * granted (planner_menu(): role grants ∩ allow-list). Home, the invite page and the upgrade
 * page are always reachable (a read-only trial must still be able to upgrade).
 * Pure; exported for tests.
 */
const ALWAYS = new Set(['', 'invite', 'upgrade'])

export const sectionOf = (path) => String(path || '').split('?')[0].replace(/^\/app\/?/, '').split('/')[0] || ''

export function allowedSections(menuRows) {
  const out = new Set(ALWAYS)
  for (const r of menuRows || []) if (r.route_path?.startsWith('/app')) out.add(sectionOf(r.route_path))
  return out
}

export function isRouteAllowed(pathname, menuRows) {
  if (!String(pathname).startsWith('/app')) return true
  return allowedSections(menuRows).has(sectionOf(pathname))
}

/** Flatten a menu tree back to rows (the shell keeps the tree). */
export function flattenMenu(tree) {
  const out = []
  const walk = (list) => list.forEach((n) => { out.push(n); walk(n.children || []) })
  walk(tree || [])
  return out
}
