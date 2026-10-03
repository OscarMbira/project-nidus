/**
 * PM Quick Actions widget (v982 Phase 5) — extracted verbatim from PMDashboard.jsx's
 * "Quick Actions" section. Static links, no data fetch.
 */
import { Link } from 'react-router-dom'
import { useCurrentProject } from '../../../context/CurrentProjectContext'
import { Calendar, Layers, AlertTriangle, AlertCircle, BarChart3, FileText } from 'lucide-react'

const QUICK_ACTIONS = [
  { label: 'Daily Log', path: '/pm/delivery/daily-log', icon: Calendar },
  { label: 'Work Packages', path: '/pm/delivery/work-packages', icon: Layers },
  { label: 'Risk Register', path: '/pm/controls/risk-register', icon: AlertTriangle },
  { label: 'Issue Register', path: '/pm/controls/issue-register', icon: AlertCircle },
  { label: 'Checkpoint Reports', path: '/pm/reporting/checkpoint-reports', icon: BarChart3 },
  { label: 'Highlight Reports', path: '/pm/reporting/highlight-reports', icon: FileText },
]

export default function PmQuickActionsWidget() {
  const { currentProjectId, currentProject } = useCurrentProject()
  const currentProjectKey = currentProject?.projectCode || currentProjectId
  const withProject = (path) => (currentProjectKey ? `${path}?projectId=${encodeURIComponent(currentProjectKey)}` : path)

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Quick Actions</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {QUICK_ACTIONS.map((action) => {
          const Icon = action.icon
          return (
            <Link
              key={action.label}
              to={withProject(action.path)}
              className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              <Icon className="h-4 w-4 text-gray-500 dark:text-gray-400" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{action.label}</span>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
