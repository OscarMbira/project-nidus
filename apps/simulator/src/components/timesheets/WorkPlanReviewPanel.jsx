import { useState } from 'react'
import { CheckCircle, XCircle } from 'lucide-react'

/**
 * Approve/Reject decision panel for Work Plans — simpler than TimesheetReviewPanel (no reason
 * catalog, just a mandatory free-text justification, per rule 53's "disable the action buttons
 * while the notes field is empty/whitespace-only" pattern and the v1180 PRD's simpler
 * project_work_plan_reviews.notes-only shape).
 */
export default function WorkPlanReviewPanel({ processing, onConfirm, onCancel }) {
  const [decision, setDecision] = useState(null)
  const [notes, setNotes] = useState('')

  if (!decision) {
    return (
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-sm text-gray-600 dark:text-slate-300">Approve or reject this plan:</span>
        <button type="button" onClick={() => setDecision('approved')}
          className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-700 dark:hover:bg-emerald-600 px-3 py-2 text-sm text-white">
          <CheckCircle className="h-4 w-4" /> Approve
        </button>
        <button type="button" onClick={() => setDecision('rejected')}
          className="inline-flex items-center gap-1.5 rounded-lg bg-red-700 hover:bg-red-800 dark:bg-red-800 dark:hover:bg-red-700 px-3 py-2 text-sm text-white">
          <XCircle className="h-4 w-4" /> Reject
        </button>
        <button type="button" onClick={onCancel}
          className="text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-200 text-sm">Cancel</button>
      </div>
    )
  }

  const canConfirm = notes.trim().length > 0

  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">
        {decision === 'approved' ? 'Approve' : 'Reject'} — a justification note is required
      </p>
      <textarea value={notes} onChange={(ev) => setNotes(ev.target.value)}
        placeholder="Justification…" rows={3}
        className="w-full rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-gray-900 dark:text-slate-100 focus:border-blue-500 focus:outline-none" />
      <div className="flex items-center gap-3">
        <button type="button" onClick={() => onConfirm(decision, notes.trim())}
          disabled={!!processing || !canConfirm}
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
