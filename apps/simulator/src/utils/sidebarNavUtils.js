/**
 * Progressive sidebar drill-down indentation — one tier per nested menu level.
 * Nesting {@link SIDEBAR_NAV_TIER_BASE} wrappers compounds horizontal inset.
 * Child rows use {@link getSidebarNavTreeDotClassName} for connector nodes on the guide line.
 */

/** Base classes for one expanded menu tier (vertical guide line + inset). */
export const SIDEBAR_NAV_TIER_BASE = 'relative mt-1 space-y-0.5 ml-3 pl-4 border-l'

/** Wrapper for a single child row beneath a tier guide line. */
export const SIDEBAR_NAV_TREE_ROW_BASE = 'relative'

/**
 * @param {string} [borderClassName] Theme or state-specific border colour class.
 */
export function getSidebarNavTierClassName(borderClassName = '') {
  return [SIDEBAR_NAV_TIER_BASE, borderClassName].filter(Boolean).join(' ')
}

/**
 * Dot node centred on the tier's vertical guide line (theme-aware default).
 * @param {string} [dotClassName] Optional override for dot fill colour.
 */
export function getSidebarNavTreeDotClassName(dotClassName = '') {
  return [
    'pointer-events-none absolute -left-4 top-1/2 z-[1] h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full',
    dotClassName || 'bg-gray-400 dark:bg-gray-500',
  ]
    .filter(Boolean)
    .join(' ')
}

/**
 * @param {string} [dotClassName]
 */
export function getSidebarNavTreeRowClassName(dotClassName = '') {
  return SIDEBAR_NAV_TREE_ROW_BASE
}

/**
 * Top-level rows keep full horizontal padding; nested rows rely on parent tier inset.
 * @param {number} [level=0] Tree depth (0 = root menu row).
 * @param {{ base?: string, nested?: string }} [options]
 */
export function getSidebarNestedItemPadding(level = 0, { base = 'px-2 sm:px-3', nested = 'pr-2 sm:pr-3' } = {}) {
  return level > 0 ? nested : base
}

/** @deprecated Use {@link getSidebarNestedItemPadding} */
export function getSidebarNestedRowPadding(level = 0) {
  return getSidebarNestedItemPadding(level)
}
