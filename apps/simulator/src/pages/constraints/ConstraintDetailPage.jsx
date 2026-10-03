/**
 * Constraints Register — detail/view page (Simulator, v1100). Mirrors
 * apps/platform/src/pages/constraints/ConstraintDetailPage.jsx against sim.practice_constraints.
 */
import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Pencil } from 'lucide-react'
import DetailAuditTabList from '@nidus/ui/DetailAuditTabList'
import AuditDetailsPanel from '@nidus/ui/AuditDetailsPanel'
import AuditCard from '@nidus/ui/AuditCard'
import AuditField from '@nidus/ui/AuditField'
import AuditTimestampPair from '@nidus/ui/AuditTimestampPair'
import { getConstraint } from '../../services/constraintService'

const STATUS_LABELS = { open: 'Open', managed: 'Managed', resolved: 'Resolved' }
const CATEGORY_LABELS = {
  budget: 'Budget', schedule: 'Schedule', resource: 'Resource',
  regulatory: 'Regulatory', technical: 'Technical', other: 'Other',
}
const IMPACT_LABELS = { low: 'Low', medium: 'Medium', high: 'High', critical: 'Critical' }

export default function ConstraintDetailPage() {
  const { projectId, constraintId } = useParams()
  const navigate = useNavigate()

  const [loading, setLoading] = useState(true)
  const [constraint, setConstraint] = useState(null)
  const [activeTab, setActiveTab] = useState('details')

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      const result = await getConstraint(constraintId)
      if (!cancelled) {
        setConstraint(result.data)
        setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [constraintId])

  if (loading) {
    return <div className="p-8 text-gray-500 dark:text-gray-400">Loading…</div>
  }
  if (!constraint) {
    return <div className="p-8 text-gray-500 dark:text-gray-400">Constraint not found.</div>
  }

  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto space-y-6">
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Constraints Register
      </button>

      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Constraint</h1>
          <span className="inline-flex mt-1 px-2 py-1 rounded-full text-xs font-medium bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300">
            {STATUS_LABELS[constraint.status] || constraint.status}
          </span>
        </div>
        <button
          type="button"
          onClick={() => navigate(`/simulator/practice-projects/${projectId}/constraints/${constraintId}/edit`)}
          className="inline-flex items-center gap-2 px-3 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-900 dark:text-gray-100 rounded-lg text-sm font-medium"
        >
          <Pencil className="h-4 w-4" />
          Edit
        </button>
      </div>

      <DetailAuditTabList activeTab={activeTab} onChange={setActiveTab} ariaLabel="Constraint sections" />

      {activeTab === 'details' ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-5 space-y-4">
          <div>
            <p className="text-xs uppercase text-gray-400 mb-1">Constraint</p>
            <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{constraint.constraint_text}</p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs uppercase text-gray-400 mb-1">Category</p>
              <p className="text-sm text-gray-700 dark:text-gray-300">{CATEGORY_LABELS[constraint.category] || '—'}</p>
            </div>
            <div>
              <p className="text-xs uppercase text-gray-400 mb-1">Impact</p>
              <p className="text-sm text-gray-700 dark:text-gray-300">{IMPACT_LABELS[constraint.impact_severity] || '—'}</p>
            </div>
            <div>
              <p className="text-xs uppercase text-gray-400 mb-1">Owner</p>
              <p className="text-sm text-gray-700 dark:text-gray-300">{constraint.owner?.full_name || '—'}</p>
            </div>
            <div>
              <p className="text-xs uppercase text-gray-400 mb-1">Due date</p>
              <p className="text-sm text-gray-700 dark:text-gray-300">{constraint.due_date ? new Date(constraint.due_date).toLocaleDateString() : '—'}</p>
            </div>
          </div>
          {constraint.notes && (
            <div>
              <p className="text-xs uppercase text-gray-400 mb-1">Notes</p>
              <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{constraint.notes}</p>
            </div>
          )}
        </div>
      ) : (
        <AuditDetailsPanel description="Who created or changed this record.">
          <AuditCard title="Identity">
            <AuditField label="Status" value={STATUS_LABELS[constraint.status] || constraint.status} />
          </AuditCard>
          <AuditCard title="Classification">
            <AuditField label="Category" value={CATEGORY_LABELS[constraint.category] || '—'} />
            <AuditField label="Owner" value={constraint.owner?.full_name || '—'} />
          </AuditCard>
          <AuditCard title="Record history">
            <AuditTimestampPair dateLabel="Created at" value={constraint.created_at} />
            <AuditTimestampPair dateLabel="Updated at" value={constraint.updated_at} />
          </AuditCard>
        </AuditDetailsPanel>
      )}
    </div>
  )
}
