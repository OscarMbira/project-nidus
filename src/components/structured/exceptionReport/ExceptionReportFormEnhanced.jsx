import { useState, useEffect } from 'react'
import { FileText, AlertTriangle, TrendingUp, Target, Lightbulb, CheckCircle, X, Save, ArrowLeft, ArrowRight, User } from 'lucide-react'
import { useThemeContext } from '../../../context/ThemeContext'
import { HoldButton } from '../../ui/HoldButton'
import { 
  createExceptionReport, 
  updateExceptionReport, 
  getExceptionReportById,
  getCurrentPlanStatus,
  getToleranceBreachDetails
} from '../../../services/exceptionReportService'
import { supabase } from '../../../services/supabaseClient'
import ExceptionReportHeader from './ExceptionReportHeader'
import ExceptionOverviewSection from './ExceptionOverviewSection'
import CurrentPlanStatusSection from './CurrentPlanStatusSection'
import CauseAnalysisSection from './CauseAnalysisSection'
import ConsequencesSection from './ConsequencesSection'
import OptionsSection from './OptionsSection'
import RecommendationSection from './RecommendationSection'
import LessonsSection from './LessonsSection'

const FORM_STEPS = [
  { id: 'header', label: 'Document Header', icon: FileText, description: 'Document metadata' },
  { id: 'overview', label: 'Exception Overview', icon: AlertTriangle, description: 'Section 3: Exception overview' },
  { id: 'plan-status', label: 'Current Plan Status', icon: TrendingUp, description: 'Time/cost performance snapshot' },
  { id: 'cause', label: 'Cause Analysis', icon: Target, description: 'Section 4: Root cause analysis' },
  { id: 'consequences', label: 'Consequences', icon: AlertTriangle, description: 'Section 5: Implications' },
  { id: 'options', label: 'Options Analysis', icon: Target, description: 'Section 6: Options analysis' },
  { id: 'recommendation', label: 'Recommendation', icon: CheckCircle, description: 'Section 7: Recommendation' },
  { id: 'lessons', label: 'Lessons & Review', icon: Lightbulb, description: 'Section 8: Lessons learned' },
]

