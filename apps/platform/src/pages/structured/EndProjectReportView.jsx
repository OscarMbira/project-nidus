import { useState, useEffect } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import toast from 'react-hot-toast'

import { usePlatformProjectId } from '@nidus/shared/hooks/usePlatformProjectId.js'
import { resolveEntityId } from '@nidus/shared/utils/entityRouteParam'
import { isLikelyDatabaseUuid } from '@nidus/shared/utils/isUuid'
import { platformProjectPath } from '@nidus/shared/utils/projectRouteParam'
import { ArrowLeft, AlertCircle, Download, ChevronDown, Eye, FileDown, FileText, Presentation, Table2, FileSpreadsheet, Code, Braces, Printer } from 'lucide-react'
import { RowActionButton } from '@nidus/ui'
import { getEndProjectReportById, updateEndProjectReport } from '../../services/endProjectReportService'
import { useSuccessModal } from '@nidus/shared/hooks/useSuccessModal'
import { getBenefitsComparison } from '../../services/eprBusinessCaseReviewService'
import { getTolerancePerformance } from '../../services/eprObjectivesReviewService'
import { getTeamPerformance } from '../../services/eprTeamPerformanceService'
import { getQualityRecords, getApprovalRecords, getOffSpecifications } from '../../services/eprProductsReviewService'
import { getLessons } from '../../services/eprLessonsService'
import { getFollowOnActions } from '../../services/eprFollowOnService'
import { getQualityCheckStatus, getQualityChecks } from '../../services/eprQualityCheckService'
import EPRStatusBadge from '../../components/structured/closing/EPRStatusBadge'
import EPRQualityProgress from '../../components/structured/closing/EPRQualityProgress'
import EPRRevisionHistory from '../../components/structured/closing/EPRRevisionHistory'
import EPRApprovals from '../../components/structured/closing/EPRApprovals'
import EPRDistribution from '../../components/structured/closing/EPRDistribution'
import EPRPrintView from '../../components/structured/closing/EPRPrintView'
import ReportSectionList from '../../components/structured/closing/ReportSectionList'
import EPRDocumentHeader from '../../components/structured/closing/EPRDocumentHeader'
import EPRProjectManagerReport from '../../components/structured/closing/EPRProjectManagerReport'
import EPRBusinessCaseReview from '../../components/structured/closing/EPRBusinessCaseReview'
import EPRObjectivesReview from '../../components/structured/closing/EPRObjectivesReview'
import EPRTeamPerformance from '../../components/structured/closing/EPRTeamPerformance'
import EPRProductsReview from '../../components/structured/closing/EPRProductsReview'
import EPRLessonsReport from '../../components/structured/closing/EPRLessonsReport'
import EPRFollowOnActions from '../../components/structured/closing/EPRFollowOnActions'
import EPRQualityCriteria from '../../components/structured/closing/EPRQualityCriteria'
import { format } from 'date-fns'
import Modal from '@nidus/ui/Modal'
import {
  exportRecordToExcel,
  exportRecordToPPT,
  exportRecordToCSV,
  exportRecordToXML,
  exportRecordToJSON,
} from '@nidus/shared/utils/exportUtils'
import { exportEndProjectReportToPDF, exportEndProjectReportToWord } from '@nidus/shared/utils/eprExport'
import { platformDb } from '@nidus/supabase'
import DetailAuditTabList from '@nidus/ui/DetailAuditTabList'
import AuditDetailsPanel from '@nidus/ui/AuditDetailsPanel'
import AuditCard from '@nidus/ui/AuditCard'
import AuditField from '@nidus/ui/AuditField'
import AuditTimestampPair from '@nidus/ui/AuditTimestampPair'
import { humanizeAuditToken, resolveAuditUserLabels } from '@nidus/shared/utils/auditDisplayUtils'

function joinLines(items, formatLine) {
  return (items || [])
    .map(formatLine)
    .map((line) => String(line || '').trim())
    .filter(Boolean)
    .join('\n')
}

function personName(person) {
  return person?.full_name || person?.email || ''
}

