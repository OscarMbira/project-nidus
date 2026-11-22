/**
 * Edit Project Mandate (Platform). v1344 slice 2: every mandate field in logical tabs
 * (MandateFieldTabs, shared with the Simulator) + Audit details; key deliverables and
 * dependencies saved row by row; unsaved-changes guard (rule 52); hold / draft kept.
 */
import { useState, useEffect, useCallback, useMemo } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { ArrowLeft, Save, AlertCircle } from 'lucide-react'
import {
  getMandateByIdOrReference, updateMandate,
  getDependencies, addDependency, updateDependency, deleteDependency,
  getDeliverables, addDeliverable, updateDeliverable, deleteDeliverable,
} from '../../services/projectMandateService'
import MandateDependenciesSection from '@nidus/ui/MandateDependenciesSection'
import MandateDeliverablesSection from '@nidus/ui/MandateDeliverablesSection'
import MandateFieldTabs, { MANDATE_TABS, mandateListToMultiline, multilineToMandateList } from '@nidus/ui/MandateFieldTabs'
import { HoldButton } from '../../components/shared-app/HoldButton'
import { AutoSaveIndicator } from '@nidus/ui/AutoSaveIndicator'
import { useDraftQueue } from '../../lib/useDraftQueue'
import { useToastContext } from '@nidus/shared/context/ToastContext'
import { useUnsavedChangesGuard } from '@nidus/shared/context/UnsavedChangesContext'
import { useSuccessModal } from '@nidus/shared/hooks/useSuccessModal'
import { checkExistingDraft, getDraft, deleteDraft } from '../../services/draftQueueService'
import DetailAuditTabList from '@nidus/ui/DetailAuditTabList'
import AuditDetailsPanel from '@nidus/ui/AuditDetailsPanel'
import AuditCard from '@nidus/ui/AuditCard'
import AuditField from '@nidus/ui/AuditField'
import AuditTimestampPair from '@nidus/ui/AuditTimestampPair'
import { humanizeAuditToken } from '@nidus/shared/utils/auditDisplayUtils'
import ExportRecordMenu from '@nidus/ui/ExportRecordMenu'
import { buildMandateExportSections, buildMandateExportRecord } from '@nidus/shared/utils/mandateExportSections'
import RecordCustomFields from '../../components/shared-app/RecordCustomFields'
import { useLdeExportParts } from '../../lib/useLdeExportParts'

// Saved row by row (SQL v1447 dependencies; v160 deliverables).
const DEPENDENCY_SERVICE = { list: getDependencies, add: addDependency, update: updateDependency, remove: deleteDependency }
const DELIVERABLE_SERVICE = { list: getDeliverables, add: addDeliverable, update: updateDeliverable, remove: deleteDeliverable }

const TABS = [...MANDATE_TABS, { value: 'custom-fields', label: 'Custom Fields' }, { value: 'audit', label: 'Audit details' }]
// Which tab shows each validated field, to open it when a check fails.
const FIELD_TAB = { mandate_title: 'purpose', scope: 'scope', proposed_executive_name: 'people', project_objectives: 'objectives', constraints: 'objectives' }

const FIELDS = [
  'mandate_title', 'mandate_reference', 'project_code', 'project_name', 'purpose', 'background', 'authority_responsible',
  'scope', 'scope_exclusions', 'interfaces', 'proposed_executive_name', 'proposed_pm_name',
  'project_objectives', 'constraints', 'assumptions', 'outline_risks',
  'quality_expectations', 'quality_priority', 'outline_business_case',
]
const emptyForm = () => Object.fromEntries(FIELDS.map((f) => [f, '']))

function hasListItems(value) {
  return mandateListToMultiline(value).split(/\r?\n/).some((line) => line.trim())
}

