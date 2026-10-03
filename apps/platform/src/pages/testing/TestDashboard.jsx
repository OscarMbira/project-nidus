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
    return <p className="text-sm text-gray-700 dark:text-gray-200">Select a project to view testing metrics.</p>
  }

  return (
    <div className="space-y-8">
      <TestMetricsCards suiteStats={suiteStats} caseStats={caseStats} runStats={runStats} defectStats={defectStats} />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link
          to="/platform/testing/suites"
          className="block rounded-lg border border-gray-200 bg-white p-4 shadow-sm transition-colors hover:border-emerald-600 hover:shadow dark:border-gray-700 dark:bg-gray-800 dark:hover:border-emerald-400"
        >
          <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">Test suites</p>
          <p className="mt-2 text-sm text-gray-700 dark:text-gray-200">Manage suites and grouped cases</p>
        </Link>
        <Link
          to="/platform/testing/cases"
          className="block rounded-lg border border-gray-200 bg-white p-4 shadow-sm transition-colors hover:border-emerald-600 hover:shadow dark:border-gray-700 dark:bg-gray-800 dark:hover:border-emerald-400"
        >
          <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">Test cases</p>
          <p className="mt-2 text-sm text-gray-700 dark:text-gray-200">All cases and scripts</p>
        </Link>
        <Link
          to="/platform/testing/runs"
          className="block rounded-lg border border-gray-200 bg-white p-4 shadow-sm transition-colors hover:border-emerald-600 hover:shadow dark:border-gray-700 dark:bg-gray-800 dark:hover:border-emerald-400"
        >
          <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">Test runs</p>
          <p className="mt-2 text-sm text-gray-700 dark:text-gray-200">Execution sessions</p>
        </Link>
        <Link
          to="/platform/testing/defects"
          className="block rounded-lg border border-gray-200 bg-white p-4 shadow-sm transition-colors hover:border-emerald-600 hover:shadow dark:border-gray-700 dark:bg-gray-800 dark:hover:border-emerald-400"
        >
          <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">Defects</p>
          <p className="mt-2 text-sm text-gray-700 dark:text-gray-200">Issues and resolutions</p>
        </Link>
        <Link
          to="/platform/testing/import"
          className="block rounded-lg border border-gray-200 bg-white p-4 shadow-sm transition-colors hover:border-emerald-600 hover:shadow dark:border-gray-700 dark:bg-gray-800 dark:hover:border-emerald-400"
        >
          <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">Bulk import</p>
          <p className="mt-2 text-sm text-gray-700 dark:text-gray-200">CSV, Excel, JSON, XML</p>
        </Link>
        <Link
          to="/platform/testing/defects/dashboard"
          className="block rounded-lg border border-gray-200 bg-white p-4 shadow-sm transition-colors hover:border-emerald-600 hover:shadow dark:border-gray-700 dark:bg-gray-800 dark:hover:border-emerald-400"
        >
          <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">Defect reports</p>
          <p className="mt-2 text-sm text-gray-700 dark:text-gray-200">Trends and severity</p>
        </Link>
      </div>
    </div>
  )
}
