import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'

import { usePlatformProjectId } from '../hooks/usePlatformProjectId.js'
import { BarChart3, PieChart, TrendingUp, Clock, AlertTriangle } from 'lucide-react'
import { getIssueSummary, getIssuesByType, getIssuesByPriority, getIssuesBySeverity, getIssueTrends, getIssueAging, getResolutionMetrics, getActionEffectiveness } from '../services/issueAnalyticsService'

export default function IssueAnalytics() {
  const { projectId, routeKey } = usePlatformProjectId()
  const [summary, setSummary] = useState(null)
  const [byType, setByType] = useState(null)
  const [byPriority, setByPriority] = useState(null)
  const [bySeverity, setBySeverity] = useState(null)
  const [trends, setTrends] = useState([])
  const [aging, setAging] = useState([])
  const [resolutionMetrics, setResolutionMetrics] = useState(null)
  const [actionMetrics, setActionMetrics] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (projectId) {
      fetchAnalytics()
    }
  }, [projectId])

  const fetchAnalytics = async () => {
    try {
      setLoading(true)
      const [
        summaryData,
        typeData,
        priorityData,
        severityData,
        trendsData,
        agingData,
        resolutionData,
        actionData
      ] = await Promise.all([
        getIssueSummary(projectId),
        getIssuesByType(projectId),
        getIssuesByPriority(projectId),
        getIssuesBySeverity(projectId),
        getIssueTrends(projectId),
        getIssueAging(projectId),
        getResolutionMetrics(projectId),
        getActionEffectiveness(projectId)
      ])

      setSummary(summaryData)
      setByType(typeData)
      setByPriority(priorityData)
      setBySeverity(severityData)
      setTrends(trendsData)
      setAging(agingData)
      setResolutionMetrics(resolutionData)
      setActionMetrics(actionData)
    } catch (error) {
      console.error('Error fetching analytics:', error)
      alert('Error: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto" />
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading Analytics...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Issue Analytics
        </h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Comprehensive analysis of project issues
        </p>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Total Issues</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{summary.total_issues || 0}</p>
              </div>
              <BarChart3 className="h-8 w-8 text-blue-500" />
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Open Issues</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{summary.open_issues || 0}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-yellow-500" />
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-red-200 dark:border-red-800 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Critical Issues</p>
                <p className="text-2xl font-bold text-red-600 dark:text-red-400">{summary.critical_issues || 0}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-500" />
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-orange-200 dark:border-orange-800 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Overdue Actions</p>
                <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">{summary.overdue_actions || 0}</p>
              </div>
              <Clock className="h-8 w-8 text-orange-500" />
            </div>
          </div>
        </div>
      )}

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Issues by Type */}
        {byType && (
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Issues by Type
            </h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-gray-700 dark:text-gray-300">Request for Change</span>
                <div className="flex items-center gap-2">
                  <div className="w-32 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div
                      className="bg-purple-600 h-2 rounded-full"
                      style={{ width: `${(byType.request_for_change / (summary?.total_issues || 1)) * 100}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium text-gray-900 dark:text-white w-8">
                    {byType.request_for_change}
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-700 dark:text-gray-300">Off-Specification</span>
                <div className="flex items-center gap-2">
                  <div className="w-32 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div
                      className="bg-orange-600 h-2 rounded-full"
                      style={{ width: `${(byType.off_specification / (summary?.total_issues || 1)) * 100}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium text-gray-900 dark:text-white w-8">
                    {byType.problem_concern}
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-700 dark:text-gray-300">Problem/Concern</span>
                <div className="flex items-center gap-2">
                  <div className="w-32 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div
                      className="bg-red-600 h-2 rounded-full"
                      style={{ width: `${(byType.problem_concern / (summary?.total_issues || 1)) * 100}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium text-gray-900 dark:text-white w-8">
                    {byType.problem_concern}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Issues by Priority */}
        {byPriority && (
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Issues by Priority
            </h3>
            <div className="space-y-3">
              {['critical', 'high', 'medium', 'low'].map((priority, index) => (
                <div key={priority} className="flex items-center justify-between">
                  <span className="text-gray-700 dark:text-gray-300 capitalize">{priority}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-32 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${
                          priority === 'critical' ? 'bg-red-600' :
                          priority === 'high' ? 'bg-orange-600' :
                          priority === 'medium' ? 'bg-yellow-600' : 'bg-green-600'
                        }`}
                        style={{ width: `${(byPriority[priority] / (summary?.total_issues || 1)) * 100}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium text-gray-900 dark:text-white w-8">
                      {byPriority[priority] || 0}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Resolution Metrics */}
      {resolutionMetrics && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Resolution Metrics
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Total Resolved</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {resolutionMetrics.total_resolved || 0}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Total Closed</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {resolutionMetrics.total_closed || 0}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Avg Resolution Time</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {resolutionMetrics.average_resolution_days || 0} days
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Resolution Rate</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {resolutionMetrics.resolution_rate?.toFixed(1) || 0}%
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Action Effectiveness */}
      {actionMetrics && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Action Effectiveness
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Total Actions</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {actionMetrics.total_actions || 0}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Completed</p>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                {actionMetrics.completed_actions || 0}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Overdue</p>
              <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                {actionMetrics.overdue_actions || 0}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Completion Rate</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {actionMetrics.completion_rate?.toFixed(1) || 0}%
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Issue Aging */}
      {aging && aging.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Issue Aging Analysis
          </h3>
          <div className="space-y-3">
            {aging.map((ageGroup, index) => (
              <div key={ageGroup.age_bracket} className="flex items-center justify-between">
                <span className="text-gray-700 dark:text-gray-300">{ageGroup.age_bracket}</span>
                <div className="flex items-center gap-2">
                  <div className="w-48 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full"
                      style={{ width: `${(ageGroup.issue_count / (summary?.open_issues || 1)) * 100}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium text-gray-900 dark:text-white w-8">
                    {ageGroup.issue_count}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
