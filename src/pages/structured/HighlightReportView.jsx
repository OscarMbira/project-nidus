import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'

import { usePlatformProjectId } from '../../hooks/usePlatformProjectId.js'
import { ArrowLeft, Edit, FileText, Printer } from 'lucide-react'
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
import ExportRecordButtons from '../../components/ui/ExportRecordButtons'
import { exportRecordToExcel, exportRecordToWord, exportRecordToPPT, exportRecordToCSV, exportRecordToXML, exportRecordToJSON, exportRecordToPrint } from '../../utils/exportUtils'

const HIGHLIGHT_VIEW_SECTIONS = [
  { title: 'Document Information', fields: [
    { key: 'document_ref', label: 'Document Ref' },
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

  useEffect(() => {
    if (reportId) loadData()
  }, [reportId])

  const loadData = async () => {
    try {
      setLoading(true)
      const [r, p, rs, is, tol] = await Promise.all([
        getHighlightReportById(reportId),
        getProducts(reportId).catch(() => []),
        getRisks(reportId).catch(() => []),
        getIssues(reportId).catch(() => []),
        getTolerances(reportId).catch(() => [])
      ])
      setReport(r)
      setProducts(p || [])
      setRisks(rs || [])
      setIssues(is || [])
      setTolerances(tol || [])
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
            onClick={() => navigate(`/app/projects/${projectId}/stage-boundaries`)}
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
    { id: 'print', label: 'Print & Export', icon: Printer }
  ]

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-2">
        <button
          onClick={() => navigate(`/app/projects/${projectId}/stage-boundaries`)}
          className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
        >
          <ArrowLeft className="h-5 w-5" />
          Back to Stage Boundaries
        </button>
        <div className="flex items-center gap-2">
          <ExportRecordButtons
            onExportPPT={() => exportRecordToPPT(HIGHLIGHT_VIEW_SECTIONS, report, `Highlight_${report.document_ref || reportId}`)}
            onExportWord={() => exportRecordToWord(HIGHLIGHT_VIEW_SECTIONS, report, `Highlight_${report.document_ref || reportId}`)}
            onExportExcel={() => exportRecordToExcel(HIGHLIGHT_VIEW_SECTIONS, report, `Highlight_${report.document_ref || reportId}`)}
            onExportCSV={() => exportRecordToCSV(HIGHLIGHT_VIEW_SECTIONS, report, `Highlight_${report.document_ref || reportId}`)}
            onExportXML={() => exportRecordToXML(HIGHLIGHT_VIEW_SECTIONS, report, `Highlight_${report.document_ref || reportId}`)}
            onExportJSON={() => exportRecordToJSON(HIGHLIGHT_VIEW_SECTIONS, report, `Highlight_${report.document_ref || reportId}`)}
            onExportPrint={() => exportRecordToPrint(HIGHLIGHT_VIEW_SECTIONS, report, `Highlight_${report.document_ref || reportId}`)}
          />
          {isDraft && (
            <button
              onClick={() => navigate(`/app/projects/${projectId}/highlight-reports/${reportId}/edit`)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
            >
              <Edit className="h-4 w-4" />
              Edit
            </button>
          )}
        </div>
      </div>

      <HighlightReportHeader report={report} />

      <div className="mt-6 flex flex-wrap gap-2 border-b border-gray-200 dark:border-gray-700">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 rounded-t-lg font-medium flex items-center gap-2 ${
              activeTab === tab.id
                ? 'bg-white dark:bg-gray-800 border border-b-0 border-gray-200 dark:border-gray-700 -mb-px text-blue-600 dark:text-blue-400'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <div className="bg-white dark:bg-gray-800 rounded-b-lg border border-gray-200 dark:border-gray-700 border-t-0 p-6 space-y-6">
          <HighlightReportCompletenessIndicator reportId={reportId} />

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
            <HighlightReportRevisionHistory reportId={reportId} />
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
