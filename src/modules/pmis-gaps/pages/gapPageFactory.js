import { useState } from 'react'
import { Plus } from 'lucide-react'
import * as Icons from 'lucide-react'
import PmisGapListHub from '../components/PmisGapListHub'
import { listGapRecords } from '../services/gapDataService'

/**
 * Factory for standard gap list pages backed by a DB table.
 */
export function createGapListPage({
  gapId,
  title,
  description,
  iconName = 'list',
  table,
  columns,
  sim = false,
  storageKeyPrefix = 'gap',
}) {
  const Icon = Icons[iconName] || Icons.List

  return function GapListPage() {
    const loadRows = () =>
      listGapRecords(table, { sim, orderBy: 'created_at', ascending: false })

    return (
      <PmisGapListHub
        title={title}
        description={description}
        icon={Icon}
        storageKey={`${storageKeyPrefix}-${gapId}-${sim ? 'sim' : 'platform'}`}
        columns={columns}
        loadRows={loadRows}
        baseFilename={`${gapId}-${title.replace(/\s+/g, '-')}`}
      />
    )
  }
}

/** Specialized page shells that delegate to list hub or custom views */
export { default as OKRDashboardPage } from '../pages/OKRDashboardPage'
export { default as WorkloadHeatmapPage } from '../pages/WorkloadHeatmapPage'
export { default as UniversalCalendarPage } from '../pages/UniversalCalendarPage'
export { default as PlanningPokerPage } from '../pages/PlanningPokerPage'
export { default as DashboardBuilderPage } from '../pages/DashboardBuilderPage'
export { default as PortfolioMapPage } from '../pages/PortfolioMapPage'
export { default as WhiteboardPage } from '../pages/WhiteboardPage'
export { default as SCurvePage } from '../pages/SCurvePage'
export { default as AutomationHubPage } from '../pages/AutomationHubPage'
export { default as SimMultiplayerPage } from '../pages/sim/SimMultiplayerPage'
export { default as SimExamModePage } from '../pages/sim/SimExamModePage'
export { default as SimMarketplacePage } from '../pages/sim/SimMarketplacePage'
export { default as SimCrossRunAnalyticsPage } from '../pages/sim/SimCrossRunAnalyticsPage'

export function GapPagePlaceholder({ title }) {
  return (
    <div className="min-h-[50vh] flex items-center justify-center text-gray-400">
      {title} — loading module...
    </div>
  )
}

export function QuickCaptureButton({ onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="fixed bottom-6 right-6 z-40 lg:hidden flex items-center justify-center w-14 h-14 rounded-full bg-blue-600 text-white shadow-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-400"
      aria-label="Quick capture"
    >
      <Plus className="h-6 w-6" />
    </button>
  )
}
