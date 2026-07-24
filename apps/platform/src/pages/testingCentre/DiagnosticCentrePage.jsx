import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import * as platform from '../../services/testingCentreService'
import * as sim from '../../services/simTestingCentreService'

export default function DiagnosticCentrePage({ pathPrefix, mode }) {
  const svc = mode === 'sim' ? sim : platform
  const [rows, setRows] = useState([])
  useEffect(() => {
    svc.listDiagnosticSessions().then((r) => { if (r.success) setRows(r.data || []) })
  }, [svc])
  return (
    <div className="p-6 max-w-5xl mx-auto min-h-screen bg-gray-950 text-gray-100">
      <div className="flex justify-between mb-4">
        <h1 className="text-xl">Diagnostic sessions</h1>
        <Link to={`${pathPrefix}/diagnostics/new`} className="px-3 py-1.5 rounded bg-blue-600 text-sm">New session</Link>
      </div>
      <ul className="space-y-2">
        {rows.map((r) => (
          <li key={r.id}><Link to={`${pathPrefix}/diagnostics/${r.id}`} className="text-blue-400">{r.session_code}</Link> — {r.title}</li>
        ))}
      </ul>
    </div>
  )
}
