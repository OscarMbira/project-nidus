import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'

import { usePlatformProjectId } from '@nidus/shared/hooks/usePlatformProjectId.js'
import { resolveEntityId } from '@nidus/shared/utils/entityRouteParam'
import { isLikelyDatabaseUuid } from '@nidus/shared/utils/isUuid'
import { platformProjectPath } from '@nidus/shared/utils/projectRouteParam'
import { ArrowLeft, Download, Printer, FileText } from 'lucide-react'
import { RowActionButton } from '@nidus/ui'
import { fetchEndStageReport } from '../../services/stageBoundariesService'
import { getProductStatuses } from '../../services/endStageReportProductService'
import { getRiskReviews } from '../../services/endStageReportRiskService'
import { getIssueReviews } from '../../services/endStageReportIssueService'
import { getFollowOnActions } from '../../services/endStageReportActionsService'
import { getApprovalStatus } from '../../services/endStageReportApprovalService'
import { getDistributionList } from '../../services/endStageReportDistributionService'
import EndStageReportStatusBadge from '../../components/structured/boundaries/EndStageReportStatusBadge'
import { format } from 'date-fns'
import ExportRecordButtons from '@nidus/ui/ExportRecordButtons'
import { exportRecordToExcel, exportRecordToWord, exportRecordToPPT, exportRecordToCSV, exportRecordToXML, exportRecordToJSON, exportRecordToPrint } from '@nidus/shared/utils/exportUtils'
import { platformDb } from '@nidus/supabase'
import DetailAuditTabList from '@nidus/ui/DetailAuditTabList'
import AuditDetailsPanel from '@nidus/ui/AuditDetailsPanel'
import AuditCard from '@nidus/ui/AuditCard'
import AuditField from '@nidus/ui/AuditField'
import AuditTimestampPair from '@nidus/ui/AuditTimestampPair'
import { humanizeAuditToken, resolveAuditUserLabels } from '@nidus/shared/utils/auditDisplayUtils'

const END_STAGE_VIEW_SECTIONS = [
  { title: 'Document Information', fields: [
    { key: 'report_reference', label: 'Reference' },
    { key: 'report_title', label: 'Title' },
    { key: 'approval_workflow_status', label: 'Status' },
    { key: 'version_no', label: 'Version' }
  ]}
]

