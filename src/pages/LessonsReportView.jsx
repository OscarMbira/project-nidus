/**
 * Lessons Report View Page
 * Read-only view of a Lessons Report
 */

import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'

import { usePlatformProjectId } from '../hooks/usePlatformProjectId.js'
import { ArrowLeft, Edit2, Download, FileDown, Printer, FileText, CheckCircle, XCircle, Clock } from 'lucide-react'
import { getLessonsReportById } from '../services/lessonsReportService'
import { getLessonsInReport } from '../services/lessonsReportLessonService'
import { getRecommendations } from '../services/lessonsReportRecommendationService'
import { getApprovals } from '../services/lessonsReportApprovalService'
import { getDistributionList } from '../services/lessonsReportDistributionService'
import { getAppendices } from '../services/lessonsReportAppendixService'
import LessonsReportForm from '../components/lessonsReport/LessonsReportForm'
import LessonsReportHeader from '../components/lessonsReport/LessonsReportHeader'
import ExportRecordButtons from '../components/ui/ExportRecordButtons'
import { exportRecordToExcel, exportRecordToWord, exportRecordToPPT, exportRecordToCSV, exportRecordToXML, exportRecordToJSON, exportRecordToPrint } from '../utils/exportUtils'

const LESSONS_REPORT_VIEW_SECTIONS = [
  { title: 'Report Information', fields: [
    { key: 'report_reference', label: 'Reference' },
    { key: 'executive_summary', label: 'Executive Summary' },
    { key: 'report_type', label: 'Type' },
    { key: 'report_status', label: 'Status' }
  ]}
]

export default function LessonsReportView() {
  const { reportId } = useParams()
  const { projectId, routeKey } = usePlatformProjectId()
  const navigate = useNavigate()
  const [report, setReport] = useState(null)
  const [reportLessons, setReportLessons] = useState([])
  const [recommendations, setRecommendations] = useState([])
  const [approvals, setApprovals] = useState([])
  const [distribution, setDistribution] = useState([])
  const [appendices, setAppendices] = useState([])
  const [loading, setLoading] = useState(true)
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
        reportResult,
        lessonsResult,
        recommendationsResult,
        approvalsResult,
        distributionResult,
        appendicesResult
      ] = await Promise.all([
        getLessonsReportById(reportId),
        getLessonsInReport(reportId),
        getRecommendations(reportId),
        getApprovals(reportId),
        getDistributionList(reportId),
        getAppendices(reportId)
      ])

      if (reportResult.success) {
        setReport(reportResult.data)
      }

      if (lessonsResult.success) {
        setReportLessons(lessonsResult.data || [])
      }

      if (recommendationsResult.success) {
        setRecommendations(recommendationsResult.data || [])
      }

      if (approvalsResult.success) {
        setApprovals(approvalsResult.data || [])
      }

      if (distributionResult.success) {
        setDistribution(distributionResult.data || [])
      }

      if (appendicesResult.success) {
        setAppendices(appendicesResult.data || [])
      }
    } catch (error) {
      console.error('Error loading report data:', error)
      alert('Error loading report: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleExportPDF = () => {
    const { exportLessonsReportToPDF } = require('../utils/lessonsReportExport')
    exportLessonsReportToPDF(report, reportLessons.map(rl => rl.lesson), recommendations, approvals, distribution, appendices)
  }

  const handleExport = (format) => {
    const { exportLessonsReportToPDF, exportLessonsReportToWord } = require('../utils/lessonsReportExport')
    if (format === 'pdf') {
      exportLessonsReportToPDF(report, reportLessons.map(rl => rl.lesson), recommendations, approvals, distribution, appendices)
    } else if (format === 'word') {
      exportLessonsReportToWord(report, reportLessons.map(rl => rl.lesson), recommendations, approvals, distribution, appendices)
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'approved': return 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-200'
      case 'distributed': return 'bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-200'
      case 'closed': return 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
      case 'under_review': return 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-200'
      case 'submitted': return 'bg-orange-100 dark:bg-orange-900/20 text-orange-800 dark:text-orange-200'
      default: return 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
    }
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'approved': return <CheckCircle className="w-5 h-5 text-green-500" />
      case 'distributed': return <CheckCircle className="w-5 h-5 text-blue-500" />
      case 'closed': return <XCircle className="w-5 h-5 text-gray-500" />
      case 'under_review': return <Clock className="w-5 h-5 text-yellow-500" />
      default: return <Clock className="w-5 h-5 text-gray-400" />
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto" />
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading Lessons Report...</p>
        </div>
      </div>
    )
  }

  if (!report) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center py-12">
          <p className="text-gray-500 dark:text-gray-400 mb-4">Report not found</p>
          <button
            onClick={() => navigate(`/app/projects/${projectId}/lessons/reports`)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
          >
            Back to Reports
          </button>
        </div>
      </div>
    )
  }

  const canEdit = report.report_status === 'draft' || report.report_status === 'submitted'

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Back Button and Export */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <button
          onClick={() => navigate(`/app/projects/${projectId}/lessons/reports`)}
          className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Reports
        </button>
        <ExportRecordButtons
          onExportPPT={() => exportRecordToPPT(LESSONS_REPORT_VIEW_SECTIONS, report, `LessonsReport_${report.report_reference || reportId}`)}
          onExportWord={() => exportRecordToWord(LESSONS_REPORT_VIEW_SECTIONS, report, `LessonsReport_${report.report_reference || reportId}`)}
          onExportExcel={() => exportRecordToExcel(LESSONS_REPORT_VIEW_SECTIONS, report, `LessonsReport_${report.report_reference || reportId}`)}
          onExportCSV={() => exportRecordToCSV(LESSONS_REPORT_VIEW_SECTIONS, report, `LessonsReport_${report.report_reference || reportId}`)}
          onExportXML={() => exportRecordToXML(LESSONS_REPORT_VIEW_SECTIONS, report, `LessonsReport_${report.report_reference || reportId}`)}
          onExportJSON={() => exportRecordToJSON(LESSONS_REPORT_VIEW_SECTIONS, report, `LessonsReport_${report.report_reference || reportId}`)}
          onExportPrint={() => exportRecordToPrint(LESSONS_REPORT_VIEW_SECTIONS, report, `LessonsReport_${report.report_reference || reportId}`)}
        />
      </div>

      {/* Header */}
      <LessonsReportHeader
        report={report}
        onEdit={() => navigate(`/app/projects/${projectId}/lessons/reports/${reportId}/edit`)}
        onExport={handleExport}
        readOnly={!canEdit}
      />

      {/* View using form in view mode */}
      <LessonsReportForm
        projectId={projectId}
        lessonsLogId={report.lessons_log_id}
        stageBoundaryId={report.stage_boundary_id}
        reportId={reportId}
        reportType={report.report_type}
        mode="view"
        onCancel={() => navigate(`/app/projects/${projectId}/lessons/reports`)}
      />
    </div>
  )
}
