/**
 * v1355 — one saved analysis: the figures, the charts, the audit tab, and Adopt.
 */
import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { DetailAuditTabList, AuditDetailsPanel, AuditCard, AuditField } from '@nidus/ui'
import ExportRecordButtons from '@nidus/ui/ExportRecordButtons'
import { useSuccessModal } from '@nidus/shared/hooks/useSuccessModal'
import { useRegionalFormatSettings } from '@nidus/shared/hooks/useRegionalFormatSettings'
import { formatRegionalCurrency, formatRegionalDate } from '@nidus/shared/utils/formatRegionalSettings'
import { usePlanning } from '../../context/PlanningContext.jsx'
import { useScheduleProjectId } from '../../hooks/useSchedule.js'
import { createQraData } from '../../services/qraData.js'
import { QraSummary } from './QraSummary.jsx'

export default function QraResultsScreen() {
  const { runId } = useParams()
  const navigate = useNavigate()
  const { isSim, mode } = usePlanning()
  const scheduleOnly = mode === 'planner'
  const { projectId } = useScheduleProjectId()
  const api = createQraData(isSim)
  const { showSuccess, modal } = useSuccessModal()
  const regional = useRegionalFormatSettings(isSim ? null : projectId)
  const [run, setRun] = useState(null)
  const [tab, setTab] = useState('details')
  const [error, setError] = useState(null)
  const [adopting, setAdopting] = useState(false)

  useEffect(() => {
    let cancelled = false
    api.getRun(runId).then((row) => { if (!cancelled) setRun(row) }).catch((err) => { if (!cancelled) setError(err.message) })
    return () => { cancelled = true }
  }, [runId]) // eslint-disable-line react-hooks/exhaustive-deps

  async function adopt() {
    setAdopting(true)
    setError(null)
    try {
      const result = await api.adopt(runId)
      showSuccess({
        recordId: result?.plan_reference || run?.display_id,
        operation: 'updated',
        subject: 'plan contingency',
        message: `The plan contingency is now ${result?.new_amount}. It was ${result?.previous_amount}.`,
      })
    } catch (err) {
      setError(err.message)
    } finally {
      setAdopting(false)
    }
  }

  if (error && !run) return <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
  if (!run) return <p className="text-gray-700 dark:text-gray-200">Loading the analysis…</p>
  const summary = run.summary || {}
  const formatMoney = (n) => formatRegionalCurrency(n, regional)
  const formatDate = (d) => formatRegionalDate(d, regional)
  const record = {
    p50: summary.schedule?.p50,
    p80: summary.schedule?.p80,
    p90: summary.schedule?.p90,
    chance: summary.schedule?.chance == null ? null : `${Math.round(summary.schedule.chance * 100)}%`,
    cost_p80: summary.cost?.p80,
    recommended: summary.contingency?.recommendedCost,
  }
  const sections = [
    { title: 'Schedule', fields: [
      { key: 'p50', label: '50% finish', fact: true },
      { key: 'p80', label: '80% finish', fact: true },
      { key: 'p90', label: '90% finish', fact: true },
      { key: 'chance', label: 'Chance of the target date', fact: true },
      { key: 'cost_p80', label: '80% cost', fact: true },
      { key: 'recommended', label: 'Recommended contingency', fact: true },
    ] },
  ]
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{run.display_id || 'Saved analysis'}</h2>
          <p className="text-sm text-gray-700 dark:text-gray-200">{run.iterations?.toLocaleString()} iterations · repeat code {run.seed}</p>
        </div>
        <div className="flex gap-2">
          <button type="button" data-help="exempt" className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg text-gray-800 dark:text-gray-100" onClick={() => navigate(`../run?rerun=${run.id}&seed=${run.seed}&basis=${run.response_basis}`)}>
            Run again
          </button>
          <ExportRecordButtons title={run.display_id || 'Risk analysis'} record={record} sections={sections} />
        </div>
      </div>
      {error && <p className="text-sm text-red-700 dark:text-red-300">{error}</p>}
      <DetailAuditTabList detailsLabel="Results" auditLabel="Audit details" activeTab={tab} onChange={setTab} />
      {tab === 'details' ? (
        <QraSummary summary={summary} formatDate={formatDate} formatMoney={formatMoney} onAdopt={adopt} adopting={adopting} scheduleOnly={scheduleOnly} />
      ) : (
        <AuditDetailsPanel>
          <AuditCard title="Identity">
            <AuditField label="Reference" value={run.display_id} />
            <AuditField label="Kind" value={run.kind} />
          </AuditCard>
          <AuditCard title="Classification">
            <AuditField label="Basis" value={run.response_basis} />
            <AuditField label="Iterations" value={run.iterations} />
            <AuditField label="Repeat code" value={run.seed} />
          </AuditCard>
          <AuditCard title="Record history">
            <AuditField label="Saved" value={formatDate(run.created_at?.slice?.(0, 10)) || run.created_at} />
          </AuditCard>
        </AuditDetailsPanel>
      )}
      {modal}
    </div>
  )
}
