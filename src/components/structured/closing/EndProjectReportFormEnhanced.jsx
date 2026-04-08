import { useState, useEffect } from 'react'
import { FileText, User, Target, TrendingUp, Users, Package, CheckCircle, Lightbulb, ArrowRight, X, Save, ArrowLeft, ArrowRight as ArrowRightIcon } from 'lucide-react'
import { useThemeContext } from '../../../context/ThemeContext'
import { HoldButton } from '../../ui/HoldButton'
import { createEndProjectReport, updateEndProjectReport, getEndProjectReportById } from '../../../services/endProjectReportService'
import EPRDocumentHeader from './EPRDocumentHeader'
import EPRProjectManagerReport from './EPRProjectManagerReport'
import EPRBusinessCaseReview from './EPRBusinessCaseReview'
import EPRObjectivesReview from './EPRObjectivesReview'
import EPRTeamPerformance from './EPRTeamPerformance'
import EPRProductsReview from './EPRProductsReview'
import EPRLessonsReport from './EPRLessonsReport'
import EPRFollowOnActions from './EPRFollowOnActions'
import EPRQualityCriteria from './EPRQualityCriteria'

const FORM_STEPS = [
  { id: 'header', label: 'Document Header', icon: FileText, description: 'Document metadata' },
  { id: 'pmreport', label: "PM's Report", icon: User, description: "Project Manager's report" },
  { id: 'businesscase', label: 'Business Case Review', icon: Target, description: 'Benefits comparison' },
  { id: 'objectives', label: 'Objectives Review', icon: TrendingUp, description: 'Tolerance performance' },
  { id: 'team', label: 'Team Performance', icon: Users, description: 'Recognition & achievements' },
  { id: 'products', label: 'Products Review', icon: Package, description: 'Quality, approvals, off-specs' },
  { id: 'lessons', label: 'Lessons Report', icon: Lightbulb, description: 'What went well/badly' },
  { id: 'followon', label: 'Follow-On Actions', icon: ArrowRight, description: 'Post-project recommendations' },
  { id: 'review', label: 'Review & Submit', icon: CheckCircle, description: 'Quality checks & submit' },
]

