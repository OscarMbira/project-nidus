/**
 * Project Plan Form Component
 * Wizard-style form for creating/editing Project Plans
 */

import { useState, useEffect } from 'react'
import { FileText, Target, Calendar, DollarSign, Users, Shield, Award, CheckCircle, ArrowRight, ArrowLeft, X, Save } from 'lucide-react'
import { useThemeContext } from '../../context/ThemeContext'
import { createProjectPlan, updateProjectPlan, getProjectPlanById, validateCompleteness } from '../../services/projectPlanService'
import { addMilestone, getMilestones } from '../../services/planMilestoneService'
import { addResource, getResources } from '../../services/planResourceService'
import ProjectPlanOverviewSection from './ProjectPlanOverviewSection'
import ProjectPlanApproachSection from './ProjectPlanApproachSection'
import ProjectPlanScheduleSection from './ProjectPlanScheduleSection'
import ProjectPlanBudgetSection from './ProjectPlanBudgetSection'
import ProjectPlanResourceSection from './ProjectPlanResourceSection'
import ProjectPlanRiskSection from './ProjectPlanRiskSection'
import ProjectPlanQualitySection from './ProjectPlanQualitySection'
import CompletenessIndicator from './CompletenessIndicator'

const FORM_STEPS = [
  { id: 'overview', label: 'Overview', icon: FileText, description: 'Plan title, purpose, scope' },
  { id: 'approach', label: 'Planning Approach', icon: Target, description: 'Approach, assumptions, constraints' },
  { id: 'schedule', label: 'Schedule', icon: Calendar, description: 'Dates, milestones' },
  { id: 'budget', label: 'Budget', icon: DollarSign, description: 'Budget summary, breakdown' },
  { id: 'resources', label: 'Resources', icon: Users, description: 'Resource requirements' },
  { id: 'risks', label: 'Risks & Quality', icon: Shield, description: 'Risk and quality summary' },
  { id: 'review', label: 'Review', icon: CheckCircle, description: 'Completeness check' },
]

