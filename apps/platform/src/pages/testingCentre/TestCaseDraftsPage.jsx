import { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import * as platform from '../../services/testingCentreService'
import * as sim from '../../services/simTestingCentreService'

export default function TestCaseDraftsPage({ pathPrefix = '/platform/testing-centre', mode = 'platform' }) {
  const svc = mode === 'sim' ? sim : platform
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const load = useCallback(async () => {
    setLoading(true)
    const r = await svc.listTestCases({ status: 'draft' })
    if (r.success) setRows(r.data || [])
    setLoading(false)
  }, [svc])
  useEffect(() => { load() }, [load])

  return (
    <div className="p-6 max-w-4xl mx-auto min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100">
      <h1 className="text-xl font-semibold mb-2">Draft test cases</h1>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Cases saved with status &quot;draft&quot; (resume to complete).</p>
      {loading && <p className="text-sm text-gray-500">Loading…</p>}
      <ul className="space-y-2">
        {rows.map((r) => (
          <li
            key={r.id}
            className="flex items-center justify-between rounded-lg border border-gray-200 dark:border-gray-800 p-3 bg-white dark:bg-gray-900/50"
          >
            <div>
              <span className="font-mono text-sm text-blue-500">{r.test_case_code}</span>
              <div className="text-sm">{r.title || 'Untitled'}</div>
            </div>
            <Link
              to={`${pathPrefix}/cases/${r.id}/edit`}
              className="text-sm px-2 py-1 rounded bg-gray-200 dark:bg-gray-700"
            >
              Resume
            </Link>
          </li>
        ))}
      </ul>
      {!loading && !rows.length && <p className="text-sm text-gray-500">No drafts yet.</p>}
    </div>
  )
}
