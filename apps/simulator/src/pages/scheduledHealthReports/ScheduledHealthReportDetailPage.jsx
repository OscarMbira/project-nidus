/**
 * Scheduled Health Report — detail + run history (v963 Phase 20, GAP-23, Simulator port).
 * Simulator mirror of apps/platform/src/pages/scheduledHealthReports/
 * ScheduledHealthReportDetailPage.jsx. Route: .../reporting/scheduled/:id
 */
import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Play } from 'lucide-react'
import { simDb } from '@nidus/supabase'
import { RowActionButton } from '@nidus/ui'
import DetailAuditTabList from '@nidus/ui/DetailAuditTabList'
import AuditDetailsPanel from '@nidus/ui/AuditDetailsPanel'
import AuditCard from '@nidus/ui/AuditCard'
import AuditField from '@nidus/ui/AuditField'
import AuditTimestampPair from '@nidus/ui/AuditTimestampPair'
import { humanizeAuditToken, resolveAuditUserLabels } from '@nidus/shared/utils/auditDisplayUtils'
import { getSchedule, listRuns, runScheduleNow } from '../../services/scheduledHealthReportService'

export default function ScheduledHealthReportDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const listPath = location.pathname.replace(/\/[^/]+$/, '')

  const [row, setRow] = useState(null)
  const [runs, setRuns] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [activeTab, setActiveTab] = useState('details')
  const [auditUserLabels, setAuditUserLabels] = useState({})
  const [running, setRunning] = useState(false)

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const [schedule, runRows] = await Promise.all([getSchedule(id), listRuns(id)])
      setRow(schedule)
      setRuns(runRows)
    } catch (e) {
      setError(e?.message || 'Failed to load schedule')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [id])

  useEffect(() => {
    if (activeTab !== 'audit' || !row) return
    ;(async () => {
      const labels = await resolveAuditUserLabels(simDb, [row.created_by])
      setAuditUserLabels(labels || {})
    })()
  }, [activeTab, row])

  const handleRunNow = async () => {
    setRunning(true)
    try {
      await runScheduleNow(id)
      await load()
    } catch (e) {
      setError(e?.message || 'Run failed')
    } finally {
      setRunning(false)
    }
  }

  if (loading) return <div className="p-8 text-gray-600 dark:text-gray-400">Loading…</div>
  if (error || !row) return <div className="p-8 text-red-600 dark:text-red-400">{error || 'Not found'}</div>

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <button type="button" onClick={() => navigate(listPath)} className="inline-flex items-center gap-2 text-gray-600 dark:text-gray-400 mb-6">
        <ArrowLeft className="h-4 w-4" /> Back to list
      </button>

      <div className="flex flex-wrap justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{row.schedule_name}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 capitalize">{row.frequency} · {row.is_active ? 'Active' : 'Inactive'}</p>
        </div>
        <div className="flex gap-2">
          <RowActionButton variant="edit" label="Edit schedule" onClick={() => navigate(`${listPath}/${id}/edit`)} />
          <button
            type="button"
            onClick={handleRunNow}
            disabled={running}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm disabled:opacity-50"
          >
            <Play className="h-4 w-4" /> Run Now
          </button>
        </div>
      </div>

      <div className="mb-4">
        <DetailAuditTabList activeTab={activeTab} onChange={setActiveTab} />
      </div>

      {activeTab === 'audit' ? (
        <AuditDetailsPanel description="How this schedule is configured and tracked.">
          <AuditCard title="Identity" description="Name and scope of this schedule.">
            <AuditField label="Schedule name" value={row.schedule_name} />
            <AuditField label="Project" value={row.project_id} />
          </AuditCard>
          <AuditCard title="Classification" description="Frequency and recipients.">
            <AuditField label="Frequency" value={humanizeAuditToken(row.frequency)} />
            <AuditField label="Recipients" value={(row.recipient_emails || []).join(', ')} />
            <AuditField label="Next run" value={row.next_run_at} />
          </AuditCard>
          <AuditCard title="Record history" description="When this schedule was created and last changed.">
            <AuditField label="Created by" value={row.created_by ? auditUserLabels[row.created_by] || null : null} />
            <AuditTimestampPair dateLabel="Created at" value={row.created_at} />
            <AuditTimestampPair dateLabel="Last updated" value={row.updated_at} />
          </AuditCard>
        </AuditDetailsPanel>
      ) : (
        <div>
          <h2 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">Run history</h2>
          {runs.length === 0 ? (
            <p className="text-gray-500 dark:text-gray-400">No runs recorded yet.</p>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700/50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Status</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Sent at</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Error</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {runs.map((r) => (
                    <tr key={r.id}>
                      <td className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 capitalize">{r.run_status}</td>
                      <td className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300">{r.sent_at ? new Date(r.sent_at).toLocaleString() : '—'}</td>
                      <td className="px-4 py-2 text-sm text-red-500">{r.error_message || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
