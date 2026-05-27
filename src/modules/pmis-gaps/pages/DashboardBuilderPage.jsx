import { LayoutGrid } from 'lucide-react'
import PmisGapListHub from '../components/PmisGapListHub'
import { listGapRecords } from '../services/gapDataService'

export default function DashboardBuilderPage({ sim = false }) {
  return (
    <PmisGapListHub
      title="Dashboard Builder"
      description="Create and manage widget-based dashboards."
      icon={LayoutGrid}
      storageKey={`gap-dashboard-builder-${sim ? 'sim' : 'platform'}`}
      columns={[
        { key: 'dashboard_name', label: 'Dashboard' },
        { key: 'dashboard_type', label: 'Type' },
        { key: 'is_shared', label: 'Shared' },
        { key: 'updated_at', label: 'Updated' },
      ]}
      loadRows={() => listGapRecords('dashboards', { sim, orderBy: 'updated_at' })}
      baseFilename="Dashboards"
    />
  )
}
