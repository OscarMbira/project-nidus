/**
 * Issue Heatmap Component
 * Displays a visual heatmap of issues by priority and status
 */

import { useState, useEffect } from 'react'
import { supabase } from '../../services/supabaseClient'

const PRIORITIES = ['critical', 'high', 'medium', 'low']
const STATUSES = ['open', 'pending', 'in_progress', 'escalated', 'resolved', 'closed']

export default function IssueHeatmap({ projectId }) {
  const [data, setData] = useState({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (projectId) {
      fetchHeatmapData()
    }
  }, [projectId])

  const fetchHeatmapData = async () => {
    try {
      setLoading(true)
      const { data: issues, error } = await supabase
        .from('issues')
        .select('priority, status')
        .eq('project_id', projectId)
        .eq('is_deleted', false)

      if (error) throw error

      // Build heatmap data
      const heatmap = {}
      PRIORITIES.forEach(priority => {
        heatmap[priority] = {}
        STATUSES.forEach(status => {
          heatmap[priority][status] = 0
        })
      })

      // Count issues
      issues?.forEach(issue => {
        const priority = issue.priority || 'medium'
        const status = issue.status || 'open'
        if (heatmap[priority] && heatmap[priority][status] !== undefined) {
          heatmap[priority][status]++
        }
      })

      setData(heatmap)
    } catch (error) {
      console.error('Error fetching heatmap data:', error)
    } finally {
      setLoading(false)
    }
  }

  const getIntensity = (count) => {
    if (count === 0) return 'bg-gray-100 dark:bg-gray-700'
    if (count <= 2) return 'bg-blue-100 dark:bg-blue-900/30'
    if (count <= 5) return 'bg-blue-200 dark:bg-blue-800/40'
    if (count <= 10) return 'bg-blue-300 dark:bg-blue-700/50'
    return 'bg-blue-400 dark:bg-blue-600/60'
  }

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'critical': return 'text-red-600 dark:text-red-400'
      case 'high': return 'text-orange-600 dark:text-orange-400'
      case 'medium': return 'text-yellow-600 dark:text-yellow-400'
      case 'low': return 'text-green-600 dark:text-green-400'
      default: return 'text-gray-600 dark:text-gray-400'
    }
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
        Issue Heatmap
      </h3>

      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead>
            <tr>
              <th className="text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider py-2 px-2">
                Priority
              </th>
              {STATUSES.map(status => (
                <th
                  key={status}
                  className="text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider py-2 px-2"
                >
                  {status.replace('_', ' ')}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {PRIORITIES.map(priority => (
              <tr key={priority}>
                <td className={`py-2 px-2 text-sm font-medium capitalize ${getPriorityColor(priority)}`}>
                  {priority}
                </td>
                {STATUSES.map(status => {
                  const count = data[priority]?.[status] || 0
                  return (
                    <td key={status} className="py-2 px-2">
                      <div
                        className={`w-full h-10 rounded flex items-center justify-center text-sm font-medium ${getIntensity(count)} ${
                          count > 0 ? 'text-gray-800 dark:text-gray-200' : 'text-gray-400 dark:text-gray-500'
                        }`}
                        title={`${priority} - ${status}: ${count} issues`}
                      >
                        {count}
                      </div>
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex items-center justify-end gap-4 text-xs text-gray-500 dark:text-gray-400">
        <span>Intensity:</span>
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 rounded bg-gray-100 dark:bg-gray-700"></div>
          <span>0</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 rounded bg-blue-100 dark:bg-blue-900/30"></div>
          <span>1-2</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 rounded bg-blue-200 dark:bg-blue-800/40"></div>
          <span>3-5</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 rounded bg-blue-300 dark:bg-blue-700/50"></div>
          <span>6-10</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 rounded bg-blue-400 dark:bg-blue-600/60"></div>
          <span>10+</span>
        </div>
      </div>
    </div>
  )
}
