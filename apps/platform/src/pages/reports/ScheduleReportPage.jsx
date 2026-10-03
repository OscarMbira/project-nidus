/**
 * Schedule Report (taxonomy §3, Reports > Schedule Report). New dedicated report page —
 * combines the existing Milestones and Tasks registers into one exportable schedule snapshot.
 * No new tables; thin wrapper over existing services (rule 66 — one Promise.all, no
 * sequential waterfall).
 */
import { useState, useEffect, useCallback, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Calendar } from 'lucide-react'
import toast from 'react-hot-toast'
import ExportListMenu from '@nidus/ui/ExportListMenu'
import DashboardStatCard from '../../components/ui/DashboardStatCard'
import { usePlatformProjectId } from '@nidus/shared/hooks/usePlatformProjectId.js'
import { listMilestones, getMilestoneSummary } from '../../services/milestoneService'
import { getTasksByProject } from '../../services/taskService'

const REPORT_COLUMNS = [
  { key: 'type', label: 'Type' },
  { key: 'name', label: 'Name' },
  { key: 'status', label: 'Status' },
  { key: 'dueDate', label: 'Due Date' },
]

function formatDate(value) {
  if (!value) return '—'
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString()
}

export default function ScheduleReportPage() {
  const { projectId, routeKey } = usePlatformProjectId()
  const [milestones, setMilestones] = useState([])
  const [tasks, setTasks] = useState([])
  const [milestoneSummary, setMilestoneSummary] = useState(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!projectId) { setLoading(false); return }
    setLoading(true)
    try {
      const [msRes, tasksRes, summary] = await Promise.all([
        listMilestones(projectId),
        getTasksByProject(projectId),
        getMilestoneSummary(projectId),
      ])
      setMilestones(msRes.success ? msRes.data : [])
      setTasks(tasksRes.success ? tasksRes.data : [])
      setMilestoneSummary(summary)
    } catch (e) {
      toast.error(e?.message || 'Failed to load schedule report')
    } finally {
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => { load() }, [load])

  const projectSuffix = routeKey ? `?projectId=${encodeURIComponent(routeKey)}` : ''

  const rows = useMemo(() => [
    ...milestones.map((m) => ({ type: 'Milestone', name: m.milestone_name, status: m.status, dueDate: formatDate(m.target_date) })),
    ...tasks.map((t) => ({ type: 'Task', name: t.task_name, status: t.task_statuses?.status_name || '—', dueDate: formatDate(t.due_date) })),
  ], [milestones, tasks])

  const openTasks = tasks.filter((t) => (t.percentage_complete ?? 0) < 100).length

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
                <Calendar className="h-5 w-5 text-emerald-600 dark:text-emerald-400" /> Schedule Report
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">Milestones and tasks with status and due dates</p>
            </div>
          </div>
          <ExportListMenu columns={REPORT_COLUMNS} data={rows} baseFilename="Schedule_Report" disabled={rows.length === 0} />
        </div>

        {loading ? (
          <p className="text-gray-500 dark:text-gray-400">Loading…</p>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <DashboardStatCard label="Milestones" value={milestoneSummary?.total ?? milestones.length} />
              <DashboardStatCard label="Achieved" value={milestoneSummary?.achieved ?? 0} />
              <DashboardStatCard label="At Risk / Missed" value={(milestoneSummary?.at_risk ?? 0) + (milestoneSummary?.missed ?? 0)} />
              <DashboardStatCard label="Open Tasks" value={openTasks} />
            </div>

            <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-800">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-100 dark:bg-gray-800">
                  <tr>
                    <th className="px-4 py-2 text-left">Type</th>
                    <th className="px-4 py-2 text-left">Name</th>
                    <th className="px-4 py-2 text-left">Status</th>
                    <th className="px-4 py-2 text-left">Due Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {rows.length === 0 ? (
                    <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">No milestones or tasks yet.</td></tr>
                  ) : rows.map((row, idx) => (
                    <tr key={`${row.type}-${idx}`}>
                      <td className="px-4 py-2 text-gray-500 dark:text-gray-400">{row.type}</td>
                      <td className="px-4 py-2 font-medium">{row.name || '—'}</td>
                      <td className="px-4 py-2">{row.status || '—'}</td>
                      <td className="px-4 py-2">{row.dueDate}</td>
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