function showDate(value) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)
  return format(date, 'dd MMM yyyy')
}

function yesNo(value) {
  return value ? 'Yes' : 'No'
}

function words(value) {
  return String(value || '').replace(/_/g, ' ')
}

function asList(value) {
  if (Array.isArray(value)) return value
  if (Array.isArray(value?.reviews)) return value.reviews
  return []
}

const REPORT_TABS = [
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
  { id: 'print', label: 'Print/Export' },
  { id: 'audit', label: 'Audit details' },
]

const REPORT_SAVE_FIELDS = [
  'report_title',
  'report_date',
  'author_id',
  'owner_id',
  'client_id',
  'date_of_this_revision',
  'closure_type',
  'project_managers_report',
  'abnormal_situations',
  'abnormal_situations_impact',
  'premature_closure_reason',
  'executive_summary',
  'version_no',
]

const BUSINESS_CASE_COLUMNS = [
  { key: 'benefit', label: 'Benefit', value: (row) => row.benefit_description || row.benefit?.benefit_description || '' },
  { key: 'type', label: 'Type', value: (row) => words(row.benefit_type) },
  { key: 'target', label: 'Target', value: (row) => row.original_target_value ?? '' },
  { key: 'actual', label: 'Actual', value: (row) => row.actual_value ?? '' },
  { key: 'variance', label: 'Variance', value: (row) => (row.variance_percentage == null ? '' : `${Number(row.variance_percentage).toFixed(1)}%`) },
  { key: 'status', label: 'Status', value: (row) => (row.is_post_project ? 'Post-Project' : 'Achieved') },
]

const OBJECTIVE_COLUMNS = [
  { key: 'area', label: 'Objective', value: (row) => words(row.objective_area) },
  { key: 'target', label: 'Target', value: (row) => row.original_target || '' },
  { key: 'actual', label: 'Actual', value: (row) => row.actual_value || '' },
  { key: 'tolerance', label: 'Tolerance', value: (row) => (row.within_tolerance ? 'Within tolerance' : 'Outside tolerance') },
  { key: 'rating', label: 'Performance', value: (row) => words(row.performance_rating) },
]

const TEAM_COLUMNS = [
  { key: 'name', label: 'Name', value: (row) => row.team_member?.full_name || row.team_name || '' },
  { key: 'role', label: 'Role', value: (row) => row.role || '' },
  { key: 'type', label: 'Type', value: (row) => words(row.performance_type) },
  { key: 'performance', label: 'Performance', value: (row) => row.performance_description || '' },
]

const QUALITY_RECORD_COLUMNS = [
  { key: 'activity', label: 'Activity', value: (row) => row.activity_name || '' },
  { key: 'type', label: 'Type', value: (row) => words(row.activity_type) },
  { key: 'product', label: 'Product', value: (row) => row.product_name || '' },
  { key: 'planned', label: 'Planned', value: (row) => showDate(row.planned_date) },
  { key: 'actual', label: 'Actual', value: (row) => showDate(row.actual_date) },
  { key: 'status', label: 'Status', value: (row) => words(row.status) },
  { key: 'result', label: 'Result', value: (row) => row.result || '' },
]

const PRODUCT_APPROVAL_COLUMNS = [
  { key: 'product', label: 'Product', value: (row) => row.product_name || '' },
  { key: 'status', label: 'Status', value: (row) => words(row.approval_status) },
  { key: 'approver', label: 'Approver', value: (row) => row.approver_name || '' },
  { key: 'date', label: 'Date', value: (row) => showDate(row.approval_date) },
  { key: 'conditions', label: 'Conditions', value: (row) => row.conditions || '' },
]

const OFF_SPEC_COLUMNS = [
  { key: 'product', label: 'Product', value: (row) => row.product_name || '' },
  { key: 'type', label: 'Type', value: (row) => words(row.off_spec_type) },
  { key: 'deviation', label: 'Deviation', value: (row) => row.deviation_description || '' },
  { key: 'concession', label: 'Concession', value: (row) => yesNo(row.concession_granted) },
  { key: 'impact', label: 'Impact', value: (row) => row.impact_assessment || '' },
]

