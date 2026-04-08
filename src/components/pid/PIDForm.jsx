/**
 * PID Form Component
 * Wizard-style form for creating/editing Project Initiation Document
 */

import { useState, useEffect } from 'react'
import { FileText, Target, Settings, Users, Gauge, BarChart3, CheckCircle, ArrowRight, ArrowLeft, X, Save, Link as LinkIcon } from 'lucide-react'
import { createPID, updatePID } from '../../services/projectInitiationDocumentService'
import { HoldButton } from '../ui/HoldButton'
import { supabase } from '../../services/supabaseClient'

const FORM_STEPS = [
  { id: 'overview', label: 'Overview', icon: FileText, description: 'Basic information and background' },
  { id: 'definition', label: 'Project Definition', icon: Target, description: 'Definition, scope, and exclusions' },
  { id: 'approach', label: 'Approach', icon: Settings, description: 'Project and management approaches' },
  { id: 'controls', label: 'Controls', icon: BarChart3, description: 'Control mechanisms and reviews' },
  { id: 'plans', label: 'Plans', icon: FileText, description: 'Timeline and budget summary' },
  { id: 'review', label: 'Review', icon: CheckCircle, description: 'Review and complete' },
]

export default function PIDForm({
  projectId,
  pid = null,
  mode = 'create',
  onSave,
  onCancel,
  onHoldComplete,
  saving = false
}) {
  const [activeStep, setActiveStep] = useState(0)
  const [formData, setFormData] = useState({
    pid_title: '',
    pid_description: '',
    project_background: '',
    project_justification: '',
    project_definition: '',
    project_scope: '',
    exclusions: '',
    dependencies: '',
    success_criteria: '',
    project_outcomes: '',
    expected_benefits: '',
    development_approach: '',
    configuration_management_approach: '',
    procurement_approach: '',
    change_control_approach: '',
    control_mechanisms: '',
    stage_boundary_reviews: '',
    timeline_summary: '',
    budget_summary: '',
    version_number: 1,
    release: '',
    document_ref: '',
    status: 'draft'
  })
  const [errors, setErrors] = useState({})
  const [relatedDocs, setRelatedDocs] = useState({
    businessCase: null,
    brief: null,
    mandate: null,
    ppd: null,
    qms: null,
    rms: null,
    cms: null,
    cfgMs: null
  })

  useEffect(() => {
    if (pid) {
      setFormData({
        pid_title: pid.pid_title || '',
        pid_description: pid.pid_description || '',
        project_background: pid.project_background || '',
        project_justification: pid.project_justification || '',
        project_definition: pid.project_definition || '',
        project_scope: pid.project_scope || '',
        exclusions: pid.exclusions || '',
        dependencies: pid.dependencies || '',
        success_criteria: pid.success_criteria || '',
        project_outcomes: pid.project_outcomes || '',
        expected_benefits: pid.expected_benefits || '',
        development_approach: pid.development_approach || '',
        configuration_management_approach: pid.configuration_management_approach || '',
        procurement_approach: pid.procurement_approach || '',
        change_control_approach: pid.change_control_approach || '',
        control_mechanisms: pid.control_mechanisms || '',
        stage_boundary_reviews: pid.stage_boundary_reviews || '',
        timeline_summary: pid.timeline_summary || '',
        budget_summary: pid.budget_summary || '',
        version_number: pid.version_number || 1,
        release: pid.release || '',
        document_ref: pid.document_ref || '',
        status: pid.status || 'draft'
      })
      setRelatedDocs({
        businessCase: pid.business_case_id ? { id: pid.business_case_id, reference: pid.business_case?.business_case_reference } : null,
        brief: pid.project_brief_id ? { id: pid.project_brief_id, reference: pid.project_brief?.brief_reference } : null,
        mandate: pid.project_mandate_id ? { id: pid.project_mandate_id, reference: pid.project_mandate?.mandate_reference } : null,
        ppd: pid.project_product_description_id ? { id: pid.project_product_description_id, reference: pid.project_product_description?.ppd_reference } : null,
        qms: pid.quality_management_strategy_id ? { id: pid.quality_management_strategy_id } : null,
        rms: pid.risk_management_strategy_id ? { id: pid.risk_management_strategy_id } : null,
        cms: pid.communication_management_strategy_id ? { id: pid.communication_management_strategy_id } : null,
        cfgMs: pid.configuration_management_strategy_id ? { id: pid.configuration_management_strategy_id } : null
      })
    } else {
      loadRelatedDocuments()
    }
  }, [pid, projectId])

  const loadRelatedDocuments = async () => {
    try {
      // Load Business Case, Brief, Mandate, PPD if they exist
      const [bcResult, briefResult, mandateResult, ppdResult] = await Promise.all([
        supabase.from('business_cases').select('id, business_case_reference').eq('project_id', projectId).eq('is_deleted', false).order('created_at', { ascending: false }).limit(1).maybeSingle(),
        supabase.from('project_briefs').select('id, brief_reference').eq('project_id', projectId).eq('is_deleted', false).order('created_at', { ascending: false }).limit(1).maybeSingle(),
        supabase.from('project_mandates').select('id, mandate_reference').eq('project_id', projectId).eq('is_deleted', false).order('created_at', { ascending: false }).limit(1).maybeSingle(),
        supabase.from('project_product_descriptions').select('id, ppd_reference').eq('project_id', projectId).eq('is_deleted', false).order('created_at', { ascending: false }).limit(1).maybeSingle()
      ])

      setRelatedDocs(prev => ({
        ...prev,
        businessCase: bcResult.data ? { id: bcResult.data.id, reference: bcResult.data.business_case_reference } : null,
        brief: briefResult.data ? { id: briefResult.data.id, reference: briefResult.data.brief_reference } : null,
        mandate: mandateResult.data ? { id: mandateResult.data.id, reference: mandateResult.data.mandate_reference } : null,
        ppd: ppdResult.data ? { id: ppdResult.data.id, reference: ppdResult.data.ppd_reference } : null
      }))
    } catch (error) {
      console.error('Error loading related documents:', error)
    }
  }

  const handleChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[field]
        return newErrors
      })
    }
  }

  const validateStep = (stepId) => {
    const newErrors = {}
    
    switch (stepId) {
      case 'overview':
        if (!formData.pid_title?.trim()) {
          newErrors.pid_title = 'PID title is required'
        }
        break
      case 'definition':
        if (!formData.project_definition?.trim()) {
          newErrors.project_definition = 'Project definition is required'
        }
        if (!formData.project_scope?.trim()) {
          newErrors.project_scope = 'Project scope is required'
        }
        break
      default:
        break
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleNext = () => {
    if (validateStep(FORM_STEPS[activeStep].id)) {
      if (activeStep < FORM_STEPS.length - 1) {
        setActiveStep(activeStep + 1)
      }
    }
  }

  const handlePrevious = () => {
    if (activeStep > 0) {
      setActiveStep(activeStep - 1)
    }
  }

  const handleSave = async () => {
    if (!validateStep(FORM_STEPS[activeStep].id)) {
      return
    }

    try {
      let result
      if (mode === 'create') {
        result = await createPID(projectId, formData)
      } else {
        result = await updatePID(pid.id, formData)
      }

      if (onSave) {
        onSave(result)
      }
    } catch (error) {
      console.error('Error saving PID:', error)
      alert('Error saving PID: ' + error.message)
    }
  }

  const renderStepContent = () => {
    const step = FORM_STEPS[activeStep]

    switch (step.id) {
      case 'overview':
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                PID Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.pid_title}
                onChange={(e) => handleChange('pid_title', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="Enter PID title"
              />
              {errors.pid_title && (
                <p className="mt-1 text-sm text-red-600">{errors.pid_title}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                PID Description
              </label>
              <textarea
                value={formData.pid_description}
                onChange={(e) => handleChange('pid_description', e.target.value)}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="Describe the Project Initiation Document..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Project Background
              </label>
              <textarea
                value={formData.project_background}
                onChange={(e) => handleChange('project_background', e.target.value)}
                rows={5}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="Provide background context for the project..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Project Justification
              </label>
              <textarea
                value={formData.project_justification}
                onChange={(e) => handleChange('project_justification', e.target.value)}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="Why is this project needed?"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Version Number
                </label>
                <input
                  type="number"
                  value={formData.version_number}
                  onChange={(e) => handleChange('version_number', parseInt(e.target.value) || 1)}
                  min="1"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Release
                </label>
                <input
                  type="text"
                  value={formData.release}
                  onChange={(e) => handleChange('release', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="e.g., 1.0"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Document Reference
                </label>
                <input
                  type="text"
                  value={formData.document_ref}
                  onChange={(e) => handleChange('document_ref', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="Document reference"
                />
              </div>
            </div>

            {(relatedDocs.businessCase || relatedDocs.brief || relatedDocs.mandate || relatedDocs.ppd) && (
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">Related Documents</h4>
                <div className="space-y-2 text-sm">
                  {relatedDocs.businessCase && (
                    <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                      <LinkIcon className="w-4 h-4" />
                      <span>Business Case: {relatedDocs.businessCase.reference}</span>
                    </div>
                  )}
                  {relatedDocs.brief && (
                    <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                      <LinkIcon className="w-4 h-4" />
                      <span>Project Brief: {relatedDocs.brief.reference}</span>
                    </div>
                  )}
                  {relatedDocs.mandate && (
                    <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                      <LinkIcon className="w-4 h-4" />
                      <span>Project Mandate: {relatedDocs.mandate.reference}</span>
                    </div>
                  )}
                  {relatedDocs.ppd && (
                    <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                      <LinkIcon className="w-4 h-4" />
                      <span>Project Product Description: {relatedDocs.ppd.reference}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )

      case 'definition':
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Project Definition <span className="text-red-500">*</span>
              </label>
              <textarea
                value={formData.project_definition}
                onChange={(e) => handleChange('project_definition', e.target.value)}
                rows={6}
                required
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="Define what the project is to deliver..."
              />
              {errors.project_definition && (
                <p className="mt-1 text-sm text-red-600">{errors.project_definition}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Project Scope <span className="text-red-500">*</span>
              </label>
              <textarea
                value={formData.project_scope}
                onChange={(e) => handleChange('project_scope', e.target.value)}
                rows={6}
                required
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="Define the scope of work..."
              />
              {errors.project_scope && (
                <p className="mt-1 text-sm text-red-600">{errors.project_scope}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Exclusions
              </label>
              <textarea
                value={formData.exclusions}
                onChange={(e) => handleChange('exclusions', e.target.value)}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="What is explicitly out of scope..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Dependencies
              </label>
              <textarea
                value={formData.dependencies}
                onChange={(e) => handleChange('dependencies', e.target.value)}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="Key dependencies on other projects or activities..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Success Criteria
              </label>
              <textarea
                value={formData.success_criteria}
                onChange={(e) => handleChange('success_criteria', e.target.value)}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="How will success be measured..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Project Outcomes
              </label>
              <textarea
                value={formData.project_outcomes}
                onChange={(e) => handleChange('project_outcomes', e.target.value)}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="Expected project outcomes..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Expected Benefits
              </label>
              <textarea
                value={formData.expected_benefits}
                onChange={(e) => handleChange('expected_benefits', e.target.value)}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="Expected benefits from the project..."
              />
            </div>
          </div>
        )

      case 'approach':
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Development Approach
              </label>
              <textarea
                value={formData.development_approach}
                onChange={(e) => handleChange('development_approach', e.target.value)}
                rows={5}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="Describe the development approach (e.g., waterfall, agile, hybrid)..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Configuration Management Approach
              </label>
              <textarea
                value={formData.configuration_management_approach}
                onChange={(e) => handleChange('configuration_management_approach', e.target.value)}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="How configuration items will be managed..."
              />
              {relatedDocs.cfgMs && (
                <p className="mt-1 text-xs text-blue-600 dark:text-blue-400">
                  Configuration Management Strategy is linked
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Procurement Approach
              </label>
              <textarea
                value={formData.procurement_approach}
                onChange={(e) => handleChange('procurement_approach', e.target.value)}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="How procurement will be managed..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Change Control Approach
              </label>
              <textarea
                value={formData.change_control_approach}
                onChange={(e) => handleChange('change_control_approach', e.target.value)}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="How changes will be controlled and managed..."
              />
            </div>

            <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-4">
              <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">Management Strategies</h4>
              <p className="text-xs text-gray-600 dark:text-gray-400 mb-3">
                Link to detailed management strategies. These can be configured in the Approach tab after saving.
              </p>
              <div className="space-y-2 text-sm">
                {relatedDocs.qms && (
                  <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                    <LinkIcon className="w-4 h-4" />
                    <span>Quality Management Strategy linked</span>
                  </div>
                )}
                {relatedDocs.rms && (
                  <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                    <LinkIcon className="w-4 h-4" />
                    <span>Risk Management Strategy linked</span>
                  </div>
                )}
                {relatedDocs.cms && (
                  <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                    <LinkIcon className="w-4 h-4" />
                    <span>Communication Management Strategy linked</span>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
              <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">Additional Sections</h4>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                After saving, you can add detailed information in the following sections:
              </p>
              <ul className="mt-2 space-y-1 text-xs text-gray-600 dark:text-gray-400 list-disc list-inside">
                <li>Objectives - Add detailed project objectives</li>
                <li>Interfaces - Define project interfaces</li>
                <li>Dependencies - Manage project dependencies</li>
                <li>Team Structure - Define project management team</li>
                <li>Tolerances - Set tolerance levels</li>
                <li>Reporting Arrangements - Configure reporting</li>
              </ul>
            </div>
          </div>
        )

      case 'controls':
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Control Mechanisms
              </label>
              <textarea
                value={formData.control_mechanisms}
                onChange={(e) => handleChange('control_mechanisms', e.target.value)}
                rows={6}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="Describe the control mechanisms that will be used..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Stage Boundary Reviews
              </label>
              <textarea
                value={formData.stage_boundary_reviews}
                onChange={(e) => handleChange('stage_boundary_reviews', e.target.value)}
                rows={5}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="Describe stage boundary review arrangements..."
              />
            </div>

            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
              <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">Additional Controls</h4>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                After saving, you can configure:
              </p>
              <ul className="mt-2 space-y-1 text-xs text-gray-600 dark:text-gray-400 list-disc list-inside">
                <li>Tolerances - Set detailed tolerance levels for time, cost, quality, scope, risk, and benefits</li>
                <li>Reporting Arrangements - Configure reporting by report type</li>
              </ul>
            </div>
          </div>
        )

      case 'plans':
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Timeline Summary
              </label>
              <textarea
                value={formData.timeline_summary}
                onChange={(e) => handleChange('timeline_summary', e.target.value)}
                rows={5}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="Provide a summary of the project timeline, key milestones, and dates..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Budget Summary
              </label>
              <textarea
                value={formData.budget_summary}
                onChange={(e) => handleChange('budget_summary', e.target.value)}
                rows={5}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="Provide a summary of the project budget, cost estimates, and financial information..."
              />
            </div>

            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
              <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">Detailed Plans</h4>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                For detailed planning, create:
              </p>
              <ul className="mt-2 space-y-1 text-xs text-gray-600 dark:text-gray-400 list-disc list-inside">
                <li>Project Plan - Overall project plan with detailed schedule and budget</li>
                <li>Stage Plans - Detailed plans for each project stage</li>
              </ul>
            </div>
          </div>
        )

      case 'review':
        return (
          <div className="space-y-6">
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Review Summary</h3>
              
              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Overview</h4>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    <p><strong>Title:</strong> {formData.pid_title || 'Not set'}</p>
                    <p><strong>Version:</strong> {formData.version_number || 1}</p>
                    {formData.release && <p><strong>Release:</strong> {formData.release}</p>}
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Completion Status</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      {formData.pid_title ? (
                        <CheckCircle className="w-4 h-4 text-green-600" />
                      ) : (
                        <X className="w-4 h-4 text-red-600" />
                      )}
                      <span className={formData.pid_title ? 'text-gray-600 dark:text-gray-400' : 'text-red-600'}>
                        PID Title
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {formData.project_definition ? (
                        <CheckCircle className="w-4 h-4 text-green-600" />
                      ) : (
                        <X className="w-4 h-4 text-red-600" />
                      )}
                      <span className={formData.project_definition ? 'text-gray-600 dark:text-gray-400' : 'text-red-600'}>
                        Project Definition
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {formData.project_scope ? (
                        <CheckCircle className="w-4 h-4 text-green-600" />
                      ) : (
                        <X className="w-4 h-4 text-red-600" />
                      )}
                      <span className={formData.project_scope ? 'text-gray-600 dark:text-gray-400' : 'text-red-600'}>
                        Project Scope
                      </span>
                    </div>
                  </div>
                </div>

                <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-4">
                  <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">Next Steps</h4>
                  <ul className="text-xs text-gray-600 dark:text-gray-400 space-y-1 list-disc list-inside">
                    <li>Add detailed objectives in the Objectives section</li>
                    <li>Define interfaces and dependencies</li>
                    <li>Configure team structure</li>
                    <li>Set tolerance levels</li>
                    <li>Configure reporting arrangements</li>
                    <li>Link to management strategies (QMS, RMS, CMS, Configuration MS)</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )

      default:
        return null
    }
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
      {/* Header */}
      <div className="border-b border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              {mode === 'create' ? 'Create Project Initiation Document' : 'Edit Project Initiation Document'}
            </h2>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              Step {activeStep + 1} of {FORM_STEPS.length}: {FORM_STEPS[activeStep].description}
            </p>
          </div>
          {onCancel && (
            <button
              onClick={onCancel}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <X className="w-6 h-6" />
            </button>
          )}
        </div>
      </div>

      {/* Step Indicators */}
      <div className="border-b border-gray-200 dark:border-gray-700 p-4 bg-gray-50 dark:bg-gray-900">
        <div className="flex items-center gap-2 overflow-x-auto">
          {FORM_STEPS.map((step, index) => {
            const Icon = step.icon
            const isActive = index === activeStep
            const isCompleted = index < activeStep

            return (
              <button
                key={step.id}
                onClick={() => setActiveStep(index)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm whitespace-nowrap transition-colors ${
                  isActive
                    ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                    : isCompleted
                    ? 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                    : 'bg-white dark:bg-gray-800 text-gray-400 dark:text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{step.label}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Form Content */}
      <div className="p-6">
        {renderStepContent()}
      </div>

      {/* Footer Actions */}
      <div className="border-t border-gray-200 dark:border-gray-700 p-6 flex items-center justify-between">
        <button
          onClick={handlePrevious}
          disabled={activeStep === 0}
          className="px-4 py-2 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Previous
        </button>

        <div className="flex items-center gap-3">
          <HoldButton
            entityType="project_initiation_document"
            entityId={pid?.id}
            formData={formData}
            projectId={projectId}
            onHoldComplete={onHoldComplete || onCancel}
          />
          {onCancel && (
            <button
              onClick={onCancel}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              Cancel
            </button>
          )}
          {activeStep === FORM_STEPS.length - 1 ? (
            <button
              onClick={handleSave}
              disabled={saving || Object.keys(errors).length > 0}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Saving...' : mode === 'create' ? 'Create PID' : 'Save Changes'}
            </button>
          ) : (
            <button
              onClick={handleNext}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
            >
              Next
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
