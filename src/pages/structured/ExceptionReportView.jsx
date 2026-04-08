import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'

import { usePlatformProjectId } from '../../hooks/usePlatformProjectId.js'
import { ArrowLeft, Edit2, Printer, FileText, Calendar, User, AlertTriangle } from 'lucide-react'
import { getExceptionReportById } from '../../services/exceptionReportService'
import { getOptions } from '../../services/exceptionReportOptionsService'
import { getLessons } from '../../services/exceptionReportLessonsService'
import { getQualityChecks } from '../../services/exceptionReportQualityService'
import ExceptionReportStatusBadge from '../../components/structured/exceptionReport/ExceptionReportStatusBadge'
import ExceptionReportRevisionHistory from '../../components/structured/exceptionReport/ExceptionReportRevisionHistory'
import ExceptionReportApprovals from '../../components/structured/exceptionReport/ExceptionReportApprovals'
import ExceptionReportDistribution from '../../components/structured/exceptionReport/ExceptionReportDistribution'
import ExceptionReportQualityCriteria from '../../components/structured/exceptionReport/ExceptionReportQualityCriteria'
import ExceptionReportPrintView from '../../components/structured/exceptionReport/ExceptionReportPrintView'
import BoardDecisionPanel from '../../components/structured/exceptionReport/BoardDecisionPanel'
import BoardPresentationSummary from '../../components/structured/exceptionReport/BoardPresentationSummary'
import { format } from 'date-fns'
import ExportRecordButtons from '../../components/ui/ExportRecordButtons'
import { exportRecordToExcel, exportRecordToWord, exportRecordToPPT, exportRecordToCSV, exportRecordToXML, exportRecordToJSON, exportRecordToPrint } from '../../utils/exportUtils'

const EXCEPTION_VIEW_SECTIONS = [
  { title: 'Document Information', fields: [
    { key: 'document_ref', label: 'Document Ref' },
    { key: 'report_title', label: 'Title' },
    { key: 'report_status', label: 'Status' },
    { key: 'report_date', label: 'Report Date' },
    { key: 'exception_type', label: 'Exception Type' }
  ]}
]