const LESSON_COLUMNS = [
  { key: 'title', label: 'Title', value: (row) => row.title || '' },
  { key: 'type', label: 'Type', value: (row) => words(row.lesson_type) },
  { key: 'category', label: 'Category', value: (row) => words(row.category) },
  { key: 'impact', label: 'Impact', value: (row) => words(row.impact) },
  { key: 'description', label: 'Description', value: (row) => row.description || '' },
  { key: 'recommendation', label: 'Recommendation', value: (row) => row.recommendation || '' },
]

const FOLLOW_ON_COLUMNS = [
  { key: 'action', label: 'Action', value: (row) => row.follow_on_action?.action_title || row.source_reference || words(row.source_type) },
  { key: 'source', label: 'Source', value: (row) => words(row.source_type) },
  { key: 'reference', label: 'Reference', value: (row) => row.source_reference || '' },
  { key: 'documentation', label: 'Documentation', value: (row) => yesNo(row.documentation_attached) },
  { key: 'advice', label: 'Board advice', value: (row) => yesNo(row.project_board_advice_requested) },
  { key: 'recipient', label: 'Recipient', value: (row) => row.recommended_recipient || '' },
]

const QUALITY_CHECK_COLUMNS = [
  { key: 'criterion', label: 'Criterion', value: (row) => row.criterion_name || '' },
  { key: 'status', label: 'Status', value: (row) => words(row.validation_status) },
  { key: 'comment', label: 'Comment', value: (row) => row.manual_check_comment || '' },
  { key: 'checked_by', label: 'Checked by', value: (row) => personName(row.checked_by_user) },
  { key: 'checked_at', label: 'Checked', value: (row) => showDate(row.checked_at) },
]

const EPR_EXPORT_SECTIONS = [
  {
    title: 'Document Information',
    fields: [
      { key: 'document_ref', label: 'Document Ref' },
      { key: 'report_title', label: 'Title' },
      { key: 'approval_status', label: 'Status' },
      { key: 'version_no', label: 'Version' },
      { key: 'report_date', label: 'Report Date' },
      { key: 'date_of_this_revision', label: 'Date of This Revision' },
      { key: 'author', label: 'Author' },
      { key: 'owner', label: 'Owner' },
      { key: 'client', label: 'Client' },
      { key: 'closure_type', label: 'Closure Type' },
    ],
  },
  {
    title: 'Report',
    fields: [
      { key: 'executive_summary', label: 'Executive Summary' },
      { key: 'project_managers_report', label: "Project Manager's Report" },
      { key: 'abnormal_situations', label: 'Abnormal Situations' },
      { key: 'abnormal_situations_impact', label: 'Abnormal Situations Impact' },
    ],
  },
  { title: 'Objectives', fields: [{ key: 'objectives', label: 'Objectives Performance' }] },
  { title: 'Team', fields: [{ key: 'team_performance', label: 'Team Performance' }] },
  {
    title: 'Products',
    fields: [
      { key: 'quality_records', label: 'Quality Records' },
      { key: 'approval_records', label: 'Approval Records' },
      { key: 'off_specifications', label: 'Off-Specifications' },
    ],
  },
  { title: 'Lessons', fields: [{ key: 'lessons', label: 'Lessons' }] },
  { title: 'Follow-On Actions', fields: [{ key: 'follow_on_actions', label: 'Follow-On Actions' }] },
]

