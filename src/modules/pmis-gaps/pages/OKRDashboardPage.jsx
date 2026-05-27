import { Target } from 'lucide-react'
import PmisGapListHub from '../components/PmisGapListHub'
import { listGapRecords } from '../services/gapDataService'

const COLS = [
  { key: 'objective_title', label: 'Objective' },
  { key: 'cycle_name', label: 'Cycle' },
  { key: 'health_status', label: 'Health' },
  { key: 'progress_pct', label: 'Progress %' },
]

export default function OKRDashboardPage({ sim = false }) {
  return (
    <PmisGapListHub
      title="OKR Dashboard"
      description="Objectives and key results progress across your organisation."
      icon={Target}
      storageKey={`gap-okr-dashboard-${sim ? 'sim' : 'platform'}`}
      columns={COLS}
      loadRows={async () => {
        const objectives = await listGapRecords('objectives', { sim, orderBy: 'created_at' })
        const cycles = await listGapRecords('okr_cycles', { sim })
        const cycleMap = Object.fromEntries((cycles || []).map((c) => [c.id, c.cycle_name]))
        return (objectives || []).map((o) => ({
          ...o,
          objective_title: o.objective_title || o.title,
          cycle_name: cycleMap[o.cycle_id] || '—',
          progress_pct: o.progress_pct ?? 0,
        }))
      }}
      baseFilename="OKR-Dashboard"
    />
  )
}