export default function ExceptionReportFormEnhanced({
  projectId,
  exceptionId,
  reportId = null,
  mode = 'create', // 'create' | 'edit' | 'view'
  onSave,
  onCancel,
  onHoldComplete
}) {
  const { theme } = useThemeContext()
  const [activeStep, setActiveStep] = useState(0)
  const [formData, setFormData] = useState({
    report_title: '',
    report_date: new Date().toISOString().split('T')[0],
    version_no: '1.0',
    document_ref: '',
    author_id: null,
    owner_id: null,
    client_id: null,
    date_of_this_revision: new Date().toISOString().split('T')[0],
    date_of_next_revision: null,
    
    // Exception Overview
    exception_title: '',
    exception_summary: '',
    tolerance_type: null,
    tolerance_threshold: '',
    actual_value: '',
    variance_amount: '',
    variance_percentage: null,
    is_forecast_breach: false,
    
    // Current Plan Status
    time_performance_status: '',
    time_baseline_end_date: null,
    time_current_forecast_date: null,
    time_variance_days: null,
    cost_performance_status: '',
    cost_baseline_budget: null,
    cost_current_forecast: null,
    cost_variance_amount: null,
    cost_variance_percentage: null,
    scope_status: '',
    quality_status: '',
    
    // Cause Analysis
    cause_description: '',
    root_cause_category: null,
    root_cause_analysis: '',
    contributing_factors: [],
    
    // Consequences
    project_consequences: '',
    programme_consequences: '',
    corporate_consequences: '',
    consequences_if_not_addressed: '',
    impact_on_business_case: '',
    impact_on_project_plan: '',
    
    // Recommendation
    recommended_option_number: null,
    recommendation_summary: '',
    recommendation_justification: '',
    requested_decision: '',
    
    // Lessons
    lessons_summary: '',
    preventive_measures: '',
    
    // Status
    report_status: 'draft',
    urgency: 'medium',
    exception_plan_id: null,
    stage_boundary_id: null,
    board_id: null
  })
  const [options, setOptions] = useState([])
  const [lessons, setLessons] = useState([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState({})
  const [exceptionData, setExceptionData] = useState(null)

  useEffect(() => {
    if (reportId && mode !== 'create') {
      loadReport()
    } else if (exceptionId && mode === 'create') {
      loadExceptionData()
      autoPopulateFromException()
    }
  }, [reportId, exceptionId, mode])

  useEffect(() => {
    if (reportId) {
      loadRelatedData()
    }
  }, [reportId])

  const loadReport = async () => {
    try {
      setLoading(true)
      const report = await getExceptionReportById(reportId)
      setFormData({
        ...report,
        report_date: report.report_date || new Date().toISOString().split('T')[0],
        date_of_this_revision: report.date_of_this_revision || new Date().toISOString().split('T')[0],
        date_of_next_revision: report.date_of_next_revision || null
      })
    } catch (error) {
      console.error('Error loading report:', error)
      alert('Error loading report: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const loadExceptionData = async () => {
    if (!exceptionId) return
    try {
      const { data, error } = await supabase
        .from('exceptions')
        .select('*')
        .eq('id', exceptionId)
        .eq('is_deleted', false)
        .single()
      
      if (error) throw error
      setExceptionData(data)
    } catch (error) {
      console.error('Error loading exception:', error)
    }
  }

  const autoPopulateFromException = async () => {
    if (!exceptionId || !projectId) return
    
    try {
      // Get tolerance breach details
      const breachDetails = await getToleranceBreachDetails(exceptionId)
      if (breachDetails) {
        setFormData(prev => ({
          ...prev,
          tolerance_type: breachDetails.tolerance_type,
          tolerance_threshold: breachDetails.tolerance_threshold || '',
          actual_value: breachDetails.actual_value || '',
          variance_amount: breachDetails.variance_amount || '',
          is_forecast_breach: breachDetails.is_forecast || false
        }))
      }

      // Get current plan status
      const planStatus = await getCurrentPlanStatus(projectId)
      if (planStatus) {
        setFormData(prev => ({
          ...prev,
          time_baseline_end_date: planStatus.time_baseline_end_date,
          time_current_forecast_date: planStatus.time_current_forecast,
          time_variance_days: planStatus.time_variance_days,
          cost_baseline_budget: planStatus.cost_baseline_budget,
          cost_current_forecast: planStatus.cost_current_forecast,
          cost_variance_amount: planStatus.cost_variance,
          cost_variance_percentage: planStatus.cost_variance_percentage,
          scope_status: planStatus.scope_status || '',
          quality_status: planStatus.quality_status || ''
        }))
      }

      // Populate from exception data
      if (exceptionData) {
        setFormData(prev => ({
          ...prev,
          exception_title: exceptionData.exception_title || '',
          exception_summary: exceptionData.exception_description || ''
        }))
      }
    } catch (error) {
      console.error('Error auto-populating:', error)
    }
  }

  const loadRelatedData = async () => {
    if (!reportId) return
    try {
      const [
        optionsData,
        lessonsData
      ] = await Promise.all([
        import('../../../services/exceptionReportOptionsService').then(m => m.getOptions(reportId).catch(() => [])),
        import('../../../services/exceptionReportLessonsService').then(m => m.getLessons(reportId).catch(() => []))
      ])

      setOptions(optionsData || [])
      setLessons(lessonsData || [])
    } catch (error) {
      console.error('Error loading related data:', error)
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

  const validateStep = (stepId) => {
    const newErrors = {}
    
    switch (stepId) {
      case 'header':
        if (!formData.report_title || formData.report_title.length < 10) {
          newErrors.report_title = 'Report title must be at least 10 characters'
        }
        if (!formData.report_date) {
          newErrors.report_date = 'Report date is required'
        }
        break
      case 'overview':
        if (!formData.exception_title || formData.exception_title.length < 10) {
          newErrors.exception_title = 'Exception title must be at least 10 characters'
        }
        if (!formData.tolerance_type) {
          newErrors.tolerance_type = 'Tolerance type is required'
        }
        break
      case 'cause':
        if (!formData.cause_description || formData.cause_description.length < 100) {
          newErrors.cause_description = 'Cause description must be at least 100 characters'
        }
        if (!formData.root_cause_analysis || formData.root_cause_analysis.length < 100) {
          newErrors.root_cause_analysis = 'Root cause analysis must be at least 100 characters'
        }
        break
      case 'consequences':
        if (!formData.project_consequences || formData.project_consequences.length < 50) {
          newErrors.project_consequences = 'Project consequences must be at least 50 characters'
        }
        break
      case 'options':
        if (options.length < 2) {
          newErrors.options = 'At least 2 options are required'
        }
        const recommendedCount = options.filter(o => o.is_recommended).length
        if (recommendedCount !== 1) {
          newErrors.recommendation = 'Exactly one option must be recommended'
        }
        break
      case 'recommendation':
        if (!formData.recommendation_summary || formData.recommendation_summary.length < 100) {
          newErrors.recommendation_summary = 'Recommendation summary must be at least 100 characters'
        }
        if (!formData.recommendation_justification || formData.recommendation_justification.length < 100) {
          newErrors.recommendation_justification = 'Recommendation justification must be at least 100 characters'
        }
        break
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleNext = () => {
    const currentStepId = FORM_STEPS[activeStep].id
    
    if (!validateStep(currentStepId)) {
      return
    }

    if (activeStep < FORM_STEPS.length - 1) {
      setActiveStep(activeStep + 1)
    }
  }

  const handlePrevious = () => {
    if (activeStep > 0) {
      setActiveStep(activeStep - 1)
    }
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('User not authenticated')

      const reportData = {
        ...formData,
        project_id: projectId,
        exception_id: exceptionId,
        created_by: user.id,
        updated_by: user.id
      }
      
      if (reportId) {
        await updateExceptionReport(reportId, reportData)
      } else {
        const newReport = await createExceptionReport(projectId, exceptionId, reportData)
        if (onSave) {
          onSave(newReport)
        }
      }
      
      if (onSave && reportId) {
        onSave()
      }
    } catch (error) {
      console.error('Error saving report:', error)
      alert('Error saving report: ' + error.message)
    } finally {
      setSaving(false)
    }
  }

  const renderStepContent = () => {
    const step = FORM_STEPS[activeStep]
    
    switch (step.id) {
      case 'header':
        return (
          <ExceptionReportHeader
            formData={formData}
            onChange={handleChange}
            errors={errors}
            mode={mode}
            projectId={projectId}
          />
        )
      case 'overview':
        return (
          <ExceptionOverviewSection
            formData={formData}
            onChange={handleChange}
            errors={errors}
            mode={mode}
            exceptionData={exceptionData}
          />
        )
      case 'plan-status':
        return (
          <CurrentPlanStatusSection
            formData={formData}
            onChange={handleChange}
            errors={errors}
            mode={mode}
            projectId={projectId}
          />
        )
      case 'cause':
        return (
          <CauseAnalysisSection
            formData={formData}
            onChange={handleChange}
            errors={errors}
            mode={mode}
          />
        )
      case 'consequences':
        return (
          <ConsequencesSection
            formData={formData}
            onChange={handleChange}
            errors={errors}
            mode={mode}
          />
        )
      case 'options':
        return (
          <OptionsSection
            reportId={reportId}
            options={options}
            onOptionsChange={setOptions}
            formData={formData}
            onChange={handleChange}
            errors={errors}
            mode={mode}
          />
        )
      case 'recommendation':
        return (
          <RecommendationSection
            formData={formData}
            onChange={handleChange}
            errors={errors}
            mode={mode}
            options={options}
          />
        )
      case 'lessons':
        return (
          <LessonsSection
            reportId={reportId}
            lessons={lessons}
            onLessonsChange={setLessons}
            formData={formData}
            onChange={handleChange}
            errors={errors}
            mode={mode}
          />
        )
      default:
        return <div>Unknown step</div>
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-gray-600 dark:text-gray-400">Loading...</div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-6xl w-full my-8 ${theme === 'dark' ? 'dark' : ''}`}>
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              {reportId ? (mode === 'view' ? 'View Exception Report' : 'Edit Exception Report') : 'Create Exception Report'}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {FORM_STEPS[activeStep].description}
            </p>
          </div>
          <button
            onClick={onCancel}
            className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Step Navigation */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
          <div className="flex items-center justify-between overflow-x-auto">
            {FORM_STEPS.map((step, index) => {
              const StepIcon = step.icon
              const isActive = index === activeStep
              const isCompleted = index < activeStep
              
              return (
                <div
                  key={step.id}
                  className={`flex items-center flex-shrink-0 ${
                    index < FORM_STEPS.length - 1 ? 'mr-4' : ''
                  }`}
                >
                  <button
                    onClick={() => {
                      if (mode !== 'view') {
                        setActiveStep(index)
                      }
                    }}
                    className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                      isActive
                        ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
                        : isCompleted
                        ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-800'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                    } ${mode === 'view' ? 'cursor-default' : 'cursor-pointer'}`}
                  >
                    <StepIcon className="h-4 w-4" />
                    <span className="text-sm font-medium">{step.label}</span>
                  </button>
                  {index < FORM_STEPS.length - 1 && (
                    <ArrowRight className="h-4 w-4 text-gray-400 mx-2 flex-shrink-0" />
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Form Content */}
        <div className="p-6 max-h-[60vh] overflow-y-auto">
          {renderStepContent()}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
          <button
            onClick={handlePrevious}
            disabled={activeStep === 0 || mode === 'view'}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
              activeStep === 0 || mode === 'view'
                ? 'bg-gray-200 dark:bg-gray-700 text-gray-400 cursor-not-allowed'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
            }`}
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Previous</span>
          </button>

          <div className="flex items-center space-x-3">
            {mode !== 'view' && (
              <>
                <HoldButton
                  entityType="exception_report"
                  entityId={reportId}
                  formData={formData}
                  projectId={projectId}
                  onHoldComplete={onHoldComplete || onCancel}
                />
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                >
                  <Save className="h-4 w-4" />
                  <span>{saving ? 'Saving...' : 'Save Draft'}</span>
                </button>
              </>
            )}
            
            {activeStep < FORM_STEPS.length - 1 ? (
              <button
                onClick={handleNext}
                disabled={mode === 'view'}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                  mode === 'view'
                    ? 'bg-gray-200 dark:bg-gray-700 text-gray-400 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                <span>Next</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            ) : (
              mode !== 'view' && (
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                >
                  <CheckCircle className="h-4 w-4" />
                  <span>{saving ? 'Saving...' : 'Save & Complete'}</span>
                </button>
              )
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
