import { useState, useEffect } from 'react'
import { FileText, AlertTriangle, CheckCircle, Users, Settings, X } from 'lucide-react'
import { useThemeContext } from '../../context/ThemeContext'
import { HoldButton } from '../ui/HoldButton'
import IssueReportDocumentInfoSection from './IssueReportDocumentInfoSection'
import IssueReportIssueSummarySection from './IssueReportIssueSummarySection'
import IssueReportImpactAnalysisSection from './IssueReportImpactAnalysisSection'
import IssueReportOptionsSection from './IssueReportOptionsSection'
import IssueReportDecisionSection from './IssueReportDecisionSection'
import IssueReportClosureSection from './IssueReportClosureSection'
import IssueReportDistributionSection from './IssueReportDistributionSection'
import IssueReportCompletenessIndicator from './IssueReportCompletenessIndicator'
import { enableAutoSave, getAutoSaveStatus } from '../../utils/issueReportAutoSave'

const FORM_STEPS = [
  { id: 'document', label: 'Document Info', icon: FileText, description: 'Reference, version, author' },
  { id: 'issue', label: 'Issue Summary', icon: AlertTriangle, description: 'Issue details' },
  { id: 'impact', label: 'Impact Analysis', icon: AlertTriangle, description: 'Six variables impact' },
  { id: 'options', label: 'Options & Recommendations', icon: CheckCircle, description: 'Options analysis' },
  { id: 'decision', label: 'Decision', icon: Settings, description: 'Decision requirements' },
  { id: 'closure', label: 'Closure', icon: CheckCircle, description: 'Closure documentation' },
  { id: 'distribution', label: 'Distribution & Approval', icon: Users, description: 'Approval workflow' },
]

