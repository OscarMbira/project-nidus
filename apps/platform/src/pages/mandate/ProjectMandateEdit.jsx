import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { ArrowLeft, Save, AlertCircle } from 'lucide-react'
import { getMandateByIdOrReference, updateMandate } from '../../services/projectMandateService'
import MultiLineListInput from '@nidus/ui/MultiLineListInput'
import { HoldButton } from '../../components/shared-app/HoldButton'
import { AutoSaveIndicator } from '@nidus/ui/AutoSaveIndicator'
import { useDraftQueue } from '../../lib/useDraftQueue'
import { useToastContext } from '@nidus/shared/context/ToastContext'
import { checkExistingDraft, getDraft, deleteDraft } from '../../services/draftQueueService'
import DetailAuditTabList from '@nidus/ui/DetailAuditTabList'
import AuditDetailsPanel from '@nidus/ui/AuditDetailsPanel'
import AuditCard from '@nidus/ui/AuditCard'
import AuditField from '@nidus/ui/AuditField'
import AuditTimestampPair from '@nidus/ui/AuditTimestampPair'
import { humanizeAuditToken } from '@nidus/shared/utils/auditDisplayUtils'
import ExportRecordMenu from '@nidus/ui/ExportRecordMenu'

const MANDATE_EXPORT_SECTIONS = [
  { title: 'Basic Information', fields: [
    { key: 'mandate_reference', label: 'Reference' },
    { key: 'mandate_title', label: 'Title' },
    { key: 'document_status', label: 'Status' },
  ]},
  { title: 'Scope', fields: [{ key: 'scope', label: 'Scope' }] },
  { title: 'Objectives', fields: [{ key: 'project_objectives', label: 'Objectives' }] },
  { title: 'Constraints', fields: [{ key: 'constraints', label: 'Constraints' }] },
  { title: 'Proposed Roles', fields: [
    { key: 'proposed_executive_name', label: 'Proposed Executive' },
    { key: 'proposed_pm_name', label: 'Proposed PM' },
  ]},
]

function toMultiline(value) {
  if (!value) return ''
  if (Array.isArray(value)) return value.map((v) => String(v).trim()).filter(Boolean).join('\n')
  const raw = String(value).trim()
  if (!raw) return ''
  try {
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) return parsed.map((v) => String(v).trim()).filter(Boolean).join('\n')
  } catch {
    /* plain text */
  }
  return raw
}

function fromMultiline(value) {
  const lines = String(value || '')
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
  return lines.length ? JSON.stringify(lines) : JSON.stringify([])
}

function hasListItems(value) {
  return toMultiline(value)
    .split(/\r?\n/)
    .some((line) => line.trim())
}

