import { useState } from 'react'
import { X } from 'lucide-react'
import { platformDb } from '../../services/supabase/supabaseClient'
import { listTimesheetEntryReviewHistory } from '../../services/timesheetService'
import { getReviewReasonsByIds } from '../../services/timesheetReasonCatalogService'

const BADGE_CLASSES = {
  approved: 'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-900/40 dark:text-emerald-300 dark:border-emerald-700',
  rejected: 'bg-red-50 text-red-700 border-red-300 dark:bg-red-900/40 dark:text-red-300 dark:border-red-700',
}

/**
 * Approved/rejected status badge that opens the latest decision's reasons and notes on click.
 * The review history is fetched on first open only, so the grid doesn't query every row up front.
 */
export default function ReviewDecisionBadge({ entryId, status }) {
  const [open, setOpen] = useState(false)
  const [detail, setDetail] = useState(null)
  const [loading, setLoading] = useState(false)

  const toggle = async () => {
    if (open) {
      setOpen(false)
      return
    }
    setOpen(true)
    if (detail) return
    setLoading(true)
    try {
      const [latest] = await listTimesheetEntryReviewHistory(entryId)
      if (!latest) {
        setDetail({ decidedAt: null, reviewer: null, reasons: [], notes: '' })
        return
      }
      const [reasonsRes, reviewerRes] = await Promise.all([
        getReviewReasonsByIds(latest.decision, latest.reason_ids || []),
        latest.reviewer_id
          ? platformDb.from('users').select('full_name').eq('id', latest.reviewer_id).maybeSingle()
          : Promise.resolve({ data: null }),
      ])
      setDetail({
        decidedAt: latest.decided_at,
        reviewer: reviewerRes.data?.full_name || null,
        reasons: (reasonsRes.data || []).map((r) => r.name),
        notes: latest.notes || '',
      })
    } catch (err) {
      console.error('Failed to load review decision:', err)
      setDetail({ error: true, reasons: [], notes: '' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <span className="relative inline-block">
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        title="View decision details"
        className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium capitalize ${BADGE_CLASSES[status] || ''}`}
      >
        {status}
      </button>
      {open && (
        <div
          role="dialog"
          className="absolute right-0 z-20 mt-1 w-64 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-3 text-left text-xs text-gray-700 dark:text-slate-300 shadow-lg"
        >
          <div className="mb-2 flex items-center justify-between">
            <span className="font-semibold capitalize text-gray-900 dark:text-slate-100">{status}</span>
            <button type="button" onClick={() => setOpen(false)} aria-label="Close" className="text-gray-400 hover:text-gray-600 dark:hover:text-slate-200">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
          {loading && <p>Loading…</p>}
          {!loading && detail?.error && <p className="text-red-600 dark:text-red-400">Could not load the decision.</p>}
          {!loading && detail && !detail.error && (
            <div className="space-y-1">
              {(detail.reviewer || detail.decidedAt) && (
                <p>
                  {detail.reviewer ? `By ${detail.reviewer}` : 'Reviewed'}
                  {detail.decidedAt ? ` on ${new Date(detail.decidedAt).toLocaleDateString()}` : ''}
                </p>
              )}
              {detail.reasons.length > 0 && (
                <div>
                  <p className="font-medium text-gray-900 dark:text-slate-100">Reasons</p>
                  <ul className="list-disc pl-4">
                    {detail.reasons.map((r) => <li key={r}>{r}</li>)}
                  </ul>
                </div>
              )}
              {detail.notes && (
                <div>
                  <p className="font-medium text-gray-900 dark:text-slate-100">Notes</p>
                  <p className="whitespace-pre-wrap">{detail.notes}</p>
                </div>
              )}
              {detail.reasons.length === 0 && !detail.notes && <p>No reason was recorded.</p>}
            </div>
          )}
        </div>
      )}
    </span>
  )
}
