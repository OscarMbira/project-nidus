import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { testCaseDetailPathSegment } from '../../services/testCaseService'
import TestingPageShell from '../../components/testing/TestingPageShell'
import { getTestSuiteById } from '../../services/testSuiteService'

export default function TestSuiteDetail() {
  const { suiteId } = useParams()
  return (
    <TestingPageShell title="Suite detail" subtitle="Test cases in this suite.">
      {() => <Detail suiteId={suiteId} />}
    </TestingPageShell>
  )
}

function Detail({ suiteId }) {
  const [suite, setSuite] = useState(null)
  const [err, setErr] = useState(null)

  useEffect(() => {
    if (!suiteId) return
    ;(async () => {
      try {
        const data = await getTestSuiteById(suiteId)
        setSuite(data)
      } catch (e) {
        setErr(e?.message || 'Not found')
      }
    })()
  }, [suiteId])

  if (err) return <p className="text-red-400">{err}</p>
  if (!suite) return <p className="text-gray-500">Loading…</p>

  const cases = suite.test_cases || []

  return (
    <div className="space-y-4">
      <div className="flex justify-between flex-wrap gap-2">
        <Link to="/platform/testing/suites" className="text-sm text-emerald-400 hover:underline">
          ← All suites
        </Link>
        <Link
          to={`/platform/testing/cases?suite=${suite.id}`}
          className="text-sm text-emerald-400 hover:underline"
        >
          View cases in list →
        </Link>
      </div>
      <div className="rounded-xl border border-gray-800 p-4">
        <h2 className="text-xl font-bold text-white">{suite.name}</h2>
        <p className="text-sm text-gray-400 mt-1">{suite.description}</p>
        <p className="text-xs text-gray-500 mt-2">
          {suite.suite_type} · {suite.status}
        </p>
      </div>
      <h3 className="text-sm font-semibold text-gray-300">Cases ({cases.length})</h3>
      <ul className="space-y-2">
        {cases.map((c) => (
          <li key={c.id} className="rounded-lg border border-gray-800 px-3 py-2 flex justify-between">
            <span className="text-gray-200">
              <span className="text-gray-500 text-xs mr-2">{c.test_case_ref}</span>
              {c.title}
            </span>
            <Link to={`/platform/testing/cases/${testCaseDetailPathSegment(c)}`} className="text-emerald-400 text-sm">
              Open
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