export default function ExceptionReportView() {
  const { reportId } = useParams()
  const { projectId, routeKey } = usePlatformProjectId()
  const navigate = useNavigate()
  const [report, setReport] = useState(null)
  const [options, setOptions] = useState([])
  const [lessons, setLessons] = useState([])
  const [approvals, setApprovals] = useState([])
  const [distribution, setDistribution] = useState([])
  const [qualityChecks, setQualityChecks] = useState([])
  const [qualityStatus, setQualityStatus] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')
  const [showPrintView, setShowPrintView] = useState(false)

  useEffect(() => {
    if (reportId) {
      loadReport()
    }
  }, [reportId])

  const loadReport = async () => {
    try {
      setLoading(true)
      const [
        reportData, 
        optionsData, 
        lessonsData,
        approvalsData,
        distributionData,
        qualityChecksData
      ] = await Promise.all([
        getExceptionReportById(reportId),
        getOptions(reportId).catch(() => []),
        getLessons(reportId).catch(() => []),
        import('../../services/exceptionReportApprovalService').then(m => m.getApprovalStatus(reportId).catch(() => [])),
        import('../../services/supabaseClient').then(async ({ supabase }) => {
          const { data } = await supabase
            .from('exception_report_distribution')
            .select('*')
            .eq('exception_report_id', reportId)
          return data || []
        }).catch(() => []),
        getQualityChecks(reportId).catch(() => [])
      ])

      setReport(reportData)
      setOptions(optionsData)
      setLessons(lessonsData)
      setApprovals(approvalsData)
      setDistribution(distributionData)
      setQualityChecks(qualityChecksData)

      // Get quality status
      try {
        const { getQualityCheckStatus } = await import('../../services/exceptionReportQualityService')
        const status = await getQualityCheckStatus(reportId)
        setQualityStatus(status)
      } catch (err) {
        console.error('Error loading quality status:', err)
      }
    } catch (error) {
      console.error('Error loading report:', error)
      alert('Error loading report: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto" />
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading Exception Report...</p>
        </div>
      </div>
    )
  }

  if (!report) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center py-12">
          <p className="text-gray-500 dark:text-gray-400 mb-4">Exception Report not found</p>
          <button
            onClick={() => navigate(`/app/projects/${projectId}/exception-reports`)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
          >
            Back to Reports
          </button>
        </div>
      </div>
    )
  }

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'options', label: 'Options' },
    { id: 'lessons', label: 'Lessons' },
    { id: 'quality', label: 'Quality Checks' },
    { id: 'approvals', label: 'Approvals' },
    { id: 'distribution', label: 'Distribution' },
    { id: 'history', label: 'Revision History' }
  ]

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <button
        onClick={() => navigate(`/app/projects/${projectId}/exception-reports`)}
        className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4 flex items-center gap-2"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Reports
      </button>

      {/* Header */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 mb-6">
        <div className="flex items-start justify-between mb-4 flex-wrap gap-2">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <ExportRecordButtons
                onExportPPT={() => exportRecordToPPT(EXCEPTION_VIEW_SECTIONS, report, `Exception_${report.document_ref || reportId}`)}
                onExportWord={() => exportRecordToWord(EXCEPTION_VIEW_SECTIONS, report, `Exception_${report.document_ref || reportId}`)}
                onExportExcel={() => exportRecordToExcel(EXCEPTION_VIEW_SECTIONS, report, `Exception_${report.document_ref || reportId}`)}
                onExportCSV={() => exportRecordToCSV(EXCEPTION_VIEW_SECTIONS, report, `Exception_${report.document_ref || reportId}`)}
                onExportXML={() => exportRecordToXML(EXCEPTION_VIEW_SECTIONS, report, `Exception_${report.document_ref || reportId}`)}
                onExportJSON={() => exportRecordToJSON(EXCEPTION_VIEW_SECTIONS, report, `Exception_${report.document_ref || reportId}`)}
                onExportPrint={() => exportRecordToPrint(EXCEPTION_VIEW_SECTIONS, report, `Exception_${report.document_ref || reportId}`)}
              />
              <ExceptionReportStatusBadge status={report.report_status} urgency={report.urgency} />
              <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded text-sm font-mono">
                {report.document_ref || 'N/A'}
              </span>
              <span className="text-sm text-gray-500 dark:text-gray-400">Version {report.version_no || '1.0'}</span>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              {report.report_title || report.exception_title || 'Exception Report'}
            </h1>
            <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
              {report.report_date && (
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  <span>{format(new Date(report.report_date), 'MMM dd, yyyy')}</span>
                </div>
              )}
              {report.author && (
                <div className="flex items-center gap-1">
                  <User className="h-4 w-4" />
                  <span>Author: {report.author.full_name || report.author.email || 'Unknown'}</span>
                </div>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            {(report.report_status === 'draft' || report.report_status === 'rejected') && (
              <button
                onClick={() => navigate(`/app/projects/${projectId}/exception-reports/${reportId}/edit`)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2"
              >
                <Edit2 className="h-4 w-4" />
                Edit
              </button>
            )}
            <button
              onClick={() => setShowPrintView(true)}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2"
            >
              <Printer className="h-4 w-4" />
              Print View
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700 mb-6">
        <nav className="flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Exception Overview</h2>
              <div className="space-y-4">
                <div>
                  <h3 className="font-medium text-gray-700 dark:text-gray-300 mb-2">Exception Title</h3>
                  <p className="text-gray-900 dark:text-white">{report.exception_title || 'N/A'}</p>
                </div>
                {report.exception_summary && (
                  <div>
                    <h3 className="font-medium text-gray-700 dark:text-gray-300 mb-2">Summary</h3>
                    <p className="text-gray-900 dark:text-white whitespace-pre-wrap">{report.exception_summary}</p>
                  </div>
                )}
                {report.tolerance_type && (
                  <div>
                    <h3 className="font-medium text-gray-700 dark:text-gray-300 mb-2">Tolerance Type</h3>
                    <p className="text-gray-900 dark:text-white capitalize">{report.tolerance_type}</p>
                  </div>
                )}
              </div>
            </div>

            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Cause Analysis</h2>
              {report.cause_description && (
                <div className="mb-4">
                  <h3 className="font-medium text-gray-700 dark:text-gray-300 mb-2">Cause Description</h3>
                  <p className="text-gray-900 dark:text-white whitespace-pre-wrap">{report.cause_description}</p>
                </div>
              )}
              {report.root_cause_analysis && (
                <div>
                  <h3 className="font-medium text-gray-700 dark:text-gray-300 mb-2">Root Cause Analysis</h3>
                  <p className="text-gray-900 dark:text-white whitespace-pre-wrap">{report.root_cause_analysis}</p>
                </div>
              )}
            </div>

            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Consequences</h2>
              {report.project_consequences && (
                <div className="mb-4">
                  <h3 className="font-medium text-gray-700 dark:text-gray-300 mb-2">Project Consequences</h3>
                  <p className="text-gray-900 dark:text-white whitespace-pre-wrap">{report.project_consequences}</p>
                </div>
              )}
              {report.impact_on_business_case && (
                <div>
                  <h3 className="font-medium text-gray-700 dark:text-gray-300 mb-2">Impact on Business Case</h3>
                  <p className="text-gray-900 dark:text-white whitespace-pre-wrap">{report.impact_on_business_case}</p>
                </div>
              )}
            </div>

            {report.recommendation_summary && (
              <div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Recommendation</h2>
                <p className="text-gray-900 dark:text-white whitespace-pre-wrap">{report.recommendation_summary}</p>
                {report.recommendation_justification && (
                  <div className="mt-4">
                    <h3 className="font-medium text-gray-700 dark:text-gray-300 mb-2">Justification</h3>
                    <p className="text-gray-900 dark:text-white whitespace-pre-wrap">{report.recommendation_justification}</p>
                  </div>
                )}
              </div>
            )}

            {report.board_decision && (
              <div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Board Decision</h2>
                <p className="text-gray-900 dark:text-white whitespace-pre-wrap">{report.board_decision}</p>
                {report.board_decision_date && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                    Decision Date: {format(new Date(report.board_decision_date), 'MMM dd, yyyy')}
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === 'options' && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Options Analysis</h2>
            {options.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400">No options defined</p>
            ) : (
              options.map((option) => (
                <div key={option.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-semibold text-gray-900 dark:text-white">
                      Option {option.option_number}: {option.option_title}
                    </h3>
                    {option.is_recommended && (
                      <span className="px-2 py-1 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 rounded text-xs">
                        Recommended
                      </span>
                    )}
                  </div>
                  <p className="text-gray-700 dark:text-gray-300 mb-2">{option.option_description}</p>
                  {option.effect_on_business_case && (
                    <div className="mt-2">
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Business Case Impact:</p>
                      <p className="text-sm text-gray-700 dark:text-gray-300">{option.effect_on_business_case}</p>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'lessons' && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Lessons Learned</h2>
            {lessons.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400">No lessons captured</p>
            ) : (
              lessons.map((lesson) => (
                <div key={lesson.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-2">{lesson.lesson_title}</h3>
                  <p className="text-gray-700 dark:text-gray-300">{lesson.lesson_description}</p>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'quality' && (
          <ExceptionReportQualityCriteria reportId={reportId} mode="view" />
        )}

        {activeTab === 'approvals' && (
          <ExceptionReportApprovals reportId={reportId} mode="view" />
        )}

        {activeTab === 'distribution' && (
          <ExceptionReportDistribution reportId={reportId} />
        )}

        {activeTab === 'history' && (
          <ExceptionReportRevisionHistory reportId={reportId} />
        )}

        {activeTab === 'summary' && (
          <BoardPresentationSummary
            report={report}
            options={options}
            qualityStatus={qualityStatus}
          />
        )}
      </div>

      {/* Board Decision Panel (if applicable) */}
      {report.report_status === 'under_review' && (
        <div className="mt-6">
          <BoardDecisionPanel
            reportId={reportId}
            onDecisionRecorded={loadReport}
            mode="edit"
          />
        </div>
      )}
    </div>
  )
}
