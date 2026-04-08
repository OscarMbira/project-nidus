import { useState, useEffect } from 'react'
import { supabase } from '../../services/supabaseClient'
import { X, Save, FileText, Settings, Target, BarChart3, Shield, Users, Calendar, CheckCircle, ArrowRight, ArrowLeft } from 'lucide-react'
import { createQMS, updateQMS, createQMSForProject } from '../../services/qualityManagementStrategyService'
import { HoldButton } from '../ui/HoldButton'

export default function QMSForm({ qms, projectId, onSave, onCancel, onHoldComplete }) {
  const [formData, setFormData] = useState({
    purpose: '',
    objectives: '',
    scope: '',
    strategy_responsibility: '',
    quality_planning_approach: '',
    quality_control_approach: '',
    quality_assurance_approach: '',
    variance_from_corporate: '',
    variance_justification: '',
    customer_qms_reference: '',
    supplier_qms_reference: '',
    corporate_quality_policy_reference: '',
    programme_quality_policy_reference: '',
    author_id: '',
    owner_id: '',
    client_id: '',
    status: 'draft'
  })
  const [teamMembers, setTeamMembers] = useState([])
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState({})
  const [activeStep, setActiveStep] = useState(1)

  const steps = [
    { id: 1, title: 'Introduction', icon: FileText },
    { id: 2, title: 'Quality Procedures', icon: Settings },
    { id: 3, title: 'References', icon: Shield },
    { id: 4, title: 'Ownership', icon: Users },
    { id: 5, title: 'Review', icon: CheckCircle }
  ]

  useEffect(() => {
    fetchTeamMembers()

    if (qms) {
      setFormData({
        purpose: qms.purpose || '',
        objectives: qms.objectives || '',
        scope: qms.scope || '',
        strategy_responsibility: qms.strategy_responsibility || '',
        quality_planning_approach: qms.quality_planning_approach || '',
        quality_control_approach: qms.quality_control_approach || '',
        quality_assurance_approach: qms.quality_assurance_approach || '',
        variance_from_corporate: qms.variance_from_corporate || '',
        variance_justification: qms.variance_justification || '',
        customer_qms_reference: qms.customer_qms_reference || '',
        supplier_qms_reference: qms.supplier_qms_reference || '',
        corporate_quality_policy_reference: qms.corporate_quality_policy_reference || '',
        programme_quality_policy_reference: qms.programme_quality_policy_reference || '',
        author_id: qms.author_id || '',
        owner_id: qms.owner_id || '',
        client_id: qms.client_id || '',
        status: qms.status || 'draft'
      })
    }
  }, [qms, projectId])

  const fetchTeamMembers = async () => {
    try {
      const { data, error } = await supabase
        .from('user_projects')
        .select(`
          user:users!user_projects_user_id_fkey(
            id,
            full_name,
            email
          )
        `)
        .eq('project_id', projectId)
        .eq('is_deleted', false)

      if (error) throw error

      const members = (data || [])
        .map(up => up.user)
        .filter(u => u)

      setTeamMembers(members)
    } catch (error) {
      console.error('Error fetching team members:', error)
    }
  }

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
    
    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[name]
        return newErrors
      })
    }
  }

  const validateStep = (step) => {
    const newErrors = {}
    
    switch (step) {
      case 1:
        if (!formData.purpose || formData.purpose.trim().length < 50) {
          newErrors.purpose = 'Purpose must be at least 50 characters'
        }
        if (!formData.objectives || formData.objectives.trim().length < 30) {
          newErrors.objectives = 'Objectives must be at least 30 characters'
        }
        if (!formData.scope || formData.scope.trim().length < 30) {
          newErrors.scope = 'Scope must be at least 30 characters'
        }
        break
      case 2:
        if (!formData.quality_control_approach || formData.quality_control_approach.trim().length < 50) {
          newErrors.quality_control_approach = 'Quality control approach must be at least 50 characters'
        }
        if (!formData.quality_assurance_approach || formData.quality_assurance_approach.trim().length < 50) {
          newErrors.quality_assurance_approach = 'Quality assurance approach must be at least 50 characters'
        }
        if (formData.variance_from_corporate && formData.variance_from_corporate.trim() && 
            (!formData.variance_justification || formData.variance_justification.trim().length < 20)) {
          newErrors.variance_justification = 'Variance justification is required when variance is specified (minimum 20 characters)'
        }
        break
      case 3:
        // References are optional, no validation needed
        break
      case 4:
        // Ownership is optional, no validation needed
        break
      default:
        break
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleNext = () => {
    if (validateStep(activeStep)) {
      setActiveStep(prev => Math.min(prev + 1, steps.length))
    }
  }

  const handlePrevious = () => {
    setActiveStep(prev => Math.max(prev - 1, 1))
  }

  const handleSubmit = async () => {
    if (!validateStep(activeStep)) {
      return
    }

    try {
      setSaving(true)

      if (qms) {
        // Update existing QMS
        await updateQMS(qms.id, formData)
      } else {
        // Create new QMS
        await createQMS(projectId, formData)
      }

      if (onSave) {
        onSave()
      }
    } catch (error) {
      console.error('Error saving QMS:', error)
      alert('Error saving Quality Management Strategy: ' + error.message)
    } finally {
      setSaving(false)
    }
  }

  const renderStepContent = () => {
    switch (activeStep) {
      case 1:
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Purpose <span className="text-red-500">*</span>
              </label>
              <textarea
                name="purpose"
                value={formData.purpose}
                onChange={handleChange}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                placeholder="Define the purpose of the Quality Management Strategy..."
              />
              {errors.purpose && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.purpose}</p>
              )}
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Minimum 50 characters. Describe why this strategy exists and what it aims to achieve.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Objectives <span className="text-red-500">*</span>
              </label>
              <textarea
                name="objectives"
                value={formData.objectives}
                onChange={handleChange}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                placeholder="Define the quality objectives for the project..."
              />
              {errors.objectives && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.objectives}</p>
              )}
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Minimum 30 characters. What quality outcomes are we aiming to achieve?
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Scope <span className="text-red-500">*</span>
              </label>
              <textarea
                name="scope"
                value={formData.scope}
                onChange={handleChange}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                placeholder="Define the scope of quality management..."
              />
              {errors.scope && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.scope}</p>
              )}
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Minimum 30 characters. What does this strategy cover?
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Strategy Responsibility
              </label>
              <input
                type="text"
                name="strategy_responsibility"
                value={formData.strategy_responsibility}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                placeholder="Who is responsible for the strategy?"
              />
            </div>
          </div>
        )

      case 2:
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Quality Planning Approach
              </label>
              <textarea
                name="quality_planning_approach"
                value={formData.quality_planning_approach}
                onChange={handleChange}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                placeholder="Describe the approach to quality planning..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Quality Control Approach <span className="text-red-500">*</span>
              </label>
              <textarea
                name="quality_control_approach"
                value={formData.quality_control_approach}
                onChange={handleChange}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                placeholder="Describe the approach to quality control (inspections, reviews, testing)..."
              />
              {errors.quality_control_approach && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.quality_control_approach}</p>
              )}
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Minimum 50 characters. How will quality be controlled during the project?
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Quality Assurance Approach <span className="text-red-500">*</span>
              </label>
              <textarea
                name="quality_assurance_approach"
                value={formData.quality_assurance_approach}
                onChange={handleChange}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                placeholder="Describe the approach to quality assurance (audits, compliance checks)..."
              />
              {errors.quality_assurance_approach && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.quality_assurance_approach}</p>
              )}
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Minimum 50 characters. How will quality be assured (independent verification)?
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Variance from Corporate Standards
              </label>
              <textarea
                name="variance_from_corporate"
                value={formData.variance_from_corporate}
                onChange={handleChange}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                placeholder="Describe any variance from corporate quality standards..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Variance Justification
              </label>
              <textarea
                name="variance_justification"
                value={formData.variance_justification}
                onChange={handleChange}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                placeholder="Justify any variance from corporate standards..."
              />
              {errors.variance_justification && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.variance_justification}</p>
              )}
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Required if variance is specified (minimum 20 characters).
              </p>
            </div>
          </div>
        )

      case 3:
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Customer QMS Reference
              </label>
              <textarea
                name="customer_qms_reference"
                value={formData.customer_qms_reference}
                onChange={handleChange}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                placeholder="Reference customer's quality management system elements to use..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Supplier QMS Reference
              </label>
              <textarea
                name="supplier_qms_reference"
                value={formData.supplier_qms_reference}
                onChange={handleChange}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                placeholder="Reference supplier's quality management system elements to use..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Corporate Quality Policy Reference
              </label>
              <input
                type="text"
                name="corporate_quality_policy_reference"
                value={formData.corporate_quality_policy_reference}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                placeholder="Reference to corporate quality policy..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Programme Quality Policy Reference
              </label>
              <input
                type="text"
                name="programme_quality_policy_reference"
                value={formData.programme_quality_policy_reference}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                placeholder="Reference to programme quality policy..."
              />
            </div>
          </div>
        )

      case 4:
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Author
              </label>
              <select
                name="author_id"
                value={formData.author_id}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              >
                <option value="">Select author...</option>
                {teamMembers.map(member => (
                  <option key={member.id} value={member.id}>
                    {member.full_name} ({member.email})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Owner
              </label>
              <select
                name="owner_id"
                value={formData.owner_id}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              >
                <option value="">Select owner...</option>
                {teamMembers.map(member => (
                  <option key={member.id} value={member.id}>
                    {member.full_name} ({member.email})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Client
              </label>
              <select
                name="client_id"
                value={formData.client_id}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              >
                <option value="">Select client...</option>
                {teamMembers.map(member => (
                  <option key={member.id} value={member.id}>
                    {member.full_name} ({member.email})
                  </option>
                ))}
              </select>
            </div>
          </div>
        )

      case 5:
        return (
          <div className="space-y-4">
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <h3 className="font-semibold text-blue-900 dark:text-blue-300 mb-2">Review Your Quality Management Strategy</h3>
              <p className="text-sm text-blue-700 dark:text-blue-400 mb-4">
                Please review all the information before saving. You can go back to edit any section.
              </p>
              
              <div className="space-y-2 text-sm">
                <div>
                  <span className="font-medium text-gray-700 dark:text-gray-300">Purpose: </span>
                  <span className={formData.purpose && formData.purpose.length >= 50 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
                    {formData.purpose ? `${formData.purpose.length} characters` : 'Not set'}
                  </span>
                </div>
                <div>
                  <span className="font-medium text-gray-700 dark:text-gray-300">Objectives: </span>
                  <span className={formData.objectives && formData.objectives.length >= 30 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
                    {formData.objectives ? `${formData.objectives.length} characters` : 'Not set'}
                  </span>
                </div>
                <div>
                  <span className="font-medium text-gray-700 dark:text-gray-300">Scope: </span>
                  <span className={formData.scope && formData.scope.length >= 30 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
                    {formData.scope ? `${formData.scope.length} characters` : 'Not set'}
                  </span>
                </div>
                <div>
                  <span className="font-medium text-gray-700 dark:text-gray-300">Quality Control Approach: </span>
                  <span className={formData.quality_control_approach && formData.quality_control_approach.length >= 50 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
                    {formData.quality_control_approach ? `${formData.quality_control_approach.length} characters` : 'Not set'}
                  </span>
                </div>
                <div>
                  <span className="font-medium text-gray-700 dark:text-gray-300">Quality Assurance Approach: </span>
                  <span className={formData.quality_assurance_approach && formData.quality_assurance_approach.length >= 50 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
                    {formData.quality_assurance_approach ? `${formData.quality_assurance_approach.length} characters` : 'Not set'}
                  </span>
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto my-8">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-800 z-10">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                {qms ? 'Edit Quality Management Strategy' : 'Create Quality Management Strategy'}
              </h2>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                Step {activeStep} of {steps.length}: {steps.find(s => s.id === activeStep)?.title}
              </p>
            </div>
            <button
              onClick={onCancel}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          {/* Progress Steps */}
          <div className="mt-4 flex items-center justify-between">
            {steps.map((step, index) => {
              const Icon = step.icon
              const isActive = activeStep === step.id
              const isCompleted = activeStep > step.id
              
              return (
                <div key={step.id} className="flex items-center flex-1">
                  <div className="flex flex-col items-center">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 ${
                      isActive ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' :
                      isCompleted ? 'border-green-500 bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400' :
                      'border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-400 dark:text-gray-500'
                    }`}>
                      {isCompleted ? (
                        <CheckCircle className="h-5 w-5" />
                      ) : (
                        <Icon className="h-5 w-5" />
                      )}
                    </div>
                    <span className={`mt-2 text-xs font-medium ${
                      isActive ? 'text-blue-600 dark:text-blue-400' :
                      isCompleted ? 'text-green-600 dark:text-green-400' :
                      'text-gray-500 dark:text-gray-400'
                    }`}>
                      {step.title}
                    </span>
                  </div>
                  {index < steps.length - 1 && (
                    <div className={`flex-1 h-0.5 mx-2 ${
                      isCompleted ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'
                    }`} />
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {renderStepContent()}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <button
            onClick={handlePrevious}
            disabled={activeStep === 1}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Previous
          </button>

          <div className="flex gap-3">
            <HoldButton
              entityType="qms"
              entityId={qms?.id}
              formData={formData}
              projectId={projectId}
              onHoldComplete={onHoldComplete || onCancel}
            />
            <button
              onClick={onCancel}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              Cancel
            </button>
            {activeStep < steps.length ? (
              <button
                onClick={handleNext}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2"
              >
                Next
                <ArrowRight className="h-4 w-4" />
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={saving}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg flex items-center gap-2 disabled:opacity-50"
              >
                <Save className="h-4 w-4" />
                {saving ? 'Saving...' : 'Save'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
