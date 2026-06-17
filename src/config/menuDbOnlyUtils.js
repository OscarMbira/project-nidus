/**
 * DB-only menu helpers (v664+).
 * Strip any client-invented virtual rows from a menu tree.
 */

export function isVirtualMenuItem(item) {
  if (!item) return false
  const id = String(item.id || '')
  const code = String(item.menu_code || '').trim().toLowerCase()
  return (
    id.startsWith('virtual-') ||
    id.startsWith('virtual_') ||
    code.startsWith('virtual_')
  )
}

/** Recursively remove virtual menu rows (registry/JS fillers). */
export function stripVirtualMenuItems(items = []) {
  return (items || [])
    .filter((item) => !isVirtualMenuItem(item))
    .map((item) => ({
      ...item,
      children: stripVirtualMenuItems(item.children || []),
    }))
}
