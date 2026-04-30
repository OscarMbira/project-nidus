import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import * as platform from '../../services/testingCentreService'
import * as sim from '../../services/simTestingCentreService'

export default function TestRunsPage({ pathPrefix, mode }) {
  const svc = mode === 'sim' ? sim : platform
  const [rows, setRows] = useState([])
  useEffect(() => {
    svc.listTestRuns().then((r) => { if (r.success) setRows(r.data || []) })
  }, [svc])
  return (
    <div className="p-6 max-w-6xl mx-auto min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-xl font-semibold">Test runs</h1>
        <Link to={`${pathPrefix}/runs/new`} className="px-3 py-1.5 rounded bg-blue-600 text-white text-sm">Start run</Link>
      </div>
      <ul className="space-y-2">
        {rows.map((r) => (
          <li key={r.id} className="rounded border border-gray-200 dark:border-gray-800 p-3 flex justify-between">
            <Link to={`${pathPrefix}/runs/${r.id}`} className="font-mono text-blue-500">{r.run_code || r.id}</Link>
            <span className="text-sm text-gray-500">{r.run_status}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