export default function EndStageReportView() {
  const { reportId } = useParams()
  const { projectId, routeKey } = usePlatformProjectId()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [report, setReport] = useState(null)
  const [productStatuses, setProductStatuses] = useState([])
  const [riskReviews, setRiskReviews] = useState([])
  const [issueReviews, setIssueReviews] = useState([])
  const [followOnActions, setFollowOnActions] = useState([])
  const [approvalStatus, setApprovalStatus] = useState(null)
  const [distribution, setDistribution] = useState([])
  const [activeTab, setActiveTab] = useState('overview')
  const [auditUserLabels, setAuditUserLabels] = useState({})
  const [resolvedReportId, setResolvedReportId] = useState(null)

  useEffect(() => {
    if (reportId && projectId) {
      loadReportData()
    }
  }, [reportId, projectId])

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

  const loadReportData = async () => {
    try {
      setLoading(true)
      const resolvedId = isLikelyDatabaseUuid(reportId)
        ? reportId
        : await resolveEntityId('endStageReport', reportId, projectId)
      if (!resolvedId) {
        setReport(null)
        setLoading(false)
        return
      }
      setResolvedReportId(resolvedId)
      const [
        reportData,
        productsData,
        risksData,
        issuesData,
        actionsData,
        approvalData,
        distributionData
      ] = await Promise.all([
        fetchEndStageReport(resolvedId).catch(() => null),
        getProductStatuses(resolvedId).catch(() => []),
        getRiskReviews(resolvedId).catch(() => []),
        getIssueReviews(resolvedId).catch(() => []),
        getFollowOnActions(resolvedId).catch(() => []),
        getApprovalStatus(resolvedId).catch(() => null),
        getDistributionList(resolvedId).catch(() => [])
      ])

      setReport(reportData)
      setProductStatuses(productsData || [])
      setRiskReviews(risksData || [])
      setIssueReviews(issuesData || [])
      setFollowOnActions(actionsData || [])
      setApprovalStatus(approvalData)
      setDistribution(distributionData || [])

      if (reportData?.report_reference && reportData.report_reference !== reportId) {
        navigate(platformProjectPath(routeKey, 'stage-boundaries', 'end-stage-reports', reportData.report_reference), { replace: true })
      }
    } catch (error) {
      console.error('Error loading report:', error)
      alert('Error loading report: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = () => {
    navigate(platformProjectPath(routeKey, 'stage-boundaries', 'end-stage-reports', report?.report_reference || reportId, 'edit'))
  }

  const handleBack = () => {
    navigate(platformProjectPath(routeKey, 'stage-boundaries'))
  }

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'project', label: 'Project Review' },
    { id: 'businesscase', label: 'Business Case' },
    { id: 'performance', label: 'Performance' },
    { id: 'products', label: 'Products' },
    { id: 'risks', label: 'Risks' },
    { id: 'issues', label: 'Issues' },
    { id: 'lessons', label: 'Lessons' },
    { id: 'forecast', label: 'Forecast' },
    { id: 'actions', label: 'Follow-On Actions' },
    { id: 'approvals', label: 'Approvals' },
    { id: 'print', label: 'Print/Export' },
    { id: 'audit', label: 'Audit details' }
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
          <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Report Not Found</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">The requested end stage report could not be found.</p>
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

  const canEdit = report.approval_workflow_status === 'draft' || report.approval_workflow_status === 'rejected'

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
                  {report.report_title || 'End Stage Report'}
                </h1>
                <div className="flex items-center gap-4 mt-2">
                  {report.report_reference && (
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {report.report_reference}
                    </span>
                  )}
                  <EndStageReportStatusBadge status={report.approval_workflow_status || report.approval_status} />
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
                onExportPPT={() => exportRecordToPPT(END_STAGE_VIEW_SECTIONS, report, `EndStage_${report.report_reference || reportId}`)}
                onExportWord={() => exportRecordToWord(END_STAGE_VIEW_SECTIONS, report, `EndStage_${report.report_reference || reportId}`)}
                onExportExcel={() => exportRecordToExcel(END_STAGE_VIEW_SECTIONS, report, `EndStage_${report.report_reference || reportId}`)}
                onExportCSV={() => exportRecordToCSV(END_STAGE_VIEW_SECTIONS, report, `EndStage_${report.report_reference || reportId}`)}
                onExportXML={() => exportRecordToXML(END_STAGE_VIEW_SECTIONS, report, `EndStage_${report.report_reference || reportId}`)}
                onExportJSON={() => exportRecordToJSON(END_STAGE_VIEW_SECTIONS, report, `EndStage_${report.report_reference || reportId}`)}
                onExportPrint={() => exportRecordToPrint(END_STAGE_VIEW_SECTIONS, report, `EndStage_${report.report_reference || reportId}`)}
              />
              {canEdit && (
                <RowActionButton variant="edit" label="Edit end stage report" onClick={handleEdit} />
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
            ariaLabel="End stage report sections"
            tabs={tabs.map((tab) => ({ value: tab.id, label: tab.label }))}
          />
        </div>
      </div>

      {/* Tab Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'audit' && (
          <AuditDetailsPanel description="Who created or changed this end stage report, and how it is classified.">
            <AuditCard title="Identity" description="How this report is labelled and tracked.">
              <AuditField label="Reference" value={report.report_reference} />
              <AuditField label="Title" value={report.report_title} />
              <AuditField label="Status" value={humanizeAuditToken(report.approval_workflow_status || report.approval_status)} />
            </AuditCard>
            <AuditCard title="Classification" description="Where this report sits.">
              <AuditField label="Stage" value={report.stage_name} />
              <AuditField label="Stage status" value={humanizeAuditToken(report.stage_status)} />
            </AuditCard>
            <AuditCard title="Record history" description="When this report was created and last changed.">
              <AuditField label="Created by" value={report.created_by ? auditUserLabels[report.created_by] || null : null} />
              <AuditTimestampPair dateLabel="Created at" value={report.created_at} />
              <AuditField label="Updated by" value={report.updated_by ? auditUserLabels[report.updated_by] || null : null} />
              <AuditTimestampPair dateLabel="Last updated" value={report.updated_at} />
            </AuditCard>
          </AuditDetailsPanel>
        )}

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
                {report.reporting_period_start && report.reporting_period_end && (
                  <div>
                    <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">Reporting Period</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {format(new Date(report.reporting_period_start), 'dd MMM yyyy')} - {format(new Date(report.reporting_period_end), 'dd MMM yyyy')}
                    </p>
                  </div>
                )}
                <div>
                  <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">Stage</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {report.stage_name} (Stage {report.stage_number})
                  </p>
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">Stage Status</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400 capitalize">{report.stage_status || 'completed'}</p>
                </div>
              </div>
            </div>

            {/* Stage Objectives */}
            {report.stage_objectives_summary && (
              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Stage Objectives Summary</h2>
                <p className="text-gray-600 dark:text-gray-400 whitespace-pre-wrap">{report.stage_objectives_summary}</p>
                <p className="mt-4 text-sm">
                  <strong>Objectives Met:</strong> {report.stage_objectives_met ? 'Yes' : 'No'}
                </p>
              </div>
            )}

            {/* Performance Summary */}
            {(report.schedule_performance_index || report.cost_performance_index) && (
              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Performance Summary</h2>
                <div className="grid grid-cols-2 gap-4">
                  {report.schedule_performance_index && (
                    <div>
                      <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">Schedule Performance Index (SPI)</p>
                      <p className="text-lg font-bold text-gray-900 dark:text-white">{report.schedule_performance_index.toFixed(2)}</p>
                    </div>
                  )}
                  {report.cost_performance_index && (
                    <div>
                      <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">Cost Performance Index (CPI)</p>
                      <p className="text-lg font-bold text-gray-900 dark:text-white">{report.cost_performance_index.toFixed(2)}</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Other tabs would render their respective content */}
        {activeTab === 'products' && (
          <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Product/Deliverable Status</h2>
              {productStatuses.length > 0 ? (
                <div className="space-y-4">
                  {productStatuses.map((product, index) => (
                    <div key={product.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">                      <h3 className="font-semibold text-gray-900 dark:text-white">{product.product_name}</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Status: {product.completion_status} | Quality: {product.quality_status}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-600 dark:text-gray-400">No products added yet.</p>
              )}
            </div>
          </div>
        )}

        {/* Similar sections for other tabs... */}
      </div>
    </div>
  )
}
