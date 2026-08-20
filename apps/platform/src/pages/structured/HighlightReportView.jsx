import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'

import { usePlatformProjectId } from '@nidus/shared/hooks/usePlatformProjectId.js'
import { resolveEntityId } from '@nidus/shared/utils/entityRouteParam'
import { isLikelyDatabaseUuid } from '@nidus/shared/utils/isUuid'
import { platformProjectPath } from '@nidus/shared/utils/projectRouteParam'
import { ArrowLeft, FileText, Printer } from 'lucide-react'
import { RowActionButton } from '@nidus/ui'
import { getHighlightReportById } from '../../services/controllingStageService'
import { getProducts } from '../../services/highlightReportProductService'
import { getRisks } from '../../services/highlightReportRiskService'
import { getIssues } from '../../services/highlightReportIssueService'
import { getTolerances } from '../../services/highlightReportToleranceService'
import { format } from 'date-fns'
import HighlightReportHeader from '../../components/structured/highlightReport/HighlightReportHeader'
import HighlightReportCompletenessIndicator from '../../components/structured/highlightReport/HighlightReportCompletenessIndicator'
import HighlightReportRevisionHistory from '../../components/structured/highlightReport/HighlightReportRevisionHistory'
import HighlightReportPrintView from '../../components/structured/highlightReport/HighlightReportPrintView'
import ExportRecordButtons from '@nidus/ui/ExportRecordButtons'
import { exportRecordToExcel, exportRecordToWord, exportRecordToPPT, exportRecordToCSV, exportRecordToXML, exportRecordToJSON, exportRecordToPrint } from '@nidus/shared/utils/exportUtils'
import { platformDb } from '@nidus/supabase'
import DetailAuditTabList from '@nidus/ui/DetailAuditTabList'
import AuditDetailsPanel from '@nidus/ui/AuditDetailsPanel'
import AuditCard from '@nidus/ui/AuditCard'
import AuditField from '@nidus/ui/AuditField'
import AuditTimestampPair from '@nidus/ui/AuditTimestampPair'
import { humanizeAuditToken, resolveAuditUserLabels } from '@nidus/shared/utils/auditDisplayUtils'

const HIGHLIGHT_VIEW_SECTIONS = [
  { title: 'Document Information', fields: [
    { key: 'report_reference', label: 'Document Ref' },
    { key: 'report_title', label: 'Title' },
    { key: 'executive_summary', label: 'Executive Summary' },
    { key: 'approval_workflow_status', label: 'Status' }
  ]}
]

