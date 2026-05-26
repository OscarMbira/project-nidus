import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'

import { usePlatformProjectId } from '../../hooks/usePlatformProjectId.js'
import { ArrowLeft, Edit, Download, Printer, FileText, CheckCircle, X, AlertCircle } from 'lucide-react'
import { getEndProjectReportById } from '../../services/endProjectReportService'
import { getBenefitsComparison } from '../../services/eprBusinessCaseReviewService'
import { getTolerancePerformance } from '../../services/eprObjectivesReviewService'
import { getTeamPerformance } from '../../services/eprTeamPerformanceService'
import { getQualityRecords, getApprovalRecords, getOffSpecifications } from '../../services/eprProductsReviewService'
import { getLessons } from '../../services/eprLessonsService'
import { getFollowOnActions } from '../../services/eprFollowOnService'
import { getQualityCheckStatus } from '../../services/eprQualityCheckService'
import { getVersionHistory } from '../../services/eprRevisionService'
import { getApprovalStatus } from '../../services/eprApprovalService'
import EPRStatusBadge from '../../components/structured/closing/EPRStatusBadge'
import EPRQualityProgress from '../../components/structured/closing/EPRQualityProgress'
import EPRRevisionHistory from '../../components/structured/closing/EPRRevisionHistory'
import EPRApprovals from '../../components/structured/closing/EPRApprovals'
import EPRDistribution from '../../components/structured/closing/EPRDistribution'
import EPRPrintView from '../../components/structured/closing/EPRPrintView'
import BenefitReviewCard from '../../components/structured/closing/BenefitReviewCard'
import { format } from 'date-fns'
import ExportRecordButtons from '../../components/ui/ExportRecordButtons'
import { exportRecordToExcel, exportRecordToWord, exportRecordToPPT, exportRecordToCSV, exportRecordToXML, exportRecordToJSON, exportRecordToPrint } from '../../utils/exportUtils'

const EPR_VIEW_SECTIONS = [
  { title: 'Document Information', fields: [
    { key: 'document_ref', label: 'Document Ref' },
    { key: 'report_title', label: 'Title' },
    { key: 'approval_status', label: 'Status' },
    { key: 'version_no', label: 'Version' }
  ]}
]

