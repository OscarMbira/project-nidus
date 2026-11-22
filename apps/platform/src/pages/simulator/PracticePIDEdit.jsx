/**
 * Practice PID Edit Page (v1344 follow-up)
 * Routed page (rule 65): simulator/practice-pids/:id/edit. Tabs follow the PID outline;
 * Audit details tab (rule 63.1); unsaved-changes guard (rule 52); success modal (rule 16);
 * read-only while the PID awaits authorisation (rule 53).
 */

import { useState, useEffect, useMemo, useCallback } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { ArrowLeft, Save } from 'lucide-react'
import { MultiLineListInput } from '@nidus/ui'
import DetailAuditTabList from '@nidus/ui/DetailAuditTabList'
import AuditDetailsPanel from '@nidus/ui/AuditDetailsPanel'
import AuditCard from '@nidus/ui/AuditCard'
import AuditField from '@nidus/ui/AuditField'
import AuditTimestampPair from '@nidus/ui/AuditTimestampPair'
import { humanizeAuditToken, resolveAuditUserLabels } from '@nidus/shared/utils/auditDisplayUtils'
import { useUnsavedChangesGuard } from '@nidus/shared/context/UnsavedChangesContext'
import { useSuccessModal } from '@nidus/shared/hooks/useSuccessModal'
import { practicePidToForm, practicePidFormToUpdate } from '@nidus/shared/utils/practicePidForm'
import { simDb } from '@nidus/supabase'
import { getPracticePIDById, updatePracticePID } from '../../services/sim/practicePIDService'
import FieldLabelWithHelp from '@nidus/ui/FieldLabelWithHelp'

const TABS = [
  { value: 'definition', label: 'Definition' },
  { value: 'approach', label: 'Approach' },
  { value: 'controls', label: 'Controls' },
  { value: 'plans', label: 'Plans' },
  { value: 'audit', label: 'Audit details' },
]

const inputClass = 'w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500'
const labelClass = 'block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'

function TextArea({ name, label, value, onChange, rows = 4, hint }) {
  return (
    <div>
      <FieldLabelWithHelp helpKey={`sim.practice_project_initiation_documents.${name}`} htmlFor={`pid-${name}`} className={labelClass}>{label}</FieldLabelWithHelp>
      <textarea id={`pid-${name}`} name={name} value={value} onChange={onChange} rows={rows} className={inputClass} />
      {hint && <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{hint}</p>}
    </div>
  )
}

