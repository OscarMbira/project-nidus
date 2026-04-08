import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { listOPAs } from '../../services/opaService'
import { getCurrentUserAccountId } from '../../utils/accountResolution'

export default function OPAOnHold() {
  const navigate = useNavigate()
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    ;(async () => {
      const id = await getCurrentUserAccountId()
      if (!id) {
        setLoading(false)
        return
      }
      const { data } = await listOPAs(id, { onHoldOnly: true })
      setRows(data || [])
      setLoading(false)
    })()
  }, [])

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <Link to="/platform/opa" className="inline-flex items-center gap-2 text-gray-600 dark:text-gray-400 mb-6">
        <ArrowLeft className="h-4 w-4" /> All OPAs
      </Link>
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">OPA drafts & on hold</h1>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Records marked on hold. Open one to continue editing.</p>
      {loading ? (
        <p className="text-gray-600 dark:text-gray-400">Loading…</p>
      ) : (
        <ul className="divide-y divide-gray-200 dark:divide-gray-700 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
          {rows.map((r) => (
            <li key={r.id} className="p-4 flex flex-wrap justify-between gap-2">
              <div>
                <button type="button" className="font-medium text-left text-gray-900 dark:text-white hover:underline" onClick={() => navigate(`/platform/opa/${r.id}/edit`)}>
                  {r.title}
                </button>
                <p className="text-xs text-gray-500 mt-1">{r.on_hold_reason || 'On hold'}</p>
              </div>
              <button type="button" className="text-sky-600 dark:text-sky-400 text-sm" onClick={() => navigate(`/platform/opa/${r.id}/edit`)}>
                Resume
              </button>
            </li>
          ))}
        </ul>
      )}
      {!loading && !rows.length && <p className="text-gray-500 dark:text-gray-400 py-8 text-center">No on-hold OPA records.</p>}
    </div>
  )
}
