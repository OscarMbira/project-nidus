import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'

import { usePlatformProjectId } from '../hooks/usePlatformProjectId.js'
import { ArrowLeft, Edit2, Printer, FileText, Calendar, User, CheckCircle, Clock, Download, FileDown } from 'lucide-react'
import { exportToPDF, exportToWord, copyToClipboard } from '../utils/issueReportExport'
import { getIssueReportById } from '../services/issueReportService'
import ExportRecordButtons from '../components/ui/ExportRecordButtons'
import { exportRecordToExcel, exportRecordToWord, exportRecordToPPT, exportRecordToCSV, exportRecordToXML, exportRecordToJSON, exportRecordToPrint } from '../utils/exportUtils'

const ISSUE_REPORT_VIEW_SECTIONS = [
  { title: 'Report Information', fields: [
    { key: 'report_reference', label: 'Reference' },
    { key: 'issue_title', label: 'Issue Title' },
    { key: 'issue_identifier', label: 'Issue ID' },
    { key: 'status', label: 'Status' }
  ]}
]
import { getOptions } from '../services/issueReportOptionService'
import { getApprovals } from '../services/issueReportApprovalService'
import { getDistributionList } from '../services/issueReportDistributionService'
import IssueReportCompletenessIndicator from '../components/issues/IssueReportCompletenessIndicator'
import IssueReportApprovalWorkflow from '../components/issues/IssueReportApprovalWorkflow'

