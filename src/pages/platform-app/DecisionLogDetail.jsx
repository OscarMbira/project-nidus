import { useEffect, useState } from 'react'
import { useNavigate, useParams, useSearchParams, Link } from 'react-router-dom'
import { ArrowLeft, Gavel, FileEdit, Trash2, Calendar, User, Tag, AlertCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import { getDecision, deleteDecision } from '../../services/decisionLogService'

const STATUS_COLORS = {
  proposed:   'bg-amber-900/40 text-amber-300 border-amber-700',
  approved:   'bg-emerald-900/40 text-emerald-300 border-emerald-700',
  rejected:   'bg-red-900/40 text-red-300 border-red-700',
  deferred:   'bg-slate-700 text-slate-300 border-slate-600',
  superseded: 'bg-purple-900/40 text-purple-300 border-purple-700',
}

const PRIORITY_COLORS = {
  low: 'text-slate-400', medium: 'text-amber-400', high: 'text-orange-400', critical: 'text-red-400',
}

function DetailRow({ icon: Icon, label, value }) {
  if (!value) return null
  return (
    <div className="flex gap-3 py-3 border-b border-slate-800 last:border-0">
      <div className="mt-0.5 shrink-0 text-slate-500">{Icon && <Icon className="h-4 w-4" />}</div>
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
        <p className="mt-0.5 text-sm text-slate-200 whitespace-pre-wrap">{value}</p>
      </div>
    </div>
  )
}

function Section({ title, content }) {
  if (!content) return null
  return (
    <div className="rounded-xl border border-slate-700 bg-slate-800 overflow-hidden">
      <div className="px-5 py-3 border-b border-slate-700 bg-slate-700/40">
        <h3 className="text-sm font-semibold text-slate-200">{title}</h3>
      </div>
      <div className="px-5 py-4 text-sm text-slate-300 whitespace-pre-wrap leading-relaxed">{content}</div>
    </div>
  )
}

export default function DecisionLogDetail() {
  const { id } = useParams()
  const [searchParams] = useSearchParams()
  const projectId = searchParams.get('projectId')
  const navigate = useNavigate()
  const [decision, setDecision] = useState(null)
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    if (!id) return
    ;(async () => {
      setLoading(true)
      try {
        const data = await getDecision(id)
        setDecision(data)
      } catch (e) {
        toast.error(e?.message || 'Failed to load decision')
      } finally {
        setLoading(false)
      }
    })()
  }, [id])

  const handleDelete = async () => {
    if (!window.confirm('Permanently delete this decision?')) return
    setDeleting(true)
    try {
      await deleteDecision(id)
      toast.success('Decision deleted')
      navigate(`/platform/governance/decisions${projectId ? `?projectId=${projectId}` : ''}`)
    } catch (e) {
      toast.error(e?.message || 'Delete failed')
    } finally {
      setDeleting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="h-8 w-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!decision) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center gap-4 p-8">
        <AlertCircle className="h-10 w-10 text-slate-500" />
        <p className="text-slate-400">Decision not found.</p>
        <button type="button" onClick={() => navigate(-1)}
          className="rounded-lg bg-blue-600 hover:bg-blue-700 px-4 py-2 text-sm text-white">Go back</button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 px-4 py-6">
      <div className="max-w-3xl mx-auto space-y-5">

        {/* Header */}
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => navigate(-1)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-300 hover:bg-slate-700 min-h-[40px]">
            <ArrowLeft className="h-4 w-4" /> Back
          </button>
          <h1 className="flex-1 text-xl font-bold text-white flex items-center gap-2">
            <Gavel className="h-5 w-5 text-blue-400" />
            Decision Detail
          </h1>
          <Link to={`/platform/governance/decisions/${id}/edit${projectId ? `?projectId=${projectId}` : ''}`}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-300 hover:bg-slate-700 min-h-[40px]">
            <FileEdit className="h-4 w-4" /> Edit
          </Link>
          <button type="button" onClick={handleDelete} disabled={deleting}
            className="inline-flex items-center gap-1.5 rounded-lg border border-red-700 bg-red-900/30 px-3 py-2 text-sm text-red-300 hover:bg-red-900/50 disabled:opacity-50 min-h-[40px]">
            <Trash2 className="h-4 w-4" /> Delete
          </button>
        </div>

        {/* Hero */}
        <div className="rounded-xl bg-gradient-to-r from-slate-700 to-slate-800 border border-slate-600 px-6 py-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-mono text-xs text-slate-400 mb-1">{decision.decision_reference}</p>
              <h2 className="text-xl font-bold text-white leading-snug">{decision.decision_title}</h2>
            </div>
            <span className={`shrink-0 inline-flex items-center rounded-full border px-3 py-1 text-sm font-medium capitalize ${STATUS_COLORS[decision.status] || STATUS_COLORS.proposed}`}>
              {decision.status}
            </span>
          </div>
        </div>

        {/* Core details card */}
        <div className="rounded-xl border border-slate-700 bg-slate-800 px-5 py-1">
          <DetailRow icon={Tag}      label="Category"       value={decision.category} />
          <DetailRow icon={AlertCircle} label="Priority"    value={<span className={PRIORITY_COLORS[decision.priority]}>{decision.priority}</span>} />
          <DetailRow icon={Calendar} label="Decision Date"  value={decision.decision_date} />
          <DetailRow icon={User}     label="Decided By"     value={decision.decided_by_name} />
          <DetailRow icon={Calendar} label="Review Date"    value={decision.review_date} />
        </div>

        {decision.description && <Section title="Description" content={decision.description} />}
        {decision.rationale && <Section title="Rationale" content={decision.rationale} />}
        {decision.impact && <Section title="Impact" content={decision.impact} />}
        {decision.alternatives_considered && <Section title="Alternatives Considered" content={decision.alternatives_considered} />}
      </div>
    </div>
  )
}
