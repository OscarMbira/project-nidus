import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { ChevronLeft } from 'lucide-react'
import TestingPageShell from '../../components/testing/TestingPageShell'
import TestCaseForm from '../../components/testing/TestCaseForm'
import { createTestCase, testCaseDetailPathSegment } from '../../services/testCaseService'
import { getTestSuites } from '../../services/testSuiteService'

export default function TestCaseCreate() {
  return (
    <TestingPageShell title="New test case" subtitle="Create a test case for the selected project.">
      {({ projectId }) => <CreateBody projectId={projectId} />}
    </TestingPageShell>
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
      const su = await getTestSuites(projectId)
      if (!cancelled) setSuites(su || [])
    })()
    return () => {
      cancelled = true
    }
  }, [projectId])

  if (!projectId) {
    return <p className="text-gray-500 text-sm">Select a project in the header.</p>
  }

  return (
    <div className="space-y-4">
      <Link
        to={suiteFilter ? `/platform/testing/cases?suite=${encodeURIComponent(suiteFilter)}` : '/platform/testing/cases'}
        className="inline-flex items-center gap-1 text-sm text-emerald-400 hover:underline"
      >
        <ChevronLeft className="h-4 w-4" />
        Back to test cases
      </Link>
      <TestCaseForm
        layout="inline"
        projectId={projectId}
        suites={suites}
        initialSuiteId={suiteFilter || ''}
        onClose={() =>
          navigate(suiteFilter ? `/platform/testing/cases?suite=${encodeURIComponent(suiteFilter)}` : '/platform/testing/cases')
        }
        onSave={async (payload) => {
          const row = await createTestCase(payload)
          navigate(`/platform/testing/cases/${testCaseDetailPathSegment(row)}`)
        }}
      />
    </div>
  )
}
