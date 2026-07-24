import { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import SimTestingPageShell from '../../../components/sim/SimTestingPageShell'
import TestMetricsCards from '../../../components/testing/TestMetricsCards'
import { getPracticeTestSuiteStats } from '../../../services/sim/practiceTestSuiteService'
import { getPracticeTestCaseStats } from '../../../services/sim/practiceTestCaseService'
import { getPracticeRunStats } from '../../../services/sim/practiceTestRunService'
import { getPracticeDefectStats } from '../../../services/sim/practiceDefectService'
import { SIM_TESTING_BASE } from './simTestingPaths'

export default function SimTestDashboard() {
  return (
    <SimTestingPageShell title="Testing dashboard" subtitle="Practice project — coverage, runs, and defects.">
      {({ projectId }) => <Body projectId={projectId} />}
    </SimTestingPageShell>
  )
}

function Body({ projectId }) {
  const [suiteStats, setSuiteStats] = useState(null)
  const [caseStats, setCaseStats] = useState(null)
  const [runStats, setRunStats] = useState([])
  const [defectStats, setDefectStats] = useState(null)

  const load = useCallback(async () => {
    if (!projectId) return
    try {
      const [s, c, r, d] = await Promise.all([
        getPracticeTestSuiteStats(projectId),
        getPracticeTestCaseStats(projectId),
        getPracticeRunStats(projectId),
        getPracticeDefectStats(projectId),
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
    return <p className="text-gray-500 text-sm">Select a practice project to view testing metrics.</p>
  }

  return (
    <div className="space-y-8">
      <TestMetricsCards suiteStats={suiteStats} caseStats={caseStats} runStats={runStats} defectStats={defectStats} />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link
          to={`${SIM_TESTING_BASE}/suites`}
          className="block rounded-xl border border-gray-800 bg-gray-900/50 p-4 hover:border-emerald-700 transition-colors"
        >
          <p className="text-emerald-400 text-sm font-medium">Test suites</p>
          <p className="text-xs text-gray-500 mt-2">Manage suites and grouped cases</p>
        </Link>
        <Link
          to={`${SIM_TESTING_BASE}/cases`}
          className="block rounded-xl border border-gray-800 bg-gray-900/50 p-4 hover:border-emerald-700 transition-colors"
        >
          <p className="text-emerald-400 text-sm font-medium">Test cases</p>
          <p className="text-xs text-gray-500 mt-2">All cases and scripts</p>
        </Link>
        <Link
          to={`${SIM_TESTING_BASE}/runs`}
          className="block rounded-xl border border-gray-800 bg-gray-900/50 p-4 hover:border-emerald-700 transition-colors"
        >
          <p className="text-emerald-400 text-sm font-medium">Test runs</p>
          <p className="text-xs text-gray-500 mt-2">Execution sessions</p>
        </Link>
        <Link
          to={`${SIM_TESTING_BASE}/defects`}
          className="block rounded-xl border border-gray-800 bg-gray-900/50 p-4 hover:border-emerald-700 transition-colors"
        >
          <p className="text-emerald-400 text-sm font-medium">Defects</p>
          <p className="text-xs text-gray-500 mt-2">Issues and resolutions</p>
        </Link>
        <Link
          to={`${SIM_TESTING_BASE}/import`}
          className="block rounded-xl border border-gray-800 bg-gray-900/50 p-4 hover:border-emerald-700 transition-colors"
        >
          <p className="text-emerald-400 text-sm font-medium">Bulk import</p>
          <p className="text-xs text-gray-500 mt-2">CSV, Excel, JSON, XML</p>
        </Link>
        <Link
          to={`${SIM_TESTING_BASE}/defects/dashboard`}
          className="block rounded-xl border border-gray-800 bg-gray-900/50 p-4 hover:border-emerald-700 transition-colors"
        >
          <p className="text-emerald-400 text-sm font-medium">Defect reports</p>
          <p className="text-xs text-gray-500 mt-2">Trends and severity</p>
        </Link>
      </div>
    </div>
  )
}
