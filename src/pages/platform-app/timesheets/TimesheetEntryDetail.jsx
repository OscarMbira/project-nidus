import { useEffect, useState } from 'react'
import { useNavigate, useParams, useSearchParams, Link } from 'react-router-dom'
import { ArrowLeft, Clock, FileEdit, Trash2, AlertCircle, Calendar, Tag, MessageSquare } from 'lucide-react'
import toast from 'react-hot-toast'
import { getTimesheetEntry, deleteTimesheetEntry, submitTimesheetEntry } from '../../../services/timesheetService'

const STATUS_COLORS = {
  draft:     'bg-slate-700 text-slate-300 border-slate-600',
  submitted: 'bg-amber-900/40 text-amber-300 border-amber-700',
  approved:  'bg-emerald-900/40 text-emerald-300 border-emerald-700',
  rejected:  'bg-red-900/40 text-red-300 border-red-700',
}

function DetailRow({ icon: Icon, label, value }) {
  if (!value) return null
  return (
    <div className="flex gap-3 py-3 border-b border-slate-800 last:border-0">
      <div className="mt-0.5 shrink-0 text-slate-500">{Icon && <Icon className="h-4 w-4" />}</div>
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
        <p className="mt-0.5 text-sm text-slate-200">{value}</p>
      </div>
    </div>
  )
}

export default function TimesheetEntryDetail() {
  const { id } = useParams()
  const [searchParams] = useSearchParams()
  const projectId = searchParams.get('projectId')
  const navigate = useNavigate()
  const [entry, setEntry] = useState(null)
  const [loading, setLoading] = useState(true)

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
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="h-8 w-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!entry) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center gap-4 p-8">
        <AlertCircle className="h-10 w-10 text-slate-500" />
        <p className="text-slate-400">Entry not found.</p>
        <button type="button" onClick={() => navigate(-1)}
          className="rounded-lg bg-blue-600 hover:bg-blue-700 px-4 py-2 text-sm text-white">Go back</button>
      </div>
    )
  }

  const canEdit = entry.status === 'draft' || entry.status === 'rejected'
  const formatDate = (v) => v ? new Date(v).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : '—'

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 px-4 py-6">
      <div className="max-w-2xl mx-auto space-y-5">
        {/* Header */}
        <div className="flex items-center gap-3 flex-wrap">
          <button type="button" onClick={() => navigate(-1)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-300 hover:bg-slate-700 min-h-[40px]">
            <ArrowLeft className="h-4 w-4" /> Back
          </button>
          <h1 className="flex-1 text-xl font-bold text-white flex items-center gap-2">
            <Clock className="h-5 w-5 text-blue-400" />
            Time Entry
          </h1>
          {canEdit && (
            <Link to={`/platform/timesheets/${id}/edit${projectId ? `?projectId=${projectId}` : ''}`}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-300 hover:bg-slate-700 min-h-[40px]">
              <FileEdit className="h-4 w-4" /> Edit
            </Link>
          )}
          {entry.status === 'draft' && (
            <button type="button" onClick={handleSubmit}
              className="inline-flex items-center gap-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 px-3 py-2 text-sm font-medium text-white min-h-[40px]">
              Submit
            </button>
          )}
          {entry.status === 'draft' && (
            <button type="button" onClick={handleDelete}
              className="inline-flex items-center gap-1.5 rounded-lg border border-red-700 bg-red-900/30 px-3 py-2 text-sm text-red-300 hover:bg-red-900/50 min-h-[40px]">
              <Trash2 className="h-4 w-4" /> Delete
            </button>
          )}
        </div>

        {/* Hero */}
        <div className="rounded-xl bg-gradient-to-r from-slate-700 to-slate-800 border border-slate-600 px-6 py-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-blue-300 text-xs font-medium uppercase tracking-wide mb-1">Time Entry</p>
              <p className="text-2xl font-bold text-white">{entry.hours_worked}h</p>
              <p className="text-slate-300 text-sm mt-1 capitalize">{entry.work_category}</p>
            </div>
            <span className={`inline-flex items-center rounded-full border px-3 py-1 text-sm font-medium capitalize ${STATUS_COLORS[entry.status] || STATUS_COLORS.draft}`}>
              {entry.status}
            </span>
          </div>
        </div>

        {/* Details */}
        <div className="rounded-xl border border-slate-700 bg-slate-800 px-5 py-1">
          <DetailRow icon={Calendar} label="Date" value={formatDate(entry.entry_date)} />
          <DetailRow icon={Tag} label="Category" value={<span className="capitalize">{entry.work_category}</span>} />
          <DetailRow icon={MessageSquare} label="Description" value={entry.description} />
        </div>

        {/* Review notes (if rejected) */}
        {entry.status === 'rejected' && entry.review_notes && (
          <div className="rounded-xl border border-red-700 bg-red-900/20 px-5 py-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-red-400 mb-1">Rejection Notes</p>
            <p className="text-sm text-red-200">{entry.review_notes}</p>
          </div>
        )}

        {entry.status === 'approved' && (
          <div className="rounded-xl border border-emerald-700 bg-emerald-900/20 px-5 py-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-400 mb-1">Approved</p>
            {entry.review_notes && <p className="text-sm text-emerald-200">{entry.review_notes}</p>}
          </div>
        )}
      </div>
    </div>
  )
}
