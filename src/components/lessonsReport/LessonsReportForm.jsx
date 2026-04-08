/**
 * Lessons Report Form Component
 * Main multi-step form for creating and editing Lessons Reports
 */

import { useState, useEffect } from 'react'
import { Save, X, ChevronLeft, ChevronRight, CheckCircle, AlertCircle } from 'lucide-react'
import { HoldButton } from '../ui/HoldButton'
import LessonsReportDocumentInfoSection from './LessonsReportDocumentInfoSection'
import LessonsReportOverviewSection from './LessonsReportOverviewSection'
import LessonsReportOverallReviewSection from './LessonsReportOverallReviewSection'
import LessonsReportMeasuresSection from './LessonsReportMeasuresSection'
import LessonsReportLessonsSection from './LessonsReportLessonsSection'
import LessonsReportRecommendationsSection from './LessonsReportRecommendationsSection'
import LessonsReportAppendicesSection from './LessonsReportAppendicesSection'
import LessonsReportDistributionSection from './LessonsReportDistributionSection'
import LessonsReportCompletenessIndicator from './LessonsReportCompletenessIndicator'
import { validateReportCompleteness } from '../../services/lessonsReportService'

// Auto-save utility (similar to issue reports)
const enableAutoSave = (reportId, formData, onStatusChange) => {
  if (!reportId || reportId === 'new') return () => {}

  let intervalId
  let lastSavedData = JSON.stringify(formData)

  const save = async () => {
    try {
      const currentData = JSON.stringify(formData)
      if (currentData === lastSavedData) {
        if (onStatusChange) onStatusChange({ saved: true, timestamp: new Date() })
        return
      }

      const { updateLessonsReport } = await import('../../services/lessonsReportService')
      await updateLessonsReport(reportId, formData)
      lastSavedData = currentData
      if (onStatusChange) onStatusChange({ saved: true, timestamp: new Date() })
    } catch (error) {
      console.error('Auto-save error:', error)
      if (onStatusChange) onStatusChange({ saved: false, error: error.message, timestamp: new Date() })
    }
  }

  intervalId = setInterval(save, 30000) // Auto-save every 30 seconds

  return () => {
    if (intervalId) clearInterval(intervalId)
  }
}

const FORM_STEPS = [
  { id: 'document', label: 'Document Info', icon: '📄' },
  { id: 'overview', label: 'Overview & Context', icon: '📋' },
  { id: 'overall', label: 'Overall Review', icon: '📊' },
  { id: 'measures', label: 'Review of Measures', icon: '📈' },
  { id: 'lessons', label: 'Significant Lessons', icon: '💡' },
  { id: 'recommendations', label: 'Recommendations', icon: '✅' },
  { id: 'appendices', label: 'Appendices', icon: '📎' },
  { id: 'distribution', label: 'Distribution & Approval', icon: '📤' }
]