export default function IssueReportView() {
  const { issueId, reportId } = useParams()
  const { projectId, routeKey } = usePlatformProjectId()
  const navigate = useNavigate()
  const [report, setReport] = useState(null)
  const [options, setOptions] = useState([])
  const [approvals, setApprovals] = useState([])
  const [distribution, setDistribution] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')

  useEffect(() => {
    if (reportId) {
      loadReport()
    }
  }, [reportId])

  const loadReport = async () => {
    try {
      setLoading(true)
      const [reportData, optionsData, approvalsData, distributionData] = await Promise.all([
        getIssueReportById(reportId),
        getOptions(reportId),
        getApprovals(reportId),
        getDistributionList(reportId)
      ])

      setReport(reportData)
      setOptions(optionsData)
      setApprovals(approvalsData)
      setDistribution(distributionData)
    } catch (error) {
      console.error('Error loading report:', error)
      alert('Error loading report: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'approved':
      case 'closed':
        return 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-200 border-green-300 dark:border-green-800'
      case 'submitted':
      case 'under_review':
        return 'bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-200 border-blue-300 dark:border-blue-800'
      case 'distributed':
        return 'bg-purple-100 dark:bg-purple-900/20 text-purple-800 dark:text-purple-200 border-purple-300 dark:border-purple-800'
      default:
        return 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 border-gray-300 dark:border-gray-700'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto" />
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading Issue Report...</p>
        </div>
      </div>
    )
  }

  if (!report) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center py-12">
          <p className="text-gray-500 dark:text-gray-400 mb-4">Issue Report not found</p>
          <button
            onClick={() => navigate(`/projects/${projectId}/issues/${issueId}`)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
          >
            Back to Issue
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <button
        onClick={() => navigate(`/projects/${projectId}/issues/${issueId}`)}
        className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4 flex items-center gap-2"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Issue
      </button>

      {/* Header */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 mb-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <span className={`px-3 py-1 rounded-lg text-sm font-medium border ${getStatusColor(report.report_status)}`}>
                {report.report_status}
              </span>
              <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded text-sm font-mono">
                {report.report_reference}
              </span>
              <span className="text-sm text-gray-500 dark:text-gray-400">Version {report.version_no}</span>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              Issue Report: {report.issue_title}
            </h1>
            <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
              {report.report_date && (
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  <span>Report Date: {new Date(report.report_date).toLocaleDateString()}</span>
                </div>
              )}
              {report.author && (
                <div className="flex items-center gap-1">
                  <User className="h-4 w-4" />
                  <span>Author: {report.author.full_name || report.author.email}</span>
                </div>
              )}
            </div>
          </div>
          <div className="flex gap-2 flex-wrap items-center">
            <ExportRecordButtons
              onExportPPT={() => exportRecordToPPT(ISSUE_REPORT_VIEW_SECTIONS, report, `IssueReport_${report.report_reference || reportId}`)}
              onExportWord={() => exportRecordToWord(ISSUE_REPORT_VIEW_SECTIONS, report, `IssueReport_${report.report_reference || reportId}`)}
              onExportExcel={() => exportRecordToExcel(ISSUE_REPORT_VIEW_SECTIONS, report, `IssueReport_${report.report_reference || reportId}`)}
              onExportCSV={() => exportRecordToCSV(ISSUE_REPORT_VIEW_SECTIONS, report, `IssueReport_${report.report_reference || reportId}`)}
              onExportXML={() => exportRecordToXML(ISSUE_REPORT_VIEW_SECTIONS, report, `IssueReport_${report.report_reference || reportId}`)}
              onExportJSON={() => exportRecordToJSON(ISSUE_REPORT_VIEW_SECTIONS, report, `IssueReport_${report.report_reference || reportId}`)}
              onExportPrint={() => exportRecordToPrint(ISSUE_REPORT_VIEW_SECTIONS, report, `IssueReport_${report.report_reference || reportId}`)}
            />
            {report.report_status === 'draft' && (
              <button
                onClick={() => navigate(`/projects/${projectId}/issues/${issueId}/reports/${reportId}/edit`)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2"
              >
                <Edit2 className="h-4 w-4" />
                Edit
              </button>
            )}
            <div className="flex gap-2">
              <button
                onClick={() => window.print()}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2"
              >
                <Printer className="h-4 w-4" />
                Print
              </button>
              <div className="relative group">
                <button
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2"
                >
                  <Download className="h-4 w-4" />
                  Export
                </button>
                <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
                  <button
                    onClick={() => exportToPDF(report, options, approvals, distribution)}
                    className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2"
                  >
                    <FileDown className="w-4 h-4" />
                    Export as PDF
                  </button>
                  <button
                    onClick={() => exportToWord(report, options, approvals, distribution)}
                    className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2"
                  >
                    <FileText className="w-4 h-4" />
                    Export as Word
                  </button>
                  <button
                    onClick={() => copyToClipboard(report, options)}
                    className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2"
                  >
                    <FileDown className="w-4 h-4" />
                    Copy to Clipboard
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Completeness Indicator */}
        <IssueReportCompletenessIndicator reportId={reportId} />
      </div>

      {/* Tabs */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 mb-6">
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="flex -mb-px">
            {['overview', 'impact', 'options', 'decision', 'approval', 'distribution'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-6 py-3 text-sm font-medium border-b-2 capitalize ${
                  activeTab === tab
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
              >
                {tab === 'overview' && 'Overview'}
                {tab === 'impact' && 'Impact Analysis'}
                {tab === 'options' && `Options (${options.length})`}
                {tab === 'decision' && 'Decision'}
                {tab === 'approval' && `Approval (${approvals.length})`}
                {tab === 'distribution' && `Distribution (${distribution.length})`}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Issue Summary</h3>
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 space-y-2">
                  <p><strong>Identifier:</strong> {report.issue_identifier}</p>
                  <p><strong>Type:</strong> {report.issue_type}</p>
                  <p><strong>Title:</strong> {report.issue_title}</p>
                  <p className="whitespace-pre-wrap"><strong>Description:</strong> {report.issue_description}</p>
                </div>
              </div>

              {report.recommendation && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Recommendation</h3>
                  <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                    <p className="text-gray-900 dark:text-white font-medium mb-2">{report.recommendation}</p>
                    {report.recommendation_rationale && (
                      <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                        {report.recommendation_rationale}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {report.decision_made && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Decision</h3>
                  <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                    <p className="text-gray-900 dark:text-white font-medium mb-2">{report.decision_made}</p>
                    {report.decision_date && (
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Date: {new Date(report.decision_date).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'impact' && (
            <div className="space-y-4">
              {report.impact_time && (
                <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 dark:text-white mb-2">Time Impact</h4>
                  <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{report.impact_time}</p>
                </div>
              )}
              {report.impact_cost && (
                <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 dark:text-white mb-2">Cost Impact</h4>
                  <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{report.impact_cost}</p>
                </div>
              )}
              {report.impact_quality && (
                <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 dark:text-white mb-2">Quality Impact</h4>
                  <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{report.impact_quality}</p>
                </div>
              )}
              {report.impact_scope && (
                <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 dark:text-white mb-2">Scope Impact</h4>
                  <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{report.impact_scope}</p>
                </div>
              )}
              {report.impact_benefits && (
                <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 dark:text-white mb-2">Benefits Impact</h4>
                  <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{report.impact_benefits}</p>
                </div>
              )}
              {report.impact_risk && (
                <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 dark:text-white mb-2">Risk Impact</h4>
                  <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{report.impact_risk}</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'options' && (
            <div className="space-y-4">
              {options.map((option, index) => (
                <div
                  key={option.id || index}
                  className={`border rounded-lg p-4 ${
                    option.is_recommended
                      ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                      : 'border-gray-200 dark:border-gray-700'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded text-sm font-medium">
                      Option {option.option_number}
                    </span>
                    {option.is_recommended && (
                      <span className="px-2 py-1 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 rounded text-sm font-medium">
                        Recommended
                      </span>
                    )}
                  </div>
                  <h4 className="font-medium text-gray-900 dark:text-white mb-2">{option.option_title}</h4>
                  {option.option_description && (
                    <p className="text-gray-700 dark:text-gray-300 mb-3 whitespace-pre-wrap">{option.option_description}</p>
                  )}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    {option.pros && (
                      <div>
                        <p className="font-medium text-green-700 dark:text-green-400 mb-1">Pros</p>
                        <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{option.pros}</p>
                      </div>
                    )}
                    {option.cons && (
                      <div>
                        <p className="font-medium text-red-700 dark:text-red-400 mb-1">Cons</p>
                        <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{option.cons}</p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'approval' && (
            <IssueReportApprovalWorkflow reportId={reportId} readOnly={true} />
          )}

          {activeTab === 'distribution' && (
            <div className="space-y-2">
              {distribution.map((item) => (
                <div
                  key={item.id}
                  className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 flex items-center justify-between"
                >
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {item.recipient_name || item.recipient?.full_name || 'Unknown'}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {item.recipient_email || item.recipient?.email} • {item.recipient_role}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                      Status: {item.distribution_status} • Version: {item.version_distributed}
                    </p>
                  </div>
                  {item.distribution_status === 'acknowledged' && (
                    <CheckCircle className="w-5 h-5 text-green-500" />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