export default function EndProjectReportView() {
  const { reportId } = useParams()
  const { projectId, routeKey } = usePlatformProjectId()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [report, setReport] = useState(null)
  const [businessCaseReviews, setBusinessCaseReviews] = useState([])
  const [objectivesReviews, setObjectivesReviews] = useState([])
  const [teamPerformance, setTeamPerformance] = useState([])
  const [qualityRecords, setQualityRecords] = useState([])
  const [approvalRecords, setApprovalRecords] = useState([])
  const [offSpecifications, setOffSpecifications] = useState([])
  const [lessons, setLessons] = useState([])
  const [followOnActions, setFollowOnActions] = useState([])
  const [qualityStatus, setQualityStatus] = useState(null)
  const [activeTab, setActiveTab] = useState('overview')

  useEffect(() => {
    if (reportId) {
      loadReportData()
    }
  }, [reportId])

  const loadReportData = async () => {
    try {
      setLoading(true)
      const [
        reportData,
        businessCaseData,
        objectivesData,
        teamData,
        qualityData,
        approvalData,
        offSpecData,
        lessonsData,
        followOnData,
        qualityStatusData
      ] = await Promise.all([
        getEndProjectReportById(reportId),
        getBenefitsComparison(reportId).catch(() => []),
        getTolerancePerformance(reportId).catch(() => []),
        getTeamPerformance(reportId).catch(() => []),
        getQualityRecords(reportId).catch(() => []),
        getApprovalRecords(reportId).catch(() => []),
        getOffSpecifications(reportId).catch(() => []),
        getLessons(reportId).catch(() => []),
        getFollowOnActions(reportId).catch(() => []),
        getQualityCheckStatus(reportId).catch(() => null)
      ])

      setReport(reportData)
      setBusinessCaseReviews(businessCaseData || [])
      setObjectivesReviews(objectivesData || [])
      setTeamPerformance(teamData || [])
      setQualityRecords(qualityData || [])
      setApprovalRecords(approvalData || [])
      setOffSpecifications(offSpecData || [])
      setLessons(lessonsData || [])
      setFollowOnActions(followOnData || [])
      setQualityStatus(qualityStatusData)
    } catch (error) {
      console.error('Error loading report:', error)
      alert('Error loading report: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = () => {
    navigate(`/app/projects/${projectId}/closure/end-project-report/${reportId}/edit`)
  }

  const handleBack = () => {
    navigate(`/app/projects/${projectId}/closure`)
  }

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'businesscase', label: 'Business Case' },
    { id: 'objectives', label: 'Objectives' },
    { id: 'team', label: 'Team Performance' },
    { id: 'products', label: 'Products' },
    { id: 'lessons', label: 'Lessons' },
    { id: 'followon', label: 'Follow-On Actions' },
    { id: 'quality', label: 'Quality Checks' },
    { id: 'approvals', label: 'Approvals' },
    { id: 'history', label: 'History' },
    { id: 'print', label: 'Print/Export' }
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!report) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
        <div className="max-w-4xl mx-auto bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-8 text-center">
          <AlertCircle className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Report Not Found</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">The requested end project report could not be found.</p>
          <button
            onClick={handleBack}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
          >
            Go Back
          </button>
        </div>
      </div>
    )
  }

  const canEdit = report.approval_status === 'draft' || report.approval_status === 'rejected'

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={handleBack}
                className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                  {report.report_title || 'End Project Report'}
                </h1>
                <div className="flex items-center gap-4 mt-2">
                  {report.document_ref && (
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {report.document_ref}
                    </span>
                  )}
                  <EPRStatusBadge status={report.approval_status} />
                  {report.version_no && (
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      Version {report.version_no}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <ExportRecordButtons
                onExportPPT={() => exportRecordToPPT(EPR_VIEW_SECTIONS, report, `EndProject_${report.document_ref || reportId}`)}
                onExportWord={() => exportRecordToWord(EPR_VIEW_SECTIONS, report, `EndProject_${report.document_ref || reportId}`)}
                onExportExcel={() => exportRecordToExcel(EPR_VIEW_SECTIONS, report, `EndProject_${report.document_ref || reportId}`)}
                onExportCSV={() => exportRecordToCSV(EPR_VIEW_SECTIONS, report, `EndProject_${report.document_ref || reportId}`)}
                onExportXML={() => exportRecordToXML(EPR_VIEW_SECTIONS, report, `EndProject_${report.document_ref || reportId}`)}
                onExportJSON={() => exportRecordToJSON(EPR_VIEW_SECTIONS, report, `EndProject_${report.document_ref || reportId}`)}
                onExportPrint={() => exportRecordToPrint(EPR_VIEW_SECTIONS, report, `EndProject_${report.document_ref || reportId}`)}
              />
              {canEdit && (
                <button
                  onClick={handleEdit}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2"
                >
                  <Edit className="h-4 w-4" />
                  Edit
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8 overflow-x-auto">
            {tabs.map((tab, index) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-1 py-4 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Tab Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Document Information */}
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Document Information</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">Report Date</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {report.report_date ? format(new Date(report.report_date), 'dd MMM yyyy') : 'N/A'}
                  </p>
                </div>
                {report.date_of_this_revision && (
                  <div>
                    <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">Date of This Revision</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {format(new Date(report.date_of_this_revision), 'dd MMM yyyy')}
                    </p>
                  </div>
                )}
                {report.author && (
                  <div>
                    <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">Author</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {report.author.full_name || report.author.email}
                    </p>
                  </div>
                )}
                {report.owner && (
                  <div>
                    <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">Owner</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {report.owner.full_name || report.owner.email}
                    </p>
                  </div>
                )}
                <div>
                  <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">Closure Type</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400 capitalize">{report.closure_type || 'normal'}</p>
                </div>
              </div>
            </div>

            {/* Executive Summary */}
            {report.executive_summary && (
              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Executive Summary</h2>
                <p className="text-gray-600 dark:text-gray-400 whitespace-pre-wrap">{report.executive_summary}</p>
              </div>
            )}

            {/* Project Manager's Report */}
            {report.project_managers_report && (
              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Project Manager's Report</h2>
                <p className="text-gray-600 dark:text-gray-400 whitespace-pre-wrap">{report.project_managers_report}</p>
              </div>
            )}

            {/* Abnormal Situations */}
            {report.abnormal_situations && (
              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Abnormal Situations</h2>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Description</p>
                    <p className="text-gray-600 dark:text-gray-400 whitespace-pre-wrap">{report.abnormal_situations}</p>
                  </div>
                  {report.abnormal_situations_impact && (
                    <div>
                      <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Impact</p>
                      <p className="text-gray-600 dark:text-gray-400 whitespace-pre-wrap">{report.abnormal_situations_impact}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Quality Status */}
            {qualityStatus && (
              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Quality Criteria Status</h2>
                <EPRQualityProgress qualityStatus={qualityStatus} />
              </div>
            )}
          </div>
        )}

        {activeTab === 'businesscase' && (
          <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Business Case Review</h2>
              {businessCaseReviews.length > 0 ? (
                <div className="space-y-4">
                  {businessCaseReviews.map((benefit, index) => (
                    <BenefitReviewCard key={benefit.id} benefit={benefit} mode="view" />
                  ))}
                </div>
              ) : (
                <p className="text-gray-600 dark:text-gray-400">No business case reviews added yet.</p>
              )}
            </div>
          </div>
        )}

        {activeTab === 'objectives' && (
          <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Objectives Performance Review</h2>
              {objectivesReviews.length > 0 ? (
                <div className="space-y-4">
                  {objectivesReviews.map((objective, index) => (
                    <div key={objective.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-semibold text-gray-900 dark:text-white capitalize">{objective.objective_area}</h3>
                        <span className={`px-2 py-1 rounded text-xs ${
                          objective.within_tolerance
                            ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                            : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                        }`}>
                          {objective.within_tolerance ? 'Within Tolerance' : 'Outside Tolerance'}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-gray-600 dark:text-gray-400">Target: {objective.original_target}</p>
                          <p className="text-gray-600 dark:text-gray-400">Actual: {objective.actual_value}</p>
                        </div>
                        <div>
                          <p className="text-gray-600 dark:text-gray-400">Performance: {objective.performance_rating}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-600 dark:text-gray-400">No objectives reviews added yet.</p>
              )}
            </div>
          </div>
        )}

        {activeTab === 'team' && (
          <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Team Performance & Recognition</h2>
              {teamPerformance.length > 0 ? (
                <div className="space-y-4">
                  {teamPerformance.map((team, index) => (
                    <div key={team.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">                      <h3 className="font-semibold text-gray-900 dark:text-white mb-2">{team.team_name || 'Team Member'}</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Role: {team.role}</p>
                      <p className="text-gray-600 dark:text-gray-400">{team.performance_description}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-600 dark:text-gray-400">No team performance records added yet.</p>
              )}
            </div>
          </div>
        )}

        {activeTab === 'products' && (
          <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Products Review</h2>
              <div className="space-y-6">
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Quality Records</h3>
                  {qualityRecords.length > 0 ? (
                    <div className="space-y-2">
                      {qualityRecords.map((record, index) => (
                        <div key={record.id} className="border border-gray-200 dark:border-gray-700 rounded p-3 text-sm">                          <p className="font-medium">{record.activity_name}</p>
                          <p className="text-gray-600 dark:text-gray-400">Status: {record.status}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-600 dark:text-gray-400">No quality records added yet.</p>
                  )}
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Approval Records</h3>
                  {approvalRecords.length > 0 ? (
                    <div className="space-y-2">
                      {approvalRecords.map((record, index) => (
                        <div key={record.id} className="border border-gray-200 dark:border-gray-700 rounded p-3 text-sm">                          <p className="font-medium">{record.product_name}</p>
                          <p className="text-gray-600 dark:text-gray-400">Status: {record.approval_status}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-600 dark:text-gray-400">No approval records added yet.</p>
                  )}
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Off-Specifications</h3>
                  {offSpecifications.length > 0 ? (
                    <div className="space-y-2">
                      {offSpecifications.map((offSpec, index) => (
                        <div key={offSpec.id} className="border border-gray-200 dark:border-gray-700 rounded p-3 text-sm">                          <p className="font-medium">{offSpec.product_name}</p>
                          <p className="text-gray-600 dark:text-gray-400">Type: {offSpec.off_spec_type}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-600 dark:text-gray-400">No off-specifications recorded.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'lessons' && (
          <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Lessons Learned</h2>
              {lessons.length > 0 ? (
                <div className="space-y-4">
                  {lessons.map((lesson, index) => (
                    <div key={lesson.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-semibold text-gray-900 dark:text-white">{lesson.title}</h3>
                        <span className="px-2 py-1 rounded text-xs bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                          {lesson.lesson_type}
                        </span>
                      </div>
                      <p className="text-gray-600 dark:text-gray-400 mb-2">{lesson.description}</p>
                      {lesson.recommendation && (
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          <strong>Recommendation:</strong> {lesson.recommendation}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-600 dark:text-gray-400">No lessons learned documented yet.</p>
              )}
            </div>
          </div>
        )}

        {activeTab === 'followon' && (
          <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Follow-On Actions</h2>
              {followOnActions.length > 0 ? (
                <div className="space-y-4">
                  {followOnActions.map((action, index) => (
                    <div key={action.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">                      <p className="font-semibold text-gray-900 dark:text-white">{action.source_type}</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Reference: {action.source_reference}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-600 dark:text-gray-400">No follow-on actions linked yet.</p>
              )}
            </div>
          </div>
        )}

        {activeTab === 'quality' && (
          <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Quality Criteria Validation</h2>
              {qualityStatus && <EPRQualityProgress qualityStatus={qualityStatus} />}
            </div>
          </div>
        )}

        {activeTab === 'approvals' && (
          <div className="space-y-6">
            <EPRApprovals reportId={reportId} mode="view" />
            <EPRDistribution reportId={reportId} mode="view" />
          </div>
        )}

        {activeTab === 'history' && (
          <div className="space-y-6">
            <EPRRevisionHistory reportId={reportId} />
          </div>
        )}

        {activeTab === 'print' && (
          <div>
            <EPRPrintView
              report={report}
              businessCaseReviews={businessCaseReviews}
              objectivesReviews={objectivesReviews}
              teamPerformance={teamPerformance}
              qualityRecords={qualityRecords}
              approvalRecords={approvalRecords}
              offSpecifications={offSpecifications}
              lessons={lessons}
              followOnActions={followOnActions}
              qualityStatus={qualityStatus}
            />
          </div>
        )}
      </div>
    </div>
  )
}
