import { useEffect, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Clock, AlertCircle, Calendar, Tag, MessageSquare, CheckCircle, XCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import { RowActionButton } from '@nidus/ui'
import { platformDb } from '@nidus/supabase'
import { getTimesheetEntry, deleteTimesheetEntry, submitTimesheetEntry, listTimesheetEntryReviewHistory, listTimesheetEntryEditHistory } from '../../../services/timesheetService'
import { getReviewReasonsByIds } from '../../../services/timesheetReasonCatalogService'
import DetailAuditTabList from '@nidus/ui/DetailAuditTabList'
import AuditDetailsPanel from '@nidus/ui/AuditDetailsPanel'
import AuditCard from '@nidus/ui/AuditCard'
import AuditField from '@nidus/ui/AuditField'
import AuditTimestampPair from '@nidus/ui/AuditTimestampPair'
import { humanizeAuditToken } from '@nidus/shared/utils/auditDisplayUtils'

const STATUS_COLORS = {
  draft:     'bg-gray-100 text-gray-700 border-gray-300 dark:bg-slate-700 dark:text-slate-300 dark:border-slate-600',
  submitted: 'bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-900/40 dark:text-amber-300 dark:border-amber-700',
  approved:  'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-900/40 dark:text-emerald-300 dark:border-emerald-700',
  rejected:  'bg-red-50 text-red-700 border-red-300 dark:bg-red-900/40 dark:text-red-300 dark:border-red-700',
}

function DetailRow({ icon: Icon, label, value }) {
  if (!value) return null
  return (
    <div className="flex gap-3 py-3 border-b border-gray-200 dark:border-slate-800 last:border-0">
      <div className="mt-0.5 shrink-0 text-gray-400 dark:text-slate-500">{Icon && <Icon className="h-4 w-4" />}</div>
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-500">{label}</p>
        <p className="mt-0.5 text-sm text-gray-700 dark:text-slate-200">{value}</p>
      </div>
    </div>
  )
}

/** Resolve each history row's reason_ids to display names, and each reviewer_id to a label. */
async function enrichReviewHistory(rows) {
  const approveIds = [...new Set(rows.filter((r) => r.decision === 'approved').flatMap((r) => r.reason_ids || []))]
  const rejectIds = [...new Set(rows.filter((r) => r.decision === 'rejected').flatMap((r) => r.reason_ids || []))]
  const [approveRes, rejectRes] = await Promise.all([
    getReviewReasonsByIds('approved', approveIds),
    getReviewReasonsByIds('rejected', rejectIds),
  ])
  const reasonNameMap = {}
  ;[...(approveRes.data || []), ...(rejectRes.data || [])].forEach((r) => { reasonNameMap[r.id] = r.name })

  const reviewerIds = [...new Set(rows.map((r) => r.reviewer_id).filter(Boolean))]
  let reviewerNameMap = {}
  if (reviewerIds.length > 0) {
    const { data: users } = await platformDb
      .from('users')
      .select('auth_user_id, full_name, email')
      .in('auth_user_id', reviewerIds)
    reviewerNameMap = Object.fromEntries((users || []).map((u) => [u.auth_user_id, u.full_name || u.email || 'Unknown reviewer']))
  }

  return rows.map((r) => ({
    ...r,
    reasonNames: (r.reason_ids || []).map((id) => reasonNameMap[id]).filter(Boolean),
    reviewerName: reviewerNameMap[r.reviewer_id] || 'Unknown reviewer',
  }))
}

function formatHistoryDate(v) {
  if (!v) return '—'
  return new Date(v).toLocaleString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })
}

/** Resolve each edit-history row's editor to a display name. */
async function enrichEditHistory(rows) {
  const editorIds = [...new Set(rows.map((r) => r.edited_by).filter(Boolean))]
  let editorNameMap = {}
  if (editorIds.length > 0) {
    const { data: users } = await platformDb
      .from('users')
      .select('auth_user_id, full_name, email')
      .in('auth_user_id', editorIds)
    editorNameMap = Object.fromEntries((users || []).map((u) => [u.auth_user_id, u.full_name || u.email || 'Unknown']))
  }
  return rows.map((r) => ({ ...r, editorName: editorNameMap[r.edited_by] || 'Unknown' }))
}

function formatPreviousValuesSummary(prev) {
  if (!prev) return ''
  const parts = []
  if (prev.entry_date) parts.push(`Date: ${prev.entry_date}`)
  if (prev.hours_worked != null) parts.push(`Hours: ${prev.hours_worked}h`)
  if (prev.work_category) parts.push(`Category: ${humanizeAuditToken(prev.work_category)}`)
  if (prev.start_time || prev.end_time) parts.push(`Time: ${prev.start_time?.slice(0, 5) || '—'}–${prev.end_time?.slice(0, 5) || '—'}`)
  if (prev.overtime_type_code) parts.push(`Overtime type: ${humanizeAuditToken(prev.overtime_type_code)}`)
  if (prev.description) parts.push(`Description: "${prev.description}"`)
  return parts.join(' · ')
}

