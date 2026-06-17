/**
 * Registry-driven virtual menu fallback for useMenu transforms.
 * @deprecated v664+ — DB menu_items is the sole runtime source. Exports kept for unit tests.
 */
import { getRegistryFallbackEntries } from './menuRegistry'
import { resolveRegistryCategoryId } from './pmoSidebarCategories'

const norm = (s) => String(s || '').trim().toLowerCase()

/** Registry route → equivalent DB routes (v647 legacy paths). */
const REGISTRY_ROUTE_EQUIVALENTS = {
  '/pmo/collaboration/whiteboard': ['/pmo/collaboration/whiteboards', '/pmo/collaboration/whiteboard'],
  '/pmo/planning/planning-poker': ['/pmo/planning/planning-poker', '/pmo/collaboration/poker'],
  '/pmo/planning/s-curve': ['/pmo/planning/s-curve', '/pmo/reporting/s-curve'],
  '/pmo/settings/notifications': ['/pmo/settings/notifications', '/pmo/notifications/preferences'],
  '/pm/settings/notifications': ['/pm/settings/notifications', '/pm/notifications/preferences'],
  '/pmo/strategy/portfolio-map': ['/pmo/strategy/portfolio-map', '/pmo/portfolio/map'],
}

function normalizePath(path) {
  return norm(path).replace(/\/$/, '')
}

function pathExistsInBaseline(pathKey, existingPaths) {
  if (existingPaths.has(pathKey)) return true
  const equiv = REGISTRY_ROUTE_EQUIVALENTS[pathKey]
  if (equiv?.some((p) => existingPaths.has(normalizePath(p)))) return true
  return false
}

/**
 * Scope filter for simulator registry entries.
 * @param {string} routePath
 * @param {'pmo'|'pm'} scope
 */
function matchesSimulatorScope(routePath, scope) {
  const p = norm(routePath)
  if (scope === 'pmo') return p.startsWith('/simulator/pmo')
  if (scope === 'pm') return p.startsWith('/simulator/pm')
  return p.startsWith('/simulator/')
}

/**
 * Inject missing simulator registry leaves into a hierarchical menu tree.
 * @param {object[]} tree
 * @param {'pmo'|'pm'} scope
 * @returns {object[]}
 */
export function applySimulatorRegistryFallback(tree = [], _scope = 'pmo') {
  // v664+: simulator menus are DB-seeded; no registry injection at runtime.
  return [...(tree || [])].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
}

/**
 * @deprecated v664+ — no runtime injection. Kept for unit tests only.
 */
export function applyRegistryCategoryFallback(
  grouped,
  pushVirtualToCategory,
  existingPaths = new Set(),
  domain = 'platform'
) {
  const isDev = typeof import.meta !== 'undefined' && import.meta.env?.DEV

  for (const entry of getRegistryFallbackEntries(domain)) {
    if (!entry.category || !entry.route_path) continue

    const categoryId = resolveRegistryCategoryId(entry.category)
    const pathKey = normalizePath(entry.route_path)
    if (!grouped.has(categoryId)) grouped.set(categoryId, [])
    const bucket = grouped.get(categoryId)
    const existsInBucket = bucket.some((i) => {
      const iPath = normalizePath(i.route_path)
      if (iPath && iPath === pathKey) return true
      return norm(i.menu_label) === norm(entry.menu_label)
    })
    const existsInBaseline = pathExistsInBaseline(pathKey, existingPaths)

    if (!existsInBucket && !existsInBaseline) {
      if (isDev) {
        console.warn(
          `[menuRegistry] registry fallback (${domain}): ${entry.menu_code} → ${categoryId} (${entry.route_path}) — seed menu_items or run v664 SQL`
        )
      }
      pushVirtualToCategory(
        categoryId,
        entry.menu_label,
        entry.route_path,
        entry.menu_icon,
        entry.sort_order
      )
    }
  }
}

/**
 * Collect normalized route paths from a menu tree.
 * @param {object[]} items
 * @returns {Set<string>}
 */
export function collectMenuRoutePaths(items = []) {
  const paths = new Set()
  const walk = (nodes) => {
    for (const node of nodes || []) {
      const p = norm(node?.route_path).replace(/\/$/, '')
      if (p) paths.add(p)
      if (Array.isArray(node?.children) && node.children.length) walk(node.children)
    }
  }
  walk(items)
  return paths
}
