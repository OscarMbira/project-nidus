/**
 * ZoneTabs (v982 Phase 7 — Main Application Zones, brief §21)
 * My Work / Delivery / Organisation top-level zone switcher, rendered at the top of the sidebar.
 * Account stays in SystemHeader's header dropdown (decision 1, accepted by default) — not a 4th
 * zone here.
 *
 * DELIBERATE LOW-RISK DESIGN (see the Phase 7 plan file's Review section for the full reasoning):
 * this component does NOT touch packages/config/src/pmoMenuHierarchyUtils.js's category-grouping
 * internals at all. "Delivery" and "Organisation" map 1:1 onto the EXISTING, already-proven 'pm'
 * and 'pmo' layouts (`useMenu()`/`useSimMenu()`'s own `layoutHint.layout`) — that distinction
 * already IS today's PM-layout-vs-PMO-layout split (decision 2's own framing: "generalized into
 * three instead of two"), just not previously exposed as an explicit user-facing tab. Clicking a
 * zone tab is pure navigation to that zone's landing route; useMenu's own pathname-based layout
 * inference (resolveMenuLayoutScope) then resolves the correct layout automatically, exactly as
 * it already does today for direct navigation/deep links. This means zero changes to the exact
 * code path that already caused two real, confirmed regressions this session (the PM/PMO leak bug,
 * the shared-label ambiguity bug) — the safest way to generalize a twice-regressed mechanism is to
 * not touch its internals at all where reuse is possible.
 *
 * "My Work" has no pre-existing layout to reuse (genuinely new per decision 3) — its own page
 * (MyWorkHome.jsx) is a self-contained content view, not a variant sidebar tree; ZoneTabs still
 * treats it as a third tab for navigation purposes.
 */
import { CheckSquare, Briefcase, Building2 } from 'lucide-react'

const ZONES = [
  { id: 'my-work', label: 'My Work', icon: CheckSquare },
  { id: 'delivery', label: 'Delivery', icon: Briefcase },
  { id: 'organisation', label: 'Organisation', icon: Building2 },
]

/**
 * Derives the active zone from the current route + the already-resolved layoutHint — no new
 * state, no duplicate source of truth. Exported standalone so it has its own direct unit test
 * (task D: zone selection must be provably data-driven, not eyeballed).
 * @param {string} pathname
 * @param {string|null} layout - layoutHint?.layout ('pm' | 'pmo' | 'sim_pm' | 'sim_pmo' | ...)
 * @returns {'my-work'|'delivery'|'organisation'|null}
 */
export function resolveActiveZone(pathname, layout) {
  const path = String(pathname || '')
  if (/\/my-work(\/|$)/.test(path)) return 'my-work'
  // v982 Phase 7 follow-up: /simulator/practice-projects/* (confirmed live — a large, actively
  // routed tree: scope/schedule/etc. sub-areas, plus `simulator/scenarios` redirects here) has NO
  // explicit branch in inferLayoutScopeFromPathname() (menuLayoutUtils.js) — it falls through to
  // that function's role-based fallback, which can be ambiguous depending on which roles the
  // viewer holds. Practice PROJECT delivery is Simulator's direct analogue of Platform's /pm/*
  // real project delivery, so it is classified as Delivery by path directly here, mirroring how
  // that same function already explicitly handles /pm/ and /simulator/pm — a resolveActiveZone-
  // only fix (this function's own pathname checks), not a change to the historically-regression-
  // prone menuLayoutUtils.js/pmoMenuHierarchyUtils.js files themselves.
  if (/^\/simulator\/practice-projects(\/|$)/.test(path)) return 'delivery'
  if (layout === 'pm' || layout === 'tm' || layout === 'sim_pm') return 'delivery'
  if (layout === 'pmo' || layout === 'sim_pmo') return 'organisation'
  return null
}

/**
 * @param {string} zoneId
 * @param {boolean} isSimulatorContext
 * @returns {string} the landing route to navigate to for that zone
 */
export function zoneLandingRoute(zoneId, isSimulatorContext) {
  if (isSimulatorContext) {
    if (zoneId === 'my-work') return '/simulator/my-work'
    if (zoneId === 'delivery') return '/simulator/pm/dashboard'
    return '/simulator/pmo/dashboard'
  }
  if (zoneId === 'my-work') return '/platform/my-work'
  if (zoneId === 'delivery') return '/pm/dashboard'
  return '/platform/dashboard'
}

export default function ZoneTabs({ activeZone, onSelect }) {
  return (
    <div
      className="flex min-w-0 items-center gap-1 mb-3 p-1 rounded-lg bg-gray-100 dark:bg-gray-900/60 border border-gray-200 dark:border-gray-700"
      role="tablist"
      aria-label="Application zones"
    >
      {ZONES.map((zone) => {
        const Icon = zone.icon
        const isActive = activeZone === zone.id
        return (
          <button
            key={zone.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            title={zone.label}
            onClick={() => onSelect(zone.id)}
            className={`flex-1 min-w-0 flex items-center justify-center gap-1.5 px-1.5 py-1.5 rounded-md text-xs sm:text-sm font-medium transition-colors ${
              isActive
                ? 'bg-white dark:bg-gray-800 text-blue-700 dark:text-blue-400 shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
          >
            <Icon className="h-3.5 w-3.5 flex-shrink-0" />
            <span className="truncate">{zone.label}</span>
          </button>
        )
      })}
    </div>
  )
}
