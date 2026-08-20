import { useEffect, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Gavel, Calendar, User, Tag, AlertCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import { getDecision, deleteDecision } from '../../services/decisionLogService'
import { RowActionButton } from '@nidus/ui'
import { platformDb } from '@nidus/supabase'
import DetailAuditTabList from '@nidus/ui/DetailAuditTabList'
import AuditDetailsPanel from '@nidus/ui/AuditDetailsPanel'
import AuditCard from '@nidus/ui/AuditCard'
import AuditField from '@nidus/ui/AuditField'
import AuditTimestampPair from '@nidus/ui/AuditTimestampPair'
import { humanizeAuditToken, resolveAuditUserLabels } from '@nidus/shared/utils/auditDisplayUtils'

const STATUS_COLORS = {
  proposed:   'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900/40 dark:text-amber-300 dark:border-amber-700',
  approved:   'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-900/40 dark:text-emerald-300 dark:border-emerald-700',
  rejected:   'bg-red-100 text-red-800 border-red-300 dark:bg-red-900/40 dark:text-red-300 dark:border-red-700',
  deferred:   'bg-gray-100 text-gray-700 border-gray-300 dark:bg-slate-700 dark:text-slate-300 dark:border-slate-600',
  superseded: 'bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-900/40 dark:text-purple-300 dark:border-purple-700',
}

const PRIORITY_COLORS = {
  low: 'text-gray-600 dark:text-gray-300',
  medium: 'text-amber-700 dark:text-amber-300',
  high: 'text-orange-700 dark:text-orange-300',
  critical: 'text-red-700 dark:text-red-300',
}

function DetailRow({ icon: Icon, label, value }) {
  if (!value) return null
  return (
    <div className="flex gap-3 py-3 border-b border-gray-200 dark:border-slate-800 last:border-0">
      <div className="mt-0.5 shrink-0 text-gray-400 dark:text-slate-500">{Icon && <Icon className="h-4 w-4" />}</div>
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-300">{label}</p>
        <p className="mt-0.5 text-sm text-gray-900 dark:text-gray-100 whitespace-pre-wrap">{value}</p>
      </div>
    </div>
  )
}

function Section({ title, content }) {
  if (!content) return null
  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden">
      <div className="px-5 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/40">
        <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">{title}</h3>
      </div>
      <div className="px-5 py-4 text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">{content}</div>
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
  const [activeTab, setActiveTab] = useState('details')
  const [auditUserLabels, setAuditUserLabels] = useState({})

  useEffect(() => {
    if (activeTab !== 'audit' || !decision) return
    ;(async () => {
      const labels = await resolveAuditUserLabels(platformDb, [decision.created_by, decision.updated_by])
      setAuditUserLabels(labels)
    })()
  }, [activeTab, decision])

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
      <div className="w-full px-3 sm:px-4 lg:px-5 xl:px-6 py-6 flex items-center justify-center min-h-[40vh]">
        <div className="h-8 w-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!decision) {
    return (
      <div className="w-full px-3 sm:px-4 lg:px-5 xl:px-6 py-6 flex flex-col items-center justify-center gap-4 min-h-[40vh]">
        <AlertCircle className="h-10 w-10 text-gray-400 dark:text-gray-500" />
        <p className="text-gray-500 dark:text-gray-400">Decision not found.</p>
        <button type="button" onClick={() => navigate(-1)}
          className="rounded-lg bg-blue-600 hover:bg-blue-700 px-4 py-2 text-sm text-white">Go back</button>
      </div>
    )
  }

  return (
    <div className="w-full px-3 sm:px-4 lg:px-5 xl:px-6 py-6">
      <div className="max-w-3xl mx-auto space-y-5">

        <div className="flex items-center gap-3">
          <button type="button" onClick={() => navigate(-1)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 min-h-[40px]">
            <ArrowLeft className="h-4 w-4" /> Back
          </button>
          <h1 className="flex-1 text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Gavel className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            Decision Detail
          </h1>
          <RowActionButton
            variant="edit"
            label="Edit decision"
            onClick={() => navigate(`/platform/governance/decisions/${id}/edit${projectId ? `?projectId=${projectId}` : ''}`)}
          />
          <RowActionButton
            variant="delete"
            label="Delete decision"
            onClick={handleDelete}
            disabled={deleting}
          />
        </div>

        <DetailAuditTabList activeTab={activeTab} onChange={setActiveTab} />

        {activeTab === 'audit' ? (
          <AuditDetailsPanel description="Who recorded or changed this decision, and how it is classified.">
            <AuditCard title="Identity" description="How this decision is labelled and tracked.">
              <AuditField label="Title" value={decision.decision_title} />
              <AuditField label="Status" value={humanizeAuditToken(decision.status)} />
            </AuditCard>
            <AuditCard title="Classification" description="How this decision is categorised.">
              <AuditField label="Category" value={humanizeAuditToken(decision.category)} />
              <AuditField label="Priority" value={humanizeAuditToken(decision.priority)} />
              <AuditField label="Decided by" value={decision.decided_by_name} />
            </AuditCard>
            <AuditCard title="Record history" description="When this decision was created and last changed.">
              <AuditField label="Created by" value={decision.created_by ? auditUserLabels[decision.created_by] || null : null} />
              <AuditTimestampPair dateLabel="Created at" value={decision.created_at} />
              <AuditField label="Updated by" value={decision.updated_by ? auditUserLabels[decision.updated_by] || null : null} />
              <AuditTimestampPair dateLabel="Last updated" value={decision.updated_at} />
            </AuditCard>
          </AuditDetailsPanel>
        ) : (
        <>
        <div className="rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-6 py-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-mono text-xs text-gray-600 dark:text-gray-300 mb-1">{decision.decision_reference}</p>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white leading-snug">{decision.decision_title}</h2>
            </div>
            <span className={`shrink-0 inline-flex items-center rounded-full border px-3 py-1 text-sm font-medium capitalize ${STATUS_COLORS[decision.status] || STATUS_COLORS.proposed}`}>
              {decision.status}
            </span>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-5 py-1">
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
        </>
        )}
      </div>
    </div>
  )
}
