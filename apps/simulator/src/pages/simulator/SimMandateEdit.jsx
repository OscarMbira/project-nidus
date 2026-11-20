/**
 * Edit Practice Mandate (Simulator). v1344 slice 2: same tabs and fields as the Platform mandate
 * (MandateFieldTabs) + Audit details; key deliverables and dependencies saved row by row
 * (sim.mandate_deliverables / sim.mandate_dependencies); unsaved-changes guard (rule 52).
 * Mounted at /simulator/mandates/:mandateId/edit (the practice mandate view links here).
 */
import { useState, useEffect, useCallback, useMemo, memo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Save, GraduationCap } from 'lucide-react'
import {
  getSimMandateById, updateSimMandate,
  getSimDeliverables, addSimDeliverable, updateSimDeliverable, deleteSimDeliverable,
  getSimDependencies, addSimDependency, updateSimDependency, deleteSimDependency,
} from '../../services/simulatorMandateService'
import { simDb } from '@nidus/supabase'
import MandateFieldTabs, { MANDATE_TABS, mandateListToMultiline, multilineToMandateList } from '@nidus/ui/MandateFieldTabs'
import MandateDeliverablesSection from '@nidus/ui/MandateDeliverablesSection'
import MandateDependenciesSection from '@nidus/ui/MandateDependenciesSection'
import DetailAuditTabList from '@nidus/ui/DetailAuditTabList'
import AuditDetailsPanel from '@nidus/ui/AuditDetailsPanel'
import AuditCard from '@nidus/ui/AuditCard'
import AuditField from '@nidus/ui/AuditField'
import AuditTimestampPair from '@nidus/ui/AuditTimestampPair'
import { humanizeAuditToken, resolveAuditUserLabels } from '@nidus/shared/utils/auditDisplayUtils'
import { useToastContext } from '@nidus/shared/context/ToastContext'
import { useUnsavedChangesGuard } from '@nidus/shared/context/UnsavedChangesContext'
import { useSuccessModal } from '@nidus/shared/hooks/useSuccessModal'

const DELIVERABLE_SERVICE = { list: getSimDeliverables, add: addSimDeliverable, update: updateSimDeliverable, remove: deleteSimDeliverable }
const DEPENDENCY_SERVICE = { list: getSimDependencies, add: addSimDependency, update: updateSimDependency, remove: deleteSimDependency }

const TABS = [...MANDATE_TABS, { value: 'audit', label: 'Audit details' }]
const FIELD_TAB = { mandate_title: 'purpose', purpose: 'purpose', background: 'purpose', project_objectives: 'objectives', outline_business_case: 'case' }
const FIELDS = [
  'mandate_title', 'mandate_reference', 'purpose', 'background', 'authority_responsible',
  'scope', 'scope_exclusions', 'interfaces', 'proposed_executive_name', 'proposed_pm_name',
  'project_objectives', 'constraints', 'assumptions', 'outline_risks',
  'quality_expectations', 'quality_priority', 'outline_business_case',
]

