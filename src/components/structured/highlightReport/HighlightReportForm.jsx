import { useState, useEffect, useCallback, useRef } from 'react'
import { format, subDays } from 'date-fns'
import {
  FileText,
  Save,
  X,
  ArrowLeft,
  ArrowRight,
  Calendar,
  BarChart3,
  Package,
  ShieldAlert,
  AlertCircle,
  GitBranch,
  Gavel,
  BookOpen,
  Send,
  CheckCircle
} from 'lucide-react'
import { HoldButton } from '../../ui/HoldButton'
import {
  createHighlightReport,
  updateHighlightReport,
  getHighlightReportById
} from '../../../services/controllingStageService'
import HighlightReportDocumentInfoSection from './HighlightReportDocumentInfoSection'
import HighlightReportSixVariablesSection from './HighlightReportSixVariablesSection'
import HighlightReportToleranceSection from './HighlightReportToleranceSection'
import HighlightReportProductsSection from './HighlightReportProductsSection'
import HighlightReportRisksSection from './HighlightReportRisksSection'
import HighlightReportIssuesSection from './HighlightReportIssuesSection'
import HighlightReportChangesSection from './HighlightReportChangesSection'
import HighlightReportDecisionsSection from './HighlightReportDecisionsSection'
import HighlightReportLessonsSection from './HighlightReportLessonsSection'
import HighlightReportDistributionSection from './HighlightReportDistributionSection'
import HighlightReportCompletenessIndicator from './HighlightReportCompletenessIndicator'
import HighlightReportAutoPopulateButton from './HighlightReportAutoPopulateButton'

const FORM_STEPS = [
  { id: 'document', label: 'Document Info', icon: FileText },
  { id: 'summary', label: 'Summary & Status', icon: BarChart3 },
  { id: 'sixvars', label: 'Six Variables', icon: BarChart3 },
  { id: 'tolerance', label: 'Tolerance', icon: BarChart3 },
  { id: 'progress', label: 'Progress', icon: Package },
  { id: 'products', label: 'Products', icon: Package },
  { id: 'risks', label: 'Risks', icon: ShieldAlert },
  { id: 'issues', label: 'Issues', icon: AlertCircle },
  { id: 'changes', label: 'Changes', icon: GitBranch },
  { id: 'decisions', label: 'Decisions', icon: Gavel },
  { id: 'lessons', label: 'Lessons', icon: BookOpen },
  { id: 'distribution', label: 'Distribution', icon: Send }
]

const defaultFormData = {
  report_title: 'Highlight Report',
  report_date: format(new Date(), 'yyyy-MM-dd'),
  reporting_period_start: format(subDays(new Date(), 7), 'yyyy-MM-dd'),
  reporting_period_end: format(new Date(), 'yyyy-MM-dd'),
  version_no: '1.0',
  report_reference: '',
  frequency: '',
  next_report_due_date: '',
  executive_summary: '',
  stage_status: 'on_track',
  overall_status_summary: '',
  progress_summary: '',
  completed_this_period: '',
  planned_next_period: '',
  budget_status: '',
  budget_variance: '',
  budget_forecast: '',
  schedule_status: '',
  schedule_variance_days: '',
  schedule_forecast: '',
  quality_status: '',
  quality_issues: '',
  time_status: '',
  time_summary: '',
  time_forecast: '',
  cost_status: '',
  cost_summary: '',
  cost_forecast: '',
  quality_status_six: '',
  quality_summary: '',
  quality_forecast: '',
  scope_status: '',
  scope_summary: '',
  scope_forecast: '',
  benefits_status: '',
  benefits_summary: '',
  benefits_forecast: '',
  risk_status: '',
  risk_summary: '',
  risk_forecast: '',
  tolerance_breaches_summary: '',
  tolerance_warnings_summary: '',
  escalation_required: false,
  escalation_reason: '',
  risks_summary: '',
  issues_summary: '',
  changes_summary: '',
  decisions_required: '',
  recommendations: ''
}

