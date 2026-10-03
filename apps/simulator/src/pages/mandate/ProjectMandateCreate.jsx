import { useState, useCallback, useMemo, memo, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { ArrowLeft, Save } from 'lucide-react'
import { createMandate } from '../../services/projectMandateService'
import MultiLineListInput from '@nidus/ui/MultiLineListInput'
import { HoldButton } from '@nidus/ui/HoldButton'
import { AutoSaveIndicator } from '@nidus/ui/AutoSaveIndicator'
import { useDraftQueue } from '@nidus/shared/hooks/useDraftQueue'
import DetailAuditTabList from '@nidus/ui/DetailAuditTabList'
import { usePlatformProjectId } from '../../hooks/usePlatformProjectId'
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

/** Convert JSON-array / legacy text columns ↔ newline-joined MultiLineListInput value. */
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

function ProjectMandateCreate() {
  const navigate = useNavigate()
  const location = useLocation()
  const { projectId: currentProjectId } = usePlatformProjectId()

  const isPMOContext = location.pathname.startsWith('/pmo')
  const basePath = isPMOContext ? '/pmo/mandates' : '/platform/mandates'
  const listPath = isPMOContext ? '/pmo/governance/mandate' : '/platform/mandates/list'

  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState({})
  const [activeTab, setActiveTab] = useState('details')

  const {
    draftId,
    saveStatus,
    draftCount,
    canCreateDraft,
    autoSave,
  } = useDraftQueue('project_mandate')

  const [formData, setFormData] = useState({
    mandate_title: '',
    mandate_reference: '',
    project_code: '',
    project_name: '',
    project_id: null,
    // Brief mandate content (guide: Scope / Responsibilities / Objectives / Key constraints)
    scope: JSON.stringify([]),
    proposed_executive_name: '',
    proposed_pm_name: '',
    project_objectives: JSON.stringify([]),
    constraints: JSON.stringify([]),
    // Legacy NOT NULL columns — kept blank; expanded later in Brief / PID
    purpose: '',
    authority_responsible: JSON.stringify([]),
    background: '',
    scope_exclusions: JSON.stringify([]),
    interfaces: JSON.stringify([]),
    quality_expectations: JSON.stringify([]),
    outline_business_case: '',
    is_standalone: true,
    programme_id: null,
    document_status: 'draft',
  })

  useEffect(() => {
    if (currentProjectId) {
      setFormData((prev) => ({ ...prev, project_id: currentProjectId }))
    }
  }, [currentProjectId])

  useEffect(() => {
    if (formData.mandate_title) {
      const timer = setTimeout(() => {
        autoSave(formData, formData.mandate_title)
      }, 60000)
      return () => clearTimeout(timer)
    }
  }, [formData, autoSave])

  const handleChange = useCallback((e) => {
    const { name, value, type, checked } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }))
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

  const validateForm = useCallback(() => {
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
  }, [formData])

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault()
    if (!validateForm()) return

    try {
      setSaving(true)
      // Satisfy legacy NOT NULL columns with brief-friendly placeholders derived from the four fields
      const payload = {
        ...formData,
        purpose: formData.purpose?.trim()
          || `Mandate for: ${formData.mandate_title.trim()}`,
        background: formData.background?.trim()
          || toMultiline(formData.scope) || formData.mandate_title.trim(),
        outline_business_case: formData.outline_business_case?.trim()
          || toMultiline(formData.project_objectives) || formData.mandate_title.trim(),
        project_id: formData.project_id || currentProjectId || null,
      }
      const mandate = await createMandate(payload)
      navigate(`${basePath}/${mandate.mandate_reference || mandate.id}/view`, {
        replace: true,
        state: { message: 'Mandate created successfully!' },
      })
    } catch (error) {
      console.error('Error creating mandate:', error)
      setErrors({ submit: error.message || 'Error creating mandate' })
    } finally {
      setSaving(false)
    }
  }, [formData, currentProjectId, validateForm, navigate, basePath])

  const handleCancel = useCallback(() => {
    navigate(listPath, { replace: true })
  }, [navigate, listPath])

  const inputClasses = useMemo(
    () =>
      'w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600 focus:ring-blue-500 focus:border-blue-500 transition-colors',
    [],
  )

  return (
    <div className="space-y-6">
      <div>
        <button
          type="button"
          onClick={handleCancel}
          className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4 flex items-center transition-colors"
          aria-label="Back to mandates list"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Mandates
        </button>
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Create Project Mandate</h1>
              <AutoSaveIndicator status={saveStatus} />
            </div>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              A brief pre-project mandate — capture only the key information needed to start.
              Formal approval is optional (verbal or statement instruction is allowed).
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:pt-1">
            <ExportRecordMenu
              sections={MANDATE_EXPORT_SECTIONS}
              record={formData}
              baseFilename={`Mandate_${formData.mandate_reference || formData.mandate_title || 'Draft'}`}
            />
          </div>
        </div>
      </div>

      {errors.submit && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-red-800 dark:text-red-200 text-sm">{errors.submit}</p>
        </div>
      )}

      <DetailAuditTabList activeTab={activeTab} onChange={setActiveTab} ariaLabel="Mandate sections" />

      {activeTab === 'audit' && (
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Audit details appear after this mandate is saved.
        </p>
      )}

      {activeTab === 'details' && (
        <form onSubmit={handleSubmit} className="space-y-6" noValidate>
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
                  placeholder="Short descriptive title"
                  required
                  autoFocus
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
            <p className="mt-4 text-sm text-gray-600 dark:text-gray-400">
              Capture these key bits of information for the mandate:
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Scope */}
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-lg font-semibold mb-1 text-gray-900 dark:text-white">Scope</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Outline of what the project is about and what it will deliver. One point per line.
              </p>
              <MultiLineListInput
                viewModeId="mandate-brief-scope"
                id="mandate_scope"
                value={toMultiline(formData.scope)}
                onChange={(v) => setListField('scope', v)}
                placeholder="e.g. Replace legacy core banking with Temenos T24 for retail deposits"
                ariaLabelPrefix="scope point"
                itemColumnLabel="Scope point"
              />
              {errors.scope && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.scope}</p>
              )}
            </div>

            {/* Responsibilities */}
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-lg font-semibold mb-1 text-gray-900 dark:text-white">Responsibilities</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Who is in overall charge (Executive), and who the Project Manager is if already decided.
              </p>
              <div className="space-y-4">
                <div>
                  <label htmlFor="proposed_executive_name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Executive
                  </label>
                  <input
                    id="proposed_executive_name"
                    type="text"
                    name="proposed_executive_name"
                    value={formData.proposed_executive_name}
                    onChange={handleChange}
                    className={inputClasses}
                    placeholder="Name of the Executive"
                  />
                </div>
                <div>
                  <label htmlFor="proposed_pm_name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Project Manager
                  </label>
                  <input
                    id="proposed_pm_name"
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

            {/* Objectives */}
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-lg font-semibold mb-1 text-gray-900 dark:text-white">Objectives</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                What the project is expected to achieve (savings, faster service, and so on). One per line.
              </p>
              <MultiLineListInput
                viewModeId="mandate-brief-objectives"
                id="mandate_objectives"
                value={toMultiline(formData.project_objectives)}
                onChange={(v) => setListField('project_objectives', v)}
                placeholder="e.g. Cut account-opening time from 5 days to same-day"
                ariaLabelPrefix="objective"
                itemColumnLabel="Objective"
              />
              {errors.project_objectives && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.project_objectives}</p>
              )}
            </div>

            {/* Key constraints */}
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-lg font-semibold mb-1 text-gray-900 dark:text-white">Key constraints</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Limits such as an absolute delivery date, maximum budget, or required integrations. One per line.
              </p>
              <MultiLineListInput
                viewModeId="mandate-brief-constraints"
                id="mandate_constraints"
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
              formData={formData}
              onHoldComplete={() => navigate(listPath)}
              disabled={!canCreateDraft && !draftId}
              draftCount={draftCount}
            />
            <button
              type="button"
              onClick={handleCancel}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              disabled={saving}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center transition-colors"
            >
              <Save className="w-4 h-4 mr-2" />
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      )}
    </div>
  )
}

export default memo(ProjectMandateCreate)
