import { useEffect, useState } from 'react'

export default function DelayOwnerHistory({ fetchHistory, delayId }) {
  const [rows, setRows] = useState([])
  const [open, setOpen] = useState(true)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!delayId || !fetchHistory) return
    let c = false
    ;(async () => {
      setLoading(true)
      try {
        const data = await fetchHistory(delayId)
        if (!c) setRows(Array.isArray(data) ? data : [])
      } catch {
        if (!c) setRows([])
      } finally {
        if (!c) setLoading(false)
      }
    })()
    return () => {
      c = true
    }
  }, [delayId, fetchHistory])

  if (!delayId) return null

  return (
    <div className="mt-4 border border-slate-600/40 rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex justify-between items-center px-3 py-2 bg-slate-800/50 text-left text-sm font-medium text-slate-200"
      >
        Ownership history
        <span className="text-slate-500">{open ? '−' : '+'}</span>
      </button>
      {open && (
        <div className="p-3 space-y-3 max-h-64 overflow-y-auto">
          {loading && <p className="text-xs text-slate-500">Loading…</p>}
          {!loading && rows.length === 0 && (
            <p className="text-xs text-slate-500">No ownership changes recorded yet.</p>
          )}
          {rows.map((h) => (
            <div key={h.id} className="border-l-2 border-blue-500/60 pl-3 text-xs text-slate-300">
              <div className="text-slate-400">
                {h.changed_at ? new Date(h.changed_at).toLocaleString() : ''}
              </div>
              <div>
                <span className="text-slate-500">From </span>
                {h.previous_owner_id || '—'}
                <span className="text-slate-500"> → </span>
                {h.new_owner_id}
              </div>
              <div className="text-slate-500 mt-0.5">
                Event: {h.source_event?.replace(/_/g, ' ')} · Status: {h.delay_status_at_change || '—'}
              </div>
              {h.change_reason && <div className="text-slate-400 mt-1">{h.change_reason}</div>}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
