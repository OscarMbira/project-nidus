/**
 * Assumptions Register — detail/view page (Simulator, v963 Phase 3). Mirrors
 * apps/platform/src/pages/assumptions/AssumptionDetailPage.jsx against sim.assumptions.
 */
import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Pencil, AlertTriangle, AlertCircle } from 'lucide-react'
import DetailAuditTabList from '@nidus/ui/DetailAuditTabList'
import AuditDetailsPanel from '@nidus/ui/AuditDetailsPanel'
import AuditCard from '@nidus/ui/AuditCard'
import AuditField from '@nidus/ui/AuditField'
import AuditTimestampPair from '@nidus/ui/AuditTimestampPair'
import { useToast } from '@nidus/shared/hooks/useToast'
import { getAssumption, convertAssumptionToRisk, convertAssumptionToIssue } from '../../services/assumptionService'

const STATUS_LABELS = { active: 'Active', validated: 'Validated', invalidated: 'Invalidated', closed: 'Closed' }
const IMPACT_LABELS = { low: 'Low', medium: 'Medium', high: 'High', critical: 'Critical' }

export default function AssumptionDetailPage() {
  const { projectId, assumptionId } = useParams()
  const navigate = useNavigate()
  const toast = useToast()

  const [loading, setLoading] = useState(true)
  const [assumption, setAssumption] = useState(null)
  const [activeTab, setActiveTab] = useState('details')
  const [converting, setConverting] = useState(false)

  const load = async () => {
    setLoading(true)
    const result = await getAssumption(assumptionId)
    setAssumption(result.data)
    setLoading(false)
  }

  useEffect(() => { load() }, [assumptionId])

  const handleConvert = async (kind) => {
    if (!assumption) return
    if (!window.confirm(`Convert this assumption to a ${kind === 'risk' ? 'Risk' : 'Issue'}? This will mark the assumption Invalidated.`)) return
    setConverting(true)
    const fn = kind === 'risk' ? convertAssumptionToRisk : convertAssumptionToIssue
    const result = await fn(assumption.id, assumption.project_id, assumption.assumption_text)
    setConverting(false)
    if (!result.success) {
      toast.error(result.error || `Failed to convert to ${kind}`)
      return
    }
    toast.success(`Converted to ${kind === 'risk' ? 'Risk' : 'Issue'}.`)
    load()
  }

  if (loading) {
    return <div className="p-8 text-gray-500 dark:text-gray-400">Loading…</div>
  }
  if (!assumption) {
    return <div className="p-8 text-gray-500 dark:text-gray-400">Assumption not found.</div>
  }

  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto space-y-6">
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Assumptions Register
      </button>

      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Assumption</h1>
          <span className="inline-flex mt-1 px-2 py-1 rounded-full text-xs font-medium bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300">
            {STATUS_LABELS[assumption.validation_status] || assumption.validation_status}
          </span>
        </div>
        <button
          type="button"
          onClick={() => navigate(`/simulator/practice-projects/${projectId}/assumptions/${assumptionId}/edit`)}
          className="inline-flex items-center gap-2 px-3 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-900 dark:text-gray-100 rounded-lg text-sm font-medium"
        >
          <Pencil className="h-4 w-4" />
          Edit
        </button>
      </div>

      <DetailAuditTabList activeTab={activeTab} onChange={setActiveTab} ariaLabel="Assumption sections" />

      {activeTab === 'details' ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-5 space-y-4">
          <div>
            <p className="text-xs uppercase text-gray-400 mb-1">Assumption</p>
            <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{assumption.assumption_text}</p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs uppercase text-gray-400 mb-1">Owner</p>
              <p className="text-sm text-gray-700 dark:text-gray-300">{assumption.owner?.full_name || '—'}</p>
            </div>
            <div>
              <p className="text-xs uppercase text-gray-400 mb-1">Impact</p>
              <p className="text-sm text-gray-700 dark:text-gray-300">{IMPACT_LABELS[assumption.impact_severity] || '—'}</p>
            </div>
            <div>
              <p className="text-xs uppercase text-gray-400 mb-1">Next review date</p>
              <p className="text-sm text-gray-700 dark:text-gray-300">{assumption.next_review_date ? new Date(assumption.next_review_date).toLocaleDateString() : '—'}</p>
            </div>
          </div>
          {assumption.notes && (
            <div>
              <p className="text-xs uppercase text-gray-400 mb-1">Notes</p>
              <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{assumption.notes}</p>
            </div>
          )}

          {(assumption.converted_to_risk_id || assumption.converted_to_issue_id) ? (
            <div className="pt-2 text-sm text-gray-600 dark:text-gray-300">
              {assumption.converted_to_risk_id && <p>Converted to Risk.</p>}
              {assumption.converted_to_issue_id && <p>Converted to Issue.</p>}
            </div>
          ) : (
            <div className="pt-2 flex flex-wrap items-center gap-2">
              <button
                type="button"
                disabled={converting}
                onClick={() => handleConvert('risk')}
                className="inline-flex items-center gap-2 px-3 py-2 bg-amber-50 dark:bg-amber-900/20 hover:bg-amber-100 dark:hover:bg-amber-900/40 text-amber-800 dark:text-amber-300 rounded-lg text-sm font-medium disabled:opacity-50"
              >
                <AlertTriangle className="h-4 w-4" />
                Convert to Risk
              </button>
              <button
                type="button"
                disabled={converting}
                onClick={() => handleConvert('issue')}
                className="inline-flex items-center gap-2 px-3 py-2 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/40 text-red-800 dark:text-red-300 rounded-lg text-sm font-medium disabled:opacity-50"
              >
                <AlertCircle className="h-4 w-4" />
                Convert to Issue
              </button>
            </div>
          )}
        </div>
      ) : (
        <AuditDetailsPanel description="Who created or changed this record.">
          <AuditCard title="Identity">
            <AuditField label="Status" value={STATUS_LABELS[assumption.validation_status] || assumption.validation_status} />
          </AuditCard>
          <AuditCard title="Classification">
            <AuditField label="Owner" value={assumption.owner?.full_name || '—'} />
            <AuditField label="Impact" value={IMPACT_LABELS[assumption.impact_severity] || '—'} />
            <AuditField
              label="Converted to"
              value={assumption.converted_to_risk_id ? 'Risk' : assumption.converted_to_issue_id ? 'Issue' : 'Not converted'}
            />
          </AuditCard>
          <AuditCard title="Record history">
            <AuditTimestampPair dateLabel="Created at" value={assumption.created_at} />
            <AuditTimestampPair dateLabel="Updated at" value={assumption.updated_at} />
          </AuditCard>
        </AuditDetailsPanel>
      )}
    </div>
  )
}
