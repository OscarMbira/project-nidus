/**
 * Registry-driven virtual menu fallback for useMenu transforms.
 * Temporary shim until DB backfill (v638+) is confirmed in all environments.
 */
import { getRegistryFallbackEntries } from './menuRegistry'

const norm = (s) => String(s || '').trim().toLowerCase()

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
export function applySimulatorRegistryFallback(tree = [], scope = 'pmo') {
  const isDev = typeof import.meta !== 'undefined' && import.meta.env?.DEV
  const existingPaths = collectMenuRoutePaths(tree)
  const existingCodes = new Set()
  const walkCodes = (nodes) => {
    for (const n of nodes || []) {
      if (n?.menu_code) existingCodes.add(norm(n.menu_code))
      walkCodes(n.children)
    }
  }
  walkCodes(tree)

  const findByCode = (nodes, code) => {
    for (const n of nodes || []) {
      if (norm(n.menu_code) === norm(code)) return n
      const found = findByCode(n.children, code)
      if (found) return found
    }
    return null
  }

  const next = tree.map((n) => ({ ...n, children: [...(n.children || [])] }))

  for (const entry of getRegistryFallbackEntries('simulator')) {
    if (!entry.route_path || !matchesSimulatorScope(entry.route_path, scope)) continue
    const pathKey = norm(entry.route_path).replace(/\/$/, '')
    if (existingPaths.has(pathKey) || existingCodes.has(norm(entry.menu_code))) continue

    const leaf = {
      id: `virtual-sim-${entry.menu_code}`,
      menu_code: entry.menu_code,
      menu_label: entry.menu_label,
      menu_description: entry.menu_label,
      parent_menu_id: null,
      menu_level: 2,
      sort_order: entry.sort_order,
      route_path: entry.route_path,
      external_url: null,
      menu_icon: entry.menu_icon,
      menu_color: null,
      badge_text: null,
      badge_color: null,
      is_visible: true,
      is_active: true,
      canUse: true,
      children: [],
    }

    if (isDev) {
      console.warn(`[menuRegistry] simulator fallback: ${entry.menu_code} (${entry.route_path})`)
    }

    if (entry.parent_code) {
      const parent = findByCode(next, entry.parent_code)
      if (parent) {
        parent.children = [...(parent.children || []), leaf]
        parent.children.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
      } else {
        next.push(leaf)
      }
    } else {
      next.push(leaf)
    }
    existingPaths.add(pathKey)
    existingCodes.add(norm(entry.menu_code))
  }

  return next.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
}

/**
 * Push missing registry items into a PMO category bucket.
 * @param {Map<string, object[]>} grouped
 * @param {(categoryId: string, label: string, path: string, icon: string, sortOrder: number) => void} pushVirtualToCategory
 * @param {Set<string>} [existingPaths] — normalized route paths already present in baseline
 * @param {'platform'|'simulator'} [domain='platform']
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

    const pathKey = norm(entry.route_path).replace(/\/$/, '')
    if (!grouped.has(entry.category)) grouped.set(entry.category, [])
    const bucket = grouped.get(entry.category)
    const existsInBucket = bucket.some((i) => {
      const iPath = norm(i.route_path).replace(/\/$/, '')
      if (iPath && iPath === pathKey) return true
      return norm(i.menu_label) === norm(entry.menu_label)
    })
    const existsInBaseline = existingPaths.has(pathKey)

    if (!existsInBucket && !existsInBaseline) {
      if (isDev) {
        console.warn(
          `[menuRegistry] virtual fallback: ${entry.menu_code} → ${entry.category} (${entry.route_path})`
        )
      }
      pushVirtualToCategory(
        entry.category,
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