export default function HighlightReportForm({
  projectId,
  stageBoundaryId = null,
  reportId = null,
  mode = 'create',
  onSave,
  onCancel,
  onHoldComplete,
  embedded = false
}) {
  const [activeStep, setActiveStep] = useState(0)
  const [formData, setFormData] = useState(defaultFormData)
  const [loading, setLoading] = useState(!!reportId)
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState({})
  const formDataRef = useRef(formData)
  formDataRef.current = formData

  useEffect(() => {
    if (reportId && mode !== 'create') loadReport()
  }, [reportId, mode])

  // Auto-save draft every 30s in edit mode
  useEffect(() => {
    if (!reportId || mode !== 'edit') return
    const t = setInterval(async () => {
      const fd = formDataRef.current
      try {
        const payload = {
          ...fd,
          report_date: fd.report_date || fd.reporting_period_end,
          budget_variance: fd.budget_variance ? parseFloat(fd.budget_variance) : null,
          schedule_variance_days: fd.schedule_variance_days ? parseInt(fd.schedule_variance_days, 10) : null
        }
        await updateHighlightReport(reportId, payload)
      } catch (e) {
        console.warn('Auto-save:', e)
      }
    }, 30000)
    return () => clearInterval(t)
  }, [reportId, mode])

  const loadReport = async () => {
    try {
      setLoading(true)
      const r = await getHighlightReportById(reportId)
      setFormData({
        ...defaultFormData,
        ...r,
        report_date: r.report_date || r.reporting_period_end,
        budget_variance: r.budget_variance ?? '',
        schedule_variance_days: r.schedule_variance_days ?? ''
      })
    } catch (e) {
      console.error('Load report:', e)
      setFormData(defaultFormData)
    } finally {
      setLoading(false)
    }
  }

  const handleChange = useCallback((field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }))
  }, [errors])

  const validateStep = (stepId) => {
    const e = {}
    if (stepId === 'document') {
      if (!formData.report_title?.trim()) e.report_title = 'Report title required'
      if (!formData.report_date) e.report_date = 'Report date required'
      if (!formData.reporting_period_start) e.reporting_period_start = 'Period start required'
      if (!formData.reporting_period_end) e.reporting_period_end = 'Period end required'
      if (formData.reporting_period_start && formData.reporting_period_end &&
          new Date(formData.reporting_period_start) > new Date(formData.reporting_period_end)) {
        e.reporting_period_end = 'End must be after start'
      }
    }
    if (stepId === 'summary') {
      if (!formData.executive_summary?.trim() || formData.executive_summary.length < 50) {
        e.executive_summary = 'Executive summary required (min 50 characters)'
      }
      if (!formData.stage_status) e.stage_status = 'Stage status required'
    }
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleNext = () => {
    if (!validateStep(FORM_STEPS[activeStep].id)) return
    if (activeStep < FORM_STEPS.length - 1) setActiveStep(activeStep + 1)
  }

  const handlePrev = () => {
    if (activeStep > 0) setActiveStep(activeStep - 1)
  }

  const handleSubmit = async () => {
    if (!validateStep(FORM_STEPS[activeStep].id)) return
    setSaving(true)
    try {
      const payload = {
        ...formData,
        report_date: formData.report_date || formData.reporting_period_end,
        budget_variance: formData.budget_variance ? parseFloat(formData.budget_variance) : null,
        schedule_variance_days: formData.schedule_variance_days ? parseInt(formData.schedule_variance_days, 10) : null
      }
      if (reportId) {
        await updateHighlightReport(reportId, payload)
        onSave?.(null)
      } else {
        const created = await createHighlightReport(projectId, payload, stageBoundaryId)
        onSave?.(created)
      }
    } catch (err) {
      console.error('Save highlight report:', err)
      setErrors({ submit: err.message })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-gray-500 dark:text-gray-400">
        Loading…
      </div>
    )
  }

  const step = FORM_STEPS[activeStep]
  const isCreate = !reportId

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 max-w-5xl w-full">
      <div className="sticky top-0 z-10 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            {isCreate ? 'Create Highlight Report' : 'Edit Highlight Report'}
          </h2>
          <nav className="flex flex-wrap gap-1">
            {FORM_STEPS.map((s, i) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setActiveStep(i)}
                className={`px-2 py-1 rounded text-sm ${
                  i === activeStep
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-500'
                }`}
              >
                {s.label}
              </button>
            ))}
          </nav>
        </div>
        {!embedded && (
          <button type="button" onClick={onCancel} className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      <div className="p-6">
        {reportId && (
          <div className="mb-6 flex flex-wrap gap-4">
            <HighlightReportAutoPopulateButton
              reportId={reportId}
              stageBoundaryId={formData.stage_boundary_id || stageBoundaryId}
              onComplete={() => {}}
            />
            <HighlightReportCompletenessIndicator reportId={reportId} />
          </div>
        )}

        {step.id === 'document' && (
          <HighlightReportDocumentInfoSection
            formData={formData}
            onChange={handleChange}
            errors={errors}
            mode={mode}
            projectId={projectId}
            stageBoundaryId={stageBoundaryId}
          />
        )}

        {step.id === 'summary' && (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Executive Summary *</label>
              <textarea
                value={formData.executive_summary || ''}
                onChange={(e) => handleChange('executive_summary', e.target.value)}
                rows={5}
                disabled={mode === 'view'}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
              {errors.executive_summary && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.executive_summary}</p>}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Stage Status *</label>
                <select
                  value={formData.stage_status || 'on_track'}
                  onChange={(e) => handleChange('stage_status', e.target.value)}
                  disabled={mode === 'view'}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                >
                  <option value="on_track">On track</option>
                  <option value="at_risk">At risk</option>
                  <option value="off_track">Off track</option>
                  <option value="exception">Exception</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Overall Status Summary</label>
              <textarea
                value={formData.overall_status_summary || ''}
                onChange={(e) => handleChange('overall_status_summary', e.target.value)}
                rows={3}
                disabled={mode === 'view'}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
            </div>
          </div>
        )}

        {step.id === 'sixvars' && (
          <HighlightReportSixVariablesSection formData={formData} onChange={handleChange} errors={errors} mode={mode} />
        )}

        {step.id === 'tolerance' && (
          <HighlightReportToleranceSection
            reportId={reportId}
            formData={formData}
            onChange={handleChange}
            mode={mode}
          />
        )}

        {step.id === 'progress' && (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Progress Summary</label>
              <textarea
                value={formData.progress_summary || ''}
                onChange={(e) => handleChange('progress_summary', e.target.value)}
                rows={4}
                disabled={mode === 'view'}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Completed This Period</label>
                <textarea
                  value={formData.completed_this_period || ''}
                  onChange={(e) => handleChange('completed_this_period', e.target.value)}
                  rows={4}
                  disabled={mode === 'view'}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Planned Next Period</label>
                <textarea
                  value={formData.planned_next_period || ''}
                  onChange={(e) => handleChange('planned_next_period', e.target.value)}
                  rows={4}
                  disabled={mode === 'view'}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
              </div>
            </div>
          </div>
        )}

        {step.id === 'products' && <HighlightReportProductsSection reportId={reportId} mode={mode} />}
        {step.id === 'risks' && <HighlightReportRisksSection reportId={reportId} formData={formData} onChange={handleChange} mode={mode} />}
        {step.id === 'issues' && <HighlightReportIssuesSection reportId={reportId} formData={formData} onChange={handleChange} mode={mode} />}
        {step.id === 'changes' && <HighlightReportChangesSection reportId={reportId} formData={formData} onChange={handleChange} mode={mode} />}
        {step.id === 'decisions' && <HighlightReportDecisionsSection reportId={reportId} formData={formData} onChange={handleChange} mode={mode} />}
        {step.id === 'lessons' && <HighlightReportLessonsSection reportId={reportId} mode={mode} />}
        {step.id === 'distribution' && <HighlightReportDistributionSection reportId={reportId} mode={mode} />}

        {errors.submit && (
          <p className="mt-4 text-sm text-red-600 dark:text-red-400">{errors.submit}</p>
        )}

        <div className="mt-8 flex flex-wrap gap-3 justify-between border-t border-gray-200 dark:border-gray-700 pt-6">
          <div className="flex gap-2">
            {activeStep > 0 && (
              <button
                type="button"
                onClick={handlePrev}
                className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                <ArrowLeft className="h-4 w-4" />
                Previous
              </button>
            )}
            {activeStep < FORM_STEPS.length - 1 && (
              <button
                type="button"
                onClick={handleNext}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
              >
                Next
                <ArrowRight className="h-4 w-4" />
              </button>
            )}
          </div>
          <div className="flex gap-2">
            {mode !== 'view' && (
              <HoldButton
                entityType="highlight_report"
                entityId={reportId}
                formData={formData}
                projectId={projectId}
                onHoldComplete={onHoldComplete || onCancel}
              />
            )}
            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
            )}
            <button
              type="button"
              onClick={handleSubmit}
              disabled={saving}
              className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              {saving ? 'Saving…' : isCreate ? 'Create Report' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
