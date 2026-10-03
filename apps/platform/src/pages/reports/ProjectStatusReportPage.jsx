/**
 * Project Status Report (taxonomy §3, Reports > Project Status Report). New dedicated report
 * page — rolls up project overview, milestones, top risks, open issues, and recent changes
 * from their existing registers into one exportable snapshot. No new tables; thin wrapper over
 * existing services (rule 66 — one Promise.all, no sequential waterfall).
 */
import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, FileText } from 'lucide-react'
import toast from 'react-hot-toast'
import ExportListMenu from '@nidus/ui/ExportListMenu'
import DashboardStatCard from '../../components/ui/DashboardStatCard'
import { usePlatformProjectId } from '@nidus/shared/hooks/usePlatformProjectId.js'
import { getProjectDetail } from '../../services/projectService'
import { getMilestoneSummary, getUpcomingMilestones } from '../../services/milestoneService'
import { getRisksByProject } from '../../services/riskService'
import { getIssueRegisterByProject } from '../../services/issueRegisterService'
import { getOpenIssues } from '../../services/issueService'
import { fetchChangeRequests } from '../../services/changeManagementService'

const REPORT_COLUMNS = [
  { key: 'type', label: 'Type' },
  { key: 'title', label: 'Title' },
  { key: 'status', label: 'Status' },
  { key: 'date', label: 'Date' },
]

function formatDate(value) {
  if (!value) return '—'
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString()
}

export default function ProjectStatusReportPage() {
  const { projectId, routeKey } = usePlatformProjectId()
  const [project, setProject] = useState(null)
  const [milestoneSummary, setMilestoneSummary] = useState(null)
  const [upcomingMilestones, setUpcomingMilestones] = useState([])
  const [topRisks, setTopRisks] = useState([])
  const [openIssues, setOpenIssues] = useState([])
  const [recentChanges, setRecentChanges] = useState([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!projectId) { setLoading(false); return }
    setLoading(true)
    try {
      const [projectRes, msSummary, upcomingMs, risksRes, register, changes] = await Promise.all([
        getProjectDetail(projectId),
        getMilestoneSummary(projectId),
        getUpcomingMilestones(projectId, 5),
        getRisksByProject(projectId, { orderBy: 'pre_expected_value', ascending: false }),
        getIssueRegisterByProject(projectId).catch(() => null),
        fetchChangeRequests(projectId).catch(() => []),
      ])

      if (projectRes.success) setProject(projectRes.data)
      setMilestoneSummary(msSummary)
      setUpcomingMilestones(Array.isArray(upcomingMs) ? upcomingMs : [])
      setTopRisks((risksRes?.data || []).slice(0, 5))
      setRecentChanges((changes || []).slice(0, 5))

      if (register?.id) {
        const issues = await getOpenIssues(register.id).catch(() => [])
        setOpenIssues(issues.slice(0, 5))
      } else {
        setOpenIssues([])
      }
    } catch (e) {
      toast.error(e?.message || 'Failed to load project status report')
    } finally {
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => { load() }, [load])

  const projectSuffix = routeKey ? `?projectId=${encodeURIComponent(routeKey)}` : ''

  const reportRows = [
    ...upcomingMilestones.map((m) => ({ type: 'Milestone', title: m.milestone_name, status: m.status, date: formatDate(m.target_date) })),
    ...topRisks.map((r) => ({ type: 'Risk', title: r.risk_title, status: r.status_enum || r.status, date: r.pre_risk_score != null ? `Score ${r.pre_risk_score}` : '—' })),
    ...openIssues.map((i) => ({ type: 'Issue', title: i.issue_title, status: i.status, date: formatDate(i.date_raised) })),
    ...recentChanges.map((c) => ({ type: 'Change', title: c.change_title, status: c.status, date: formatDate(c.submission_date) })),
  ]

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 p-4 md:p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link to={`/platform/reports${projectSuffix}`} className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div>
              <h1 className="text-xl font-bold flex items-center gap-2">
                <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400" /> Project Status Report
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">Overview, milestones, top risks, open issues, and recent changes</p>
            </div>
          </div>
          <ExportListMenu columns={REPORT_COLUMNS} data={reportRows} baseFilename="Project_Status_Report" disabled={reportRows.length === 0} />
        </div>

        {loading ? (
          <p className="text-gray-500 dark:text-gray-400">Loading…</p>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <DashboardStatCard label="Project" value={project?.project_name || '—'} description={project?.project_code || ''} accentClassName="text-gray-900 dark:text-white truncate" />
              <DashboardStatCard label="Status" value={project?.project_statuses?.status_name || '—'} />
              <DashboardStatCard label="% Complete" value={project?.percentage_complete != null ? `${project.percentage_complete}%` : '—'} />
              <DashboardStatCard label="Milestones Achieved" value={milestoneSummary ? `${milestoneSummary.achieved || 0} / ${milestoneSummary.total || 0}` : '—'} />
            </div>

            <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-800">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-100 dark:bg-gray-800">
                  <tr>
                    <th className="px-4 py-2 text-left">Type</th>
                    <th className="px-4 py-2 text-left">Title</th>
                    <th className="px-4 py-2 text-left">Status</th>
                    <th className="px-4 py-2 text-left">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {reportRows.length === 0 ? (
                    <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">No status items to report yet.</td></tr>
                  ) : reportRows.map((row, idx) => (
                    <tr key={`${row.type}-${idx}`}>
                      <td className="px-4 py-2 text-gray-500 dark:text-gray-400">{row.type}</td>
                      <td className="px-4 py-2 font-medium">{row.title || '—'}</td>
                      <td className="px-4 py-2">{row.status || '—'}</td>
                      <td className="px-4 py-2">{row.date}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
