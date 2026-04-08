import { useState, useEffect } from 'react'
import { FileText, User, Target, TrendingUp, Package, AlertTriangle, Lightbulb, ArrowRight, CheckCircle, X, Save, ArrowLeft } from 'lucide-react'
import { useThemeContext } from '../../../context/ThemeContext'
import { HoldButton } from '../../ui/HoldButton'
import { createEndStageReport, updateEndStageReport, fetchEndStageReport } from '../../../services/stageBoundariesService'
import { generateReportReference, validateReportCompleteness } from '../../../services/endStageReportService'
import { supabase } from '../../../services/supabaseClient'
import EndStageReportDocumentInfoSection from './EndStageReportDocumentInfoSection'
import EndStageReportProjectReviewSection from './EndStageReportProjectReviewSection'
import EndStageReportBusinessCaseSection from './EndStageReportBusinessCaseSection'

const FORM_STEPS = [
  { id: 'document', label: 'Document Info', icon: FileText, description: 'Document metadata' },
  { id: 'basic', label: 'Basic Info', icon: FileText, description: 'Stage information' },
  { id: 'project', label: 'Project Review', icon: Target, description: 'Six variables review' },
  { id: 'businesscase', label: 'Business Case', icon: Target, description: 'Business case review' },
  { id: 'performance', label: 'Performance', icon: TrendingUp, description: 'Stage performance' },
  { id: 'products', label: 'Products', icon: Package, description: 'Product status' },
  { id: 'risks', label: 'Risks & Issues', icon: AlertTriangle, description: 'Risk and issue review' },
  { id: 'lessons', label: 'Lessons', icon: Lightbulb, description: 'Lessons learned' },
  { id: 'forecast', label: 'Forecast', icon: ArrowRight, description: 'Next stage forecast' },
  { id: 'actions', label: 'Follow-On Actions', icon: ArrowRight, description: 'Follow-on actions' },
  { id: 'approval', label: 'Approval', icon: CheckCircle, description: 'Approval and distribution' },
]

