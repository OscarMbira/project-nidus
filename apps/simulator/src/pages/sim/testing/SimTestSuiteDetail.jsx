import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import SimTestingPageShell from '../../../components/sim/SimTestingPageShell'
import { getPracticeTestSuiteById } from '../../../services/sim/practiceTestSuiteService'
import { SIM_TESTING_BASE } from './simTestingPaths'
import { testCaseDetailPathSegment } from '../../../services/testCaseService'

export default function SimTestSuiteDetail() {
  const { suiteId } = useParams()
  return (
    <SimTestingPageShell title="Suite detail" subtitle="Test cases in this suite.">
      {() => <Detail suiteId={suiteId} />}
    </SimTestingPageShell>
  )
}

function Detail({ suiteId }) {
  const [suite, setSuite] = useState(null)
  const [err, setErr] = useState(null)

  useEffect(() => {
    if (!suiteId) return
    ;(async () => {
      try {
        const data = await getPracticeTestSuiteById(suiteId)
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
        <Link to={`${SIM_TESTING_BASE}/suites`} className="text-sm text-emerald-400 hover:underline">
          ← All suites
        </Link>
        <Link to={`${SIM_TESTING_BASE}/cases?suite=${suite.id}`} className="text-sm text-emerald-400 hover:underline">
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
            <Link to={`${SIM_TESTING_BASE}/cases/${testCaseDetailPathSegment(c)}`} className="text-emerald-400 text-sm">
              Open
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
