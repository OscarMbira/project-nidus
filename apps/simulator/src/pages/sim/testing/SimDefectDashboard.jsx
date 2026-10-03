import { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import SimTestingPageShell from '../../../components/sim/SimTestingPageShell'
import DashboardStatCard from '../../../components/ui/DashboardStatCard'
import { getPracticeDefectStats } from '../../../services/sim/practiceDefectService'
import DefectTrendChart from '../../../components/testing/DefectTrendChart'
import DefectBySeverityChart from '../../../components/testing/DefectBySeverityChart'
import { SIM_TESTING_BASE } from './simTestingPaths'

export default function SimDefectDashboard() {
  return (
    <SimTestingPageShell title="Defect reports" subtitle="Trends and severity for the practice project.">
      {({ projectId }) => <Body projectId={projectId} />}
    </SimTestingPageShell>
  )
}

function Body({ projectId }) {
  const [stats, setStats] = useState(null)

  const load = useCallback(async () => {
    if (!projectId) return
    try {
      const s = await getPracticeDefectStats(projectId)
      setStats(s)
    } catch (e) {
      console.error(e)
    }
  }, [projectId])

  useEffect(() => {
    load()
  }, [load])

  if (!projectId) return <p className="text-gray-500 text-sm">Select a practice project.</p>
  if (!stats) return <p className="text-gray-500">Loading…</p>

  return (
    <div className="space-y-8">
      <Link to={`${SIM_TESTING_BASE}/defects`} className="text-sm text-emerald-400 hover:underline">
        ← Defect register
      </Link>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <DashboardStatCard label="Total defects" value={stats.total} />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">Opened by day</h3>
          <DefectTrendChart trend={stats.trend} />
        </div>
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">By severity</h3>
          <DefectBySeverityChart bySeverity={stats.bySeverity} />
        </div>
      </div>
    </div>
  )
}