function SimMandateEdit() {
  const { mandateId } = useParams()
  const navigate = useNavigate()
  const toast = useToastContext()
  const { showSuccess, modal } = useSuccessModal()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState({})
  const [formData, setFormData] = useState(() => Object.fromEntries(FIELDS.map((f) => [f, ''])))
  const [initialSnapshot, setInitialSnapshot] = useState(null)
  const [record, setRecord] = useState(null)
  const [activeTab, setActiveTab] = useState('purpose')
  const [auditUserLabels, setAuditUserLabels] = useState({})

  const isDirty = useMemo(() => initialSnapshot !== null && JSON.stringify(formData) !== initialSnapshot, [formData, initialSnapshot])
  useUnsavedChangesGuard(isDirty && !saving)

  const fetchMandate = useCallback(async () => {
    try {
      const mandate = await getSimMandateById(mandateId)
      setRecord(mandate)
      if (mandate.document_status !== 'draft') {
        toast.error('Only draft practice mandates can be edited.')
        navigate(`/simulator/mandates/${mandateId}/view`)
        return
      }
      const initial = Object.fromEntries(FIELDS.map((f) => [f, mandate[f] ?? '']))
      setFormData(initial)
      setInitialSnapshot(JSON.stringify(initial))
    } catch (error) {
      toast.error('Error loading practice mandate: ' + error.message)
      navigate('/simulator/mandates/list')
    } finally {
      setLoading(false)
    }
  }, [mandateId, navigate, toast])

  useEffect(() => {
    if (!mandateId) return undefined
    const t = setTimeout(fetchMandate, 0)
    return () => clearTimeout(t)
  }, [mandateId, fetchMandate])

  useEffect(() => {
    if (activeTab !== 'audit' || !record?.user_id) return undefined
    let cancelled = false
    resolveAuditUserLabels(simDb, [record.user_id])
      .then((labels) => { if (!cancelled) setAuditUserLabels(labels || {}) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [activeTab, record])

  const clearError = useCallback((name) => {
    setErrors((prev) => {
      if (!prev[name]) return prev
      const next = { ...prev }
      delete next[name]
      return next
    })
  }, [])

  const handleChange = useCallback((e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    clearError(name)
  }, [clearError])

  const setListField = useCallback((name, multilineValue) => {
    setFormData((prev) => ({ ...prev, [name]: multilineToMandateList(multilineValue) }))
    clearError(name)
  }, [clearError])

  const validateForm = () => {
    const e = {}
    if (!formData.mandate_title?.trim()) e.mandate_title = 'Mandate title is required'
    if (!formData.purpose?.trim() || formData.purpose.trim().length < 20) e.purpose = 'Purpose is required (minimum 20 characters)'
    if (!formData.background?.trim() || formData.background.trim().length < 100) e.background = 'Background is required (minimum 100 characters)'
    if (!mandateListToMultiline(formData.project_objectives).trim()) e.project_objectives = 'Add at least one objective'
    if (!formData.outline_business_case?.trim() || formData.outline_business_case.trim().length < 100) {
      e.outline_business_case = 'Outline business case is required (minimum 100 characters)'
    }
    setErrors(e)
    const first = Object.keys(e)[0]
    if (first && FIELD_TAB[first]) setActiveTab(FIELD_TAB[first])
    return Object.keys(e).length === 0
  }

  const handleSubmit = async (ev) => {
    ev.preventDefault()
    if (!validateForm()) {
      toast.error('Please fix the highlighted fields before saving')
      return
    }
    setSaving(true)
    try {
      await updateSimMandate(mandateId, { ...formData, quality_priority: formData.quality_priority || 'balanced' })
      setInitialSnapshot(JSON.stringify(formData))
      showSuccess({
        recordId: record?.mandate_reference || formData.mandate_title,
        operation: 'updated',
        message: 'Practice mandate saved.',
        onOk: () => navigate(`/simulator/mandates/${mandateId}/view`),
      })
    } catch (error) {
      toast.error('Error updating practice mandate: ' + error.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" aria-label="Loading practice mandate" />
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div>
        <button type="button" onClick={() => navigate(-1)}
          className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4 flex items-center gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>
        <div className="flex items-center gap-3">
          <GraduationCap className="w-8 h-8 text-blue-600 dark:text-blue-400" />
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Edit Practice Mandate</h1>
            <p className="mt-1 text-gray-600 dark:text-gray-400">Work through the tabs. Only draft practice mandates can be edited.</p>
          </div>
        </div>
      </div>

      <DetailAuditTabList activeTab={activeTab} onChange={setActiveTab} ariaLabel="Practice mandate sections" tabs={TABS} />

      {activeTab === 'audit' ? (
        <AuditDetailsPanel description="Who created or changed this mandate.">
          <AuditCard title="Identity" description="How this mandate is labelled.">
            <AuditField label="Title" value={record?.mandate_title} />
            <AuditField label="Reference" value={record?.mandate_reference} />
          </AuditCard>
          <AuditCard title="Classification" description="Where this mandate sits.">
            <AuditField label="Status" value={humanizeAuditToken(record?.document_status)} />
          </AuditCard>
          <AuditCard title="Record history" description="When this mandate was created and last changed.">
            <AuditField label="Created by" value={record?.user_id ? auditUserLabels[record.user_id] || null : null} />
            <AuditTimestampPair dateLabel="Created at" value={record?.created_at} />
            <AuditTimestampPair dateLabel="Last updated" value={record?.updated_at} />
          </AuditCard>
        </AuditDetailsPanel>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          <MandateFieldTabs
            activeTab={activeTab}
            formData={formData}
            errors={errors}
            onChange={handleChange}
            onListChange={setListField}
            viewModePrefix="sim-mandate-edit"
            helpSchema="sim"
            deliverables={<MandateDeliverablesSection mandateId={mandateId} viewModeId="sim-mandate-deliverables-edit" service={DELIVERABLE_SERVICE} helpSchema="sim" />}
            dependencies={<MandateDependenciesSection mandateId={mandateId} viewModeId="sim-mandate-dependencies-edit" service={DEPENDENCY_SERVICE} helpSchema="sim" />}
          />
          {activeTab !== 'deliverables' && (
            <div className="flex justify-end gap-3">
              <button type="button" onClick={() => navigate(`/simulator/mandates/${mandateId}/view`)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">
                Cancel
              </button>
              <button type="submit" disabled={saving}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center">
                <Save className="w-4 h-4 mr-2" />
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          )}
        </form>
      )}
      {modal}
    </div>
  )
}

export default memo(SimMandateEdit)