export default function ProjectMandateEdit() {
  const { mandateId: mandateIdentifier } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const toast = useToastContext()
  const { showSuccess, modal } = useSuccessModal()

  const isPMOContext = location.pathname.startsWith('/pmo')
  const isPMContext = location.pathname.startsWith('/pm/')
  const basePath = isPMOContext ? '/pmo/mandates' : isPMContext ? '/pm/mandates' : '/platform/mandates'
  const listPath = isPMOContext ? '/pmo/governance/mandate' : isPMContext ? '/pm/governance/mandate' : '/platform/mandates/list'

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState({})
  const [editable, setEditable] = useState(false)
  const [internalMandateId, setInternalMandateId] = useState(null)
  const [mandateRef, setMandateRef] = useState(null)
  const [mandateRecord, setMandateRecord] = useState(null)
  const [activeTab, setActiveTab] = useState('purpose')
  const [formData, setFormData] = useState(emptyForm)
  const [initialSnapshot, setInitialSnapshot] = useState(null)

  const { draftId, saveStatus, draftCount, canCreateDraft, autoSave } = useDraftQueue('project_mandate', internalMandateId)

  const lde = useLdeExportParts({
    entityType: 'project_mandate',
    entityId: internalMandateId,
    projectId: mandateRecord?.project_id,
    screenCode: 'mandate_detail',
    enabled: !!internalMandateId && !!mandateRecord?.project_id,
  })

  // Rule 52: warn before leaving with unsaved changes.
  const isDirty = useMemo(() => initialSnapshot !== null && JSON.stringify(formData) !== initialSnapshot, [formData, initialSnapshot])
  useUnsavedChangesGuard(isDirty && !saving)

  const fetchMandate = useCallback(async () => {
    if (!mandateIdentifier) return
    try {
      setLoading(true)
      const mandate = await getMandateByIdOrReference(mandateIdentifier)
      if (!mandate) {
        toast.error('Mandate not found.')
        navigate(listPath)
        return
      }

      const id = mandate.id
      const ref = mandate.mandate_reference || mandate.id
      setInternalMandateId(id)
      setMandateRef(ref)
      setMandateRecord(mandate)

      // Draft / rejected stay editable; approved or awaiting approval are read-only (rule 53).
      const canEdit = ['draft', 'rejected'].includes(mandate.document_status)
      setEditable(canEdit)
      if (!canEdit) {
        toast.error('This mandate cannot be edited. It may be approved, awaiting approval or archived.')
        navigate(`${basePath}/${ref}/view`)
        return
      }

      const initialFormData = Object.fromEntries(FIELDS.map((f) => [f, mandate[f] ?? '']))
      setFormData(initialFormData)
      setInitialSnapshot(JSON.stringify(initialFormData))
      setLoading(false)

      const existingDraft = await checkExistingDraft('project_mandate', id).catch(() => null)
      const draftRecord = existingDraft?.draft_id ? await getDraft(existingDraft.draft_id).catch(() => null) : null
      const mandateUpdated = mandate.updated_at ? new Date(mandate.updated_at).getTime() : 0
      const draftUpdated = draftRecord?.last_saved_at
        ? new Date(draftRecord.last_saved_at).getTime()
        : (draftRecord?.updated_at ? new Date(draftRecord.updated_at).getTime() : 0)
      if (draftUpdated > mandateUpdated && draftRecord?.form_data && typeof draftRecord.form_data === 'object') {
        const { structuredConstraints: _sc, ...rest } = draftRecord.form_data
        setFormData((prev) => ({ ...prev, ...rest }))
      }
    } catch (error) {
      console.error('Error fetching mandate:', error)
      toast.error('Error loading mandate: ' + error.message)
      navigate(listPath)
    } finally {
      setLoading(false)
    }
  }, [mandateIdentifier, basePath, navigate, listPath, toast])

  useEffect(() => {
    const t = setTimeout(fetchMandate, 0) // start after render (no synchronous setState inside the effect)
    return () => clearTimeout(t)
  }, [fetchMandate])

  useEffect(() => {
    if (formData.mandate_title && !loading) {
      const timer = setTimeout(() => { autoSave(formData, formData.mandate_title) }, 60000)
      return () => clearTimeout(timer)
    }
    return undefined
  }, [formData, loading, autoSave])

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
    const newErrors = {}
    if (!formData.mandate_title?.trim()) newErrors.mandate_title = 'Mandate title is required'
    if (!hasListItems(formData.scope)) newErrors.scope = 'Add at least one scope point'
    if (!formData.proposed_executive_name?.trim() && !formData.proposed_pm_name?.trim()) {
      newErrors.proposed_executive_name = 'Name the Executive and/or Project Manager'
    }
    if (!hasListItems(formData.project_objectives)) newErrors.project_objectives = 'Add at least one objective'
    if (!hasListItems(formData.constraints)) newErrors.constraints = 'Add at least one key constraint'
    setErrors(newErrors)
    const first = Object.keys(newErrors)[0]
    if (first && FIELD_TAB[first]) setActiveTab(FIELD_TAB[first])
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validateForm()) {
      toast.error('Please fix the highlighted fields before saving')
      return
    }
    if (saving) return
    setSaving(true)
    try {
      const payload = {
        ...formData,
        quality_priority: formData.quality_priority || 'balanced', // CHECK constraint (v160)
        purpose: formData.purpose?.trim() || `Mandate for: ${formData.mandate_title.trim()}`,
        background: formData.background?.trim() || mandateListToMultiline(formData.scope) || formData.mandate_title.trim(),
        outline_business_case: formData.outline_business_case?.trim()
          || mandateListToMultiline(formData.project_objectives) || formData.mandate_title.trim(),
      }
      await updateMandate(internalMandateId, payload, { skipEditCheck: true })
      const existing = await checkExistingDraft('project_mandate', internalMandateId).catch(() => null)
      if (existing?.draft_id) await deleteDraft(existing.draft_id).catch(() => {})
      setInitialSnapshot(JSON.stringify(formData))
      showSuccess({
        recordId: mandateRef || formData.mandate_reference || 'Mandate',
        operation: 'updated',
        message: 'Mandate saved.',
        onOk: () => navigate(`${basePath}/${mandateRef || internalMandateId}/view`),
      })
    } catch (error) {
      toast.error(`Error saving mandate: ${error?.message || 'Unknown error'}`)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="h-6 w-32 bg-gray-200 dark:bg-gray-700 rounded mb-4 animate-pulse" />
        <div className="h-9 w-80 bg-gray-200 dark:bg-gray-700 rounded mb-6 animate-pulse" />
        <div className="h-48 w-full bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse" />
      </div>
    )
  }

  if (!editable) return null

  return (
    <div className="space-y-6">
      <div>
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4 flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Edit Project Mandate</h1>
              <AutoSaveIndicator status={saveStatus} />
            </div>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              {mandateRef && <span className="font-mono text-blue-600 dark:text-blue-400 mr-2">{mandateRef}</span>}
              Work through the tabs; the mandate is saved as one record.
            </p>
          </div>
          <ExportRecordMenu
            sections={[...buildMandateExportSections(formData), ...(lde.section ? [lde.section] : [])]}
            record={{ ...buildMandateExportRecord(formData), ...lde.mergedRecord }}
            baseFilename={`Mandate_${formData.mandate_reference || mandateRef || 'Draft'}`}
          />
        </div>
      </div>

      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <div className="flex items-start">
          <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 mr-2 mt-0.5" />
          <p className="text-blue-800 dark:text-blue-200 text-sm">
            <strong>Note:</strong> Once this mandate is submitted or approved, it cannot be edited.
          </p>
        </div>
      </div>

      <DetailAuditTabList activeTab={activeTab} onChange={setActiveTab} ariaLabel="Mandate sections" tabs={TABS} />

      {activeTab === 'audit' && mandateRecord && (
        <AuditDetailsPanel description="Who created or changed this mandate, and how it is classified.">
          <AuditCard title="Identity" description="How this mandate is labelled and tracked.">
            <AuditField label="Reference" value={mandateRecord.mandate_reference} />
            <AuditField label="Title" value={formData.mandate_title || mandateRecord.mandate_title} />
            <AuditField label="Status" value={humanizeAuditToken(mandateRecord.document_status)} />
          </AuditCard>
          <AuditCard title="Classification" description="Where this mandate sits.">
            <AuditField label="Executive" value={formData.proposed_executive_name || mandateRecord.proposed_executive_name} />
            <AuditField label="Project Manager" value={formData.proposed_pm_name || mandateRecord.proposed_pm_name} />
            <AuditField label="Version" value={mandateRecord.version_number} />
          </AuditCard>
          <AuditCard title="Record history" description="When this mandate was created and last changed.">
            <AuditField label="Created by" value={mandateRecord.creator?.full_name || mandateRecord.creator?.email || null} />
            <AuditTimestampPair dateLabel="Created at" value={mandateRecord.created_at} />
            <AuditField label="Updated by" value={mandateRecord.updater?.full_name || mandateRecord.updater?.email || null} />
            <AuditTimestampPair dateLabel="Last updated" value={mandateRecord.updated_at} />
          </AuditCard>
        </AuditDetailsPanel>
      )}

      {activeTab === 'custom-fields' && (
        <RecordCustomFields
          projectId={mandateRecord?.project_id}
          entityType="project_mandate"
          entityId={internalMandateId}
          screenCode="mandate_detail"
          mode="edit"
          alwaysShow
          title="Custom Fields"
        />
      )}

      {activeTab !== 'audit' && activeTab !== 'custom-fields' && (
        <form onSubmit={handleSubmit} className="space-y-6">
          <MandateFieldTabs
            activeTab={activeTab}
            formData={formData}
            errors={errors}
            onChange={handleChange}
            onListChange={setListField}
            viewModePrefix="mandate-edit"
            deliverables={<MandateDeliverablesSection mandateId={internalMandateId} viewModeId="mandate-deliverables-edit" service={DELIVERABLE_SERVICE} />}
            dependencies={<MandateDependenciesSection mandateId={internalMandateId} viewModeId="mandate-dependencies-edit" service={DEPENDENCY_SERVICE} />}
          />

          {activeTab !== 'deliverables' && (
            <div className="flex flex-wrap justify-end items-center gap-3">
              <HoldButton
                entityType="project_mandate"
                entityId={internalMandateId}
                formData={formData}
                onHoldComplete={() => {
                  toast.success('Mandate put on hold')
                  navigate(listPath)
                }}
                disabled={!canCreateDraft && !draftId}
                draftCount={draftCount}
              />
              <button
                type="button"
                onClick={() => navigate(`${basePath}/${mandateRef || internalMandateId}/view`)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
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