export default function PracticePIDEdit() {
  const { id } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const { showSuccess, modal } = useSuccessModal()
  const viewPath = `${location.pathname.replace(/\/edit\/?$/, '')}${location.search}`

  const [record, setRecord] = useState(null)
  const [form, setForm] = useState(null)
  const [snapshot, setSnapshot] = useState(null)
  const [loadError, setLoadError] = useState('')
  const [saveError, setSaveError] = useState('')
  const [titleError, setTitleError] = useState('')
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState('definition')
  const [auditUserLabels, setAuditUserLabels] = useState({})

  const isDirty = useMemo(() => snapshot !== null && form !== null && JSON.stringify(form) !== snapshot, [form, snapshot])
  const { requestNavigation, confirmBack } = useUnsavedChangesGuard(isDirty && !saving)
  const locked = record?.record_status === 'unauthorised'

  useEffect(() => {
    if (!id) return undefined
    let cancelled = false
    getPracticePIDById(id).then((result) => {
      if (cancelled) return
      if (!result.success || !result.data) {
        setLoadError(result.error || 'PID not found')
        return
      }
      const initial = practicePidToForm(result.data)
      setRecord(result.data)
      setForm(initial)
      setSnapshot(JSON.stringify(initial))
    })
    return () => { cancelled = true }
  }, [id])

  useEffect(() => {
    if (activeTab !== 'audit' || !record) return undefined
    let cancelled = false
    resolveAuditUserLabels(simDb, [record.created_by, record.updated_by])
      .then((labels) => { if (!cancelled) setAuditUserLabels(labels || {}) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [activeTab, record])

  const handleChange = useCallback((e) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
    if (name === 'pid_title') setTitleError('')
  }, [])

  const setField = useCallback((name, value) => setForm((prev) => ({ ...prev, [name]: value })), [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.pid_title.trim()) {
      setTitleError('PID title is required')
      setActiveTab('definition')
      return
    }
    setSaving(true)
    setSaveError('')
    const result = await updatePracticePID(id, practicePidFormToUpdate(form, record))
    setSaving(false)
    if (!result.success) {
      setSaveError(result.error || 'Could not save the PID')
      return
    }
    setRecord(result.data)
    setSnapshot(JSON.stringify(form))
    showSuccess({
      recordId: result.data?.pid_reference || form.pid_title,
      operation: 'updated',
      message: 'Practice PID saved.',
      onOk: () => navigate(viewPath),
    })
  }

  const backButton = (
    <button type="button" onClick={() => confirmBack()}
      className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4 flex items-center gap-2">
      <ArrowLeft className="h-4 w-4" />
      Back to PID
    </button>
  )

  if (loadError) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {backButton}
        <p className="text-red-600 dark:text-red-400">{loadError}</p>
      </div>
    )
  }
  if (!form) {
    return <div className="py-12 text-center text-gray-500 dark:text-gray-400">Loading…</div>
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div>
        {backButton}
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Edit Practice PID</h1>
        <p className="mt-1 text-gray-600 dark:text-gray-400">{record?.pid_reference ? `${record.pid_reference} · ` : ''}Work through the tabs, then save.</p>
      </div>

      {locked && (
        <div className="rounded-lg border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20 p-3 text-sm text-amber-800 dark:text-amber-200">
          This PID is awaiting authorisation, so it can be reviewed but not changed.
        </div>
      )}

      <DetailAuditTabList activeTab={activeTab} onChange={setActiveTab} ariaLabel="Practice PID sections" tabs={TABS} />

      {activeTab === 'audit' ? (
        <AuditDetailsPanel description="Who created or changed this PID.">
          <AuditCard title="Identity" description="How this PID is labelled.">
            <AuditField label="Title" value={record?.pid_title} />
            <AuditField label="Reference" value={record?.pid_reference} />
            <AuditField label="Version" value={record?.document_version} />
          </AuditCard>
          <AuditCard title="Classification" description="Approval and lifecycle status.">
            <AuditField label="Approved" value={record?.is_approved ? 'Yes' : 'No'} />
            <AuditField label="Record status" value={humanizeAuditToken(record?.record_status)} />
          </AuditCard>
          <AuditCard title="Record history" description="When this PID was created and last changed.">
            <AuditField label="Created by" value={record?.created_by ? auditUserLabels[record.created_by] || null : null} />
            <AuditTimestampPair dateLabel="Created at" value={record?.created_at} />
            <AuditField label="Updated by" value={record?.updated_by ? auditUserLabels[record.updated_by] || null : null} />
            <AuditTimestampPair dateLabel="Last updated" value={record?.updated_at} />
          </AuditCard>
        </AuditDetailsPanel>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          <fieldset disabled={locked} className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 space-y-5">
            {activeTab === 'definition' && (
              <>
                <div>
                  <FieldLabelWithHelp helpKey="sim.practice_project_initiation_documents.pid_title" htmlFor="pid-pid_title" className={labelClass}>PID title *</FieldLabelWithHelp>
                  <input id="pid-pid_title" name="pid_title" type="text" value={form.pid_title} onChange={handleChange} className={inputClass} />
                  {titleError && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{titleError}</p>}
                </div>
                <TextArea name="pid_description" label="Description" value={form.pid_description} onChange={handleChange} rows={3} />
                <TextArea name="project_definition" label="Project definition" value={form.project_definition} onChange={handleChange} />
                <div>
                  <span className={labelClass}>Objectives</span>
                  <MultiLineListInput viewModeId="sim-practice-pid-objectives" id="pid-objectives" value={form.project_objectives}
                    onChange={(v) => setField('project_objectives', v)} itemColumnLabel="Objective" placeholder="Add an objective" disabled={locked} />
                </div>
                <TextArea name="project_scope" label="Scope" value={form.project_scope} onChange={handleChange} />
                <TextArea name="exclusions" label="Exclusions" value={form.exclusions} onChange={handleChange} rows={3} />
                <div>
                  <span className={labelClass}>Interfaces</span>
                  <MultiLineListInput viewModeId="sim-practice-pid-interfaces" id="pid-interfaces" value={form.interfaces}
                    onChange={(v) => setField('interfaces', v)} itemColumnLabel="Interface" placeholder="Add an interface" disabled={locked} />
                </div>
              </>
            )}
            {activeTab === 'approach' && (
              <>
                <TextArea name="project_approach" label="Project approach" value={form.project_approach} onChange={handleChange} />
                <TextArea name="quality_approach" label="Quality approach" value={form.quality_approach} onChange={handleChange} />
                <TextArea name="risk_approach" label="Risk approach" value={form.risk_approach} onChange={handleChange} />
                <TextArea name="change_control_approach" label="Change control approach" value={form.change_control_approach} onChange={handleChange} />
                <TextArea name="communication_approach" label="Communication approach" value={form.communication_approach} onChange={handleChange} />
              </>
            )}
            {activeTab === 'controls' && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {[['tolerance_time', 'Time tolerance', 'e.g. 2 weeks'], ['tolerance_cost', 'Cost tolerance', 'e.g. 10%'],
                    ['tolerance_scope', 'Scope tolerance', 'e.g. Training pack may be simplified'], ['tolerance_quality', 'Quality tolerance', 'e.g. 95% complete records']]
                    .map(([name, label, placeholder]) => (
                      <div key={name}>
                        <FieldLabelWithHelp helpKey={`sim.practice_project_initiation_documents.${name}`} htmlFor={`pid-${name}`} className={labelClass}>{label}</FieldLabelWithHelp>
                        <input id={`pid-${name}`} name={name} type="text" value={form[name]} onChange={handleChange} placeholder={placeholder} className={inputClass} />
                      </div>
                    ))}
                </div>
                <TextArea name="reporting_arrangements" label="Reporting arrangements" value={form.reporting_arrangements} onChange={handleChange} />
                <TextArea name="monitoring_and_control" label="Monitoring and control" value={form.monitoring_and_control} onChange={handleChange} />
              </>
            )}
            {activeTab === 'plans' && (
              <>
                <TextArea name="project_plan_summary" label="Project plan summary" value={form.project_plan_summary} onChange={handleChange} rows={5}
                  hint="Stages, major products and timing for the whole project." />
                <TextArea name="stage_plan_summary" label="Current stage plan summary" value={form.stage_plan_summary} onChange={handleChange} rows={5}
                  hint="What the current stage delivers and when." />
              </>
            )}
          </fieldset>

          {saveError && <p className="text-sm text-red-600 dark:text-red-400">{saveError}</p>}

          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => requestNavigation(viewPath)}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">
              Cancel
            </button>
            <button type="submit" disabled={saving || locked}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center">
              <Save className="w-4 h-4 mr-2" />
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </form>
      )}
      {modal}
    </div>
  )
}
