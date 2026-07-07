/**
 * Progressive sidebar drill-down indentation — one tier per nested menu level.
 * Nesting {@link SIDEBAR_NAV_TIER_BASE} wrappers compounds horizontal inset.
 */

/** Base classes for one expanded menu tier (guide line + inset). */
export const SIDEBAR_NAV_TIER_BASE = 'mt-1 space-y-0.5 border-l-2 ml-3 pl-3'

/**
 * @param {string} [borderClassName] Theme or state-specific border colour class.
 */
export function getSidebarNavTierClassName(borderClassName = '') {
  return [SIDEBAR_NAV_TIER_BASE, borderClassName].filter(Boolean).join(' ')
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
