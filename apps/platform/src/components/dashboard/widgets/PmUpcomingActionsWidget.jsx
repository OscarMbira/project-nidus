/**
 * PM Upcoming Actions widget (v982 Phase 5) — extracted verbatim from PMDashboard.jsx's
 * "Upcoming Actions" (governance actions) section.
 */
import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useCurrentProject } from '../../../lib/CurrentProjectContext'
import { getGovernanceActions } from '../../../services/governanceActionService'
import { ListTodo } from 'lucide-react'

export default function PmUpcomingActionsWidget() {
  const { currentProjectId } = useCurrentProject()
  const [actions, setActions] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!currentProjectId) {
      setActions([])
      setLoading(false)
      return
    }
    let cancelled = false
    ;(async () => {
      setLoading(true)
      const result = await getGovernanceActions({ projectId: currentProjectId, status: 'pending', limit: 5 })
      if (!cancelled) {
        setActions(result || [])
        setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [currentProjectId])

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        <ListTodo className="h-5 w-5 inline-block mr-2 text-blue-600 dark:text-blue-400" />
        Upcoming Actions
      </h2>
      {loading ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">Loading…</p>
      ) : actions.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">No pending governance actions for this project.</p>
      ) : (
        <ul className="divide-y divide-gray-100 dark:divide-gray-700">
          {actions.map((a) => (
            <li key={`${a.action_type}-${a.action_id}`} className="flex items-center justify-between py-2 gap-3">
              {a.view_path ? (
                <Link to={a.view_path} className="text-sm text-gray-700 dark:text-gray-300 hover:underline truncate">
                  {a.record_label}
                </Link>
              ) : (
                <span className="text-sm text-gray-700 dark:text-gray-300 truncate">{a.record_label}</span>
              )}
              <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">{a.due_date || a.action_type_label}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
