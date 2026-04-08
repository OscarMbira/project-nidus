import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { ArrowLeft, Save, AlertCircle } from 'lucide-react'
import { getMandateByIdOrReference, updateMandate, getStakeholders, getAssociatedDocuments } from '../../services/projectMandateService'
import { getConstraintsByMandate, bulkCreateConstraints, hardDeleteConstraint } from '../../services/mandateConstraintService'
import { getConstraintCategories } from '../../services/constraintCategoryService'
import ConstraintSelector from '../../components/constraints/ConstraintSelector'
import ObjectivesList from '../../components/mandate/ObjectivesList'
import ScopeList from '../../components/mandate/ScopeList'
import AuthorityList from '../../components/mandate/AuthorityList'
import InterfacesList from '../../components/mandate/InterfacesList'
import QualityExpectationsList from '../../components/mandate/QualityExpectationsList'
import AssociatedDocumentsList from '../../components/mandate/AssociatedDocumentsList'
import StakeholdersListSimple from '../../components/mandate/StakeholdersListSimple'
import { HoldButton } from '../../components/ui/HoldButton'
import { AutoSaveIndicator } from '../../components/ui/AutoSaveIndicator'
import { useDraftQueue } from '../../hooks/useDraftQueue'
import { useToastContext } from '../../context/ToastContext'
import { checkExistingDraft, getDraft, deleteDraft } from '../../services/draftQueueService'

