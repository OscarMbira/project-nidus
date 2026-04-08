import { useState, useEffect } from 'react'
import { platformDb } from '../../services/supabase/supabaseClient'
import { X, Save, FileText, Settings, Target, BarChart3, Shield, Users, Calendar, CheckCircle, ArrowRight, ArrowLeft, AlertTriangle } from 'lucide-react'
import { createRMS, updateRMS, createRMSForProject, createRMSFromTemplate } from '../../services/riskManagementStrategyService'
import { HoldButton } from '../ui/HoldButton'

export default function RMSForm({ rms, projectId, onSave, onCancel, onHoldComplete }) {
  const [formData, setFormData] = useState({
    purpose: '',
    objectives: '',
    scope: '',
    strategy_responsibility: '',
    risk_identification_approach: '',
    risk_assessment_approach: '',
    risk_response_approach: '',
    risk_monitoring_approach: '',
    variance_from_corporate: '',
    variance_justification: '',
    customer_risk_standards_reference: '',
    supplier_risk_standards_reference: '',
    corporate_risk_policy_reference: '',
    programme_risk_policy_reference: '',
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
    { id: 2, title: 'Risk Procedures', icon: Settings },
    { id: 3, title: 'References', icon: Shield },
    { id: 4, title: 'Ownership', icon: Users },
    { id: 5, title: 'Review', icon: CheckCircle }
  ]

  useEffect(() => {
    fetchTeamMembers()

    if (rms) {
      setFormData({
        purpose: rms.purpose || '',
        objectives: rms.objectives || '',
        scope: rms.scope || '',
        strategy_responsibility: rms.strategy_responsibility || '',
        risk_identification_approach: rms.risk_identification_approach || '',
        risk_assessment_approach: rms.risk_assessment_approach || '',
        risk_response_approach: rms.risk_response_approach || '',
        risk_monitoring_approach: rms.risk_monitoring_approach || '',
        variance_from_corporate: rms.variance_from_corporate || '',
        variance_justification: rms.variance_justification || '',
        customer_risk_standards_reference: rms.customer_risk_standards_reference || '',
        supplier_risk_standards_reference: rms.supplier_risk_standards_reference || '',
        corporate_risk_policy_reference: rms.corporate_risk_policy_reference || '',
        programme_risk_policy_reference: rms.programme_risk_policy_reference || '',
        author_id: rms.author_id || '',
        owner_id: rms.owner_id || '',
        client_id: rms.client_id || '',
        status: rms.status || 'draft'
      })
    }
  }, [rms, projectId])

  const fetchTeamMembers = async () => {
    try {
      const { data, error } = await platformDb
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
        if (!formData.risk_identification_approach || formData.risk_identification_approach.trim().length < 50) {
          newErrors.risk_identification_approach = 'Risk identification approach must be at least 50 characters'
        }
        if (!formData.risk_assessment_approach || formData.risk_assessment_approach.trim().length < 50) {
          newErrors.risk_assessment_approach = 'Risk assessment approach must be at least 50 characters'
        }
        if (!formData.risk_response_approach || formData.risk_response_approach.trim().length < 50) {
          newErrors.risk_response_approach = 'Risk response approach must be at least 50 characters'
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

      let result
      if (rms) {
        // Update existing RMS
        result = await updateRMS(rms.id, formData)
      } else {
        // Create new RMS
        result = await createRMS(projectId, formData)
      }

      if (result.success) {
        if (onSave) {
          onSave()
        }
      } else {
        alert('Error: ' + result.error)
      }
    } catch (error) {
      console.error('Error saving RMS:', error)
      alert('Error saving Risk Management Strategy: ' + error.message)
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
                placeholder="Define the purpose of the Risk Management Strategy..."
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
                placeholder="Define the risk management objectives for the project..."
              />
              {errors.objectives && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.objectives}</p>
              )}
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Minimum 30 characters. What risk management outcomes are we aiming to achieve?
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
                placeholder="Define the scope of risk management..."
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
                Risk Identification Approach <span className="text-red-500">*</span>
              </label>
              <textarea
                name="risk_identification_approach"
                value={formData.risk_identification_approach}
                onChange={handleChange}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                placeholder="Describe the approach to risk identification (workshops, checklists, expert judgment)..."
              />
              {errors.risk_identification_approach && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.risk_identification_approach}</p>
              )}
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Minimum 50 characters. How will risks be identified throughout the project?
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Risk Assessment Approach <span className="text-red-500">*</span>
              </label>
              <textarea
                name="risk_assessment_approach"
                value={formData.risk_assessment_approach}
                onChange={handleChange}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                placeholder="Describe the approach to risk assessment (probability, impact, proximity scales)..."
              />
              {errors.risk_assessment_approach && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.risk_assessment_approach}</p>
              )}
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Minimum 50 characters. How will risks be assessed (probability and impact)?
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Risk Response Approach <span className="text-red-500">*</span>
              </label>
              <textarea
                name="risk_response_approach"
                value={formData.risk_response_approach}
                onChange={handleChange}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                placeholder="Describe the approach to risk response (avoid, reduce, transfer, accept, exploit, enhance)..."
              />
              {errors.risk_response_approach && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.risk_response_approach}</p>
              )}
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Minimum 50 characters. How will risks be responded to?
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Risk Monitoring Approach
              </label>
              <textarea
                name="risk_monitoring_approach"
                value={formData.risk_monitoring_approach}
                onChange={handleChange}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                placeholder="Describe the approach to risk monitoring (reviews, tracking, reporting)..."
              />
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
                placeholder="Describe any variance from corporate risk standards..."
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
                Customer Risk Standards Reference
              </label>
              <textarea
                name="customer_risk_standards_reference"
                value={formData.customer_risk_standards_reference}
                onChange={handleChange}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                placeholder="Reference customer's risk management elements to use..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Supplier Risk Standards Reference
              </label>
              <textarea
                name="supplier_risk_standards_reference"
                value={formData.supplier_risk_standards_reference}
                onChange={handleChange}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                placeholder="Reference supplier's risk management elements to use..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Corporate Risk Policy Reference
              </label>
              <textarea
                name="corporate_risk_policy_reference"
                value={formData.corporate_risk_policy_reference}
                onChange={handleChange}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                placeholder="Reference corporate risk policy..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Programme Risk Policy Reference
              </label>
              <textarea
                name="programme_risk_policy_reference"
                value={formData.programme_risk_policy_reference}
                onChange={handleChange}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                placeholder="Reference programme risk policy..."
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
                <option value="">Select author</option>
                {teamMembers.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.full_name}
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
                <option value="">Select owner</option>
                {teamMembers.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.full_name}
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
                <option value="">Select client</option>
                {teamMembers.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.full_name}
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
              <div className="flex items-start gap-2">
                <CheckCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">Review Your Risk Management Strategy</h4>
                  <p className="text-sm text-blue-800 dark:text-blue-300 mb-4">
                    Please review all the information before saving. You can go back to any step to make changes.
                  </p>
                  
                  <div className="space-y-2 text-sm">
                    <div className="flex items-start gap-2">
                      <CheckCircle className={`h-4 w-4 mt-0.5 flex-shrink-0 ${
                        formData.purpose && formData.purpose.trim().length >= 50 ? 'text-green-600' : 'text-gray-400'
                      }`} />
                      <span className={formData.purpose && formData.purpose.trim().length >= 50 ? 'text-gray-700 dark:text-gray-300' : 'text-gray-400'}>
                        Purpose defined
                      </span>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle className={`h-4 w-4 mt-0.5 flex-shrink-0 ${
                        formData.objectives && formData.objectives.trim().length >= 30 ? 'text-green-600' : 'text-gray-400'
                      }`} />
                      <span className={formData.objectives && formData.objectives.trim().length >= 30 ? 'text-gray-700 dark:text-gray-300' : 'text-gray-400'}>
                        Objectives defined
                      </span>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle className={`h-4 w-4 mt-0.5 flex-shrink-0 ${
                        formData.scope && formData.scope.trim().length >= 30 ? 'text-green-600' : 'text-gray-400'
                      }`} />
                      <span className={formData.scope && formData.scope.trim().length >= 30 ? 'text-gray-700 dark:text-gray-300' : 'text-gray-400'}>
                        Scope defined
                      </span>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle className={`h-4 w-4 mt-0.5 flex-shrink-0 ${
                        formData.risk_identification_approach && formData.risk_identification_approach.trim().length >= 50 ? 'text-green-600' : 'text-gray-400'
                      }`} />
                      <span className={formData.risk_identification_approach && formData.risk_identification_approach.trim().length >= 50 ? 'text-gray-700 dark:text-gray-300' : 'text-gray-400'}>
                        Risk identification approach defined
                      </span>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle className={`h-4 w-4 mt-0.5 flex-shrink-0 ${
                        formData.risk_assessment_approach && formData.risk_assessment_approach.trim().length >= 50 ? 'text-green-600' : 'text-gray-400'
                      }`} />
                      <span className={formData.risk_assessment_approach && formData.risk_assessment_approach.trim().length >= 50 ? 'text-gray-700 dark:text-gray-300' : 'text-gray-400'}>
                        Risk assessment approach defined
                      </span>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle className={`h-4 w-4 mt-0.5 flex-shrink-0 ${
                        formData.risk_response_approach && formData.risk_response_approach.trim().length >= 50 ? 'text-green-600' : 'text-gray-400'
                      }`} />
                      <span className={formData.risk_response_approach && formData.risk_response_approach.trim().length >= 50 ? 'text-gray-700 dark:text-gray-300' : 'text-gray-400'}>
                        Risk response approach defined
                      </span>
                    </div>
                  </div>
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              {rms ? 'Edit Risk Management Strategy' : 'Create Risk Management Strategy'}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
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

        {/* Progress Bar */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-2">
            {steps.map((step, index) => {
              const Icon = step.icon
              const isActive = step.id === activeStep
              const isCompleted = step.id < activeStep
              return (
                <div key={step.id} className="flex items-center flex-1">
                  <div className="flex items-center flex-1">
                    <div className={`flex items-center justify-center w-10 h-10 rounded-full ${
                      isActive ? 'bg-blue-600 text-white' :
                      isCompleted ? 'bg-green-600 text-white' :
                      'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                    }`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    {index < steps.length - 1 && (
                      <div className={`flex-1 h-1 mx-2 ${
                        isCompleted ? 'bg-green-600' : 'bg-gray-200 dark:bg-gray-700'
                      }`} />
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Form Content */}
        <div className="p-6">
          {renderStepContent()}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
          <button
            onClick={handlePrevious}
            disabled={activeStep === 1}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Previous
          </button>
          
          <div className="flex items-center gap-2">
            <HoldButton
              entityType="rms"
              entityId={rms?.id}
              formData={formData}
              projectId={projectId}
              onHoldComplete={onHoldComplete || onCancel}
            />
            <button
              onClick={onCancel}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
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
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save className="h-4 w-4" />
                {saving ? 'Saving...' : rms ? 'Update Strategy' : 'Create Strategy'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
