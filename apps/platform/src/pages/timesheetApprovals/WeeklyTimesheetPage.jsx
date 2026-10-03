/**
 * Weekly Timesheet Submission (v963 Phase 19, GAP-13) — period-level workflow
 * that sits above the existing entry-level TeamTimesheetsPage/timesheetService.js
 * flow (untouched). Aggregates this user's timesheet_entries for the selected
 * week into a `timesheets` row and lets them submit it for approval.
 * Route: /platform/timesheets/weekly
 */
import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Send, RefreshCw, Clock } from 'lucide-react'
import { platformDb } from '@nidus/supabase'
import PlanningProjectBar, { usePlanningProjectId } from '../../components/planning/PlanningProjectBar'
import {
  aggregateWeeklyTimesheet,
  listWeeklyTimesheetEntries,
  submitWeeklyTimesheet,
} from '../../services/timesheetPeriodService'
import { useSuccessModal } from '@nidus/shared/hooks/useSuccessModal'

const STATUS_COLORS = {
  draft: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
  submitted: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  under_review: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  approved: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  rejected: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
}

/** Monday (ISO) of the week containing `date`. */
function mondayOf(date) {
  const d = new Date(date)
  const day = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() - day + 1)
  return d.toISOString().slice(0, 10)
}

export default function WeeklyTimesheetPage() {
  const navigate = useNavigate()
  const projectId = usePlanningProjectId()
  const [userId, setUserId] = useState(null)
  const [weekStart, setWeekStart] = useState(() => mondayOf(new Date()))
  const [timesheet, setTimesheet] = useState(null)
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const { showSuccess, modal: successModal } = useSuccessModal()

  useEffect(() => {
    platformDb.auth.getUser().then(({ data }) => setUserId(data?.user?.id || null))
  }, [])

  const refresh = useCallback(async () => {
    if (!projectId || !userId || !weekStart) return
    setLoading(true)
    setError(null)
    try {
      const ts = await aggregateWeeklyTimesheet(projectId, userId, weekStart)
      setTimesheet(ts)
      const rows = await listWeeklyTimesheetEntries(ts.id)
      setEntries(rows)
    } catch (e) {
      setError(e?.message || 'Failed to load weekly timesheet')
    } finally {
      setLoading(false)
    }
  }, [projectId, userId, weekStart])

  useEffect(() => { refresh() }, [refresh])

  const handleSubmit = async () => {
    if (!timesheet) return
    setLoading(true)
    try {
      const updated = await submitWeeklyTimesheet(timesheet.id)
      setTimesheet(updated)
      showSuccess({
        recordId: `${weekStart} → ${updated.week_end_date}`,
        operation: 'updated',
        message: 'Weekly timesheet submitted for approval.',
      })
    } catch (e) {
      setError(e?.message || 'Failed to submit')
    } finally {
      setLoading(false)
    }
  }

  const canSubmit = timesheet && ['draft', 'rejected'].includes(timesheet.approval_status) && (timesheet.total_hours || 0) > 0

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center gap-3 mb-2">
          <Clock className="h-7 w-7 text-blue-500" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Weekly Timesheet</h1>
        </div>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          Aggregates your logged time entries for the selected week and submits them for approval.
        </p>

        <PlanningProjectBar />

        <div className="flex flex-wrap items-end gap-4 mb-6">
          <label className="block">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Week starting (Monday)</span>
            <input
              type="date"
              value={weekStart}
              onChange={(e) => setWeekStart(mondayOf(e.target.value))}
              className="mt-1 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-gray-900 dark:text-gray-100 min-h-[44px]"
            />
          </label>
          <button
            type="button"
            onClick={refresh}
            disabled={loading || !projectId}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </button>
        </div>

        {error && <p className="text-red-600 dark:text-red-400 mb-4" role="alert">{error}</p>}

        {!projectId ? (
          <p className="text-gray-500 dark:text-gray-400">Select a project to view your weekly timesheet.</p>
        ) : timesheet ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {timesheet.week_start_date} → {timesheet.week_end_date}
                </p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-gray-100">{timesheet.total_hours}h total</p>
              </div>
              <span className={`inline-flex px-3 py-1 rounded-full text-sm font-medium capitalize ${STATUS_COLORS[timesheet.approval_status] || STATUS_COLORS.draft}`}>
                {timesheet.approval_status.replace(/_/g, ' ')}
              </span>
            </div>

            {entries.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400 py-4">No time entries logged for this week yet.</p>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700 mb-4">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-700/50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Date</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Category</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Hours</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {entries.map((e) => (
                      <tr key={e.id}>
                        <td className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300">{e.entry_date}</td>
                        <td className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 capitalize">{e.work_category}</td>
                        <td className="px-4 py-2 text-sm font-medium text-gray-900 dark:text-gray-100">{e.hours_worked}h</td>
                        <td className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400 capitalize">{e.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <button
              type="button"
              onClick={handleSubmit}
              disabled={!canSubmit || loading}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50"
            >
              <Send className="h-4 w-4" /> Submit for Approval
            </button>
            {!canSubmit && timesheet.approval_status === 'draft' && (timesheet.total_hours || 0) === 0 && (
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">Log at least one time entry for this week before submitting.</p>
            )}
          </div>
        ) : (
          <p className="text-gray-500 dark:text-gray-400">Loading…</p>
        )}

        <button
          type="button"
          onClick={() => navigate('/platform/timesheets')}
          className="mt-6 text-sm text-blue-600 dark:text-blue-400 hover:underline"
        >
          Go to My Timesheets (entry-level) →
        </button>
        {successModal}
      </div>
    </div>
  )
}
