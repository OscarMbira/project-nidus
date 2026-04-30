import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import * as platformSvc from '../../services/workAuthorisationService'
import * as simSvc from '../../services/simWorkAuthorisationService'

export default function WorkAuthorisationDraftsPage() {
  const location = useLocation()
  const mode = useMemo(() => (location.pathname.includes('/simulator/') ? 'sim' : 'platform'), [location.pathname])
  const svc = mode === 'sim' ? simSvc : platformSvc
  const basePath = mode === 'sim'
    ? '/simulator/pm/controls/work-authorisations'
    : '/platform/work-authorisations'

  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const res = await svc.listWorkAuthorisations({ status: 'draft' })
      if (res.success) setRows(res.data || [])
      setLoading(false)
    }
    load()
  }, [svc])

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 text-gray-900 dark:text-gray-100">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">Draft queue</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Continue editing saved drafts before submission.
          </p>
        </div>
        <Link
          to={`${basePath}/new`}
          className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm"
        >
          New request
        </Link>
      </div>

      {loading ? (
        <p className="text-sm text-gray-500">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-gray-500">No drafts. Create a new request or save one as draft.</p>
      ) : (
        <ul className="space-y-2">
          {rows.map((r) => (
            <li key={r.id}>
              <Link
                to={`${basePath}/${r.id}/edit`}
                className="block rounded-lg border border-gray-200 dark:border-gray-700 p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50"
              >
                <span className="font-mono text-xs text-gray-500">{r.reference_code}</span>
                <p className="font-medium">{r.title}</p>
                <p className="text-xs text-gray-500 mt-1">{r.action_type}</p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
