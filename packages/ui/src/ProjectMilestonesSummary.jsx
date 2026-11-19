/**
 * Read-only list of a project's milestones from the Milestones register (v1344 A5) — used by the
 * Project Brief / Charter "Milestones" tab in both apps. The register stays the only place to
 * edit milestones; this shows them with a link to manage them.
 *
 * @param {{ projectId: string|null, loadMilestones: (projectId: string) => Promise<{success: boolean, data: object[], error?: string}>,
 *   manageHref?: string|null, formatDate?: (v: string) => string }} props
 */
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Flag } from 'lucide-react'
import { getDisplayRowNumber } from '@nidus/shared/utils/tableRowNumberUtils'
import { TableRowNumberHeader, TableRowNumberCell } from './Table.jsx'

const STATUS_STYLES = {
  planned: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200',
  at_risk: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
  achieved: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300',
  missed: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
  slipped: 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300',
}
const defaultDate = (v) => (v ? new Date(v).toLocaleDateString() : '—')
const label = (v) => (v ? String(v).replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase()) : '—')

export default function ProjectMilestonesSummary({ projectId, loadMilestones, manageHref = null, formatDate = defaultDate }) {
  const [state, setState] = useState({ key: null, rows: [], error: '' })

  useEffect(() => {
    if (!projectId) return undefined
    let cancelled = false
    loadMilestones(projectId)
      .then((res) => {
        if (cancelled) return
        if (res?.success === false) setState({ key: projectId, rows: [], error: res.error || 'Could not load milestones' })
        else setState({ key: projectId, rows: res?.data || [], error: '' })
      })
      .catch((e) => { if (!cancelled) setState({ key: projectId, rows: [], error: e?.message || 'Could not load milestones' }) })
    return () => { cancelled = true }
  }, [projectId, loadMilestones])

  const loading = projectId && state.key !== projectId

  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <Flag className="h-5 w-5 text-blue-600 dark:text-blue-400" /> High-level milestones
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">From the project's Milestones register. Edit them there; the brief always shows the current list.</p>
        </div>
        {manageHref && (
          <Link to={manageHref} className="self-start px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700">
            Manage milestones
          </Link>
        )}
      </div>
      {!projectId && <p className="text-sm text-gray-500 dark:text-gray-400">Link the brief to a project to see its milestones.</p>}
      {projectId && loading && <p className="text-sm text-gray-500 dark:text-gray-400">Loading milestones…</p>}
      {state.error && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{state.error}</p>}
      {projectId && !loading && !state.error && state.rows.length === 0 && (
        <p className="text-sm text-gray-500 dark:text-gray-400">No milestones recorded for this project yet.</p>
      )}
      {state.rows.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 text-sm">
            <thead className="bg-gray-50 dark:bg-gray-700/50 text-xs uppercase text-gray-500 dark:text-gray-400">
              <tr>
                <TableRowNumberHeader />
                <th className="px-4 py-2 text-left">Milestone</th>
                <th className="px-4 py-2 text-left">Target</th>
                <th className="px-4 py-2 text-left">Forecast</th>
                <th className="px-4 py-2 text-left">Status</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700 text-gray-800 dark:text-gray-200">
              {state.rows.map((m, i) => (
                <tr key={m.id}>
                  <TableRowNumberCell number={getDisplayRowNumber(i)} />
                  <td className="px-4 py-2">{m.milestone_name}</td>
                  <td className="px-4 py-2">{formatDate(m.target_date)}</td>
                  <td className="px-4 py-2">{m.forecast_date ? formatDate(m.forecast_date) : '—'}</td>
                  <td className="px-4 py-2">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[m.status] || STATUS_STYLES.planned}`}>
                      {label(m.status)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
