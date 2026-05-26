import { useEffect, useState, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Search, Download, Users, CheckCircle, XCircle, Clock } from 'lucide-react'
import { platformDb } from '../../../services/supabase/supabaseClient'
import { getTeamTimesheets, approveTimesheetEntry, rejectTimesheetEntry } from '../../../services/timesheetService'
import { exportListToCSV } from '../../../utils/exportUtils'
import PlanningProjectBar, { usePlanningProjectId } from '../../../components/planning/PlanningProjectBar'
import { TableRowNumberHeader, TableRowNumberCell } from '../../../components/ui/Table'
import { getDisplayRowNumber } from '../../../utils/tableRowNumberUtils'

const STATUS_COLORS = {
  draft:     'bg-slate-700 text-slate-300 border-slate-600',
  submitted: 'bg-amber-900/40 text-amber-300 border-amber-700',
  approved:  'bg-emerald-900/40 text-emerald-300 border-emerald-700',
  rejected:  'bg-red-900/40 text-red-300 border-red-700',
}

const EXPORT_COLS = [
  { key: 'entry_date', label: 'Date' },
  { key: 'user_id', label: 'User ID' },
  { key: 'hours_worked', label: 'Hours' },
  { key: 'work_category', label: 'Category' },
  { key: 'status', label: 'Status' },
  { key: 'description', label: 'Description' },
]

