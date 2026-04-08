/**
 * Issues By Priority Chart Component
 * Visualizes issue distribution by priority
 */

import { useState, useEffect } from 'react'
import { BarChart3 } from 'lucide-react'
import { getIssuesByPriority } from '../../services/issueAnalyticsService'

export default function IssuesByPriorityChart({ projectId }) {
  const [data, setData] = useState({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (projectId) {
      loadData()
    }
  }, [projectId])

  const loadData = async () => {
    try {
      setLoading(true)
      const result = await getIssuesByPriority(projectId)
      setData(result || { critical: 0, high: 0, medium: 0, low: 0 })
    } catch (error) {
      console.error('Error loading issues by priority:', error)
      setData({ critical: 0, high: 0, medium: 0, low: 0 })
    } finally {
      setLoading(false)
    }
  }

  const priorityLabels = {
    critical: 'Critical',
    high: 'High',
    medium: 'Medium',
    low: 'Low'
  }

  const priorityColors = {
    critical: 'bg-red-600',
    high: 'bg-orange-500',
    medium: 'bg-yellow-500',
    low: 'bg-green-500'
  }

  const priorityOrder = ['critical', 'high', 'medium', 'low']

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    )
  }

  const total = Object.values(data).reduce((sum, count) => sum + count, 0)
  const maxValue = Math.max(...Object.values(data), 0)

  if (total === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          Issues by Priority
        </h3>
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
          <p>No issues yet</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
        <BarChart3 className="h-5 w-5" />
        Issues by Priority
      </h3>

      <div className="space-y-3">
        {priorityOrder.map(priority => {
          const count = data[priority] || 0
          const percentage = maxValue > 0 ? ((count / maxValue) * 100) : 0
          return (
            <div key={priority} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-700 dark:text-gray-300">
                  {priorityLabels[priority] || priority}
                </span>
                <span className="font-semibold text-gray-900 dark:text-white">{count}</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-6 overflow-hidden">
                <div
                  className={`h-full ${priorityColors[priority] || 'bg-gray-500'} transition-all duration-500`}
                  style={{ width: `${percentage}%` }}
                >
                  <div className="h-full flex items-center justify-end px-2">
                    {count > 0 && (
                      <span className="text-xs text-white font-medium">{count}</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
