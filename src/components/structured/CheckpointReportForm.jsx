import { useState, useEffect } from 'react'
import { FileText, Calendar, Package, CheckCircle, AlertCircle, TrendingUp, Users, Settings, X, Save, ArrowRight, ArrowLeft } from 'lucide-react'
import { useThemeContext } from '../../context/ThemeContext'
import { HoldButton } from '../ui/HoldButton'
import { createCheckpointReport, updateCheckpointReport, getCheckpointReportById } from '../../services/checkpointReportService'
import { getProductsByReport } from '../../services/checkpointReportProductsService'
import { getQualityActivities } from '../../services/checkpointReportQualityService'
import { getFollowUps } from '../../services/checkpointReportFollowUpService'
import { getLessons } from '../../services/checkpointReportLessonsService'
import { getQualityCheckStatus, runQualityChecks } from '../../services/checkpointReportQualityService'
import CheckpointReportHeader from './CheckpointReportHeader'
import ReportingPeriodSection from './ReportingPeriodSection'
import FollowUpsSection from './FollowUpsSection'
import CurrentPeriodProductsSection from './CurrentPeriodProductsSection'
import CurrentPeriodQualitySection from './CurrentPeriodQualitySection'
import CurrentPeriodLessonsSection from './CurrentPeriodLessonsSection'
import NextPeriodSection from './NextPeriodSection'
import ToleranceStatusSection from './ToleranceStatusSection'
import IssuesRisksSection from './IssuesRisksSection'
import CheckpointQualityCriteria from './CheckpointQualityCriteria'

const FORM_STEPS = [
  { id: 'header', label: 'Header', icon: FileText, description: 'Document metadata' },
  { id: 'period', label: 'Reporting Period', icon: Calendar, description: 'Period dates' },
  { id: 'followups', label: 'Follow-Ups', icon: AlertCircle, description: 'Previous report items' },
  { id: 'products', label: 'Products', icon: Package, description: 'Products & deliverables' },
  { id: 'quality', label: 'Quality Activities', icon: CheckCircle, description: 'Quality management' },
  { id: 'lessons', label: 'Lessons', icon: AlertCircle, description: 'Lessons identified' },
  { id: 'nextperiod', label: 'Next Period', icon: Calendar, description: 'Next period planning' },
  { id: 'tolerance', label: 'Tolerance Status', icon: TrendingUp, description: 'Time, cost, scope' },
  { id: 'issues', label: 'Issues & Risks', icon: AlertCircle, description: 'Issues and risks summary' },
  { id: 'review', label: 'Review & Submit', icon: CheckCircle, description: 'Quality checks & submit' },
]