export default function HighlightReportView() {
  const { reportId } = useParams()
  const { projectId, routeKey } = usePlatformProjectId()
  const navigate = useNavigate()
  const [report, setReport] = useState(null)
  const [products, setProducts] = useState([])
  const [risks, setRisks] = useState([])
  const [issues, setIssues] = useState([])
  const [tolerances, setTolerances] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')
  const [auditUserLabels, setAuditUserLabels] = useState({})
  const [resolvedReportId, setResolvedReportId] = useState(null)

  useEffect(() => {
    if (reportId && projectId) loadData()
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

  const loadData = async () => {
    try {
      setLoading(true)
      const resolvedId = isLikelyDatabaseUuid(reportId)
        ? reportId
        : await resolveEntityId('highlightReport', reportId, projectId)
      if (!resolvedId) {
        setReport(null)
        setLoading(false)
        return
      }
      setResolvedReportId(resolvedId)
      const [r, p, rs, is, tol] = await Promise.all([
        getHighlightReportById(resolvedId),
        getProducts(resolvedId).catch(() => []),
        getRisks(resolvedId).catch(() => []),
        getIssues(resolvedId).catch(() => []),
        getTolerances(resolvedId).catch(() => [])
      ])
      setReport(r)
      setProducts(p || [])
      setRisks(rs || [])
      setIssues(is || [])
      setTolerances(tol || [])
      if (r?.report_reference && r.report_reference !== reportId) {
        navigate(platformProjectPath(routeKey, 'highlight-reports', r.report_reference), { replace: true })
      }
    } catch (e) {
      console.error('Error loading highlight report:', e)
      setReport(null)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-500 dark:text-gray-400">Loading report…</div>
      </div>
    )
  }

  if (!report) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-12">
          <p className="text-gray-600 dark:text-gray-400">Report not found</p>
          <button
            onClick={() => navigate(platformProjectPath(routeKey, 'stage-boundaries'))}
            className="mt-4 text-blue-600 hover:underline"
          >
            Back to Stage Boundaries
          </button>
        </div>
      </div>
    )
  }

  const status = report.approval_workflow_status || report.stage_status || report.status
  const isDraft = status === 'draft' || status === 'submitted'

  const tabs = [
    { id: 'overview', label: 'Overview', icon: FileText },
    { id: 'print', label: 'Print & Export', icon: Printer },
    { id: 'audit', label: 'Audit details', icon: FileText }
  ]

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-2">
        <button
          onClick={() => navigate(platformProjectPath(routeKey, 'stage-boundaries'))}
          className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
        >
          <ArrowLeft className="h-5 w-5" />
          Back to Stage Boundaries
        </button>
        <div className="flex items-center gap-2">
          <ExportRecordButtons
            onExportPPT={() => exportRecordToPPT(HIGHLIGHT_VIEW_SECTIONS, report, `Highlight_${report.report_reference || reportId}`)}
            onExportWord={() => exportRecordToWord(HIGHLIGHT_VIEW_SECTIONS, report, `Highlight_${report.report_reference || reportId}`)}
            onExportExcel={() => exportRecordToExcel(HIGHLIGHT_VIEW_SECTIONS, report, `Highlight_${report.report_reference || reportId}`)}
            onExportCSV={() => exportRecordToCSV(HIGHLIGHT_VIEW_SECTIONS, report, `Highlight_${report.report_reference || reportId}`)}
            onExportXML={() => exportRecordToXML(HIGHLIGHT_VIEW_SECTIONS, report, `Highlight_${report.report_reference || reportId}`)}
            onExportJSON={() => exportRecordToJSON(HIGHLIGHT_VIEW_SECTIONS, report, `Highlight_${report.report_reference || reportId}`)}
            onExportPrint={() => exportRecordToPrint(HIGHLIGHT_VIEW_SECTIONS, report, `Highlight_${report.report_reference || reportId}`)}
          />
          {isDraft && (
            <RowActionButton
              variant="edit"
              label="Edit highlight report"
              onClick={() => navigate(platformProjectPath(routeKey, 'highlight-reports', report.report_reference || reportId, 'edit'))}
            />
          )}
        </div>
      </div>

      <HighlightReportHeader report={report} />

      <div className="mt-6 border-b border-gray-200 dark:border-gray-700">
        <DetailAuditTabList
          activeTab={activeTab}
          onChange={setActiveTab}
          ariaLabel="Highlight report sections"
          tabs={tabs.map((tab) => ({ value: tab.id, label: tab.label }))}
        />
      </div>

      {activeTab === 'audit' && (
        <div className="bg-white dark:bg-gray-800 rounded-b-lg border border-gray-200 dark:border-gray-700 border-t-0 p-6">
          <AuditDetailsPanel description="Who created or changed this highlight report, and how it is classified.">
            <AuditCard title="Identity" description="How this report is labelled and tracked.">
              <AuditField label="Reference" value={report.report_reference} />
              <AuditField label="Title" value={report.report_title} />
              <AuditField label="Status" value={humanizeAuditToken(status)} />
            </AuditCard>
            <AuditCard title="Classification" description="Where this report sits.">
              <AuditField label="Executive summary" value={report.executive_summary} />
            </AuditCard>
            <AuditCard title="Record history" description="When this report was created and last changed.">
              <AuditField label="Created by" value={report.created_by ? auditUserLabels[report.created_by] || null : null} />
              <AuditTimestampPair dateLabel="Created at" value={report.created_at} />
              <AuditField label="Updated by" value={report.updated_by ? auditUserLabels[report.updated_by] || null : null} />
              <AuditTimestampPair dateLabel="Last updated" value={report.updated_at} />
            </AuditCard>
          </AuditDetailsPanel>
        </div>
      )}

      {activeTab === 'overview' && (
        <div className="bg-white dark:bg-gray-800 rounded-b-lg border border-gray-200 dark:border-gray-700 border-t-0 p-6 space-y-6">
          <HighlightReportCompletenessIndicator reportId={resolvedReportId || reportId} />

          {report.executive_summary && (
            <section>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Executive Summary
              </h2>
              <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{report.executive_summary}</p>
            </section>
          )}

          {report.overall_status_summary && (
            <section>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Overall Status</h2>
              <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{report.overall_status_summary}</p>
            </section>
          )}

          {(report.progress_summary || report.completed_this_period || report.planned_next_period) && (
            <section>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Progress</h2>
              {report.progress_summary && (
                <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap mb-3">{report.progress_summary}</p>
              )}
              {report.completed_this_period && (
                <div className="mb-2">
                  <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">Completed this period</h3>
                  <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{report.completed_this_period}</p>
                </div>
              )}
              {report.planned_next_period && (
                <div>
                  <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">Planned next period</h3>
                  <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{report.planned_next_period}</p>
                </div>
              )}
            </section>
          )}

          {(report.risks_summary || risks.length > 0) && (
            <section>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Risks</h2>
              {report.risks_summary && (
                <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap mb-2">{report.risks_summary}</p>
              )}
              {risks.length > 0 && (
                <ul className="list-disc list-inside space-y-1 text-gray-700 dark:text-gray-300">
                  {risks.map((r) => (
                    <li key={r.id}>{r.risk_title || r.risk_description}</li>
                  ))}
                </ul>
              )}
            </section>
          )}

          {(report.issues_summary || issues.length > 0) && (
            <section>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Issues</h2>
              {report.issues_summary && (
                <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap mb-2">{report.issues_summary}</p>
              )}
              {issues.length > 0 && (
                <ul className="list-disc list-inside space-y-1 text-gray-700 dark:text-gray-300">
                  {issues.map((i) => (
                    <li key={i.id}>{i.issue_title || i.issue_description}</li>
                  ))}
                </ul>
              )}
            </section>
          )}

          {(report.decisions_required || report.recommendations) && (
            <section>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Decisions &amp; Recommendations</h2>
              {report.decisions_required && (
                <div className="mb-2">
                  <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">Decisions required</h3>
                  <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{report.decisions_required}</p>
                </div>
              )}
              {report.recommendations && (
                <div>
                  <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">Recommendations</h3>
                  <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{report.recommendations}</p>
                </div>
              )}
            </section>
          )}

          {products.length > 0 && (
            <section>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Products / Deliverables</h2>
              <ul className="space-y-2">
                {products.map((p) => (
                  <li
                    key={p.id}
                    className="flex justify-between items-start py-2 border-b border-gray-100 dark:border-gray-700 last:border-0"
                  >
                    <span className="font-medium text-gray-900 dark:text-white">{p.product_name || 'Unnamed product'}</span>
                    <span className="text-sm text-gray-500 dark:text-gray-400">{p.period_type}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Revision History</h2>
            <HighlightReportRevisionHistory reportId={resolvedReportId || reportId} />
          </section>
        </div>
      )}

      {activeTab === 'print' && (
        <div className="bg-white dark:bg-gray-800 rounded-b-lg border border-gray-200 dark:border-gray-700 border-t-0 p-6">
          <HighlightReportPrintView
            report={report}
            products={products}
            risks={risks}
            issues={issues}
            tolerances={tolerances}
          />
        </div>
      )}
    </div>
  )
}