export default function EndStageReportFormEnhanced({
  projectId,
  stageBoundaryId = null,
  reportId = null,
  mode = 'create',
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
    report_reference: '',
    reporting_period_start: null,
    reporting_period_end: null,
    stage_boundary_id: stageBoundaryId,
    stage_name: '',
    stage_number: 1,
    stage_status: 'completed',
    stage_objectives_summary: '',
    stage_objectives_met: true,
    approval_workflow_status: 'draft',
    approval_status: 'draft'
  })
  const [productStatuses, setProductStatuses] = useState([])
  const [riskReviews, setRiskReviews] = useState([])
  const [issueReviews, setIssueReviews] = useState([])
  const [followOnActions, setFollowOnActions] = useState([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState({})
  const [completeness, setCompleteness] = useState(null)

  useEffect(() => {
    if (reportId && mode !== 'create') {
      loadReport()
    }
  }, [reportId, mode])

  useEffect(() => {
    if (reportId) {
      loadRelatedData()
      checkCompleteness()
    }
  }, [reportId])

  const loadReport = async () => {
    try {
      setLoading(true)
      const report = await fetchEndStageReport(reportId)
      setFormData({
        ...report,
        report_date: report.report_date || new Date().toISOString().split('T')[0],
        reporting_period_start: report.reporting_period_start || null,
        reporting_period_end: report.reporting_period_end || null
      })
    } catch (error) {
      console.error('Error loading report:', error)
      alert('Error loading report: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const loadRelatedData = async () => {
    try {
      const [
        products,
        risks,
        issues,
        actions
      ] = await Promise.all([
        import('../../../services/endStageReportProductService').then(m => m.getProductStatuses(reportId).catch(() => [])),
        import('../../../services/endStageReportRiskService').then(m => m.getRiskReviews(reportId).catch(() => [])),
        import('../../../services/endStageReportIssueService').then(m => m.getIssueReviews(reportId).catch(() => [])),
        import('../../../services/endStageReportActionsService').then(m => m.getFollowOnActions(reportId).catch(() => []))
      ])

      setProductStatuses(products || [])
      setRiskReviews(risks || [])
      setIssueReviews(issues || [])
      setFollowOnActions(actions || [])
    } catch (error) {
      console.error('Error loading related data:', error)
    }
  }

  const checkCompleteness = async () => {
    if (!reportId) return
    try {
      const validation = await validateReportCompleteness(reportId)
      setCompleteness(validation)
    } catch (error) {
      console.error('Error checking completeness:', error)
    }
  }

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[field]
        return newErrors
      })
    }
  }

  const validateStep = () => {
    const step = FORM_STEPS[activeStep]
    const newErrors = {}

    switch (step.id) {
      case 'document':
        if (!formData.report_title || formData.report_title.trim().length < 10) {
          newErrors.report_title = 'Report title must be at least 10 characters'
        }
        if (!formData.report_date) {
          newErrors.report_date = 'Report date is required'
        }
        break
      case 'basic':
        if (!formData.stage_objectives_summary || formData.stage_objectives_summary.trim().length < 100) {
          newErrors.stage_objectives_summary = 'Stage objectives summary must be at least 100 characters'
        }
        break
      case 'businesscase':
        if (!formData.business_case_review_summary || formData.business_case_review_summary.trim().length < 50) {
          newErrors.business_case_review_summary = 'Business case review summary must be at least 50 characters'
        }
        break
      default:
        break
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleNext = () => {
    if (validateStep() && activeStep < FORM_STEPS.length - 1) {
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
      
      if (reportId) {
        await updateEndStageReport(reportId, formData)
      } else {
        const newReport = await createEndStageReport({
          ...formData,
          project_id: projectId,
          created_by: (await supabase.auth.getUser()).data.user.id,
          prepared_by: formData.prepared_by || (await supabase.auth.getUser()).data.user.id
        })
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
      case 'document':
        return (
          <EndStageReportDocumentInfoSection
            formData={formData}
            onChange={handleChange}
            errors={errors}
            mode={mode}
            projectId={projectId}
            stageNumber={formData.stage_number}
          />
        )
      case 'basic':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Stage Name *
                </label>
                <input
                  type="text"
                  value={formData.stage_name || ''}
                  onChange={(e) => handleChange('stage_name', e.target.value)}
                  required
                  disabled={mode === 'view'}
                  className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Stage Number *
                </label>
                <input
                  type="number"
                  min="1"
                  value={formData.stage_number || 1}
                  onChange={(e) => handleChange('stage_number', parseInt(e.target.value))}
                  required
                  disabled={mode === 'view'}
                  className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Stage Objectives Summary *
              </label>
              <textarea
                value={formData.stage_objectives_summary || ''}
                onChange={(e) => handleChange('stage_objectives_summary', e.target.value)}
                required
                disabled={mode === 'view'}
                rows={6}
                placeholder="Summarize the stage objectives and outcomes..."
                className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 ${
                  errors.stage_objectives_summary ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                }`}
              />
              {errors.stage_objectives_summary && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.stage_objectives_summary}</p>
              )}
            </div>
          </div>
        )
      case 'project':
        return (
          <EndStageReportProjectReviewSection
            formData={formData}
            onChange={handleChange}
            errors={errors}
            mode={mode}
          />
        )
      case 'businesscase':
        return (
          <EndStageReportBusinessCaseSection
            reportId={reportId}
            formData={formData}
            onChange={handleChange}
            errors={errors}
            mode={mode}
            projectId={projectId}
          />
        )
      case 'performance':
        return (
          <div className="space-y-6">
            <p className="text-gray-600 dark:text-gray-400">Performance section - Schedule, Cost, Quality metrics (existing fields)</p>
            {/* Use existing performance fields from formData */}
          </div>
        )
      case 'products':
        return (
          <div className="space-y-6">
            <p className="text-gray-600 dark:text-gray-400">Products section - Product status tracking</p>
            {/* Product status management will be added */}
          </div>
        )
      case 'risks':
        return (
          <div className="space-y-6">
            <p className="text-gray-600 dark:text-gray-400">Risks and Issues section - Risk and issue reviews</p>
            {/* Risk and issue review management will be added */}
          </div>
        )
      case 'lessons':
        return (
          <div className="space-y-6">
            <p className="text-gray-600 dark:text-gray-400">Lessons section - Lessons learned</p>
            {/* Lessons management will be added */}
          </div>
        )
      case 'forecast':
        return (
          <div className="space-y-6">
            <p className="text-gray-600 dark:text-gray-400">Forecast section - Next stage forecast</p>
            {/* Forecast fields from formData */}
          </div>
        )
      case 'actions':
        return (
          <div className="space-y-6">
            <p className="text-gray-600 dark:text-gray-400">Follow-on actions section</p>
            {/* Follow-on actions management will be added */}
          </div>
        )
      case 'approval':
        return (
          <div className="space-y-6">
            <p className="text-gray-600 dark:text-gray-400">Approval and distribution section</p>
            {/* Approval workflow will be added */}
          </div>
        )
      default:
        return null
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Progress Indicator */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Step {activeStep + 1} of {FORM_STEPS.length}
          </span>
          {completeness && (
            <span className="text-sm text-gray-600 dark:text-gray-400">
              Completeness: {completeness.overallCompleteness.toFixed(0)}%
            </span>
          )}
        </div>
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all"
            style={{ width: `${((activeStep + 1) / FORM_STEPS.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Step Navigation */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex gap-2 overflow-x-auto">
          {FORM_STEPS.map((step, index) => {
            const Icon = step.icon
            const isActive = index === activeStep
            const isCompleted = index < activeStep
            
            return (
              <button
                key={step.id}
                onClick={() => setActiveStep(index)}
                disabled={mode === 'view'}
                className={`px-3 py-2 text-sm font-medium flex items-center gap-2 rounded-lg whitespace-nowrap transition-colors ${
                  isActive
                    ? 'bg-blue-600 text-white'
                    : isCompleted
                    ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                } ${mode === 'view' ? 'cursor-default' : 'cursor-pointer'}`}
              >
                <Icon className="h-4 w-4" />
                {step.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Step Content */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            {(() => {
              const Icon = FORM_STEPS[activeStep].icon
              return <Icon className="h-5 w-5" />
            })()}
            {FORM_STEPS[activeStep].label}
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            {FORM_STEPS[activeStep].description}
          </p>
        </div>

        {renderStepContent()}
      </div>

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between">
        <button
          onClick={handlePrevious}
          disabled={activeStep === 0}
          className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ArrowLeft className="h-4 w-4" />
          Previous
        </button>

        <div className="flex items-center gap-3">
          {mode !== 'view' && (
            <>
              <HoldButton
                entityType="end_stage_report"
                entityId={reportId}
                formData={formData}
                projectId={projectId}
                onHoldComplete={onHoldComplete || onCancel}
              />
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg flex items-center gap-2 disabled:opacity-50"
              >
                <Save className="h-4 w-4" />
                {saving ? 'Saving...' : 'Save'}
              </button>
            </>
          )}
          
          {activeStep < FORM_STEPS.length - 1 ? (
            <button
              onClick={handleNext}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2"
            >
              Next
              <ArrowRight className="h-4 w-4" />
            </button>
          ) : (
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2 disabled:opacity-50"
            >
              <CheckCircle className="h-4 w-4" />
              {saving ? 'Saving...' : 'Complete'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
