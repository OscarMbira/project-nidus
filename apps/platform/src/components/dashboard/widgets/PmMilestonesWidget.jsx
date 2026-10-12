/**
 * PM Milestones widget (v982 Phase 5) — extracted from PMDashboard.jsx's "Upcoming Deadlines" +
 * "Milestone Summary" sections, combined into one widget (both are milestone-derived and sit
 * side-by-side in the original layout; combining avoids splitting one fetch pair into two widgets
 * that would otherwise each re-derive the same data). Content parity with the original — same
 * fields, same links, same empty states.
 */
import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useCurrentProject } from '../../../lib/CurrentProjectContext'
import { fetchProjectMilestones } from '../../../services/ganttService'
import { getMilestoneSummary } from '../../../services/milestoneService'
import { Flag } from 'lucide-react'

const EMPTY_SUMMARY = { total: 0, planned: 0, at_risk: 0, achieved: 0, missed: 0, slipped: 0 }

export default function PmMilestonesWidget() {
  const { currentProjectId, currentProject } = useCurrentProject()
  const [milestones, setMilestones] = useState([])
  const [summary, setSummary] = useState(EMPTY_SUMMARY)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!currentProjectId) {
      setMilestones([])
      setSummary(EMPTY_SUMMARY)
      setLoading(false)
      return
    }
    let cancelled = false
    ;(async () => {
      setLoading(true)
      const [milestonesRes, summaryRes] = await Promise.allSettled([
        fetchProjectMilestones(currentProjectId),
        getMilestoneSummary(currentProjectId),
      ])
      if (cancelled) return
      const today = new Date().toISOString().slice(0, 10)
      setMilestones(
        milestonesRes.status === 'fulfilled'
          ? milestonesRes.value.filter((m) => m.milestone_date >= today).slice(0, 5)
          : [],
      )
      setSummary(
        summaryRes.status === 'fulfilled' && summaryRes.value.success ? summaryRes.value.data : EMPTY_SUMMARY,
      )
      setLoading(false)
    })()
    return () => { cancelled = true }
  }, [currentProjectId])

  const currentProjectKey = currentProject?.projectCode || currentProjectId
  const qs = (extra) => {
    const params = new URLSearchParams(extra)
    if (currentProjectKey) params.set('projectId', currentProjectKey)
    return `?${params.toString()}`
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          <Flag className="h-5 w-5 inline-block mr-2 text-blue-600 dark:text-blue-400" />
          Upcoming Deadlines
        </h2>
        {loading ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">Loading…</p>
        ) : milestones.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">No upcoming milestones for this project.</p>
        ) : (
          <ul className="divide-y divide-gray-100 dark:divide-gray-700">
            {milestones.map((m) => (
              <li key={m.id} className="flex items-center justify-between py-2">
                <span className="text-sm text-gray-700 dark:text-gray-300">{m.milestone_name || m.name || 'Untitled milestone'}</span>
                <span className="text-xs text-gray-500 dark:text-gray-400">{m.milestone_date}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          <Flag className="h-5 w-5 inline-block mr-2 text-blue-600 dark:text-blue-400" />
          Milestone Summary
        </h2>
        <div className="grid grid-cols-3 gap-3">
          <Link to={`/platform/milestones${qs()}`} className="rounded-lg bg-gray-50 dark:bg-gray-700/50 p-3 text-center hover:shadow-sm transition-shadow">
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{loading ? '...' : summary.total}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Total</p>
          </Link>
          <Link to={`/platform/milestones${qs({ status: 'at_risk' })}`} className="rounded-lg bg-amber-50 dark:bg-amber-900/20 p-3 text-center hover:shadow-sm transition-shadow">
            <p className="text-2xl font-bold text-amber-700 dark:text-amber-300">{loading ? '...' : summary.at_risk}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">At Risk</p>
          </Link>
          <Link to={`/platform/milestones${qs({ status: 'achieved' })}`} className="rounded-lg bg-green-50 dark:bg-green-900/20 p-3 text-center hover:shadow-sm transition-shadow">
            <p className="text-2xl font-bold text-green-700 dark:text-green-300">{loading ? '...' : summary.achieved}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Achieved</p>
          </Link>
        </div>
      </div>
    </div>
  )
}
