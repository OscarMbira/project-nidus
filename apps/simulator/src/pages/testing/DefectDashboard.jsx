import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import TestingPageShell from '../../components/testing/TestingPageShell'
import DashboardStatCard from '../../components/ui/DashboardStatCard'
import { getDefectStats } from '../../services/defectService'
import DefectTrendChart from '../../components/testing/DefectTrendChart'
import DefectBySeverityChart from '../../components/testing/DefectBySeverityChart'

export default function DefectDashboard() {
  return (
    <TestingPageShell title="Defect reports" subtitle="Trends and severity distribution for the selected project.">
      {({ projectId }) => <Body projectId={projectId} />}
    </TestingPageShell>
  )
}

function Body({ projectId }) {
  const navigate = useNavigate()
  const [stats, setStats] = useState(null)

  const load = useCallback(async () => {
    if (!projectId) return
    try {
      const s = await getDefectStats(projectId)
      setStats(s)
    } catch (e) {
      console.error(e)
    }
  }, [projectId])

  useEffect(() => {
    load()
  }, [load])

  if (!projectId) return <p className="text-gray-500 text-sm">Select a project.</p>
  if (!stats) return <p className="text-gray-500">Loading…</p>

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap gap-4">
        <button type="button" onClick={() => navigate(-1)} className="text-sm text-emerald-400 hover:underline">
          ← Defect register
        </button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <DashboardStatCard label="Total open issues" value={stats.total} />
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
