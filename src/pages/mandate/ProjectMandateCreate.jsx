import { useState, useCallback, useMemo, memo, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { ArrowLeft, Save } from 'lucide-react'
import { createMandate } from '../../services/projectMandateService'
import ObjectivesList from '../../components/mandate/ObjectivesList'
import ScopeList from '../../components/mandate/ScopeList'
import AuthorityList from '../../components/mandate/AuthorityList'
import InterfacesList from '../../components/mandate/InterfacesList'
import QualityExpectationsList from '../../components/mandate/QualityExpectationsList'
import AssociatedDocumentsList from '../../components/mandate/AssociatedDocumentsList'
import StakeholdersListSimple from '../../components/mandate/StakeholdersListSimple'
import ConstraintSelector from '../../components/constraints/ConstraintSelector'
import { bulkCreateConstraints } from '../../services/mandateConstraintService'
import { HoldButton } from '../../components/ui/HoldButton'
import { AutoSaveIndicator } from '../../components/ui/AutoSaveIndicator'
import { useDraftQueue } from '../../hooks/useDraftQueue'

// Pre-load service to avoid dynamic import delay
// Validation rules - moved outside component
const VALIDATION_RULES = {
  mandate_title: { required: true, minLength: 1 },
  purpose: { required: true, minLength: 20 },
  background: { required: true, minLength: 100 },
  project_objectives: { required: true, minCount: 1 }, // Changed to count for array
  outline_business_case: { required: true, minLength: 100 },
}

function ProjectMandateCreate() {
  const navigate = useNavigate()
  const location = useLocation()

  // Detect context from current route - PMO routes start with /pmo
  const isPMOContext = location.pathname.startsWith('/pmo')
  const basePath = isPMOContext ? '/pmo/mandates' : '/platform/mandates'
  const listPath = isPMOContext ? '/pmo/governance/mandate' : '/platform/mandates/list'

  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState({})

  // Draft queue hook for put on hold functionality
  const {
    isDraft,
    draftId,
    saveStatus,
    draftCount,
    canCreateDraft,
    saveDraft: saveToDraftQueue,
    autoSave
  } = useDraftQueue('project_mandate')
  
  const [formData, setFormData] = useState({
    mandate_title: '',
    mandate_reference: '', // Optional: Mandate identification reference (auto-generated if not provided)
    project_code: '', // Optional: Project code if known at mandate creation
    project_name: '', // Optional: Project name if known at mandate creation
    purpose: '',
    authority_responsible: JSON.stringify([]), // Initialize as empty JSON array
    background: '',
    is_standalone: true,
    programme_id: null,
    project_objectives: JSON.stringify([]), // Initialize as empty JSON array
    scope: JSON.stringify([]), // Initialize as empty JSON array
    scope_exclusions: JSON.stringify([]), // Initialize as empty JSON array
    constraints: JSON.stringify([]), // Initialize as empty JSON array
    interfaces: JSON.stringify([]), // Initialize as empty JSON array
    quality_expectations: JSON.stringify([]), // Initialize as empty JSON array
    outline_business_case: '',
    proposed_executive_id: null,
    proposed_executive_name: '',
    proposed_pm_id: null,
    proposed_pm_name: '',
    associated_documents: JSON.stringify([]), // Initialize as empty JSON array - Section 10
    stakeholders: JSON.stringify([]), // Initialize as empty JSON array - Section 12
    document_status: 'draft',
  })
  
  // Structured constraints (for new ConstraintSelector)
  const [structuredConstraints, setStructuredConstraints] = useState([])

  // Auto-save form data periodically
  useEffect(() => {
    if (formData.mandate_title) {
      const timer = setTimeout(() => {
        autoSave(formData, formData.mandate_title)
      }, 60000) // 60 seconds
      return () => clearTimeout(timer)
    }
  }, [formData, autoSave])

  // Memoized handlers to prevent re-renders
  const handleChange = useCallback((e) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : (type === 'number' ? parseFloat(value) || null : value)
    }))
    // Clear error for this field immediately on change
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[name]
        return newErrors
      })
    }
  }, [errors])

  // Optimized validation with memoization
  const validateForm = useCallback(() => {
    const newErrors = {}
    
    // Fast validation using pre-defined rules
    for (const [field, rule] of Object.entries(VALIDATION_RULES)) {
      if (field === 'project_objectives') {
        // Special handling for objectives array
        let objectives = []
        try {
          const parsed = JSON.parse(formData[field] || '[]')
          objectives = Array.isArray(parsed) ? parsed : []
        } catch {
          objectives = formData[field]?.trim() ? [formData[field]] : []
        }
        
        if (rule.required && objectives.length === 0) {
          newErrors[field] = 'At least one project objective is required'
        } else if (rule.minCount && objectives.length < rule.minCount) {
          newErrors[field] = `At least ${rule.minCount} project objective${rule.minCount > 1 ? 's' : ''} required`
        }
      } else {
        const value = formData[field]?.trim() || ''
        if (rule.required && !value) {
          newErrors[field] = `${field.replace('_', ' ')} is required`
        } else if (value && rule.minLength && value.length < rule.minLength) {
          newErrors[field] = `${field.replace('_', ' ')} must be at least ${rule.minLength} characters`
        }
      }
    }
    
    // Special validation for Section 11: Proposed Roles
    // At least one of Executive or PM should be specified (recommended for approval)
    const hasExecutive = formData.proposed_executive_id || formData.proposed_executive_name?.trim()
    const hasPM = formData.proposed_pm_id || formData.proposed_pm_name?.trim()
    if (!hasExecutive && !hasPM) {
      // Warning only, not blocking for draft
      // This will be enforced at submission/approval stage
    }
    
    // Special validation for Section 7: Interfaces (required if not standalone)
    if (formData.is_standalone === false && !formData.interfaces?.trim()) {
      newErrors.interfaces = 'Interfaces are required for programme-linked projects'
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }, [formData])

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault()
    if (!validateForm()) return

    try {
      setSaving(true)
      // Service is pre-loaded, no dynamic import delay
      const mandate = await createMandate(formData)
      
      // Save structured constraints if any
      if (structuredConstraints.length > 0) {
        try {
          const constraintsToSave = structuredConstraints.map(c => ({
            constraint_category_id: c.constraint_category_id || c.constraint_category?.id,
            operand: c.operand,
            value_numeric: c.value_numeric,
            value_min: c.value_min,
            value_max: c.value_max,
            value_text: c.value_text,
            value_date: c.value_date,
            unit: c.unit,
            notes: c.notes
          }))
          
          await bulkCreateConstraints(mandate.id, constraintsToSave)
        } catch (constraintError) {
          console.warn('Error saving constraints:', constraintError)
          // Don't fail mandate creation if constraints fail
        }
      }
      
      navigate(`${basePath}/${mandate.id}/view`, {
        replace: true,
        state: { message: 'Mandate created successfully!' }
      })
    } catch (error) {
      console.error('Error creating mandate:', error)
      setErrors({ submit: error.message || 'Error creating mandate' })
    } finally {
      setSaving(false)
    }
  }, [formData, structuredConstraints, validateForm, navigate])

  const handleCancel = useCallback(() => {
    navigate(listPath, { replace: true })
  }, [navigate, listPath])

  // Memoized error class computation
  const getErrorClass = useCallback((fieldName) => {
    return errors[fieldName] 
      ? 'border-red-500 focus:ring-red-500 focus:border-red-500' 
      : 'border-gray-300 dark:border-gray-600 focus:ring-blue-500 focus:border-blue-500'
  }, [errors])

  // Memoized common input classes
  const inputClasses = useMemo(() => 
    'w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-colors',
    []
  )

  const textareaClasses = useMemo(() => 
    'w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-colors resize-y',
    []
  )

  return (
    <div className="space-y-6">
      <div>
        <button
          onClick={handleCancel}
          className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4 flex items-center transition-colors"
          aria-label="Back to mandates list"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Mandates
        </button>
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Create Project Mandate</h1>
          <AutoSaveIndicator status={saveStatus} />
        </div>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Create a new project mandate to initiate a project. This is a pre-project document.
        </p>
      </div>

      {errors.submit && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-red-800 dark:text-red-200 text-sm">{errors.submit}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6" noValidate>
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
                className={`${inputClasses} ${getErrorClass('mandate_reference')}`}
                placeholder="e.g., MAN-2026-001"
                maxLength={50}
              />
              {errors.mandate_reference && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.mandate_reference}</p>
              )}
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
                className={`${inputClasses} ${getErrorClass('mandate_title')}`}
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
                className={`${inputClasses} ${getErrorClass('project_code')}`}
                placeholder="Enter project code if known..."
              />
              {errors.project_code && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.project_code}</p>
              )}
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
                className={`${inputClasses} ${getErrorClass('project_name')}`}
                placeholder="Enter project name if known..."
              />
              {errors.project_name && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.project_name}</p>
              )}
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Optional: May not be available at mandate creation
              </p>
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
                className={`${textareaClasses} ${getErrorClass('purpose')}`}
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
                className={`${textareaClasses} ${getErrorClass('background')}`}
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
                mandateId={null} // null for create mode
                constraints={structuredConstraints}
                onChange={setStructuredConstraints}
                readOnly={false}
                errors={errors}
                isSimulator={false}
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
              {formData.is_standalone === false && (
                <p className="mt-2 text-xs text-amber-600 dark:text-amber-400">
                  Interfaces are required for programme-linked projects
                </p>
              )}
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
                className={`${textareaClasses} ${getErrorClass('outline_business_case')}`}
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
                    className={`${inputClasses} ${getErrorClass('proposed_executive_name')}`}
                    placeholder="Name of proposed Executive (or select from users if available)"
                  />
                  {errors.proposed_executive_name && (
                    <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.proposed_executive_name}</p>
                  )}
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
                    className={`${inputClasses} ${getErrorClass('proposed_pm_name')}`}
                    placeholder="Name of proposed Project Manager (or select from users if available)"
                  />
                  {errors.proposed_pm_name && (
                    <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.proposed_pm_name}</p>
                  )}
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  At least one role (Executive or PM) should be specified for project creation
                </p>
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
            {saving ? 'Saving...' : 'Save Draft'}
          </button>
        </div>
      </form>
    </div>
  )
}

export default memo(ProjectMandateCreate)
