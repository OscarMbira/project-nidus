/**
 * Weekly timesheet period detail — Simulator mirror (v963 Phase 19, GAP-13).
 * See apps/platform/src/pages/timesheetApprovals/TimesheetPeriodDetailPage.jsx.
 * Route: /simulator/tm/timesheets/weekly/:id
 */
import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, CheckCircle, XCircle } from 'lucide-react'
import { simDb } from '@nidus/supabase'
import DetailAuditTabList from '@nidus/ui/DetailAuditTabList'
import AuditDetailsPanel from '@nidus/ui/AuditDetailsPanel'
import AuditCard from '@nidus/ui/AuditCard'
import AuditField from '@nidus/ui/AuditField'
import AuditTimestampPair from '@nidus/ui/AuditTimestampPair'
import { humanizeAuditToken, resolveAuditUserLabels } from '@nidus/shared/utils/auditDisplayUtils'
import {
  getWeeklyTimesheet,
  listWeeklyTimesheetEntries,
  listApprovalHistory,
  decideWeeklyTimesheet,
} from '../../services/timesheetPeriodService'

export default function TimesheetPeriodDetailPage() {
  const { id } = useParams()
  const [row, setRow] = useState(null)
  const [entries, setEntries] = useState([])
  const [approvals, setApprovals] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [activeTab, setActiveTab] = useState('details')
  const [auditUserLabels, setAuditUserLabels] = useState({})
  const [approverId, setApproverId] = useState(null)
  const [comment, setComment] = useState('')
  const [deciding, setDeciding] = useState(false)

  useEffect(() => {
    simDb.auth.getUser().then(({ data }) => setApproverId(data?.user?.id || null))
  }, [])

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const [ts, entryRows, approvalRows] = await Promise.all([
        getWeeklyTimesheet(id),
        listWeeklyTimesheetEntries(id),
        listApprovalHistory(id),
      ])
      setRow(ts)
      setEntries(entryRows)
      setApprovals(approvalRows)
    } catch (e) {
      setError(e?.message || 'Failed to load timesheet')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [id])

  useEffect(() => {
    if (activeTab !== 'audit' || !row) return
    ;(async () => {
      const labels = await resolveAuditUserLabels(simDb, [row.user_id, ...approvals.map((a) => a.approver_user_id)])
      setAuditUserLabels(labels)
    })()
  }, [activeTab, row, approvals])

  const canDecide = row && ['submitted', 'under_review'].includes(row.approval_status)

  const handleDecide = async (decision) => {
    if (!comment.trim()) return
    setDeciding(true)
    try {
      await decideWeeklyTimesheet(id, approverId, decision, comment.trim())
      setComment('')
      await load()
    } catch (e) {
      setError(e?.message || 'Failed to record decision')
    } finally {
      setDeciding(false)
    }
  }

  if (loading) return <div className="p-8 text-gray-600 dark:text-gray-400">Loading…</div>
  if (error || !row) return <div className="p-8 text-red-600 dark:text-red-400">{error || 'Not found'}</div>

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <button onClick={() => navigate(-1)} className="inline-flex items-center gap-2 text-gray-600 dark:text-gray-400 mb-6">
        <ArrowLeft className="h-4 w-4" /> Back to Timesheet Approvals
      </button>

      <div className="flex flex-wrap justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {row.week_start_date} → {row.week_end_date}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{row.total_hours}h total</p>
        </div>
        <span className="inline-flex px-3 py-1 h-fit rounded-full text-sm font-medium capitalize bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200">
          {row.approval_status.replace(/_/g, ' ')}
        </span>
      </div>

      <div className="mb-4">
        <DetailAuditTabList activeTab={activeTab} onChange={setActiveTab} />
      </div>

      {activeTab === 'audit' ? (
        <AuditDetailsPanel description="Who this weekly timesheet belongs to, and its approval history.">
          <AuditCard title="Identity" description="Which project, user, and week this period covers.">
            <AuditField label="Project" value={row.project_id} />
            <AuditField label="User" value={auditUserLabels[row.user_id] || row.user_id} />
            <AuditField label="Week" value={`${row.week_start_date} → ${row.week_end_date}`} />
          </AuditCard>
          <AuditCard title="Classification" description="Status and totals.">
            <AuditField label="Status" value={humanizeAuditToken(row.approval_status)} />
            <AuditField label="Total hours" value={row.total_hours} />
          </AuditCard>
          <AuditCard title="Record history" description="When this period was created, submitted, and decided.">
            <AuditTimestampPair dateLabel="Created at" value={row.created_at} />
            <AuditTimestampPair dateLabel="Submitted at" value={row.submitted_at} />
            <AuditTimestampPair dateLabel="Last updated" value={row.updated_at} />
            {approvals.map((a) => (
              <AuditField
                key={a.id}
                label={`${humanizeAuditToken(a.approval_status)} by`}
                value={`${auditUserLabels[a.approver_user_id] || a.approver_user_id} — ${a.approval_comment || 'no comment'}`}
              />
            ))}
          </AuditCard>
        </AuditDetailsPanel>
      ) : (
        <>
          {entries.length === 0 ? (
            <p className="text-gray-500 dark:text-gray-400">No entries linked to this period.</p>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700 mb-6">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700/50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Date</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Category</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Hours</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Description</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {entries.map((e) => (
                    <tr key={e.id}>
                      <td className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300">{e.entry_date}</td>
                      <td className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 capitalize">{e.work_category}</td>
                      <td className="px-4 py-2 text-sm font-medium text-gray-900 dark:text-gray-100">{e.hours_worked}h</td>
                      <td className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">{e.description || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {canDecide && (
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">Decision</h2>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Comment (required before Approve/Reject can be confirmed)…"
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 mb-3"
                rows={3}
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => handleDecide('approved')}
                  disabled={!comment.trim() || deciding}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 px-4 py-2 text-sm text-white"
                >
                  <CheckCircle className="h-4 w-4" /> Approve
                </button>
                <button
                  type="button"
                  onClick={() => handleDecide('rejected')}
                  disabled={!comment.trim() || deciding}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 hover:bg-red-700 disabled:opacity-50 px-4 py-2 text-sm text-white"
                >
                  <XCircle className="h-4 w-4" /> Reject
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
