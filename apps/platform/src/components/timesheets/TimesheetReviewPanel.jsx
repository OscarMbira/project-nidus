import { useState } from 'react'
import { CheckCircle, XCircle } from 'lucide-react'

/**
 * Self-contained Approve/Reject decision panel — pick a decision, multi-select reasons from
 * that decision's catalog, optional notes, Confirm disabled until >=1 reason is checked (v1169
 * mandatory-justification pattern). Shared between TeamTimesheetsPage's Entries tab (inline row)
 * and its Weekly Grid tab (cell-click popover) — v1170 — so the decision UI isn't duplicated.
 * @param {{
 *   approveReasons: Array, rejectReasons: Array, processing: boolean,
 *   onConfirm: (decision: 'approved'|'rejected', reasonIds: string[], notes: string) => void,
 *   onCancel: () => void,
 * }} props
 */
export default function TimesheetReviewPanel({ approveReasons, rejectReasons, processing, onConfirm, onCancel }) {
  const [decision, setDecision] = useState(null)
  const [selectedReasonIds, setSelectedReasonIds] = useState([])
  const [notes, setNotes] = useState('')

  const reasonCatalog = decision === 'approved' ? approveReasons : rejectReasons

  const toggleReasonId = (id) => {
    setSelectedReasonIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id])
  }

  if (!decision) {
    return (
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-sm text-gray-600 dark:text-slate-300">Approve or reject this entry:</span>
        <button type="button" onClick={() => { setDecision('approved'); setSelectedReasonIds([]) }}
          className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-700 dark:hover:bg-emerald-600 px-3 py-2 text-sm text-white">
          <CheckCircle className="h-4 w-4" /> Approve
        </button>
        <button type="button" onClick={() => { setDecision('rejected'); setSelectedReasonIds([]) }}
          className="inline-flex items-center gap-1.5 rounded-lg bg-red-700 hover:bg-red-800 dark:bg-red-800 dark:hover:bg-red-700 px-3 py-2 text-sm text-white">
          <XCircle className="h-4 w-4" /> Reject
        </button>
        <button type="button" onClick={onCancel}
          className="text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-200 text-sm">Cancel</button>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">
        {decision === 'approved' ? 'Approve' : 'Reject'} — select at least one reason
      </p>
      <div className="flex flex-wrap gap-2">
        {reasonCatalog.map((reason) => {
          const checked = selectedReasonIds.includes(reason.id)
          return (
            <label key={reason.id}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs cursor-pointer ${checked
                ? 'border-blue-500 bg-blue-50 text-blue-700 dark:border-blue-500 dark:bg-blue-900/30 dark:text-blue-300'
                : 'border-gray-300 text-gray-600 hover:bg-gray-100 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800'}`}>
              <input type="checkbox" checked={checked} onChange={() => toggleReasonId(reason.id)} className="sr-only" />
              {reason.name}
            </label>
          )
        })}
      </div>
      <textarea value={notes} onChange={(ev) => setNotes(ev.target.value)}
        placeholder="Notes (optional)…" rows={2}
        className="w-full rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-gray-900 dark:text-slate-100 focus:border-blue-500 focus:outline-none" />
      <div className="flex items-center gap-3">
        <button type="button" onClick={() => onConfirm(decision, selectedReasonIds, notes)}
          disabled={!!processing || selectedReasonIds.length === 0}
          className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm text-white disabled:opacity-50 disabled:cursor-not-allowed ${
            decision === 'approved'
              ? 'bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-700 dark:hover:bg-emerald-600'
              : 'bg-red-700 hover:bg-red-800 dark:bg-red-800 dark:hover:bg-red-700'}`}>
          Confirm {decision === 'approved' ? 'Approve' : 'Reject'}
        </button>
        <button type="button" onClick={() => setDecision(null)}
          className="text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-200 text-sm">Back</button>
        <button type="button" onClick={onCancel}
          className="text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-200 text-sm">Cancel</button>
      </div>
    </div>
  )
}