function StatusBadge({ status }) {
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium capitalize ${STATUS_COLORS[status] || STATUS_COLORS.draft}`}>
      {status}
    </span>
  )
}

function formatDate(v) {
  if (!v) return '—'
  return new Date(v).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
}

export default function TeamTimesheetsPage() {
  const projectId = usePlanningProjectId()
  const [reviewerId, setReviewerId] = useState(null)
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('submitted')
  const [reviewNote, setReviewNote] = useState('')
  const [reviewingId, setReviewingId] = useState(null)
  const [processing, setProcessing] = useState(null)

  useEffect(() => {
    platformDb.auth.getUser().then(({ data }) => setReviewerId(data?.user?.id || null))
  }, [])

  const load = async () => {
    if (!projectId) return
    setLoading(true)
    try {
      const data = await getTeamTimesheets(projectId, { status: statusFilter || undefined })
      setRows(data)
    } catch (e) {
      toast.error(e?.message || 'Failed to load team timesheets')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [projectId, statusFilter])

  const filtered = useMemo(() => {
    const t = search.trim().toLowerCase()
    return t
      ? rows.filter(r =>
          (r.description || '').toLowerCase().includes(t) ||
          (r.work_category || '').toLowerCase().includes(t) ||
          (r.user_id || '').toLowerCase().includes(t)
        )
      : rows
  }, [rows, search])

  const totalHours = useMemo(() => filtered.reduce((s, r) => s + (parseFloat(r.hours_worked) || 0), 0), [filtered])
  const pendingCount = useMemo(() => filtered.filter(r => r.status === 'submitted').length, [filtered])

  const handleApprove = async (id) => {
    setProcessing(id)
    try {
      await approveTimesheetEntry(id, reviewerId, reviewNote)
      setRows(r => r.map(x => x.id === id ? { ...x, status: 'approved', review_notes: reviewNote } : x))
      setReviewingId(null)
      setReviewNote('')
      toast.success('Entry approved')
    } catch (e) {
      toast.error(e?.message || 'Approve failed')
    } finally {
      setProcessing(null)
    }
  }

  const handleReject = async (id) => {
    if (!reviewNote.trim()) { toast.error('Rejection notes are required'); return }
    setProcessing(id)
    try {
      await rejectTimesheetEntry(id, reviewerId, reviewNote)
      setRows(r => r.map(x => x.id === id ? { ...x, status: 'rejected', review_notes: reviewNote } : x))
      setReviewingId(null)
      setReviewNote('')
      toast.success('Entry rejected')
    } catch (e) {
      toast.error(e?.message || 'Reject failed')
    } finally {
      setProcessing(null)
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 px-4 py-6">
      <div className="max-w-6xl mx-auto">
        <PlanningProjectBar />

        <div className="flex flex-wrap items-center justify-between gap-3 mb-4 mt-4">
          <div>
            <h1 className="text-xl font-semibold text-white flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-400" />
              Team Timesheets
            </h1>
            {filtered.length > 0 && (
              <p className="text-xs text-slate-400 mt-0.5">
                {filtered.length} entries · {totalHours.toFixed(1)}h total
                {pendingCount > 0 && ` · ${pendingCount} awaiting approval`}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => exportListToCSV(EXPORT_COLS, filtered, `team-timesheets-${projectId}`)}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-600 px-3 py-1.5 text-sm text-slate-200 hover:bg-slate-800">
              <Download className="h-4 w-4" /> Export CSV
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-4">
          <div className="relative flex-1 min-w-[200px] max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search…"
              className="w-full rounded-lg border border-slate-700 bg-slate-800 pl-9 pr-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:border-blue-500 focus:outline-none" />
          </div>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
            className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 focus:border-blue-500 focus:outline-none">
            <option value="">All statuses</option>
            <option value="submitted">Submitted</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="draft">Draft</option>
          </select>
        </div>

        {loading && (
          <div className="flex justify-center py-12">
            <div className="h-8 w-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {!loading && filtered.length === 0 && (
          <div className="text-center py-16 text-slate-500">
            <Clock className="h-10 w-10 mx-auto mb-3 opacity-40" />
            <p>No timesheet entries found.</p>
          </div>
        )}

        {!loading && filtered.length > 0 && (
          <div className="overflow-x-auto rounded-xl border border-slate-700">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-800 text-slate-400 uppercase text-xs">
                <tr>
                <TableRowNumberHeader className="!normal-case" />
                  <th className="px-4 py-3 text-left">Date</th>
                  <th className="px-4 py-3 text-left">Member</th>
                  <th className="px-4 py-3 text-left">Hours</th>
                  <th className="px-4 py-3 text-left">Category</th>
                  <th className="px-4 py-3 text-left">Description</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {filtered.map(e => (
                  <>
                    <tr key={e.id} className="hover:bg-slate-800/50">
                    <TableRowNumberCell number={getDisplayRowNumber(index)} />
                      <td className="px-4 py-3 text-slate-300">{formatDate(e.entry_date)}</td>
                      <td className="px-4 py-3 text-slate-400 font-mono text-xs">{e.user_id?.slice(0, 8)}…</td>
                      <td className="px-4 py-3 font-semibold text-blue-400">{e.hours_worked}h</td>
                      <td className="px-4 py-3 text-slate-400 capitalize">{e.work_category}</td>
                      <td className="px-4 py-3 text-slate-400 max-w-xs truncate">{e.description || '—'}</td>
                      <td className="px-4 py-3"><StatusBadge status={e.status} /></td>
                      <td className="px-4 py-3 text-right">
                        {e.status === 'submitted' && reviewingId !== e.id && (
                          <button type="button" onClick={() => { setReviewingId(e.id); setReviewNote('') }}
                            className="text-blue-400 hover:text-blue-300 text-xs">Review</button>
                        )}
                      </td>
                    </tr>
                    {reviewingId === e.id && (
                      <tr key={`${e.id}-review`} className="bg-slate-800/70">
                    <TableRowNumberCell number={getDisplayRowNumber(index)} />
                        <td colSpan={7} className="px-4 py-3">
                          <div className="flex flex-wrap items-center gap-3">
                            <input type="text" value={reviewNote} onChange={ev => setReviewNote(ev.target.value)}
                              placeholder="Notes (required for rejection)…"
                              className="flex-1 min-w-[200px] rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-blue-500 focus:outline-none" />
                            <button type="button" onClick={() => handleApprove(e.id)} disabled={!!processing}
                              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-600 disabled:opacity-50 px-3 py-2 text-sm text-white">
                              <CheckCircle className="h-4 w-4" /> Approve
                            </button>
                            <button type="button" onClick={() => handleReject(e.id)} disabled={!!processing}
                              className="inline-flex items-center gap-1.5 rounded-lg bg-red-800 hover:bg-red-700 disabled:opacity-50 px-3 py-2 text-sm text-white">
                              <XCircle className="h-4 w-4" /> Reject
                            </button>
                            <button type="button" onClick={() => setReviewingId(null)}
                              className="text-slate-400 hover:text-slate-200 text-sm">Cancel</button>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
