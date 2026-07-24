import { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import TestingPageShell from '../../components/testing/TestingPageShell'
import TestMetricsCards from '../../components/testing/TestMetricsCards'
import { getTestSuiteStats } from '../../services/testSuiteService'
import { getTestCaseStats } from '../../services/testCaseService'
import { getRunStats } from '../../services/testRunService'
import { getDefectStats } from '../../services/defectService'

export default function TestDashboard() {
  return (
    <TestingPageShell
      title="Testing dashboard"
      subtitle="Coverage, runs, and defect summary for the selected project."
    >
      {({ projectId }) => <DashboardBody projectId={projectId} />}
    </TestingPageShell>
  )
}

function DashboardBody({ projectId }) {
  const [suiteStats, setSuiteStats] = useState(null)
  const [caseStats, setCaseStats] = useState(null)
  const [runStats, setRunStats] = useState([])
  const [defectStats, setDefectStats] = useState(null)

  const load = useCallback(async () => {
    if (!projectId) return
    try {
      const [s, c, r, d] = await Promise.all([
        getTestSuiteStats(projectId),
        getTestCaseStats(projectId),
        getRunStats(projectId),
        getDefectStats(projectId),
      ])
      setSuiteStats(s)
      setCaseStats(c)
      setRunStats(r)
      setDefectStats(d)
    } catch (e) {
      console.error(e)
    }
  }, [projectId])

  useEffect(() => {
    load()
  }, [load])

  if (!projectId) {
    return <p className="text-gray-500 text-sm">Select a project to view testing metrics.</p>
  }

  return (
    <div className="space-y-8">
      <TestMetricsCards suiteStats={suiteStats} caseStats={caseStats} runStats={runStats} defectStats={defectStats} />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link
          to="/platform/testing/suites"
          className="block rounded-xl border border-gray-800 bg-gray-900/50 p-4 hover:border-emerald-700 transition-colors"
        >
          <p className="text-emerald-400 text-sm font-medium">Test suites</p>
          <p className="text-xs text-gray-500 mt-2">Manage suites and grouped cases</p>
        </Link>
        <Link
          to="/platform/testing/cases"
          className="block rounded-xl border border-gray-800 bg-gray-900/50 p-4 hover:border-emerald-700 transition-colors"
        >
          <p className="text-emerald-400 text-sm font-medium">Test cases</p>
          <p className="text-xs text-gray-500 mt-2">All cases and scripts</p>
        </Link>
        <Link
          to="/platform/testing/runs"
          className="block rounded-xl border border-gray-800 bg-gray-900/50 p-4 hover:border-emerald-700 transition-colors"
        >
          <p className="text-emerald-400 text-sm font-medium">Test runs</p>
          <p className="text-xs text-gray-500 mt-2">Execution sessions</p>
        </Link>
        <Link
          to="/platform/testing/defects"
          className="block rounded-xl border border-gray-800 bg-gray-900/50 p-4 hover:border-emerald-700 transition-colors"
        >
          <p className="text-emerald-400 text-sm font-medium">Defects</p>
          <p className="text-xs text-gray-500 mt-2">Issues and resolutions</p>
        </Link>
        <Link
          to="/platform/testing/import"
          className="block rounded-xl border border-gray-800 bg-gray-900/50 p-4 hover:border-emerald-700 transition-colors"
        >
          <p className="text-emerald-400 text-sm font-medium">Bulk import</p>
          <p className="text-xs text-gray-500 mt-2">CSV, Excel, JSON, XML</p>
        </Link>
        <Link
          to="/platform/testing/defects/dashboard"
          className="block rounded-xl border border-gray-800 bg-gray-900/50 p-4 hover:border-emerald-700 transition-colors"
        >
          <p className="text-emerald-400 text-sm font-medium">Defect reports</p>
          <p className="text-xs text-gray-500 mt-2">Trends and severity</p>
        </Link>
      </div>
    </div>
  )
}