export default function ProjectMandateEdit() {
  const { mandateId: mandateIdentifier } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const toast = useToastContext()

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
  const [activeTab, setActiveTab] = useState('details')

  const {
    draftId,
    saveStatus,
    draftCount,
    canCreateDraft,
    autoSave,
  } = useDraftQueue('project_mandate', internalMandateId)

  const [formData, setFormData] = useState({
    mandate_title: '',
    mandate_reference: '',
    project_code: '',
    project_name: '',
    scope: '',
    proposed_executive_name: '',
    proposed_pm_name: '',
    project_objectives: '',
    constraints: '',
    purpose: '',
    background: '',
    outline_business_case: '',
  })

  const fetchMandate = useCallback(async () => {
    if (!mandateIdentifier) return
    try {
      setLoading(true)
      const mandate = await getMandateByIdOrReference(mandateIdentifier)
      if (!mandate) {
        alert('Mandate not found.')
        navigate(listPath)
        return
      }

      const id = mandate.id
      const ref = mandate.mandate_reference || mandate.id
      setInternalMandateId(id)
      setMandateRef(ref)
      setMandateRecord(mandate)

      // Draft/rejected remain editable even when linked to a project (Delivery create flow)
      const canEdit = ['draft', 'rejected'].includes(mandate.document_status)
      setEditable(canEdit)

      if (!canEdit) {
        alert('This mandate cannot be edited. It may be approved or archived.')
        navigate(`${basePath}/${ref}/view`)
        return
      }

      const initialFormData = {
        mandate_title: mandate.mandate_title || '',
        mandate_reference: mandate.mandate_reference || '',
        project_code: mandate.project_code || '',
        project_name: mandate.project_name || '',
        scope: mandate.scope || '',
        proposed_executive_name: mandate.proposed_executive_name || '',
        proposed_pm_name: mandate.proposed_pm_name || '',
        project_objectives: mandate.project_objectives || '',
        constraints: mandate.constraints || '',
        purpose: mandate.purpose || '',
        background: mandate.background || '',
        outline_business_case: mandate.outline_business_case || '',
      }
      setFormData(initialFormData)
      setLoading(false)

      const existingDraft = await checkExistingDraft('project_mandate', id).catch(() => null)
      const draftRecord = existingDraft?.draft_id
        ? await getDraft(existingDraft.draft_id).catch(() => null)
        : null

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
      alert('Error loading mandate: ' + error.message)
      navigate(listPath)
    } finally {
      setLoading(false)
    }
  }, [mandateIdentifier, basePath, navigate, listPath])

  useEffect(() => {
    fetchMandate()
  }, [fetchMandate])

  useEffect(() => {
    if (formData.mandate_title && !loading) {
      const timer = setTimeout(() => {
        autoSave(formData, formData.mandate_title)
      }, 60000)
      return () => clearTimeout(timer)
    }
  }, [formData, loading, autoSave])

  const handleChange = useCallback((e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    if (errors[name]) {
      setErrors((prev) => {
        const next = { ...prev }
        delete next[name]
        return next
      })
    }
  }, [errors])

  const setListField = useCallback((name, multilineValue) => {
    setFormData((prev) => ({ ...prev, [name]: fromMultiline(multilineValue) }))
    if (errors[name]) {
      setErrors((prev) => {
        const next = { ...prev }
        delete next[name]
        return next
      })
    }
  }, [errors])

  const validateForm = () => {
    const newErrors = {}
    if (!formData.mandate_title?.trim()) {
      newErrors.mandate_title = 'Mandate title is required'
    }
    if (!hasListItems(formData.scope)) {
      newErrors.scope = 'Add at least one scope point'
    }
    if (!formData.proposed_executive_name?.trim() && !formData.proposed_pm_name?.trim()) {
      newErrors.proposed_executive_name = 'Name the Executive and/or Project Manager'
    }
    if (!hasListItems(formData.project_objectives)) {
      newErrors.project_objectives = 'Add at least one objective'
    }
    if (!hasListItems(formData.constraints)) {
      newErrors.constraints = 'Add at least one key constraint'
    }
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validateForm()) {
      toast.error('Please fix the validation errors before saving')
      return
    }
    if (saving) return
    setSaving(true)

    const failsafeTimeout = setTimeout(() => {
      setSaving(false)
      toast.error('Save operation timed out. Please try again.')
    }, 60000)

    try {
      const payload = {
        ...formData,
        purpose: formData.purpose?.trim()
          || `Mandate for: ${formData.mandate_title.trim()}`,
        background: formData.background?.trim()
          || toMultiline(formData.scope) || formData.mandate_title.trim(),
        outline_business_case: formData.outline_business_case?.trim()
          || toMultiline(formData.project_objectives) || formData.mandate_title.trim(),
      }
      await updateMandate(internalMandateId, payload, { skipEditCheck: true })

      const existing = await checkExistingDraft('project_mandate', internalMandateId).catch(() => null)
      if (existing?.draft_id) {
        await deleteDraft(existing.draft_id).catch(() => {})
      }

      clearTimeout(failsafeTimeout)
      setSaving(false)
      toast.success('Mandate updated successfully!')
      navigate(`${basePath}/${mandateRef || internalMandateId}/view`)
    } catch (error) {
      clearTimeout(failsafeTimeout)
      setSaving(false)
      toast.error(`Error saving mandate: ${error?.message || 'Unknown error'}`)
    }
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <div className="h-6 w-32 bg-gray-200 dark:bg-gray-700 rounded mb-4 animate-pulse" />
          <div className="h-9 w-80 bg-gray-200 dark:bg-gray-700 rounded mb-2 animate-pulse" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
              <div className="h-6 w-40 bg-gray-200 dark:bg-gray-700 rounded mb-4 animate-pulse" />
              <div className="h-24 w-full bg-gray-100 dark:bg-gray-700/50 rounded animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (!editable) return null

  const inputClasses =
    'w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600'

  return (
    <div className="space-y-6">
      <div>
        <button
          type="button"
          onClick={() => navigate(`${basePath}/${mandateRef || internalMandateId}/view`)}
          className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4 flex items-center transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Mandate
        </button>
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Edit Project Mandate</h1>
              <AutoSaveIndicator status={saveStatus} />
            </div>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              Keep the mandate brief — Scope, Responsibilities, Objectives, and Key constraints.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:pt-1">
            <ExportRecordMenu
              sections={MANDATE_EXPORT_SECTIONS}
              record={formData}
              baseFilename={`Mandate_${formData.mandate_reference || mandateRef || 'Draft'}`}
            />
          </div>
        </div>
      </div>

      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
        <div className="flex items-start">
          <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 mr-2 mt-0.5" />
          <p className="text-blue-800 dark:text-blue-200 text-sm">
            <strong>Note:</strong> Once this mandate is approved, it cannot be edited.
          </p>
        </div>
      </div>

      <div className="mb-6">
        <DetailAuditTabList activeTab={activeTab} onChange={setActiveTab} ariaLabel="Mandate sections" />
      </div>

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
          </AuditCard>
          <AuditCard title="Record history" description="When this mandate was created and last changed.">
            <AuditField label="Created by" value={mandateRecord.creator?.full_name || mandateRecord.creator?.email || null} />
            <AuditTimestampPair dateLabel="Created at" value={mandateRecord.created_at} />
            <AuditField label="Updated by" value={mandateRecord.updater?.full_name || mandateRecord.updater?.email || null} />
            <AuditTimestampPair dateLabel="Last updated" value={mandateRecord.updated_at} />
          </AuditCard>
        </AuditDetailsPanel>
      )}

      {activeTab === 'details' && (
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">Basic Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div>
                <label htmlFor="mandate_reference" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Mandate Code
                </label>
                <input
                  id="mandate_reference"
                  type="text"
                  name="mandate_reference"
                  value={formData.mandate_reference}
                  onChange={handleChange}
                  className={inputClasses}
                  placeholder="e.g., MAN-2026-001"
                  maxLength={50}
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Optional: Auto-generated if not provided
                </p>
              </div>
              <div>
                <label htmlFor="mandate_title" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Mandate Title <span className="text-red-500">*</span>
                </label>
                <input
                  id="mandate_title"
                  type="text"
                  name="mandate_title"
                  value={formData.mandate_title}
                  onChange={handleChange}
                  className={inputClasses}
                  required
                />
                {errors.mandate_title && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.mandate_title}</p>
                )}
              </div>
              <div>
                <label htmlFor="project_code" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Project Code
                </label>
                <input
                  id="project_code"
                  type="text"
                  name="project_code"
                  value={formData.project_code}
                  onChange={handleChange}
                  className={inputClasses}
                  placeholder="Enter project code if known..."
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Optional: May not be available at mandate creation
                </p>
              </div>
              <div>
                <label htmlFor="project_name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Project Name
                </label>
                <input
                  id="project_name"
                  type="text"
                  name="project_name"
                  value={formData.project_name}
                  onChange={handleChange}
                  className={inputClasses}
                  placeholder="Enter project name if known..."
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Optional: May not be available at mandate creation
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-lg font-semibold mb-1 text-gray-900 dark:text-white">Scope</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Outline of what the project is about and what it will deliver.
              </p>
              <MultiLineListInput
                viewModeId="mandate-brief-scope-edit"
                id="mandate_scope_edit"
                value={toMultiline(formData.scope)}
                onChange={(v) => setListField('scope', v)}
                placeholder="e.g. Replace legacy core banking with Temenos T24"
                ariaLabelPrefix="scope point"
                itemColumnLabel="Scope point"
              />
              {errors.scope && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.scope}</p>}
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-lg font-semibold mb-1 text-gray-900 dark:text-white">Responsibilities</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Who is in overall charge (Executive), and who the Project Manager is if already decided.
              </p>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Executive</label>
                  <input
                    type="text"
                    name="proposed_executive_name"
                    value={formData.proposed_executive_name}
                    onChange={handleChange}
                    className={inputClasses}
                    placeholder="Name of the Executive"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Project Manager</label>
                  <input
                    type="text"
                    name="proposed_pm_name"
                    value={formData.proposed_pm_name}
                    onChange={handleChange}
                    className={inputClasses}
                    placeholder="Name of the Project Manager (if known)"
                  />
                </div>
                {errors.proposed_executive_name && (
                  <p className="text-sm text-red-600 dark:text-red-400">{errors.proposed_executive_name}</p>
                )}
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-lg font-semibold mb-1 text-gray-900 dark:text-white">Objectives</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                What the project is expected to achieve.
              </p>
              <MultiLineListInput
                viewModeId="mandate-brief-objectives-edit"
                id="mandate_objectives_edit"
                value={toMultiline(formData.project_objectives)}
                onChange={(v) => setListField('project_objectives', v)}
                placeholder="e.g. Cut account-opening time to same-day"
                ariaLabelPrefix="objective"
                itemColumnLabel="Objective"
              />
              {errors.project_objectives && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.project_objectives}</p>
              )}
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-lg font-semibold mb-1 text-gray-900 dark:text-white">Key constraints</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Limits such as delivery date, maximum budget, or required integrations.
              </p>
              <MultiLineListInput
                viewModeId="mandate-brief-constraints-edit"
                id="mandate_constraints_edit"
                value={toMultiline(formData.constraints)}
                onChange={(v) => setListField('constraints', v)}
                placeholder="e.g. Must go live before end of fiscal year"
                ariaLabelPrefix="constraint"
                itemColumnLabel="Constraint"
              />
              {errors.constraints && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.constraints}</p>
              )}
            </div>
          </div>

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
        </form>
      )}
    </div>
  )
}
