/**
 * Practice PID View Page
 */

import { useState, useEffect } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { RowActionButton } from '@nidus/ui'
import { getPracticePIDById } from '../../services/sim/practicePIDService'
import ExportRecordButtons from '@nidus/ui/ExportRecordButtons'
import { exportRecordToExcel, exportRecordToWord, exportRecordToPPT, exportRecordToCSV, exportRecordToXML, exportRecordToJSON, exportRecordToPrint } from '@nidus/shared/utils/exportUtils'
import { simDb } from '@nidus/supabase'
import DetailAuditTabList from '@nidus/ui/DetailAuditTabList'
import AuditDetailsPanel from '@nidus/ui/AuditDetailsPanel'
import AuditCard from '@nidus/ui/AuditCard'
import AuditField from '@nidus/ui/AuditField'
import AuditTimestampPair from '@nidus/ui/AuditTimestampPair'
import { resolveAuditUserLabels } from '@nidus/shared/utils/auditDisplayUtils'
import { planSummaryText, toleranceLines } from '@nidus/shared/utils/practicePidForm'

const PRACTICE_PID_VIEW_SECTIONS = [
  { title: 'PID', fields: [
    { key: 'pid_title', label: 'Title' },
    { key: 'pid_reference', label: 'Reference' },
    { key: 'pid_description', label: 'Description' }
  ]}
]

export default function PracticePIDView() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const projectId = searchParams.get('projectId')
  const [pid, setPid] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('details')
  const [auditUserLabels, setAuditUserLabels] = useState({})

  useEffect(() => {
    if (!id) return undefined
    let cancelled = false
    getPracticePIDById(id)
      .then((result) => { if (!cancelled && result.success) setPid(result.data) })
      .catch((error) => console.error('Error loading PID:', error))
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [id])

  useEffect(() => {
    if (activeTab !== 'audit' || !pid) return
    (async () => {
      const labels = await resolveAuditUserLabels(simDb, [pid.created_by, pid.updated_by])
      setAuditUserLabels(labels || {})
    })()
  }, [activeTab, pid])

  if (loading) return <div className="text-center py-12">Loading...</div>
  if (!pid) return <div className="text-center py-12">PID not found</div>

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <button onClick={() => navigate(-1)} className="mb-4 inline-flex items-center text-sm text-gray-500 hover:text-gray-700">
        <ArrowLeft className="h-4 w-4 mr-2" /> Back
      </button>
      <div className="flex justify-between items-start mb-6 flex-wrap gap-3">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{pid.pid_title}</h1>
        <div className="flex gap-2">
          <ExportRecordButtons
            onExportPPT={() => exportRecordToPPT(PRACTICE_PID_VIEW_SECTIONS, pid, `PracticePID_${pid.pid_reference || id}`)}
            onExportWord={() => exportRecordToWord(PRACTICE_PID_VIEW_SECTIONS, pid, `PracticePID_${pid.pid_reference || id}`)}
            onExportExcel={() => exportRecordToExcel(PRACTICE_PID_VIEW_SECTIONS, pid, `PracticePID_${pid.pid_reference || id}`)}
            onExportCSV={() => exportRecordToCSV(PRACTICE_PID_VIEW_SECTIONS, pid, `PracticePID_${pid.pid_reference || id}`)}
            onExportXML={() => exportRecordToXML(PRACTICE_PID_VIEW_SECTIONS, pid, `PracticePID_${pid.pid_reference || id}`)}
            onExportJSON={() => exportRecordToJSON(PRACTICE_PID_VIEW_SECTIONS, pid, `PracticePID_${pid.pid_reference || id}`)}
            onExportPrint={() => exportRecordToPrint(PRACTICE_PID_VIEW_SECTIONS, pid, `PracticePID_${pid.pid_reference || id}`)}
          />
          <RowActionButton
            variant="edit"
            label="Edit PID"
            onClick={() => navigate(`edit${projectId ? `?projectId=${projectId}` : ''}`)}
          />
        </div>
      </div>

      <DetailAuditTabList activeTab={activeTab} onChange={setActiveTab} />

      {activeTab === 'audit' ? (
        <AuditDetailsPanel description="Who created or changed this PID.">
          <AuditCard title="Identity" description="How this PID is labelled.">
            <AuditField label="Title" value={pid.pid_title} />
            <AuditField label="Reference" value={pid.pid_reference} />
          </AuditCard>
          <AuditCard title="Classification" description="Approval status.">
            <AuditField label="Approved" value={pid.is_approved ? 'Yes' : 'No'} />
          </AuditCard>
          <AuditCard title="Record history" description="When this PID was created and last changed.">
            <AuditField label="Created by" value={pid.created_by ? auditUserLabels[pid.created_by] || null : null} />
            <AuditTimestampPair dateLabel="Created at" value={pid.created_at} />
            <AuditField label="Updated by" value={pid.updated_by ? auditUserLabels[pid.updated_by] || null : null} />
            <AuditTimestampPair dateLabel="Last updated" value={pid.updated_at} />
          </AuditCard>
        </AuditDetailsPanel>
      ) : (
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 space-y-4">
        {/* v1344 slice 5: every PID section that has content (was description, definition, scope only) */}
        {[
          ['Description', pid.pid_description],
          ['Project Definition', pid.project_definition],
          ['Objectives', Array.isArray(pid.project_objectives) ? pid.project_objectives.join('\n') : pid.project_objectives],
          ['Project Scope', pid.project_scope],
          ['Exclusions', pid.exclusions],
          ['Interfaces', Array.isArray(pid.interfaces) ? pid.interfaces.join('\n') : pid.interfaces],
          ['Project Approach', pid.project_approach],
          ['Quality Approach', pid.quality_approach],
          ['Risk Approach', pid.risk_approach],
          ['Change Control Approach', pid.change_control_approach],
          ['Communication Approach', pid.communication_approach],
          ['Tolerances', toleranceLines(pid.tolerance_levels)],
          ['Reporting Arrangements', pid.reporting_arrangements],
          ['Monitoring and Control', pid.monitoring_and_control],
          ['Project Plan Summary', planSummaryText(pid.project_plan_summary)],
          ['Current Stage Plan Summary', planSummaryText(pid.stage_plan_summary)],
        ].filter(([, v]) => v && String(v).trim()).map(([title, value]) => (
          <div key={title}>
            <h3 className="font-medium mb-1 text-gray-900 dark:text-white">{title}</h3>
            <p className="text-gray-600 dark:text-gray-400 whitespace-pre-wrap">{value}</p>
          </div>
        ))}
      </div>
      )}
    </div>
  )
}
