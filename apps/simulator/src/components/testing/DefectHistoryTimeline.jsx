import { useState, useEffect } from 'react'
import { getDefectHistory } from '../../services/defectService'

export default function DefectHistoryTimeline({ defectId, getHistory = getDefectHistory }) {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      if (!defectId) return
      setLoading(true)
      try {
        const data = await getHistory(defectId)
        if (!cancelled) setRows(data)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [defectId])

  if (loading) return <p className="text-xs text-gray-500">Loading history…</p>

  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900/40 p-4">
      <h3 className="text-sm font-semibold text-white mb-3">History</h3>
      <ul className="space-y-3 text-sm">
        {rows.length === 0 && <li className="text-gray-500 text-xs">No changes recorded.</li>}
        {rows.map((r) => (
          <li key={r.id} className="border-l-2 border-emerald-700 pl-3">
            <p className="text-gray-200">
              <span className="font-medium capitalize">{r.field_changed?.replace(/_/g, ' ')}</span>
              {r.old_value != null && r.new_value != null && (
                <span className="text-gray-400">
                  : <span className="line-through text-red-300/80">{r.old_value}</span> →{' '}
                  <span className="text-emerald-300">{r.new_value}</span>
                </span>
              )}
            </p>
            <p className="text-[11px] text-gray-500">{new Date(r.changed_at).toLocaleString()}</p>
          </li>
        ))}
      </ul>
    </div>
  )
}
