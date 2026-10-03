/**
 * Executive Report (taxonomy §3, Reports > Executive Report). New dedicated report page — a
 * flat KPI summary (budget/cost performance, schedule performance via EVM, change and risk
 * counts) built purpose-specific for this menu item rather than reusing the org-wide Executive
 * Dashboard or the existing AnalyticsExecutive.jsx page. No new tables; thin wrapper over
 * existing services (rule 66 — one Promise.all, no sequential waterfall).
 */
import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, BarChart3, FileText, FileSpreadsheet, Presentation } from 'lucide-react'
import toast from 'react-hot-toast'
import { exportRecordToWord, exportRecordToExcel, exportRecordToPPT } from '@nidus/shared/utils/exportUtils'
import { usePlatformProjectId } from '@nidus/shared/hooks/usePlatformProjectId.js'
import { getProjectDetail } from '../../services/projectService'
import { getMilestoneSummary } from '../../services/milestoneService'
import { getRisksByProject } from '../../services/riskService'
import { getChangeManagementStats } from '../../services/changeManagementService'
import { listEvmSnapshots, computeEvmMetrics } from '../../services/evmService'

const EXPORT_SECTIONS = [
  { title: 'Project Overview', fields: [
    { key: 'projectName', label: 'Project' },
    { key: 'projectCode', label: 'Project Code' },
    { key: 'status', label: 'Status' },
    { key: 'percentComplete', label: '% Complete' },
  ]},
  { title: 'Budget & Cost Performance', fields: [
    { key: 'budget', label: 'Budget' },
    { key: 'actualCost', label: 'Actual Cost' },
    { key: 'costVariance', label: 'Cost Variance (CV)' },
    { key: 'cpi', label: 'Cost Performance Index (CPI)' },
  ]},
  { title: 'Schedule Performance', fields: [
    { key: 'scheduleVariance', label: 'Schedule Variance (SV)' },
    { key: 'spi', label: 'Schedule Performance Index (SPI)' },
    { key: 'milestonesAchieved', label: 'Milestones Achieved' },
    { key: 'milestonesAtRisk', label: 'Milestones At Risk / Missed' },
  ]},
  { title: 'Risk & Change Summary', fields: [
    { key: 'openRisks', label: 'Open Risks' },
    { key: 'highRisks', label: 'High-Score Risks' },
    { key: 'totalChangeRequests', label: 'Total Change Requests' },
    { key: 'pendingChangeApproval', label: 'Pending Approval' },
  ]},
]

function fmtMoney(n) {
  if (n == null || Number.isNaN(Number(n))) return '—'
  return Number(n).toLocaleString(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })
}
function fmtNum(n, digits = 2) {
  if (n == null || Number.isNaN(Number(n))) return '—'
  return Number(n).toFixed(digits)
}

export default function ExecutiveReportPage() {
  const { projectId, routeKey } = usePlatformProjectId()
  const [record, setRecord] = useState(null)
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)

  const load = useCallback(async () => {
    if (!projectId) { setLoading(false); return }
    setLoading(true)
    try {
      const [projectRes, milestoneSummary, risksRes, changeStats, snapshots] = await Promise.all([
        getProjectDetail(projectId),
        getMilestoneSummary(projectId),
        getRisksByProject(projectId),
        getChangeManagementStats(projectId).catch(() => null),
        listEvmSnapshots(projectId).catch(() => []),
      ])

      const project = projectRes.success ? projectRes.data : null
      const risks = risksRes?.data || []
      const latestSnapshot = snapshots.length > 0 ? snapshots[snapshots.length - 1] : null
      const evm = latestSnapshot ? computeEvmMetrics(latestSnapshot, project?.budget_amount) : null

      setRecord({
        projectName: project?.project_name || '—',
        projectCode: project?.project_code || '—',
        status: project?.project_statuses?.status_name || '—',
        percentComplete: project?.percentage_complete != null ? `${project.percentage_complete}%` : '—',
        budget: fmtMoney(project?.budget_amount),
        actualCost: fmtMoney(project?.actual_cost),
        costVariance: evm ? fmtMoney(evm.cv) : '—',
        cpi: evm ? fmtNum(evm.cpi) : '—',
        scheduleVariance: evm ? fmtMoney(evm.sv) : '—',
        spi: evm ? fmtNum(evm.spi) : '—',
        milestonesAchieved: milestoneSummary ? `${milestoneSummary.achieved || 0} / ${milestoneSummary.total || 0}` : '—',
        milestonesAtRisk: milestoneSummary ? `${(milestoneSummary.at_risk || 0) + (milestoneSummary.missed || 0)}` : '—',
        openRisks: risks.filter((r) => !['closed', 'resolved'].includes(r.status_enum || r.status)).length,
        highRisks: risks.filter((r) => Number(r.pre_risk_score) >= 15).length,
        totalChangeRequests: changeStats?.totalRequests ?? '—',
        pendingChangeApproval: changeStats?.pendingApproval ?? '—',
      })
    } catch (e) {
      toast.error(e?.message || 'Failed to load executive report')
    } finally {
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => { load() }, [load])

  const projectSuffix = routeKey ? `?projectId=${encodeURIComponent(routeKey)}` : ''

  const runExport = async (fn) => {
    if (!record) return
    setExporting(true)
    try {
      await fn(EXPORT_SECTIONS, record, 'Executive_Report')
    } catch (e) {
      toast.error(e?.message || 'Export failed')
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 p-4 md:p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <Link to={`/platform/reports${projectSuffix}`} className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div>
              <h1 className="text-xl font-bold flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-purple-600 dark:text-purple-400" /> Executive Report
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">Budget, schedule, risk, and change performance at a glance</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button type="button" disabled={exporting || !record} onClick={() => runExport(exportRecordToWord)} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50">
              <FileText className="h-4 w-4" /> Word
            </button>
            <button type="button" disabled={exporting || !record} onClick={() => runExport(async (s, r, f) => exportRecordToExcel(s, r, f))} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50">
              <FileSpreadsheet className="h-4 w-4" /> Excel
            </button>
            <button type="button" disabled={exporting || !record} onClick={() => runExport(exportRecordToPPT)} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50">
              <Presentation className="h-4 w-4" /> PowerPoint
            </button>
          </div>
        </div>

        {loading || !record ? (
          <p className="text-gray-500 dark:text-gray-400">{loading ? 'Loading…' : 'No data available for this project yet.'}</p>
        ) : (
          <div className="space-y-6">
            {EXPORT_SECTIONS.map((section) => (
              <div key={section.title} className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
                <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">{section.title}</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {section.fields.map((field) => (
                    <div key={field.key}>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{field.label}</p>
                      <p className="text-lg font-bold">{record[field.key]}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