export default function IssueReportForm({
  issueId,
  reportId = null,
  mode = 'create', // 'create' | 'edit' | 'view'
  onSave,
  onCancel,
  onHoldComplete,
  autoPopulate = true
}) {
  const { theme } = useThemeContext()
  const [activeStep, setActiveStep] = useState(0)
  const [formData, setFormData] = useState({
    report_reference: '',
    version_no: '1.0',
    report_date: new Date().toISOString().split('T')[0],
    report_status: 'draft',
    author_id: null,
    author_name: '',
    prepared_by_id: null,
    prepared_by_name: '',
    issue_identifier: '',
    issue_type: '',
    issue_title: '',
    issue_description: '',
    impact_time: '',
    impact_cost: '',
    impact_quality: '',
    impact_scope: '',
    impact_benefits: '',
    impact_risk: '',
    affects_stage_tolerances: false,
    affects_project_tolerances: false,
    tolerance_impact_details: '',
    options_analysis: '',
    recommendation: '',
    recommendation_rationale: '',
    decision_required: false,
    decision_by: '',
    decision_date: null,
    decision_made: '',
    decision_made_by_id: null,
    decision_made_by_name: '',
    decision_conditions: '',
    closure_date: null,
    closure_outcome: '',
    closure_verified_by_id: null,
    follow_up_required: false,
    follow_up_details: '',
    lessons_captured: false,
    lessons_summary: ''
  })
  const [options, setOptions] = useState([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState({})
  const [completeness, setCompleteness] = useState(null)
  const [autoSaveStatus, setAutoSaveStatus] = useState({ saved: false })
  const [autoSaveCleanup, setAutoSaveCleanup] = useState(null)

  useEffect(() => {
    if (reportId && mode !== 'create') {
      loadReport()
    } else if (issueId && autoPopulate && mode === 'create') {
      autoPopulateFromIssue()
    }
  }, [reportId, issueId, mode, autoPopulate])

  // Enable auto-save
  useEffect(() => {
    if (mode !== 'view' && (reportId || formData.report_reference)) {
      const cleanup = enableAutoSave(reportId, formData, (status) => {
        setAutoSaveStatus(status)
      })
      setAutoSaveCleanup(() => cleanup)
      return cleanup
    }
  }, [reportId, formData, mode])

  const loadReport = async () => {
    try {
      setLoading(true)
      const { getIssueReportById } = await import('../../services/issueReportService')
      const { getOptions } = await import('../../services/issueReportOptionService')
      
      const report = await getIssueReportById(reportId)
      setFormData({
        ...report,
        report_date: report.report_date || new Date().toISOString().split('T')[0],
        decision_date: report.decision_date || null,
        closure_date: report.closure_date || null
      })

      const reportOptions = await getOptions(reportId)
      setOptions(reportOptions)
    } catch (error) {
      console.error('Error loading report:', error)
      alert('Error loading report: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const autoPopulateFromIssue = async () => {
    try {
      const { getIssueById } = await import('../../services/issueService')
      const issue = await getIssueById(issueId)
      
      setFormData(prev => ({
        ...prev,
        issue_identifier: issue.issue_identifier || '',
        issue_type: issue.issue_type || '',
        issue_title: issue.title || issue.issue_title || '',
        issue_description: issue.description || issue.issue_description || '',
        author_id: issue.author_id || issue.raised_by_id || null,
        report_date: issue.date_raised || new Date().toISOString().split('T')[0]
      }))
    } catch (error) {
      console.error('Error auto-populating from issue:', error)
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

  const handleSave = async () => {
    try {
      setSaving(true)
      
      if (mode === 'create') {
        const { createIssueReport } = await import('../../services/issueReportService')
        const { addOption } = await import('../../services/issueReportOptionService')
        
        const report = await createIssueReport(issueId, formData)
        
        // Add options
        for (const option of options) {
          await addOption(report.id, option)
        }
        
        if (onSave) onSave(report)
      } else {
        const { updateIssueReport } = await import('../../services/issueReportService')
        const { addOption, updateOption, deleteOption } = await import('../../services/issueReportOptionService')
        
        await updateIssueReport(reportId, formData)
        
        // Sync options (simple approach - can be optimized)
        const { getOptions } = await import('../../services/issueReportOptionService')
        const existingOptions = await getOptions(reportId)
        
        // Delete removed options
        const existingIds = existingOptions.map(o => o.id)
        const newIds = options.filter(o => o.id).map(o => o.id)
        for (const id of existingIds) {
          if (!newIds.includes(id)) {
            await deleteOption(id)
          }
        }
        
        // Add/update options
        for (const option of options) {
          if (option.id) {
            await updateOption(option.id, option)
          } else {
            await addOption(reportId, option)
          }
        }
        
        if (onSave) onSave({ id: reportId, ...formData })
      }
    } catch (error) {
      console.error('Error saving report:', error)
      alert('Error saving report: ' + error.message)
      setSaving(false)
    }
  }

  const validateCurrentStep = () => {
    const stepErrors = {}
    const currentStepId = FORM_STEPS[activeStep].id

    switch (currentStepId) {
      case 'document':
        if (!formData.report_reference) stepErrors.report_reference = 'Report reference is required'
        if (!formData.report_date) stepErrors.report_date = 'Report date is required'
        break
      case 'issue':
        if (!formData.issue_title) stepErrors.issue_title = 'Issue title is required'
        break
      // Add more validation as needed
    }

    setErrors(stepErrors)
    return Object.keys(stepErrors).length === 0
  }

  const renderStepContent = () => {
    const readOnly = mode === 'view'
    const currentStepId = FORM_STEPS[activeStep].id

    switch (currentStepId) {
      case 'document':
        return (
          <IssueReportDocumentInfoSection
            formData={formData}
            onChange={handleChange}
            errors={errors}
            readOnly={readOnly}
          />
        )
      case 'issue':
        return (
          <IssueReportIssueSummarySection
            formData={formData}
            onChange={handleChange}
            errors={errors}
            issueId={issueId}
            readOnly={readOnly}
          />
        )
      case 'impact':
        return (
          <IssueReportImpactAnalysisSection
            formData={formData}
            onChange={handleChange}
            errors={errors}
            readOnly={readOnly}
          />
        )
      case 'options':
        return (
          <IssueReportOptionsSection
            formData={formData}
            onChange={handleChange}
            options={options}
            onOptionsChange={setOptions}
            errors={errors}
            readOnly={readOnly}
          />
        )
      case 'decision':
        return (
          <IssueReportDecisionSection
            formData={formData}
            onChange={handleChange}
            errors={errors}
            readOnly={readOnly}
          />
        )
      case 'closure':
        return (
          <IssueReportClosureSection
            formData={formData}
            onChange={handleChange}
            errors={errors}
            readOnly={readOnly}
          />
        )
      case 'distribution':
        return (
          <IssueReportDistributionSection
            formData={formData}
            onChange={handleChange}
            reportId={reportId}
            errors={errors}
            readOnly={readOnly}
          />
        )
      default:
        return <div>Unknown step</div>
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto" />
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading Issue Report...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            {mode === 'create' ? 'Create Issue Report' : mode === 'edit' ? 'Edit Issue Report' : 'Issue Report'}
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            {FORM_STEPS[activeStep].description}
          </p>
        </div>
        {onCancel && (
          <button
            onClick={onCancel}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            <X className="w-4 h-4 inline mr-2" />
            Cancel
          </button>
        )}
      </div>

      {/* Completeness Indicator */}
          {mode !== 'view' && reportId && (
        <IssueReportCompletenessIndicator reportId={reportId} onCompletenessChange={setCompleteness} />
      )}

      {/* Auto-save Status */}
      {mode !== 'view' && autoSaveStatus && (
        <div className={`text-xs px-3 py-1 rounded ${
          autoSaveStatus.saved
            ? 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300'
            : autoSaveStatus.error
            ? 'bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-300'
            : 'bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
        }`}>
          {getAutoSaveStatus(autoSaveStatus.saved, autoSaveStatus.error, autoSaveStatus.timestamp).message}
        </div>
      )}

      {/* Progress Steps */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Report Sections
          </h3>
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Step {activeStep + 1} of {FORM_STEPS.length}
          </div>
        </div>

        {/* Step Indicators */}
        <div className="flex items-center justify-between relative">
          {/* Progress Line */}
          <div className="absolute top-5 left-0 right-0 h-0.5 bg-gray-200 dark:bg-gray-700">
            <div
              className="h-full bg-blue-600 transition-all duration-300"
              style={{ width: `${(activeStep / (FORM_STEPS.length - 1)) * 100}%` }}
            />
          </div>

          {FORM_STEPS.map((step, index) => {
            const isActive = index === activeStep
            const isCompleted = index < activeStep
            const Icon = step.icon

            return (
              <div
                key={step.id}
                className="flex flex-col items-center relative z-10"
                style={{ flex: 1 }}
              >
                <button
                  onClick={() => setActiveStep(index)}
                  disabled={mode === 'view' ? false : index > activeStep}
                  className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all ${
                    isActive
                      ? 'bg-blue-600 border-blue-600 text-white'
                      : isCompleted
                      ? 'bg-green-500 border-green-500 text-white'
                      : mode === 'view' || index <= activeStep
                      ? 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-blue-500'
                      : 'bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                  }`}
                >
                  {isCompleted ? (
                    <CheckCircle className="w-5 h-5" />
                  ) : (
                    <Icon className="w-5 h-5" />
                  )}
                </button>
                <div className="mt-2 text-center max-w-[120px]">
                  <p
                    className={`text-xs font-medium ${
                      isActive
                        ? 'text-blue-600 dark:text-blue-400'
                        : isCompleted
                        ? 'text-green-600 dark:text-green-400'
                        : 'text-gray-600 dark:text-gray-400'
                    }`}
                  >
                    {step.label}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Form Content */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        {renderStepContent()}
      </div>

      {/* Navigation Buttons */}
      {mode !== 'view' && (
        <div className="flex justify-between items-center">
          <button
            onClick={handlePrevious}
            disabled={activeStep === 0}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>

          <div className="flex gap-2">
            <HoldButton
              entityType="issue_report"
              entityId={reportId}
              formData={formData}
              onHoldComplete={onHoldComplete || onCancel}
            />
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Saving...' : 'Save Draft'}
            </button>
            {activeStep === FORM_STEPS.length - 1 && (
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? 'Saving...' : 'Save & Complete'}
              </button>
            )}
          </div>

          <button
            onClick={handleNext}
            disabled={activeStep === FORM_STEPS.length - 1}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
      )}
    </div>
  )
}