export default function LessonsReportForm({
  projectId,
  lessonsLogId,
  stageBoundaryId = null,
  reportId = null,
  reportType = 'project',
  mode = 'create',
  onSave,
  onCancel,
  onHoldComplete,
  autoPopulate = true
}) {
  const [activeStep, setActiveStep] = useState(0)
  const [formData, setFormData] = useState({
    project_id: projectId, // Include project_id for reference generation
    report_type: reportType,
    report_date: new Date().toISOString().split('T')[0],
    reporting_period_start: null,
    reporting_period_end: null,
    author_id: null,
    author_name: '',
    prepared_by_id: null,
    prepared_by_name: '',
    purpose: '',
    context: '',
    scope: '',
    executive_summary: '',
    what_went_well_summary: '',
    what_did_not_go_well_summary: '',
    surprises_unexpected_summary: '',
    planned_vs_actual_analysis: '',
    time_performance_review: '',
    cost_performance_review: '',
    quality_performance_review: '',
    scope_performance_review: '',
    risk_performance_review: '',
    benefits_performance_review: '',
    baseline_vs_actual_analysis: '',
    variance_analysis: '',
    key_recommendations_summary: '',
    process_changes_recommended: '',
    documentation_changes_recommended: '',
    role_responsibility_changes: '',
    organizational_improvements: ''
  })
  const [completeness, setCompleteness] = useState(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState({})
  const [autoSaveStatus, setAutoSaveStatus] = useState({ saved: false })
  const [autoSaveCleanup, setAutoSaveCleanup] = useState(null)

  useEffect(() => {
    if (reportId && mode !== 'create') {
      loadReport()
    }
  }, [reportId, mode])

  // Enable auto-save
  useEffect(() => {
    if (mode !== 'view' && reportId && reportId !== 'new') {
      const cleanup = enableAutoSave(reportId, formData, (status) => {
        setAutoSaveStatus(status)
      })
      setAutoSaveCleanup(() => cleanup)
      return cleanup
    }
  }, [reportId, formData, mode])

  useEffect(() => {
    // Load completeness when form data changes
    if (reportId) {
      loadCompleteness()
    }
  }, [reportId, formData])

  const loadReport = async () => {
    try {
      setLoading(true)
      const { getLessonsReportById } = await import('../../services/lessonsReportService')
      const result = await getLessonsReportById(reportId)
      
      if (result.success && result.data) {
        setFormData(prev => ({ ...prev, ...result.data }))
      }
    } catch (error) {
      console.error('Error loading report:', error)
      alert('Error loading report: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const loadCompleteness = async () => {
    if (!reportId) return
    
    try {
      const { validateReportCompleteness } = await import('../../services/lessonsReportService')
      const result = await validateReportCompleteness(reportId)
      
      if (result.success) {
        setCompleteness(result.data)
      }
    } catch (error) {
      console.error('Error loading completeness:', error)
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
      const { createLessonsReport, updateLessonsReport } = await import('../../services/lessonsReportService')
      
      if (mode === 'create') {
        const result = await createLessonsReport(projectId, {
          ...formData,
          lessons_log_id: lessonsLogId,
          stage_boundary_id: stageBoundaryId
        })
        
        if (result.success) {
          if (onSave) {
            onSave(result.data)
          }
        } else {
          alert('Error creating report: ' + result.error)
        }
      } else {
        const result = await updateLessonsReport(reportId, formData)
        
        if (result.success) {
          if (onSave) {
            onSave(result.data)
          }
        } else {
          alert('Error updating report: ' + result.error)
        }
      }
    } catch (error) {
      console.error('Error saving report:', error)
      alert('Error saving report: ' + error.message)
    } finally {
      setSaving(false)
    }
  }

  const validateCurrentStep = () => {
    const newErrors = {}
    
    switch (FORM_STEPS[activeStep].id) {
      case 'document':
        if (!formData.report_date) {
          newErrors.report_date = 'Report date is required'
        }
        break
      case 'overview':
        if (!formData.purpose || formData.purpose.length < 50) {
          newErrors.purpose = 'Purpose must be at least 50 characters'
        }
        if (!formData.executive_summary || formData.executive_summary.length < 100) {
          newErrors.executive_summary = 'Executive summary must be at least 100 characters'
        }
        break
      case 'overall':
        if (!formData.what_went_well_summary && !formData.what_did_not_go_well_summary) {
          newErrors.overall_review = 'At least one review section (what went well or what didn\'t) must have content'
        }
        break
      default:
        break
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const renderStepContent = () => {
    switch (FORM_STEPS[activeStep].id) {
      case 'document':
        return (
          <LessonsReportDocumentInfoSection
            formData={formData}
            onChange={handleChange}
            errors={errors}
            reportId={reportId}
            projectId={projectId}
            readOnly={mode === 'view'}
          />
        )
      case 'overview':
        return (
          <LessonsReportOverviewSection
            formData={formData}
            onChange={handleChange}
            errors={errors}
            readOnly={mode === 'view'}
          />
        )
      case 'overall':
        return (
          <LessonsReportOverallReviewSection
            formData={formData}
            onChange={handleChange}
            errors={errors}
            readOnly={mode === 'view'}
          />
        )
      case 'measures':
        return (
          <LessonsReportMeasuresSection
            formData={formData}
            onChange={handleChange}
            errors={errors}
            readOnly={mode === 'view'}
          />
        )
      case 'lessons':
        return (
          <LessonsReportLessonsSection
            reportId={reportId || 'new'}
            projectId={projectId}
            lessonsLogId={lessonsLogId}
            readOnly={mode === 'view'}
          />
        )
      case 'recommendations':
        return (
          <LessonsReportRecommendationsSection
            reportId={reportId || 'new'}
            readOnly={mode === 'view'}
          />
        )
      case 'appendices':
        return (
          <LessonsReportAppendicesSection
            reportId={reportId || 'new'}
            readOnly={mode === 'view'}
          />
        )
      case 'distribution':
        return (
          <LessonsReportDistributionSection
            reportId={reportId || 'new'}
            readOnly={mode === 'view'}
          />
        )
      default:
        return null
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          {mode === 'create' ? 'Create Lessons Report' : mode === 'edit' ? 'Edit Lessons Report' : 'View Lessons Report'}
        </h2>
        {mode !== 'view' && (
          <div className="flex gap-2">
            <HoldButton
              entityType="lessons_report"
              entityId={reportId}
              formData={formData}
              projectId={projectId}
              onHoldComplete={onHoldComplete || onCancel}
            />
            <button
              onClick={onCancel}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              <X className="w-4 h-4 inline mr-2" />
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50"
            >
              <Save className="w-4 h-4 inline mr-2" />
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        )}
      </div>

      {/* Completeness Indicator */}
      {reportId && completeness && (
        <LessonsReportCompletenessIndicator completeness={completeness} />
      )}

      {/* Auto-save Status */}
      {mode !== 'view' && autoSaveStatus && reportId && reportId !== 'new' && (
        <div className={`text-xs px-3 py-1 rounded ${
          autoSaveStatus.saved
            ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300'
            : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300'
        }`}>
          {autoSaveStatus.saved
            ? `✓ Saved ${autoSaveStatus.timestamp ? new Date(autoSaveStatus.timestamp).toLocaleTimeString() : ''}`
            : `✗ Save failed: ${autoSaveStatus.error || 'Unknown error'}`}
        </div>
      )}

      {/* Progress Steps */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-center justify-between">
          {FORM_STEPS.map((step, index) => (
            <div key={step.id} className="flex items-center flex-1">
              <button
                onClick={() => setActiveStep(index)}
                disabled={mode === 'view'}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                  index === activeStep
                    ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                    : index < activeStep
                    ? 'text-gray-600 dark:text-gray-400'
                    : 'text-gray-400 dark:text-gray-600'
                } ${mode === 'view' ? 'cursor-default' : 'cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700'}`}
              >
                <span className="text-lg">{step.icon}</span>
                <span className="text-sm font-medium hidden md:inline">{step.label}</span>
              </button>
              {index < FORM_STEPS.length - 1 && (
                <div className={`flex-1 h-0.5 mx-2 ${
                  index < activeStep ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-700'
                }`} />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Form Content */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        {renderStepContent()}
      </div>

      {/* Navigation Buttons */}
      {mode !== 'view' && (
        <div className="flex items-center justify-between">
          <button
            onClick={handlePrevious}
            disabled={activeStep === 0}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <ChevronLeft className="w-4 h-4" />
            Previous
          </button>
          <button
            onClick={handleNext}
            disabled={activeStep === FORM_STEPS.length - 1}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            Next
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  )
}