export default function EndProjectReportFormEnhanced({
  projectId,
  reportId = null,
  mode = 'create', // 'create' | 'edit' | 'view'
  onSave,
  onCancel,
  onHoldComplete,
  businessCaseId = null
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
    project_managers_report: '',
    abnormal_situations: '',
    abnormal_situations_impact: '',
    premature_closure_reason: '',
    project_assurance_agreement: false,
    project_assurance_notes: '',
    closure_type: 'normal',
    executive_summary: '',
    approval_status: 'draft'
  })
  const [businessCaseReviews, setBusinessCaseReviews] = useState([])
  const [objectivesReviews, setObjectivesReviews] = useState([])
  const [teamPerformance, setTeamPerformance] = useState([])
  const [qualityRecords, setQualityRecords] = useState([])
  const [approvalRecords, setApprovalRecords] = useState([])
  const [offSpecifications, setOffSpecifications] = useState([])
  const [lessons, setLessons] = useState([])
  const [followOnActions, setFollowOnActions] = useState([])
  const [qualityStatus, setQualityStatus] = useState(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState({})

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
      const report = await getEndProjectReportById(reportId)
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

  const loadRelatedData = async () => {
    try {
      const [
        bcReviews,
        objReviews,
        teamPerf,
        qualityRecs,
        approvalRecs,
        offSpecs,
        lessonsData,
        followOnData,
        qualityStat
      ] = await Promise.all([
        import('../../../services/eprBusinessCaseReviewService').then(m => m.getBenefitsComparison(reportId)),
        import('../../../services/eprObjectivesReviewService').then(m => m.getTolerancePerformance(reportId)),
        import('../../../services/eprTeamPerformanceService').then(m => m.getTeamPerformance(reportId)),
        import('../../../services/eprProductsReviewService').then(m => m.getQualityRecords(reportId)),
        import('../../../services/eprProductsReviewService').then(m => m.getApprovalRecords(reportId)),
        import('../../../services/eprProductsReviewService').then(m => m.getOffSpecifications(reportId)),
        import('../../../services/eprLessonsService').then(m => m.getLessons(reportId)),
        import('../../../services/eprFollowOnService').then(m => m.getFollowOnActions(reportId)),
        import('../../../services/eprQualityCheckService').then(m => m.getQualityCheckStatus(reportId))
      ])
      setBusinessCaseReviews(bcReviews.reviews || [])
      setObjectivesReviews(objReviews || [])
      setTeamPerformance(teamPerf || [])
      setQualityRecords(qualityRecs || [])
      setApprovalRecords(approvalRecs || [])
      setOffSpecifications(offSpecs || [])
      setLessons(lessonsData || [])
      setFollowOnActions(followOnData || [])
      setQualityStatus(qualityStat)
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
      case 'pmreport':
        if (!formData.project_managers_report || formData.project_managers_report.length < 100) {
          newErrors.project_managers_report = 'Project Manager\'s report must be at least 100 characters'
        }
        break
      case 'businesscase':
        // Validation handled in component
        break
      case 'objectives':
        if (objectivesReviews.length < 6) {
          newErrors.objectives = 'All 6 objective areas must be reviewed'
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
        const { runQualityChecks, getQualityCheckStatus } = await import('../../../services/eprQualityCheckService')
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
        await updateEndProjectReport(reportId, formData)
      } else {
        const newReport = await createEndProjectReport(projectId, formData)
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
          <EPRDocumentHeader
            formData={formData}
            onChange={handleChange}
            errors={errors}
            mode={mode}
          />
        )
      case 'pmreport':
        return (
          <EPRProjectManagerReport
            formData={formData}
            onChange={handleChange}
            errors={errors}
            mode={mode}
          />
        )
      case 'businesscase':
        return (
          <EPRBusinessCaseReview
            reportId={reportId}
            businessCaseReviews={businessCaseReviews}
            onBusinessCaseReviewsChange={setBusinessCaseReviews}
            projectId={projectId}
            businessCaseId={businessCaseId}
            mode={mode}
          />
        )
      case 'objectives':
        return (
          <EPRObjectivesReview
            reportId={reportId}
            objectivesReviews={objectivesReviews}
            onObjectivesReviewsChange={setObjectivesReviews}
            mode={mode}
          />
        )
      case 'team':
        return (
          <EPRTeamPerformance
            reportId={reportId}
            teamPerformance={teamPerformance}
            onTeamPerformanceChange={setTeamPerformance}
            mode={mode}
          />
        )
      case 'products':
        return (
          <EPRProductsReview
            reportId={reportId}
            qualityRecords={qualityRecords}
            approvalRecords={approvalRecords}
            offSpecifications={offSpecifications}
            onQualityRecordsChange={setQualityRecords}
            onApprovalRecordsChange={setApprovalRecords}
            onOffSpecificationsChange={setOffSpecifications}
            projectId={projectId}
            mode={mode}
          />
        )
      case 'lessons':
        return (
          <EPRLessonsReport
            reportId={reportId}
            lessons={lessons}
            onLessonsChange={setLessons}
            projectId={projectId}
            mode={mode}
          />
        )
      case 'followon':
        return (
          <EPRFollowOnActions
            reportId={reportId}
            followOnActions={followOnActions}
            onFollowOnActionsChange={setFollowOnActions}
            projectId={projectId}
            mode={mode}
          />
        )
      case 'review':
        return (
          <div className="space-y-6">
            <EPRQualityCriteria
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
              {mode === 'create' ? 'Create' : mode === 'edit' ? 'Edit' : 'View'} End Project Report
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
            {mode !== 'view' && (
              <HoldButton
                entityType="end_project_report"
                entityId={reportId}
                formData={formData}
                projectId={projectId}
                onHoldComplete={onHoldComplete || onCancel}
              />
            )}
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
                <ArrowRightIcon className="h-4 w-4" />
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
