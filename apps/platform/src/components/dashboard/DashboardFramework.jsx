/**
 * DashboardFramework (v982 Phase 5 — Role-Aware Home Pages)
 * Renders a configured list of widgets for the current viewer. Filtering is entirely delegated to
 * `filterWidgetsForViewer()` (dashboardWidgetContract.js) — this component has no persona-specific
 * branches of its own and must never grow one; any new persona behaviour belongs in a widget's own
 * `requiredRole`/`requiredScope` declaration.
 *
 * Theme-aware (rule 28.1) and mobile-responsive (rule 29/39): 1 column on small screens, up to 3
 * on large, via Tailwind's responsive grid.
 */
import { useMemo } from 'react'
import { LayoutGrid } from 'lucide-react'
import { filterWidgetsForViewer } from './dashboardWidgetContract'

const SPAN_CLASS = {
  1: 'lg:col-span-1',
  2: 'lg:col-span-2',
  3: 'lg:col-span-3',
}

export default function DashboardFramework({ widgets, viewerContext, title, subtitle, headerExtra, emptyState }) {
  const visibleWidgets = useMemo(() => filterWidgetsForViewer(widgets, viewerContext), [widgets, viewerContext])

  return (
    <div className="space-y-6">
      {(title || subtitle || headerExtra) && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            {title && <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{title}</h1>}
            {subtitle && <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{subtitle}</p>}
          </div>
          {headerExtra}
        </div>
      )}

      {visibleWidgets.length === 0 ? (
        emptyState ?? (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-8 text-center">
            <LayoutGrid className="h-8 w-8 mx-auto text-gray-300 dark:text-gray-600 mb-2" />
            <p className="text-sm text-gray-500 dark:text-gray-400">Nothing to show here yet.</p>
          </div>
        )
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {visibleWidgets.map((widget) => {
            const Widget = widget.component
            return (
              <div key={widget.id} className={SPAN_CLASS[widget.span] || SPAN_CLASS[1]}>
                <Widget />
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
