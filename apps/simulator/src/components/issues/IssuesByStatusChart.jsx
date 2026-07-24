/**
 * Issues By Status Chart Component
 * Displays a chart showing issues grouped by status
 */

import { useState, useEffect } from 'react'
import { supabase } from '../../services/supabaseClient'

const STATUS_COLORS = {
  open: '#3B82F6',       // blue
  pending: '#F59E0B',    // amber
  in_progress: '#8B5CF6', // purple
  escalated: '#EF4444',  // red
  resolved: '#10B981',   // green
  closed: '#6B7280'      // gray
}

export default function IssuesByStatusChart({ projectId }) {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)

  useEffect(() => {
    if (projectId) {
      fetchData()
    }
  }, [projectId])

  const fetchData = async () => {
    try {
      setLoading(true)
      const { data: issues, error } = await supabase
        .from('issues')
        .select('status')
        .eq('project_id', projectId)
        .eq('is_deleted', false)

      if (error) throw error

      // Count by status
      const counts = {}
      issues?.forEach(issue => {
        const status = issue.status || 'open'
        counts[status] = (counts[status] || 0) + 1
      })

      const chartData = Object.entries(counts).map(([status, count]) => ({
        status,
        count,
        color: STATUS_COLORS[status] || '#6B7280'
      }))

      setData(chartData)
      setTotal(issues?.length || 0)
    } catch (error) {
      console.error('Error fetching issues by status:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatLabel = (status) => {
    return status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())
  }

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-4"></div>
          <div className="h-40 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        Issues by Status
      </h3>

      {data.length === 0 ? (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          No issues found
        </div>
      ) : (
        <div className="space-y-4">
          {/* Bar chart */}
          <div className="space-y-3">
            {data.map(item => (
              <div key={item.status} className="flex items-center gap-3">
                <div className="w-24 text-sm text-gray-600 dark:text-gray-400 truncate">
                  {formatLabel(item.status)}
                </div>
                <div className="flex-1 h-6 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${total > 0 ? (item.count / total) * 100 : 0}%`,
                      backgroundColor: item.color
                    }}
                  />
                </div>
                <div className="w-12 text-right text-sm font-medium text-gray-900 dark:text-white">
                  {item.count}
                </div>
              </div>
            ))}
          </div>

          {/* Legend */}
          <div className="flex flex-wrap gap-4 mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            {data.map(item => (
              <div key={item.status} className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-xs text-gray-600 dark:text-gray-400">
                  {formatLabel(item.status)} ({item.count})
                </span>
              </div>
            ))}
          </div>

          <div className="text-center text-sm text-gray-500 dark:text-gray-400 mt-2">
            Total: {total} issues
          </div>
        </div>
      )}
    </div>
  )
}