export default function EndProjectReportView() {
  const { reportId } = useParams()
  const { projectId, routeKey } = usePlatformProjectId()
  const navigate = useNavigate()
  const location = useLocation()
  const editing = location.pathname.endsWith('/edit')
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
  const [qualityChecks, setQualityChecks] = useState([])
  const [activeTab, setActiveTab] = useState(() => {
    const section = location.state?.section
    return REPORT_TABS.some((tab) => tab.id === section) ? section : 'overview'
  })
  const [saving, setSaving] = useState(false)
  const { showSuccess, modal: successModal } = useSuccessModal()
  const [auditUserLabels, setAuditUserLabels] = useState({})
  const [resolvedReportId, setResolvedReportId] = useState(null)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [exportOpen, setExportOpen] = useState(false)

  useEffect(() => {
    if (activeTab !== 'audit' || !report) return
    let cancelled = false
    ;(async () => {
      const labels = await resolveAuditUserLabels(platformDb, [
        report.created_by,
        report.updated_by,
      ])
      if (!cancelled) setAuditUserLabels(labels || {})
    })()
    return () => { cancelled = true }
  }, [activeTab, report])

  useEffect(() => {
    if (reportId && projectId) {
      loadReportData()
    }
  }, [reportId, projectId])

  const loadReportData = async () => {
    try {
      setLoading(true)
      const resolvedId = isLikelyDatabaseUuid(reportId)
        ? reportId
        : await resolveEntityId('endProjectReport', reportId, projectId)
      if (!resolvedId) {
        setReport(null)
        setLoading(false)
        return
      }
      setResolvedReportId(resolvedId)
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
        qualityStatusData,
        qualityChecksData,
      ] = await Promise.all([
        getEndProjectReportById(resolvedId),
        getBenefitsComparison(resolvedId).catch(() => []),
        getTolerancePerformance(resolvedId).catch(() => []),
        getTeamPerformance(resolvedId).catch(() => []),
        getQualityRecords(resolvedId).catch(() => []),
        getApprovalRecords(resolvedId).catch(() => []),
        getOffSpecifications(resolvedId).catch(() => []),
        getLessons(resolvedId).catch(() => []),
        getFollowOnActions(resolvedId).catch(() => []),
        getQualityCheckStatus(resolvedId).catch(() => null),
        getQualityChecks(resolvedId).catch(() => []),
      ])

      setReport(reportData)
      setBusinessCaseReviews(asList(businessCaseData))
      setObjectivesReviews(asList(objectivesData))
      setTeamPerformance(asList(teamData))
      setQualityRecords(asList(qualityData))
      setApprovalRecords(asList(approvalData))
      setOffSpecifications(asList(offSpecData))
      setLessons(asList(lessonsData))
      setFollowOnActions(asList(followOnData))
      setQualityStatus(qualityStatusData)
      setQualityChecks(asList(qualityChecksData))

      if (reportData?.document_ref && reportData.document_ref !== reportId) {
        const segments = ['closure', 'end-project-report', reportData.document_ref]
        if (location.pathname.endsWith('/edit')) segments.push('edit')
        navigate(platformProjectPath(routeKey, ...segments), { replace: true, state: location.state })
      }
    } catch (error) {
      console.error('Error loading report:', error)
      alert('Error loading report: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const reportPath = (edit) => {
    const segments = ['closure', 'end-project-report', report?.document_ref || reportId]
    if (edit) segments.push('edit')
    return platformProjectPath(routeKey, ...segments)
  }

  const handleEdit = () => {
    navigate(reportPath(true), { state: { section: activeTab } })
  }

  const handleDone = () => {
    navigate(reportPath(false), { state: { section: activeTab } })
  }

  const handleReportChange = (field, value) => {
    setReport((prev) => ({ ...prev, [field]: value }))
  }

  const saveReport = async () => {
    const id = resolvedReportId || report?.id
    if (!id) return
    const updates = {}
    REPORT_SAVE_FIELDS.forEach((key) => {
      updates[key] = report[key] ?? null
    })
    try {
      setSaving(true)
      const updated = await updateEndProjectReport(id, updates)
      setReport((prev) => ({ ...prev, ...updated }))
      showSuccess({
        recordId: updated.document_ref || report.document_ref,
        operation: 'updated',
        message: 'End project report was updated.',
      })
    } catch (error) {
      console.error('Error saving report:', error)
      toast.error('Error saving report: ' + error.message)
    } finally {
      setSaving(false)
    }
  }

  const handleBack = () => {
    navigate(platformProjectPath(routeKey, 'closure'))
  }

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
  const exportName = `EndProject_${report.document_ref || reportId}`
  const exportRecord = {
    document_ref: report.document_ref,
    report_title: report.report_title,
    approval_status: humanizeAuditToken(report.approval_status),
    version_no: report.version_no,
    report_date: report.report_date,
    date_of_this_revision: report.date_of_this_revision,
    author: personName(report.author),
    owner: personName(report.owner),
    client: personName(report.client),
    closure_type: humanizeAuditToken(report.closure_type),
    executive_summary: report.executive_summary,
    project_managers_report: report.project_managers_report,
    abnormal_situations: report.abnormal_situations,
    abnormal_situations_impact: report.abnormal_situations_impact,
    objectives: joinLines(objectivesReviews, (row) => [row.objective_area, row.performance_rating].filter(Boolean).join(' — ')),
    team_performance: joinLines(teamPerformance, (row) => [row.team_name || row.role, row.performance_description].filter(Boolean).join(': ')),
    quality_records: joinLines(qualityRecords, (row) => [row.activity_name, row.status].filter(Boolean).join(' — ')),
    approval_records: joinLines(approvalRecords, (row) => [row.product_name, row.approval_status].filter(Boolean).join(' — ')),
    off_specifications: joinLines(offSpecifications, (row) => [row.product_name, row.off_spec_type].filter(Boolean).join(' — ')),
    lessons: joinLines(lessons, (row) => [row.title, row.description].filter(Boolean).join(': ')),
    follow_on_actions: joinLines(followOnActions, (row) => row.follow_on_action?.action_description || row.action_description || row.title || ''),
  }
  const openFormattedReport = () => exportEndProjectReportToPDF(
    report,
    businessCaseReviews,
    objectivesReviews,
    teamPerformance,
    qualityRecords,
    approvalRecords,
    offSpecifications,
    lessons,
    followOnActions,
    qualityStatus,
  )
  const downloadFormattedWord = () => exportEndProjectReportToWord(
    report,
    businessCaseReviews,
    objectivesReviews,
    teamPerformance,
    qualityRecords,
    approvalRecords,
    offSpecifications,
    lessons,
    followOnActions,
    qualityStatus,
  )

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
              <div className="inline-flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPreviewOpen(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  <Eye className="w-4 h-4" />
                  View
                </button>
                <div className="relative inline-block">
                  <button
                    type="button"
                    onClick={() => setExportOpen((open) => !open)}
                    className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700"
                    aria-haspopup="true"
                    aria-expanded={exportOpen}
                  >
                    <Download className="w-4 h-4" />
                    Export
                    <ChevronDown className="w-4 h-4" />
                  </button>
                  {exportOpen && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setExportOpen(false)} aria-hidden="true" />
                      <div className="absolute right-0 mt-1 py-1 min-w-[180px] rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 shadow-lg z-20">
                        <button type="button" onClick={() => { openFormattedReport(); setExportOpen(false) }} className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700">
                          <FileDown className="w-4 h-4 text-red-600" /> PDF
                        </button>
                        <button type="button" onClick={() => { exportRecordToExcel(EPR_EXPORT_SECTIONS, exportRecord, exportName); setExportOpen(false) }} className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700">
                          <Table2 className="w-4 h-4 text-green-600" /> Excel
                        </button>
                        <button type="button" onClick={() => { downloadFormattedWord(); setExportOpen(false) }} className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700">
                          <FileText className="w-4 h-4 text-blue-600" /> Word
                        </button>
                        <button type="button" onClick={() => { exportRecordToPPT(EPR_EXPORT_SECTIONS, exportRecord, exportName); setExportOpen(false) }} className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700">
                          <Presentation className="w-4 h-4 text-amber-600" /> PowerPoint
                        </button>
                        <button type="button" onClick={() => { exportRecordToCSV(EPR_EXPORT_SECTIONS, exportRecord, exportName); setExportOpen(false) }} className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700">
                          <FileSpreadsheet className="w-4 h-4 text-emerald-600" /> CSV
                        </button>
                        <button type="button" onClick={() => { exportRecordToXML(EPR_EXPORT_SECTIONS, exportRecord, exportName); setExportOpen(false) }} className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700">
                          <Code className="w-4 h-4 text-orange-600" /> XML
                        </button>
                        <button type="button" onClick={() => { exportRecordToJSON(EPR_EXPORT_SECTIONS, exportRecord, exportName); setExportOpen(false) }} className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700">
                          <Braces className="w-4 h-4 text-yellow-600" /> JSON
                        </button>
                        <button type="button" onClick={() => { openFormattedReport(); setExportOpen(false) }} className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700">
                          <Printer className="w-4 h-4 text-slate-600" /> Print
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
              {canEdit && !editing && (
                <RowActionButton variant="edit" label="Edit end project report" onClick={handleEdit} />
              )}
              {canEdit && editing && (
                <button
                  type="button"
                  onClick={handleDone}
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Done
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <DetailAuditTabList
            activeTab={activeTab}
            onChange={setActiveTab}
            ariaLabel="End project report sections"
            tabs={REPORT_TABS.map((tab) => ({ value: tab.id, label: tab.label }))}
          />
        </div>
      </div>

      {/* Tab Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'audit' && (
          <AuditDetailsPanel description="Who created or changed this end project report, and how it is classified.">
            <AuditCard title="Identity" description="How this report is labelled and tracked.">
              <AuditField label="Reference" value={report.document_ref} />
              <AuditField label="Title" value={report.report_title} />
              <AuditField label="Status" value={humanizeAuditToken(report.approval_status)} />
            </AuditCard>
            <AuditCard title="Classification" description="Where this report sits.">
              <AuditField label="Version" value={report.version_no} />
            </AuditCard>
            <AuditCard title="Record history" description="When this report was created and last changed.">
              <AuditField label="Created by" value={report.created_by ? auditUserLabels[report.created_by] || null : null} />
              <AuditTimestampPair dateLabel="Created at" value={report.created_at} />
              <AuditField label="Updated by" value={report.updated_by ? auditUserLabels[report.updated_by] || null : null} />
              <AuditTimestampPair dateLabel="Last updated" value={report.updated_at} />
            </AuditCard>
          </AuditDetailsPanel>
        )}

        {activeTab === 'overview' && editing && (
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 space-y-6">
            <EPRDocumentHeader formData={report} onChange={handleReportChange} errors={{}} mode="edit" />
            <EPRProjectManagerReport formData={report} onChange={handleReportChange} errors={{}} mode="edit" />
            <div className="flex justify-end">
              <button
                type="button"
                onClick={saveReport}
                disabled={saving}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        )}

        {activeTab === 'overview' && !editing && (
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
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            {editing ? (
              <EPRBusinessCaseReview
                reportId={resolvedReportId || report.id}
                businessCaseReviews={businessCaseReviews}
                onBusinessCaseReviewsChange={setBusinessCaseReviews}
                projectId={projectId}
                mode="edit"
              />
            ) : (
              <ReportSectionList
                viewModeId="epr-business-case"
                title="Business Case Review"
                rows={businessCaseReviews}
                columns={BUSINESS_CASE_COLUMNS}
                emptyText="No business case reviews added yet."
              />
            )}
          </div>
        )}

        {activeTab === 'objectives' && (
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            {editing ? (
              <EPRObjectivesReview
                reportId={resolvedReportId || report.id}
                objectivesReviews={objectivesReviews}
                onObjectivesReviewsChange={setObjectivesReviews}
                mode="edit"
              />
            ) : (
              <ReportSectionList
                viewModeId="epr-objectives"
                title="Objectives Performance Review"
                rows={objectivesReviews}
                columns={OBJECTIVE_COLUMNS}
                emptyText="No objectives reviews added yet."
              />
            )}
          </div>
        )}

        {activeTab === 'team' && (
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            {editing ? (
              <EPRTeamPerformance
                reportId={resolvedReportId || report.id}
                teamPerformance={teamPerformance}
                onTeamPerformanceChange={setTeamPerformance}
                mode="edit"
              />
            ) : (
              <ReportSectionList
                viewModeId="epr-team-performance"
                title="Team Performance & Recognition"
                rows={teamPerformance}
                columns={TEAM_COLUMNS}
                emptyText="No team performance records added yet."
              />
            )}
          </div>
        )}

        {activeTab === 'products' && (
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 space-y-8">
            {editing ? (
              <EPRProductsReview
                reportId={resolvedReportId || report.id}
                qualityRecords={qualityRecords}
                approvalRecords={approvalRecords}
                offSpecifications={offSpecifications}
                onQualityRecordsChange={setQualityRecords}
                onApprovalRecordsChange={setApprovalRecords}
                onOffSpecificationsChange={setOffSpecifications}
                projectId={projectId}
                mode="edit"
              />
            ) : (
              <>
                <ReportSectionList
                  viewModeId="epr-quality-records"
                  title="Quality Records"
                  rows={qualityRecords}
                  columns={QUALITY_RECORD_COLUMNS}
                  emptyText="No quality records added yet."
                />
                <ReportSectionList
                  viewModeId="epr-product-approvals"
                  title="Approval Records"
                  rows={approvalRecords}
                  columns={PRODUCT_APPROVAL_COLUMNS}
                  emptyText="No approval records added yet."
                />
                <ReportSectionList
                  viewModeId="epr-off-specifications"
                  title="Off-Specifications"
                  rows={offSpecifications}
                  columns={OFF_SPEC_COLUMNS}
                  emptyText="No off-specifications recorded."
                />
              </>
            )}
          </div>
        )}

        {activeTab === 'lessons' && (
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            {editing ? (
              <EPRLessonsReport
                reportId={resolvedReportId || report.id}
                lessons={lessons}
                onLessonsChange={setLessons}
                projectId={projectId}
                mode="edit"
              />
            ) : (
              <ReportSectionList
                viewModeId="epr-lessons"
                title="Lessons Learned"
                rows={lessons}
                columns={LESSON_COLUMNS}
                emptyText="No lessons learned documented yet."
              />
            )}
          </div>
        )}

        {activeTab === 'followon' && (
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            {editing ? (
              <EPRFollowOnActions
                reportId={resolvedReportId || report.id}
                followOnActions={followOnActions}
                onFollowOnActionsChange={setFollowOnActions}
                projectId={projectId}
                mode="edit"
              />
            ) : (
              <ReportSectionList
                viewModeId="epr-follow-on-actions"
                title="Follow-On Actions"
                rows={followOnActions}
                columns={FOLLOW_ON_COLUMNS}
                emptyText="No follow-on actions linked yet."
              />
            )}
          </div>
        )}

        {activeTab === 'quality' && (
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 space-y-6">
            {editing ? (
              <EPRQualityCriteria
                reportId={resolvedReportId || report.id}
                qualityStatus={qualityStatus}
                onStatusChange={setQualityStatus}
                mode="edit"
              />
            ) : (
              <>
                <div>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Quality Criteria Validation</h2>
                  {qualityStatus && <EPRQualityProgress qualityStatus={qualityStatus} />}
                </div>
                <ReportSectionList
                  viewModeId="epr-quality-checks"
                  title="Quality Checks"
                  rows={qualityChecks}
                  columns={QUALITY_CHECK_COLUMNS}
                  emptyText="No quality checks recorded."
                />
              </>
            )}
          </div>
        )}

        {activeTab === 'approvals' && (
          <div className="space-y-6">
            <EPRApprovals reportId={resolvedReportId || reportId} />
            <EPRDistribution reportId={resolvedReportId || reportId} mode={editing ? 'edit' : 'view'} />
          </div>
        )}

        {activeTab === 'history' && (
          <div className="space-y-6">
            <EPRRevisionHistory reportId={resolvedReportId || reportId} />
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

      <Modal
        isOpen={previewOpen}
        onClose={() => setPreviewOpen(false)}
        title={report.report_title || 'End Project Report'}
        size="full"
      >
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
      </Modal>
      {successModal}
    </div>
  )
}
