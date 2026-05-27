import { BarChart2 } from 'lucide-react'
import PmisGapListHub from '../../components/PmisGapListHub'
import { listGapRecords } from '../../services/gapDataService'

export default function SimCrossRunAnalyticsPage() {
  return (
    <PmisGapListHub
      title="Cross-Run Analytics"
      description="Compare performance across simulation runs."
      icon={BarChart2}
      storageKey="gap-sim-run-analytics"
      columns={[
        { key: 'metric_name', label: 'Metric' },
        { key: 'run_count', label: 'Runs' },
        { key: 'average_score', label: 'Avg Score' },
        { key: 'trend_direction', label: 'Trend' },
      ]}
      loadRows={() => listGapRecords('cross_run_analytics', { sim: true, orderBy: 'metric_name' })}
      baseFilename="Cross-Run-Analytics"
    />
  )
}