export default function ProjectMandateEdit() {
  const { mandateId: mandateIdentifier } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const toast = useToastContext()

  // Detect context from current route - PMO routes start with /pmo
  const isPMOContext = location.pathname.startsWith('/pmo')
  const basePath = isPMOContext ? '/pmo/mandates' : '/platform/mandates'

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState({})
  const [editable, setEditable] = useState(false)
  const [internalMandateId, setInternalMandateId] = useState(null)
  const [mandateRef, setMandateRef] = useState(null)

  // Draft queue hook - uses internal UUID once resolved
  const {
    isDraft,
    draftId,
    saveStatus,
    draftCount,
    canCreateDraft,
    saveDraft: saveToDraftQueue,
    autoSave
  } = useDraftQueue('project_mandate', internalMandateId)

  const [formData, setFormData] = useState({
    mandate_title: '',
    mandate_reference: '',
    purpose: '',
    authority_responsible: '',
    background: '',
    project_objectives: '',
    scope: '',
    scope_exclusions: '',
    interfaces: '',
    quality_expectations: '',
    quality_priority: 'balanced',
    outline_business_case: '',
    proposed_executive_name: '',
    proposed_pm_name: '',
  })
  
  // Structured constraints and prefetched categories (avoids ConstraintSelector mount delay)
  const [structuredConstraints, setStructuredConstraints] = useState([])
  const [prefetchedCategories, setPrefetchedCategories] = useState([])

  const fetchMandate = useCallback(async () => {
    if (!mandateIdentifier) return
    try {
      setLoading(true)

      // Wave 1: Single round-trip - mandate only. Show form immediately after.
      const mandate = await getMandateByIdOrReference(mandateIdentifier)
      if (!mandate) {
        alert('Mandate not found.')
        navigate(isPMOContext ? '/pmo/governance/mandate' : '/platform/mandates/list')
        return
      }

      const id = mandate.id
      const ref = mandate.mandate_reference || mandate.id
      setInternalMandateId(id)
      setMandateRef(ref)

      // Derive canEdit from mandate (avoids redundant getMandateById in isEditable)
      const canEdit = ['draft', 'rejected'].includes(mandate.document_status) && !mandate.project_id
      setEditable(canEdit)

      if (!canEdit) {
        alert('This mandate cannot be edited. It may be approved, archived, or linked to a project.')
        navigate(`${basePath}/${ref}/view`)
        return
      }

      // Show form immediately with mandate data (empty stakeholders/documents/constraints)
      const initialFormData = {
        mandate_title: mandate.mandate_title || '',
        mandate_reference: mandate.mandate_reference || '',
        purpose: mandate.purpose || '',
        authority_responsible: mandate.authority_responsible || '',
        background: mandate.background || '',
        project_objectives: mandate.project_objectives || '',
        scope: mandate.scope || '',
        scope_exclusions: mandate.scope_exclusions || '',
        interfaces: mandate.interfaces || '',
        quality_expectations: mandate.quality_expectations || '',
        quality_priority: mandate.quality_priority || 'balanced',
        outline_business_case: mandate.outline_business_case || '',
        proposed_executive_name: mandate.proposed_executive_name || '',
        proposed_pm_name: mandate.proposed_pm_name || '',
        stakeholders: '',
        associated_documents: ''
      }
      setFormData(initialFormData)
      setStructuredConstraints([])
      setLoading(false)

      // Wave 2: Load secondary data in background (non-blocking)
      const CONSTRAINT_TIMEOUT_MS = 2000
      const constraintsPromise = Promise.race([
        getConstraintsByMandate(id),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Constraints load timed out')), CONSTRAINT_TIMEOUT_MS))
      ]).then(r => (r?.success ? r : { success: false })).catch(() => ({ success: false }))

      const [existingDraft, constraintsResult, stakeholdersData, documentsData, categoriesResult] = await Promise.all([
        checkExistingDraft('project_mandate', id).catch(() => null),
        constraintsPromise,
        getStakeholders(id).catch(() => []),
        getAssociatedDocuments(id).catch(() => []),
        getConstraintCategories().catch(() => ({ success: false, data: [] }))
      ])

      const draftRecord = existingDraft?.draft_id
        ? await getDraft(existingDraft.draft_id).catch(() => null)
        : null

      const nextFormData = {
        ...initialFormData,
        stakeholders: stakeholdersData?.length > 0 ? JSON.stringify(stakeholdersData) : '',
        associated_documents: documentsData?.length > 0 ? JSON.stringify(documentsData) : ''
      }

      let nextConstraints = constraintsResult.success && constraintsResult.data ? constraintsResult.data : []

      const mandateUpdated = mandate.updated_at ? new Date(mandate.updated_at).getTime() : 0
      const draftUpdated = draftRecord?.last_saved_at ? new Date(draftRecord.last_saved_at).getTime() : (draftRecord?.updated_at ? new Date(draftRecord.updated_at).getTime() : 0)
      const draftIsNewer = draftUpdated > mandateUpdated

      if (draftIsNewer && draftRecord?.form_data && typeof draftRecord.form_data === 'object') {
        const { structuredConstraints: savedConstraints, ...restFormData } = draftRecord.form_data
        Object.assign(nextFormData, restFormData)
        if (Array.isArray(savedConstraints)) nextConstraints = savedConstraints
      }

      setFormData(nextFormData)
      setStructuredConstraints(nextConstraints)
      setPrefetchedCategories(categoriesResult?.success ? (categoriesResult.data || []) : [])
    } catch (error) {
      console.error('Error fetching mandate:', error)
      alert('Error loading mandate: ' + error.message)
      navigate(isPMOContext ? '/pmo/governance/mandate' : '/platform/mandates/list')
    } finally {
      setLoading(false)
    }
  }, [mandateIdentifier, basePath, navigate, isPMOContext])

  useEffect(() => {
    fetchMandate()
  }, [fetchMandate])

  // Auto-save form data periodically (debounced 60s)
  useEffect(() => {
    if (formData.mandate_title && !loading) {
      const timer = setTimeout(() => {
        autoSave(formData, formData.mandate_title)
      }, 60000)
      return () => clearTimeout(timer)
    }
  }, [formData, loading, autoSave])

  const handleChange = useCallback((e) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : (type === 'number' ? parseFloat(value) || null : value)
    }))
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[name]
        return newErrors
      })
    }
  }, [errors])

  const validateForm = () => {
    const newErrors = {}
    if (!formData.mandate_title?.trim()) {
      newErrors.mandate_title = 'Mandate title is required'
    }
    if (!formData.purpose?.trim() || formData.purpose.length < 20) {
      newErrors.purpose = 'Purpose is required (minimum 20 characters)'
    }
    if (!formData.background?.trim() || formData.background.length < 100) {
      newErrors.background = 'Background is required (minimum 100 characters)'
    }
    if (!formData.project_objectives?.trim() || formData.project_objectives.length < 100) {
      newErrors.project_objectives = 'Project objectives are required (minimum 100 characters)'
    }
    if (!formData.outline_business_case?.trim() || formData.outline_business_case.length < 100) {
      newErrors.outline_business_case = 'Outline business case is required (minimum 100 characters)'
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

    // Prevent double submission
    if (saving) return

    setSaving(true)

    // FAILSAFE: Force reset saving state after 60 seconds no matter what
    const failsafeTimeout = setTimeout(() => {
      setSaving(false)
      toast.error('Save operation timed out. Please try again.')
    }, 60000)

    try {
      // Run mandate update and constraint sync in parallel for faster save
      const mandatePromise = updateMandate(internalMandateId, formData, { skipEditCheck: true })

      const constraintPromise = (async () => {
        const CONSTRAINT_TIMEOUT_MS = 8000
        try {
          await Promise.race([
            (async () => {
              const existingResult = await getConstraintsByMandate(internalMandateId)
              const existingConstraints = existingResult?.success ? (existingResult.data || []) : []

              const toDelete = existingConstraints.filter(c => c?.id)
              if (toDelete.length > 0) {
                await Promise.all(toDelete.map(c =>
                  hardDeleteConstraint(c.id).catch(() => ({}))
                ))
              }

              const toSave = (structuredConstraints || [])
                .filter(c => c?.constraint_category_id || c?.constraint_category?.id)
                .map(c => ({
                  constraint_category_id: c.constraint_category_id || c.constraint_category?.id,
                  operand: c.operand || null,
                  value_numeric: c.value_numeric ?? null,
                  value_min: c.value_min ?? null,
                  value_max: c.value_max ?? null,
                  value_text: c.value_text || null,
                  value_date: c.value_date || null,
                  unit: c.unit || null,
                  notes: c.notes || null
                }))

              if (toSave.length > 0) {
                await bulkCreateConstraints(internalMandateId, toSave)
              }
            })(),
            new Promise((_, reject) =>
              setTimeout(() => reject(new Error('Constraint sync timed out')), CONSTRAINT_TIMEOUT_MS)
            )
          ])
        } catch {
          // Don't fail the whole save for constraint issues
        }
      })()

      await Promise.all([mandatePromise, constraintPromise])

      // Clear any draft for this mandate so next edit load shows fresh DB data (not stale draft)
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

  // Skeleton layout for instant display (page shell visible in ms)
  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <div className="h-6 w-32 bg-gray-200 dark:bg-gray-700 rounded mb-4 animate-pulse" />
          <div className="h-9 w-80 bg-gray-200 dark:bg-gray-700 rounded mb-2 animate-pulse" />
          <div className="h-4 w-96 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
        </div>
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
          <div className="h-4 w-full bg-blue-200/50 dark:bg-blue-800/30 rounded animate-pulse" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
              <div className="h-6 w-40 bg-gray-200 dark:bg-gray-700 rounded mb-4 animate-pulse" />
              <div className="space-y-3">
                <div className="h-24 bg-gray-100 dark:bg-gray-700/50 rounded animate-pulse" />
                <div className="h-24 bg-gray-100 dark:bg-gray-700/50 rounded animate-pulse" />
              </div>
            </div>
          ))}
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <div className="h-10 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
          <div className="h-10 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
        </div>
      </div>
    )
  }

  if (!editable) {
    return null // Will redirect
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <button
          onClick={() => navigate(`${basePath}/${mandateRef || internalMandateId}/view`)}
          className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4 flex items-center"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Mandate
        </button>
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Edit Project Mandate</h1>
          <AutoSaveIndicator status={saveStatus} />
        </div>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Update the mandate details. Only draft and rejected mandates can be edited.
        </p>
      </div>

      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
        <div className="flex items-start">
          <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 mr-2 mt-0.5" />
          <p className="text-blue-800 dark:text-blue-200 text-sm">
            <strong>Note:</strong> Once this mandate is approved or linked to a project, it cannot be edited.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information - Full Width */}
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
                className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${
                  errors.mandate_reference ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                }`}
                placeholder="e.g., MAN-2026-001"
                maxLength={50}
              />
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
                className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${
                  errors.mandate_title ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                }`}
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
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="Enter project code if known..."
              />
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
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="Enter project name if known..."
              />
            </div>
          </div>
        </div>

        {/* 2-Column Layout for Main Form Sections - Chronological Order (1-12) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column - Sections 1, 2, 3, 4, 5, 6 */}
          <div className="space-y-6">
            {/* Section 1: Purpose */}
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">1. Purpose</h2>
              <textarea
                name="purpose"
                value={formData.purpose}
                onChange={handleChange}
                rows={4}
                className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${
                  errors.purpose ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                }`}
                placeholder="Document purpose and intent..."
                required
              />
              {errors.purpose && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.purpose}</p>
              )}
            </div>

            {/* Section 2: Authority */}
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">2. Authority</h2>
              <AuthorityList
                authorities={formData.authority_responsible}
                onChange={handleChange}
                errors={errors}
                placeholder="Enter an authority (e.g., 'Board of Directors', 'CEO', 'Finance Department')..."
              />
            </div>

            {/* Section 3: Background */}
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">3. Background</h2>
              <textarea
                name="background"
                value={formData.background}
                onChange={handleChange}
                rows={4}
                className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${
                  errors.background ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                }`}
                placeholder="Context and need for project..."
                required
              />
              {errors.background && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.background}</p>
              )}
            </div>

            {/* Section 4: Project Objectives */}
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">4. Project Objectives</h2>
              <ObjectivesList
                objectives={formData.project_objectives}
                onChange={handleChange}
                errors={errors}
                placeholder="Enter a measurable objective (e.g., 'Reduce processing time by 50% by Q2 2026')..."
              />
            </div>

            {/* Section 5: Scope */}
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">5. Scope</h2>
              <ScopeList
                scopeItems={formData.scope}
                scopeExclusions={formData.scope_exclusions}
                onChange={handleChange}
                errors={errors}
              />
            </div>

            {/* Section 6: Constraints */}
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">6. Constraints</h2>
              <ConstraintSelector
                mandateId={internalMandateId}
                constraints={structuredConstraints}
                onChange={setStructuredConstraints}
                readOnly={false}
                errors={errors}
                initialCategories={prefetchedCategories}
              />
            </div>
          </div>

          {/* Right Column - Sections 7, 8, 9, 10, 11, 12 */}
          <div className="space-y-6">
            {/* Section 7: Interfaces */}
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">7. Interfaces</h2>
              <InterfacesList
                interfaces={formData.interfaces}
                onChange={handleChange}
                errors={errors}
                placeholder="Enter an interface (e.g., 'Integration with CRM system', 'Dependency on HR project')..."
              />
            </div>

            {/* Section 8: Quality Expectations */}
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">8. Quality Expectations</h2>
              <QualityExpectationsList
                expectations={formData.quality_expectations}
                onChange={handleChange}
                errors={errors}
                placeholder="Enter a quality expectation (e.g., 'ISO 9001 compliance', '99.9% uptime', 'Zero security breaches')..."
              />
            </div>

            {/* Section 9: Outline Business Case */}
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">9. Outline Business Case</h2>
              <textarea
                name="outline_business_case"
                value={formData.outline_business_case}
                onChange={handleChange}
                rows={4}
                className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${
                  errors.outline_business_case ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                }`}
                placeholder="High-level business justification..."
                required
              />
              {errors.outline_business_case && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.outline_business_case}</p>
              )}
            </div>

            {/* Section 10: Associated Documents */}
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">10. Associated Documents</h2>
              <AssociatedDocumentsList
                documents={formData.associated_documents}
                onChange={handleChange}
                errors={errors}
              />
            </div>

            {/* Section 11: Proposed Roles */}
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">11. Proposed Roles</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Proposed Executive
                  </label>
                  <input
                    type="text"
                    name="proposed_executive_name"
                    value={formData.proposed_executive_name}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="Name of proposed Executive (or select from users if available)"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Proposed Project Manager
                  </label>
                  <input
                    type="text"
                    name="proposed_pm_name"
                    value={formData.proposed_pm_name}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="Name of proposed Project Manager (or select from users if available)"
                  />
                </div>
              </div>
            </div>

            {/* Section 12: Customers/Users/Stakeholders */}
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">12. Customers/Users/Stakeholders</h2>
              <StakeholdersListSimple
                stakeholders={formData.stakeholders}
                onChange={handleChange}
                errors={errors}
              />
            </div>
          </div>
        </div>

        {/* Form Actions */}
        <div className="flex justify-end space-x-4">
          <HoldButton
            entityType="project_mandate"
            entityId={internalMandateId}
            formData={{ ...formData, structuredConstraints }}
            onHoldComplete={() => {
              toast.success('Mandate put on hold')
              navigate(isPMOContext ? '/pmo/governance/mandate' : '/platform/mandates/list')
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
    </div>
  )
}