export default function ProjectPlanForm({
  projectId,
  planId = null,
  mode = 'create', // 'create' | 'edit' | 'view'
  onSave,
  onCancel
}) {
  const { theme } = useThemeContext()
  const [activeStep, setActiveStep] = useState(0)
  const [formData, setFormData] = useState({
    plan_title: '',
    plan_description: '',
    plan_purpose: '',
    plan_scope: '',
    planning_approach: '',
    planning_assumptions: '',
    planning_constraints: '',
    planning_principles: '',
    planned_start_date: '',
    planned_end_date: '',
    total_budget: null,
    budget_currency: 'USD',
    contingency_amount: null,
    contingency_percentage: null,
    resource_summary: '',
    risk_summary: '',
    quality_summary: '',
    pid_id: null,
    business_case_id: null,
    project_product_description_id: null,
    quality_management_strategy_id: null,
    risk_management_strategy_id: null,
    configuration_management_strategy_id: null,
    communication_management_strategy_id: null,
    author_id: null,
    owner_id: null,
    status: 'draft'
  })
  const [milestones, setMilestones] = useState([])
  const [resources, setResources] = useState([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState({})
  const [completeness, setCompleteness] = useState(null)

  useEffect(() => {
    if (planId && mode !== 'create') {
      loadPlan()
    }
  }, [planId, mode])

  useEffect(() => {
    if (planId && formData.planned_start_date && formData.planned_end_date) {
      checkCompleteness()
    }
  }, [planId, formData])

  const loadPlan = async () => {
    try {
      setLoading(true)
      const result = await getProjectPlanById(planId)
      if (result.success) {
        setFormData(result.data)
        
        // Load milestones
        const milestonesResult = await getMilestones(planId, 'project_plan')
        if (milestonesResult.success) {
          setMilestones(milestonesResult.data || [])
        }
        
        // Load resources
        const resourcesResult = await getResources(planId, 'project_plan')
        if (resourcesResult.success) {
          setResources(resourcesResult.data || [])
        }
      }
    } catch (error) {
      console.error('Error loading plan:', error)
      alert('Error loading plan: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const checkCompleteness = async () => {
    if (!planId) return
    try {
      const result = await validateCompleteness(planId)
      if (result.success) {
        setCompleteness(result.data)
      }
    } catch (error) {
      console.error('Error checking completeness:', error)
    }
  }

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[field]
        return newErrors
      })
    }
  }

  const handleNext = () => {
    if (activeStep < FORM_STEPS.length - 1) {
      setActiveStep(activeStep + 1)
    }
  }

  const handlePrevious = () => {
    if (activeStep > 0) {
      setActiveStep(activeStep - 1)
    }
  }

  const validateStep = () => {
    const step = FORM_STEPS[activeStep].id
    const newErrors = {}

    if (step === 'overview') {
      if (!formData.plan_title || formData.plan_title.length < 3) {
        newErrors.plan_title = 'Plan title must be at least 3 characters'
      }
      if (!formData.plan_purpose || formData.plan_purpose.length < 50) {
        newErrors.plan_purpose = 'Plan purpose must be at least 50 characters'
      }
      if (!formData.plan_scope || formData.plan_scope.length < 50) {
        newErrors.plan_scope = 'Plan scope must be at least 50 characters'
      }
    }

    if (step === 'schedule') {
      if (!formData.planned_start_date) {
        newErrors.planned_start_date = 'Planned start date is required'
      }
      if (!formData.planned_end_date) {
        newErrors.planned_end_date = 'Planned end date is required'
      }
      if (formData.planned_start_date && formData.planned_end_date && 
          new Date(formData.planned_end_date) < new Date(formData.planned_start_date)) {
        newErrors.planned_end_date = 'End date must be after start date'
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSave = async () => {
    if (!validateStep()) {
      return
    }

    try {
      setSaving(true)
      let result

      if (mode === 'create') {
        result = await createProjectPlan(projectId, formData)
      } else {
        result = await updateProjectPlan(planId, formData)
      }

      if (result.success) {
        if (onSave) {
          onSave(result.data)
        }
      } else {
        alert('Error saving plan: ' + result.error)
      }
    } catch (error) {
      console.error('Error saving plan:', error)
      alert('Error saving plan: ' + error.message)
    } finally {
      setSaving(false)
    }
  }

  const renderStepContent = () => {
    const step = FORM_STEPS[activeStep].id

    switch (step) {
      case 'overview':
        return (
          <ProjectPlanOverviewSection
            formData={formData}
            onChange={handleChange}
            errors={errors}
            mode={mode}
            projectId={projectId}
          />
        )
      case 'approach':
        return (
          <ProjectPlanApproachSection
            formData={formData}
            onChange={handleChange}
            errors={errors}
            mode={mode}
          />
        )
      case 'schedule':
        return (
          <ProjectPlanScheduleSection
            formData={formData}
            onChange={handleChange}
            errors={errors}
            milestones={milestones}
            setMilestones={setMilestones}
            planId={planId}
            mode={mode}
          />
        )
      case 'budget':
        return (
          <ProjectPlanBudgetSection
            formData={formData}
            onChange={handleChange}
            errors={errors}
            mode={mode}
          />
        )
      case 'resources':
        return (
          <ProjectPlanResourceSection
            formData={formData}
            onChange={handleChange}
            resources={resources}
            setResources={setResources}
            planId={planId}
            mode={mode}
          />
        )
      case 'risks':
        return (
          <>
            <ProjectPlanRiskSection
              formData={formData}
              onChange={handleChange}
              mode={mode}
              projectId={projectId}
            />
            <ProjectPlanQualitySection
              formData={formData}
              onChange={handleChange}
              mode={mode}
              projectId={projectId}
            />
          </>
        )
      case 'review':
        return (
          <div className="space-y-6">
            <CompletenessIndicator completeness={completeness} />
            <div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-lg">
              <h3 className="text-lg font-semibold mb-4">Plan Summary</h3>
              <div className="space-y-2 text-sm">
                <p><strong>Title:</strong> {formData.plan_title || 'Not set'}</p>
                <p><strong>Purpose:</strong> {formData.plan_purpose || 'Not set'}</p>
                <p><strong>Start Date:</strong> {formData.planned_start_date || 'Not set'}</p>
                <p><strong>End Date:</strong> {formData.planned_end_date || 'Not set'}</p>
                <p><strong>Budget:</strong> {formData.total_budget ? `$${formData.total_budget}` : 'Not set'}</p>
                <p><strong>Milestones:</strong> {milestones.length}</p>
                <p><strong>Resources:</strong> {resources.length}</p>
              </div>
            </div>
          </div>
        )
      default:
        return null
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading plan...</p>
        </div>
      </div>
    )
  }

  return (
    <div className={`${theme === 'dark' ? 'dark' : ''} bg-white dark:bg-gray-900 min-h-screen`}>
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {mode === 'create' ? 'Create Project Plan' : mode === 'edit' ? 'Edit Project Plan' : 'View Project Plan'}
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {FORM_STEPS[activeStep].description}
            </p>
          </div>
          {onCancel && (
            <button
              onClick={onCancel}
              className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            {FORM_STEPS.map((step, index) => {
              const StepIcon = step.icon
              const isActive = index === activeStep
              const isCompleted = index < activeStep

              return (
                <div key={step.id} className="flex items-center flex-1">
                  <div className="flex flex-col items-center flex-1">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center border-2 ${
                        isActive
                          ? 'border-blue-600 bg-blue-600 text-white'
                          : isCompleted
                          ? 'border-green-600 bg-green-600 text-white'
                          : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400'
                      }`}
                    >
                      <StepIcon className="w-5 h-5" />
                    </div>
                    <p className={`text-xs mt-2 text-center ${isActive ? 'font-semibold text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'}`}>
                      {step.label}
                    </p>
                  </div>
                  {index < FORM_STEPS.length - 1 && (
                    <div className={`flex-1 h-0.5 mx-2 ${isCompleted ? 'bg-green-600' : 'bg-gray-300 dark:bg-gray-600'}`} />
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Form Content */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-6">
          {renderStepContent()}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between">
          <button
            onClick={handlePrevious}
            disabled={activeStep === 0}
            className="flex items-center px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Previous
          </button>

          <div className="flex items-center gap-3">
            {mode !== 'view' && (
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save className="w-4 h-4 mr-2" />
                {saving ? 'Saving...' : 'Save'}
              </button>
            )}
            {activeStep < FORM_STEPS.length - 1 && (
              <button
                onClick={() => {
                  if (validateStep()) {
                    handleNext()
                  }
                }}
                className="flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
              >
                Next
                <ArrowRight className="w-4 h-4 ml-2" />
              </button>
            )}
            {activeStep === FORM_STEPS.length - 1 && mode !== 'view' && (
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                {saving ? 'Saving...' : 'Save & Complete'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
