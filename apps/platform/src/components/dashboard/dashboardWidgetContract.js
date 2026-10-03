/**
 * Dashboard widget contract (v982 Phase 5 — Role-Aware Home Pages).
 *
 * Brief §20: "one dashboard framework, not six separate engines" — a persona's home page is a
 * COMPOSITION of shared widgets, not its own hand-built component. A widget declares what it
 * needs; the framework (DashboardFramework.jsx) decides whether to render it. This file owns
 * that decision as one small, pure, fully-testable function — the framework component itself
 * must never grow an `if (role === 'x')` branch; any new persona-specific behaviour belongs in a
 * widget's own `requiredRole`/`requiredScope` declaration, not in this filter or the renderer.
 *
 * @typedef {Object} DashboardWidget
 * @property {string} id - Unique key across the whole widget registry.
 * @property {string} title - Human-readable name (used for empty-state messaging / future widget pickers).
 * @property {import('react').ComponentType} component - Renders itself with no props; a widget
 *   owns its own data-fetching (matches how ExecutiveSummary.jsx / PMDashboard.jsx's sections
 *   already self-fetch — extraction preserves that shape rather than introducing prop-drilling).
 * @property {string[]} [requiredRole] - OR-matched against viewerContext.roleNames (lowercase,
 *   normalized `role_name` values). Omit for a widget with no role restriction (e.g. "My Tasks").
 * @property {string[]} [requiredScope] - AND-matched: every key must be truthy on viewerContext
 *   (e.g. `['projectId']` for a widget that only makes sense with a current project selected).
 *   Omit for a widget with no scope requirement.
 * @property {1|2|3} [span] - Grid column span hint within the framework's 3-column layout. Default 1.
 *
 * @typedef {Object} DashboardViewerContext
 * @property {string[]} roleNames - lowercase, underscore-normalized role_name values the viewer holds.
 * @property {string|null} accountId
 * @property {string|null} [projectId]
 * @property {string|null} [portfolioId]
 * @property {string|null} [programmeId]
 * @property {boolean} [isAccountOwner]
 * @property {boolean} [isPmoAdmin]
 * @property {string|null} [accountType] - `accounts.account_type` ('individual' | 'company' | ...).
 */

/**
 * The single, pure, data-driven decision of which widgets a viewer sees. No persona name is ever
 * referenced here — only the generic `requiredRole`/`requiredScope` contract fields. This is the
 * function the "no if(role==='x') forks" structural test (v982 Phase 5 task D) exercises directly.
 * @param {DashboardWidget[]} widgets
 * @param {DashboardViewerContext} viewerContext
 * @returns {DashboardWidget[]}
 */
export function filterWidgetsForViewer(widgets, viewerContext) {
  const ctx = viewerContext || {}
  const roleNames = Array.isArray(ctx.roleNames) ? ctx.roleNames : []

  return (widgets || []).filter((widget) => {
    if (Array.isArray(widget.requiredRole) && widget.requiredRole.length > 0) {
      if (!widget.requiredRole.some((role) => roleNames.includes(role))) return false
    }
    if (Array.isArray(widget.requiredScope) && widget.requiredScope.length > 0) {
      if (!widget.requiredScope.every((key) => Boolean(ctx[key]))) return false
    }
    return true
  })
}

/** Normalizes a raw role_name to the lowercase/underscore form viewerContext.roleNames uses. */
export function normalizeRoleName(name) {
  return String(name || '').trim().toLowerCase().replace(/\s+/g, '_')
}
