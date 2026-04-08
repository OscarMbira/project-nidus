/**
 * Open Issues Widget Component
 * Displays a summary of open issues for a project
 */

import { useState, useEffect } from 'react'
import { AlertCircle, ChevronRight, Clock, AlertTriangle } from 'lucide-react'
import { supabase } from '../../services/supabaseClient'

export default function OpenIssuesWidget({ projectId }) {
  const [issues, setIssues] = useState([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    total: 0,
    critical: 0,
    high: 0,
    medium: 0,
    low: 0
  })

  useEffect(() => {
    if (projectId) {
      fetchOpenIssues()
    }
  }, [projectId])

  const fetchOpenIssues = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('issues')
        .select('id, issue_title, priority, status, date_raised, issue_type')
        .eq('project_id', projectId)
        .eq('is_deleted', false)
        .in('status', ['open', 'pending', 'in_progress', 'escalated'])
        .order('priority', { ascending: true })
        .order('date_raised', { ascending: false })
        .limit(5)

      if (error) throw error

      setIssues(data || [])

      // Calculate stats
      const allIssues = await supabase
        .from('issues')
        .select('priority', { count: 'exact' })
        .eq('project_id', projectId)
        .eq('is_deleted', false)
        .in('status', ['open', 'pending', 'in_progress', 'escalated'])

      if (!allIssues.error && allIssues.data) {
        const priorityCounts = {
          total: allIssues.data.length,
          critical: allIssues.data.filter(i => i.priority === 'critical').length,
          high: allIssues.data.filter(i => i.priority === 'high').length,
          medium: allIssues.data.filter(i => i.priority === 'medium').length,
          low: allIssues.data.filter(i => i.priority === 'low').length
        }
        setStats(priorityCounts)
      }
    } catch (error) {
      console.error('Error fetching open issues:', error)
    } finally {
      setLoading(false)
    }
  }

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'critical':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
      case 'high':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300'
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
      case 'low':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
    }
  }

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
          <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-red-500" />
          Open Issues
        </h3>
        <span className="text-sm text-gray-500 dark:text-gray-400">
          {stats.total} total
        </span>
      </div>

      {/* Priority Stats */}
      {stats.total > 0 && (
        <div className="flex gap-2 mb-4">
          {stats.critical > 0 && (
            <span className="px-2 py-1 text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 rounded">
              {stats.critical} Critical
            </span>
          )}
          {stats.high > 0 && (
            <span className="px-2 py-1 text-xs font-medium bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300 rounded">
              {stats.high} High
            </span>
          )}
          {stats.medium > 0 && (
            <span className="px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300 rounded">
              {stats.medium} Medium
            </span>
          )}
          {stats.low > 0 && (
            <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 rounded">
              {stats.low} Low
            </span>
          )}
        </div>
      )}

      {issues.length === 0 ? (
        <div className="text-center py-8">
          <AlertCircle className="h-12 w-12 mx-auto text-gray-400 dark:text-gray-500 mb-3" />
          <p className="text-gray-500 dark:text-gray-400">No open issues</p>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
            All issues are resolved
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {issues.map((issue) => (
            <div
              key={issue.id}
              className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                  {issue.issue_title}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`px-2 py-0.5 text-xs font-medium rounded ${getPriorityColor(issue.priority)}`}>
                    {issue.priority || 'unset'}
                  </span>
                  {issue.date_raised && (
                    <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {new Date(issue.date_raised).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-gray-400 flex-shrink-0" />
            </div>
          ))}
        </div>
      )}

      {stats.total > 5 && (
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <button className="text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1">
            View all {stats.total} issues
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  )
}
