/**
 * v1341 (D23) — tab strip above a page that belongs to a shared menu slot with two or more
 * visible pages (e.g. Testing on a Banking + IT project). Each tab opens that page's own route,
 * so bookmarks and Back keep working; no page is embedded in another.
 * Renders nothing when the organisation's consolidated sidebar is off or the page is not in a slot.
 */
import { useLocation, useNavigate } from 'react-router-dom'
import { useConsolidatedMenu } from '@nidus/shared/hooks/useConsolidatedMenu'
import { findSlotTabsForRoute } from '@nidus/config/consolidatedMenu'
import { resolveMenuRoutePathForLayout } from '@nidus/shared/utils/sidebarRouteUtils'

/** Presentational strip: `strip` = { label, tabs: [{ code, label, route }], activeRoute }. */
export function MenuSlotTabStripView({ strip, onNavigate }) {
  if (!strip || !Array.isArray(strip.tabs) || strip.tabs.length < 2) return null
  return (
    <nav
      aria-label={`${strip.label} pages`}
      className="w-full border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900"
    >
      <div className="flex gap-1 overflow-x-auto px-3 sm:px-4 lg:px-6" role="tablist">
        {strip.tabs.map((tab) => {
          const active = tab.route === strip.activeRoute
          return (
            <button
              key={tab.code || tab.route}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => { if (!active) onNavigate(tab.route) }}
              className={`whitespace-nowrap px-3 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                active
                  ? 'border-blue-600 text-blue-700 dark:border-blue-400 dark:text-blue-300'
                  : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-100 dark:hover:border-gray-600'
              }`}
            >
              {tab.label}
            </button>
          )
        })}
      </div>
    </nav>
  )
}

/** Connected strip for app layouts: reads the consolidated menu and the current route. */
export default function MenuSlotTabStrip() {
  const consolidated = useConsolidatedMenu()
  const location = useLocation()
  const navigate = useNavigate()
  const strip = consolidated ? findSlotTabsForRoute(consolidated.slotTabs, location.pathname) : null
  const go = (route) => navigate(resolveMenuRoutePathForLayout(route, location.pathname, null, consolidated?.projectId || null) || route)
  return <MenuSlotTabStripView strip={strip} onNavigate={go} />
}
