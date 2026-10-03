/**
 * Milestone Register — detail/view page (Simulator, v966 Phase 11). Mirrors
 * apps/platform/src/pages/milestones/MilestoneDetailPage.jsx against sim.milestones.
 */
import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Pencil } from 'lucide-react'
import DetailAuditTabList from '@nidus/ui/DetailAuditTabList'
import AuditDetailsPanel from '@nidus/ui/AuditDetailsPanel'
import AuditCard from '@nidus/ui/AuditCard'
import AuditField from '@nidus/ui/AuditField'
import AuditTimestampPair from '@nidus/ui/AuditTimestampPair'
import { getMilestone } from '../../services/milestoneService'

const STATUS_LABELS = {
  planned: 'Planned',
  at_risk: 'At Risk',
  achieved: 'Achieved',
  missed: 'Missed',
  slipped: 'Slipped',
}

const STATUS_BADGE = {
  planned: 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300',
  at_risk: 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300',
  achieved: 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300',
  missed: 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300',
  slipped: 'bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300',
}

export default function MilestoneDetailPage() {
  const { projectId, id } = useParams()
  const navigate = useNavigate()

  const [loading, setLoading] = useState(true)
  const [milestone, setMilestone] = useState(null)
  const [activeTab, setActiveTab] = useState('details')

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      const result = await getMilestone(id)
      if (!cancelled) {
        setMilestone(result.data)
        setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [id])

  if (loading) {
    return <div className="p-8 text-gray-500 dark:text-gray-400">Loading…</div>
  }
  if (!milestone) {
    return <div className="p-8 text-gray-500 dark:text-gray-400">Milestone not found.</div>
  }

  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto space-y-6">
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Milestone Register
      </button>

      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">{milestone.milestone_name}</h1>
          <span className={`inline-flex mt-1 px-2 py-1 rounded-full text-xs font-medium ${STATUS_BADGE[milestone.status] || STATUS_BADGE.planned}`}>
            {STATUS_LABELS[milestone.status] || milestone.status}
          </span>
        </div>
        <button
          type="button"
          onClick={() => navigate(`/simulator/practice-projects/${projectId}/milestones/${id}/edit`)}
          className="inline-flex items-center gap-2 px-3 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-900 dark:text-gray-100 rounded-lg text-sm font-medium"
        >
          <Pencil className="h-4 w-4" />
          Edit
        </button>
      </div>

      <DetailAuditTabList activeTab={activeTab} onChange={setActiveTab} ariaLabel="Milestone sections" />

      {activeTab === 'details' ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-5 space-y-4">
          {milestone.description && (
            <div>
              <p className="text-xs uppercase text-gray-400 mb-1">Description</p>
              <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{milestone.description}</p>
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <p className="text-xs uppercase text-gray-400 mb-1">Target Date</p>
              <p className="text-sm text-gray-700 dark:text-gray-300">{milestone.target_date || '—'}</p>
            </div>
            <div>
              <p className="text-xs uppercase text-gray-400 mb-1">Forecast Date</p>
              <p className="text-sm text-gray-700 dark:text-gray-300">{milestone.forecast_date || '—'}</p>
            </div>
            <div>
              <p className="text-xs uppercase text-gray-400 mb-1">Actual Date</p>
              <p className="text-sm text-gray-700 dark:text-gray-300">{milestone.actual_date || '—'}</p>
            </div>
          </div>
          <div>
            <p className="text-xs uppercase text-gray-400 mb-1">Owner</p>
            <p className="text-sm text-gray-700 dark:text-gray-300">{milestone.owner?.full_name || '—'}</p>
          </div>
          {milestone.notes && (
            <div>
              <p className="text-xs uppercase text-gray-400 mb-1">Notes</p>
              <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{milestone.notes}</p>
            </div>
          )}
        </div>
      ) : (
        <AuditDetailsPanel description="Who created or changed this record.">
          <AuditCard title="Identity">
            <AuditField label="Status" value={STATUS_LABELS[milestone.status] || milestone.status} />
          </AuditCard>
          <AuditCard title="Classification">
            <AuditField label="Owner" value={milestone.owner?.full_name || '—'} />
            <AuditField label="Target Date" value={milestone.target_date || '—'} />
          </AuditCard>
          <AuditCard title="Record history">
            <AuditTimestampPair dateLabel="Created at" value={milestone.created_at} />
            <AuditTimestampPair dateLabel="Updated at" value={milestone.updated_at} />
          </AuditCard>
        </AuditDetailsPanel>
      )}
    </div>
  )
}
