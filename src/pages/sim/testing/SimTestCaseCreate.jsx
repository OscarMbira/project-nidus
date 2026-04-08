import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { ChevronLeft } from 'lucide-react'
import SimTestingPageShell from '../../../components/sim/SimTestingPageShell'
import TestCaseForm from '../../../components/testing/TestCaseForm'
import { createPracticeTestCase } from '../../../services/sim/practiceTestCaseService'
import { getPracticeTestSuites } from '../../../services/sim/practiceTestSuiteService'
import { testCaseDetailPathSegment } from '../../../services/testCaseService'
import { SIM_TESTING_BASE } from './simTestingPaths'

const PID_KEY = 'practice_project_id'

export default function SimTestCaseCreate() {
  return (
    <SimTestingPageShell title="New test case" subtitle="Create a practice test case for the selected practice project.">
      {({ projectId }) => <CreateBody projectId={projectId} />}
    </SimTestingPageShell>
  )
}

function CreateBody({ projectId }) {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const suiteFilter = searchParams.get('suite') || ''
  const [suites, setSuites] = useState([])

  useEffect(() => {
    if (!projectId) return
    let cancelled = false
    ;(async () => {
      const su = await getPracticeTestSuites(projectId)
      if (!cancelled) setSuites(su || [])
    })()
    return () => {
      cancelled = true
    }
  }, [projectId])

  if (!projectId) {
    return <p className="text-gray-500 text-sm">Select a practice project in the header.</p>
  }

  const listPath = suiteFilter
    ? `${SIM_TESTING_BASE}/cases?suite=${encodeURIComponent(suiteFilter)}`
    : `${SIM_TESTING_BASE}/cases`

  return (
    <div className="space-y-4">
      <Link to={listPath} className="inline-flex items-center gap-1 text-sm text-emerald-400 hover:underline">
        <ChevronLeft className="h-4 w-4" />
        Back to test cases
      </Link>
      <TestCaseForm
        layout="inline"
        projectId={projectId}
        projectIdKey={PID_KEY}
        suites={suites}
        initialSuiteId={suiteFilter || ''}
        onClose={() => navigate(listPath)}
        onSave={async (payload) => {
          const row = await createPracticeTestCase(payload)
          navigate(`${SIM_TESTING_BASE}/cases/${testCaseDetailPathSegment(row)}`)
        }}
      />
    </div>
  )
}