export default function CheckpointReportForm({
  projectId,
  workPackageId,
  reportId = null,
  mode = 'create', // 'create' | 'edit' | 'view'
  onSave,
  onCancel,
  onHoldComplete,
  previousReportId = null
}) {
  const { theme } = useThemeContext()
  const [activeStep, setActiveStep] = useState(0)
  const [formData, setFormData] = useState({
    checkpoint_date: new Date().toISOString().split('T')[0],
    report_title: '',
    report_summary: '',
    progress_summary: '',
    completed_work: '',
    work_in_progress: '',
    planned_work: '',
    issues_summary: '',
    risks_summary: '',
    changes_summary: '',
    quality_status: '',
    quality_concerns: '',
    budget_status: '',
    schedule_status: '',
    variance_analysis: '',
    period_start_date: null,
    period_end_date: null,
    date_of_next_revision: null,
    follow_ups_summary: '',
    next_period_products_developing: '',
    next_period_products_completing: '',
    next_period_quality_activities: '',
    lessons_summary: '',
    version_no: '1.0',
    document_ref: '',
    author_id: null,
    owner_id: null,
    client_id: null,
    status: 'draft'
  })
  const [products, setProducts] = useState([])
  const [qualityActivities, setQualityActivities] = useState([])
  const [followUps, setFollowUps] = useState([])
  const [lessons, setLessons] = useState([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState({})
  const [qualityStatus, setQualityStatus] = useState(null)

  useEffect(() => {
    if (reportId && mode !== 'create') {
      loadReport()
    }
  }, [reportId, mode])

  useEffect(() => {
    if (reportId) {
      loadRelatedData()
    }
  }, [reportId])

  const loadReport = async () => {
    try {
      setLoading(true)
      const report = await getCheckpointReportById(reportId)
      setFormData({
        ...report,
        checkpoint_date: report.checkpoint_date || new Date().toISOString().split('T')[0],
        period_start_date: report.period_start_date || null,
        period_end_date: report.period_end_date || null,
        date_of_next_revision: report.date_of_next_revision || null
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
      const [productsData, qualityData, followUpsData, lessonsData, qualityStatusData] = await Promise.all([
        getProductsByReport(reportId),
        getQualityActivities(reportId),
        getFollowUps(reportId),
        getLessons(reportId),
        getQualityCheckStatus(reportId)
      ])
      setProducts(productsData)
      setQualityActivities(qualityData)
      setFollowUps(followUpsData)
      setLessons(lessonsData)
      setQualityStatus(qualityStatusData)
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
        if (!formData.checkpoint_date) newErrors.checkpoint_date = 'Checkpoint date is required'
        if (!formData.report_summary || formData.report_summary.length < 50) {
          newErrors.report_summary = 'Report summary must be at least 50 characters'
        }
        break
      case 'period':
        if (!formData.period_start_date) newErrors.period_start_date = 'Period start date is required'
        if (!formData.period_end_date) newErrors.period_end_date = 'Period end date is required'
        if (formData.period_start_date && formData.period_end_date && 
            new Date(formData.period_start_date) > new Date(formData.period_end_date)) {
          newErrors.period_end_date = 'End date must be after start date'
        }
        break
      case 'products':
        if (products.length === 0) {
          newErrors.products = 'At least one product must be listed'
        }
        break
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleNext = async () => {
    const currentStepId = FORM_STEPS[activeStep].id
    
    if (!validateStep(currentStepId)) {
      return
    }

    // Run quality checks on review step
    if (currentStepId === 'review' && reportId) {
      try {
        await runQualityChecks(reportId)
        const status = await getQualityCheckStatus(reportId)
        setQualityStatus(status)
      } catch (error) {
        console.error('Error running quality checks:', error)
      }
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
      
      if (reportId) {
        await updateCheckpointReport(reportId, formData)
      } else {
        const newReport = await createCheckpointReport(projectId, workPackageId, formData)
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
          <CheckpointReportHeader
            formData={formData}
            onChange={handleChange}
            errors={errors}
            mode={mode}
          />
        )
      case 'period':
        return (
          <ReportingPeriodSection
            formData={formData}
            onChange={handleChange}
            errors={errors}
            mode={mode}
          />
        )
      case 'followups':
        return (
          <FollowUpsSection
            reportId={reportId}
            followUps={followUps}
            onFollowUpsChange={setFollowUps}
            previousReportId={previousReportId}
            mode={mode}
          />
        )
      case 'products':
        return (
          <CurrentPeriodProductsSection
            reportId={reportId}
            products={products}
            onProductsChange={setProducts}
            workPackageId={workPackageId}
            mode={mode}
          />
        )
      case 'quality':
        return (
          <CurrentPeriodQualitySection
            reportId={reportId}
            qualityActivities={qualityActivities}
            onQualityActivitiesChange={setQualityActivities}
            mode={mode}
          />
        )
      case 'lessons':
        return (
          <CurrentPeriodLessonsSection
            reportId={reportId}
            lessons={lessons}
            onLessonsChange={setLessons}
            projectId={projectId}
            mode={mode}
          />
        )
      case 'nextperiod':
        return (
          <NextPeriodSection
            formData={formData}
            onChange={handleChange}
            errors={errors}
            mode={mode}
          />
        )
      case 'tolerance':
        return (
          <ToleranceStatusSection
            reportId={reportId}
            formData={formData}
            onChange={handleChange}
            workPackageId={workPackageId}
            mode={mode}
          />
        )
      case 'issues':
        return (
          <IssuesRisksSection
            formData={formData}
            onChange={handleChange}
            errors={errors}
            mode={mode}
          />
        )
      case 'review':
        return (
          <div className="space-y-6">
            <CheckpointQualityCriteria
              reportId={reportId}
              qualityStatus={qualityStatus}
              onStatusChange={setQualityStatus}
              mode={mode}
            />
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">Ready to Submit?</h3>
              <p className="text-sm text-blue-700 dark:text-blue-300">
                Review all sections and ensure quality criteria are met before submitting for approval.
              </p>
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
        <div className="text-gray-500 dark:text-gray-400">Loading...</div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-6xl w-full max-h-[95vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-6 flex items-center justify-between z-10">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <FileText className="h-6 w-6" />
              {mode === 'create' ? 'Create' : mode === 'edit' ? 'Edit' : 'View'} Checkpoint Report
            </h2>
            {formData.document_ref && (
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {formData.document_ref} - Version {formData.version_no}
              </p>
            )}
          </div>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Progress Steps */}
        <div className="px-6 py-4 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 overflow-x-auto">
          <div className="flex items-center gap-2 min-w-max">
            {FORM_STEPS.map((step, index) => {
              const Icon = step.icon
              const isActive = index === activeStep
              const isCompleted = index < activeStep
              
              return (
                <button
                  key={step.id}
                  onClick={() => setActiveStep(index)}
                  disabled={mode === 'view'}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm whitespace-nowrap transition-colors ${
                    isActive
                      ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                      : isCompleted
                      ? 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                      : 'bg-white dark:bg-gray-800 text-gray-400 dark:text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700'
                  } ${mode === 'view' ? 'cursor-default' : 'cursor-pointer'}`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{step.label}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Form Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {renderStepContent()}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-6 flex items-center justify-between">
          <div className="text-sm text-gray-500 dark:text-gray-400">
            Step {activeStep + 1} of {FORM_STEPS.length}
          </div>
          <div className="flex gap-3">
            {activeStep > 0 && (
              <button
                type="button"
                onClick={handlePrevious}
                disabled={mode === 'view'}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Previous
              </button>
            )}
            {activeStep < FORM_STEPS.length - 1 ? (
              <button
                type="button"
                onClick={handleNext}
                disabled={mode === 'view'}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
                <ArrowRight className="h-4 w-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSave}
                disabled={saving || mode === 'view'}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save className="h-4 w-4" />
                {saving ? 'Saving...' : reportId ? 'Update Report' : 'Save Report'}
              </button>
            )}
            {mode !== 'view' && (
              <HoldButton
                entityType="checkpoint_report"
                entityId={reportId}
                formData={formData}
                projectId={projectId}
                onHoldComplete={onHoldComplete || onCancel}
              />
            )}
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              {mode === 'view' ? 'Close' : 'Cancel'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