export default function TimesheetEntryDetail() {
  const { id } = useParams()
  const [searchParams] = useSearchParams()
  const projectId = searchParams.get('projectId')
  const navigate = useNavigate()
  const [entry, setEntry] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('details')
  const [reviewHistory, setReviewHistory] = useState([])
  const [historyLoading, setHistoryLoading] = useState(true)
  const [editHistory, setEditHistory] = useState([])
  const [editHistoryLoading, setEditHistoryLoading] = useState(true)

  useEffect(() => {
    if (!id) return
    ;(async () => {
      setLoading(true)
      try {
        const data = await getTimesheetEntry(id)
        setEntry(data)
      } catch (e) {
        toast.error(e?.message || 'Failed to load entry')
      } finally {
        setLoading(false)
      }
    })()
  }, [id])

  useEffect(() => {
    if (!id) return
    setHistoryLoading(true)
    listTimesheetEntryReviewHistory(id)
      .then(enrichReviewHistory)
      .then(setReviewHistory)
      .catch((e) => console.error('Failed to load review history:', e))
      .finally(() => setHistoryLoading(false))
  }, [id])

  useEffect(() => {
    if (!id) return
    setEditHistoryLoading(true)
    listTimesheetEntryEditHistory(id)
      .then(enrichEditHistory)
      .then(setEditHistory)
      .catch((e) => console.error('Failed to load edit history:', e))
      .finally(() => setEditHistoryLoading(false))
  }, [id])

  const handleSubmit = async () => {
    try {
      const updated = await submitTimesheetEntry(id)
      setEntry(e => ({ ...e, ...updated }))
      toast.success('Submitted for approval')
    } catch (e) {
      toast.error(e?.message || 'Submit failed')
    }
  }

  const handleDelete = async () => {
    if (!window.confirm('Delete this time entry?')) return
    try {
      await deleteTimesheetEntry(id)
      toast.success('Entry deleted')
      navigate(`/platform/timesheets${projectId ? `?projectId=${projectId}` : ''}`)
    } catch (e) {
      toast.error(e?.message || 'Delete failed')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-slate-950 flex items-center justify-center">
        <div className="h-8 w-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!entry) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-slate-950 flex flex-col items-center justify-center gap-4 p-8">
        <AlertCircle className="h-10 w-10 text-gray-400 dark:text-slate-500" />
        <p className="text-gray-500 dark:text-slate-400">Entry not found.</p>
        <button type="button" onClick={() => navigate(-1)}
          className="rounded-lg bg-blue-600 hover:bg-blue-700 px-4 py-2 text-sm text-white">Go back</button>
      </div>
    )
  }

  // v53/v1169 field lock — read-only while the PM's decision is pending.
  const canEdit = entry.status === 'draft' || entry.status === 'rejected'
  const isLocked = entry.status === 'submitted'
  const formatDate = (v) => v ? new Date(v).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : '—'

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950 text-gray-900 dark:text-slate-100 px-4 py-6">
      <div className="max-w-2xl mx-auto space-y-5">
        {/* Header */}
        <div className="flex items-center gap-3 flex-wrap">
          <button type="button" onClick={() => navigate(-1)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700 min-h-[40px]">
            <ArrowLeft className="h-4 w-4" /> Back
          </button>
          <h1 className="flex-1 text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Clock className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            Time Entry
          </h1>
          {canEdit && (
            <RowActionButton
              variant="edit"
              label="Edit entry"
              onClick={() => navigate(`/platform/timesheets/${id}/edit${projectId ? `?projectId=${projectId}` : ''}`)}
            />
          )}
          {entry.status === 'draft' && (
            <button type="button" onClick={handleSubmit}
              className="inline-flex items-center gap-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 px-3 py-2 text-sm font-medium text-white min-h-[40px]">
              Submit
            </button>
          )}
          {entry.status === 'draft' && (
            <RowActionButton
              variant="delete"
              label="Delete entry"
              onClick={handleDelete}
            />
          )}
        </div>

        <DetailAuditTabList activeTab={activeTab} onChange={setActiveTab} />

        {activeTab === 'audit' ? (
          <AuditDetailsPanel description="How this time entry is classified, and when it was created.">
            <AuditCard title="Identity" description="How this entry is labelled and tracked.">
              <AuditField label="Date" value={entry.entry_date} />
              <AuditField label="Status" value={humanizeAuditToken(entry.status)} />
            </AuditCard>
            <AuditCard title="Classification" description="How this entry is categorised.">
              <AuditField label="Work category" value={humanizeAuditToken(entry.work_category)} />
              <AuditField label="Hours worked" value={entry.hours_worked} />
            </AuditCard>
            <AuditCard title="Record history" description="When this entry was created and last changed.">
              <AuditTimestampPair dateLabel="Created at" value={entry.created_at} />
              <AuditTimestampPair dateLabel="Last updated" value={entry.updated_at} />
            </AuditCard>
          </AuditDetailsPanel>
        ) : (
        <>
        {/* Hero */}
        <div className="rounded-xl bg-gradient-to-r from-gray-100 to-gray-200 dark:from-slate-700 dark:to-slate-800 border border-gray-300 dark:border-slate-600 px-6 py-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-blue-600 dark:text-blue-300 text-xs font-medium uppercase tracking-wide mb-1">Time Entry</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{entry.hours_worked}h</p>
              <p className="text-gray-600 dark:text-slate-300 text-sm mt-1 capitalize">{entry.work_category}</p>
            </div>
            <span className={`inline-flex items-center rounded-full border px-3 py-1 text-sm font-medium capitalize ${STATUS_COLORS[entry.status] || STATUS_COLORS.draft}`}>
              {entry.status}
            </span>
          </div>
        </div>

        {isLocked && (
          <div className="rounded-xl border border-amber-300 bg-amber-50 dark:border-amber-700 dark:bg-amber-900/20 px-5 py-3">
            <p className="text-sm text-amber-700 dark:text-amber-300">Awaiting review — this entry can't be edited until a reviewer approves or rejects it.</p>
          </div>
        )}

        {/* Details */}
        <div className="rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-5 py-1">
          <DetailRow icon={Calendar} label="Date" value={formatDate(entry.entry_date)} />
          <DetailRow icon={Tag} label="Category" value={<span className="capitalize">{entry.work_category}</span>} />
          <DetailRow icon={MessageSquare} label="Description" value={entry.description} />
        </div>

        {/* Review History (v1169) — every past decision, newest first; never overwritten. */}
        <div className="rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-5 py-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-500 mb-3">Review History</p>
          {historyLoading ? (
            <p className="text-sm text-gray-500 dark:text-slate-500">Loading…</p>
          ) : reviewHistory.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-slate-500">No decisions recorded yet.</p>
          ) : (
            <ul className="space-y-3">
              {reviewHistory.map((h) => (
                <li key={h.id} className={`rounded-lg border px-4 py-3 ${h.decision === 'approved'
                  ? 'border-emerald-300 bg-emerald-50 dark:border-emerald-700 dark:bg-emerald-900/20'
                  : 'border-red-300 bg-red-50 dark:border-red-700 dark:bg-red-900/20'}`}>
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className={`inline-flex items-center gap-1.5 text-sm font-semibold capitalize ${h.decision === 'approved' ? 'text-emerald-700 dark:text-emerald-300' : 'text-red-700 dark:text-red-300'}`}>
                      {h.decision === 'approved' ? <CheckCircle className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                      {h.decision}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-slate-400">{formatHistoryDate(h.decided_at)}</span>
                  </div>
                  <p className="text-xs text-gray-600 dark:text-slate-300 mb-1">Reviewed by {h.reviewerName}</p>
                  {h.reasonNames.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                      {h.reasonNames.map((name) => (
                        <span key={name} className="inline-flex items-center rounded-full border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-2 py-0.5 text-xs text-gray-600 dark:text-slate-300">
                          {name}
                        </span>
                      ))}
                    </div>
                  )}
                  {h.notes && <p className="text-sm text-gray-700 dark:text-slate-200 mt-2">{h.notes}</p>}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Edit History (v1177) — snapshot of prior values whenever this entry is amended;
            a BEFORE UPDATE trigger writes these, so it covers every edit path, not just the grid. */}
        <div className="rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-5 py-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-500 mb-3">Edit History</p>
          {editHistoryLoading ? (
            <p className="text-sm text-gray-500 dark:text-slate-500">Loading…</p>
          ) : editHistory.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-slate-500">No amendments recorded yet.</p>
          ) : (
            <ul className="space-y-3">
              {editHistory.map((h) => (
                <li key={h.id} className="rounded-lg border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900/40 px-4 py-3">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-sm font-semibold text-gray-700 dark:text-slate-200">Amended by {h.editorName}</span>
                    <span className="text-xs text-gray-500 dark:text-slate-400">{formatHistoryDate(h.edited_at)}</span>
                  </div>
                  <p className="text-xs text-gray-600 dark:text-slate-300">Previous values: {formatPreviousValuesSummary(h.previous_values) || '—'}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
        </>
        )}
      </div>
    </div>
  )
}
