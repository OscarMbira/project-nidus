import { useParams } from 'react-router-dom'
import { useEffect, useState } from 'react'
import * as platform from '../../services/testingCentreService'
import * as sim from '../../services/simTestingCentreService'

export default function TestRunDetailPage({ mode }) {
  const { id } = useParams()
  const svc = mode === 'sim' ? sim : platform
  const [pack, setPack] = useState(null)
  useEffect(() => {
    if (svc.getTestRunWithResults) svc.getTestRunWithResults(id).then((r) => { if (r.success) setPack(r.data) })
  }, [id, svc])
  if (!pack) return <div className="p-6 text-gray-100">Loading…</div>
  return (
    <div className="p-6 max-w-5xl mx-auto min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100">
      <h1 className="text-xl font-mono mb-2">{pack.run?.run_code}</h1>
      <p className="text-sm text-gray-500 mb-4">Auto defects: {pack.run?.auto_defects_created ?? 0}</p>
      <h2 className="font-medium mb-2">Results</h2>
      <ul className="text-sm space-y-1">
        {(pack.results || []).map((x) => (
          <li key={x.id} className="border border-gray-200 dark:border-gray-800 rounded p-2">{x.case?.test_case_code} — {x.status}</li>
        ))}
      </ul>
    </div>
  )
}
