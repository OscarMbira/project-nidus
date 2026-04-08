/**
 * Issues By Type Chart Component
 * Visualizes issue distribution by type (RFC, Off-spec, Problem)
 */

import { useState, useEffect } from 'react'
import { BarChart3, PieChart } from 'lucide-react'
import { getIssuesByType } from '../../services/issueAnalyticsService'

export default function IssuesByTypeChart({ projectId, chartType: initialChartType = 'bar' }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [chartType, setChartType] = useState(initialChartType)

  useEffect(() => {
    if (projectId) {
      loadData()
    }
  }, [projectId])

  const loadData = async () => {
    try {
      setLoading(true)
      const result = await getIssuesByType(projectId)
      setData(result || { request_for_change: 0, off_specification: 0, problem_concern: 0 })
    } catch (error) {
      console.error('Error loading issues by type:', error)
      setData({ request_for_change: 0, off_specification: 0, problem_concern: 0 })
    } finally {
      setLoading(false)
    }
  }

  const typeLabels = {
    request_for_change: 'Request for Change',
    off_specification: 'Off-Specification',
    problem_concern: 'Problem/Concern'
  }

  const typeColors = {
    request_for_change: 'bg-blue-500',
    off_specification: 'bg-orange-500',
    problem_concern: 'bg-red-500'
  }

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    )
  }

  const total = (data.request_for_change || 0) + (data.off_specification || 0) + (data.problem_concern || 0)
  const maxValue = Math.max(data.request_for_change || 0, data.off_specification || 0, data.problem_concern || 0)

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          Issues by Type
        </h3>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setChartType('bar')}
            className={`px-2 py-1 rounded text-xs ${chartType === 'bar' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}
          >
            Bar
          </button>
          <button
            onClick={() => setChartType('pie')}
            className={`px-2 py-1 rounded text-xs ${chartType === 'pie' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}
          >
            Pie
          </button>
        </div>
      </div>

      {total === 0 ? (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
          <PieChart className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>No issues yet</p>
        </div>
      ) : chartType === 'bar' ? (
        <div className="space-y-3">
          {Object.entries(data).map(([type, count]) => {
            const percentage = maxValue > 0 ? ((count / maxValue) * 100) : 0
            return (
              <div key={type} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-700 dark:text-gray-300">
                    {typeLabels[type] || type}
                  </span>
                  <span className="font-semibold text-gray-900 dark:text-white">{count}</span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-6 overflow-hidden">
                  <div
                    className={`h-full ${typeColors[type] || 'bg-gray-500'} transition-all duration-500`}
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
      ) : (
        <div className="space-y-4">
          {/* Pie chart representation using circles */}
          <div className="flex items-center justify-center">
            <div className="relative w-48 h-48">
              <svg viewBox="0 0 100 100" className="transform -rotate-90">
                {(() => {
                  const rfcPercent = total > 0 ? ((data.request_for_change / total) * 100) : 0
                  const offSpecPercent = total > 0 ? ((data.off_specification / total) * 100) : 0
                  const problemPercent = total > 0 ? ((data.problem_concern / total) * 100) : 0
                  
                  return (
                    <>
                      <circle
                        cx="50"
                        cy="50"
                        r="40"
                        fill="none"
                        stroke="rgb(59 130 246)"
                        strokeWidth="20"
                        strokeDasharray={`${rfcPercent * 2.513274} 251.3274`}
                        strokeDashoffset="0"
                      />
                      <circle
                        cx="50"
                        cy="50"
                        r="40"
                        fill="none"
                        stroke="rgb(249 115 22)"
                        strokeWidth="20"
                        strokeDasharray={`${offSpecPercent * 2.513274} 251.3274`}
                        strokeDashoffset={`-${rfcPercent * 2.513274}`}
                      />
                      <circle
                        cx="50"
                        cy="50"
                        r="40"
                        fill="none"
                        stroke="rgb(239 68 68)"
                        strokeWidth="20"
                        strokeDasharray={`${problemPercent * 2.513274} 251.3274`}
                        strokeDashoffset={`-${(rfcPercent + offSpecPercent) * 2.513274}`}
                      />
                    </>
                  )
                })()}
              </svg>
            </div>
          </div>
          <div className="space-y-2">
            {Object.entries(data).map(([type, count]) => {
              const percentage = total > 0 ? ((count / total) * 100).toFixed(1) : 0
              return (
                <div key={type} className="flex items-center gap-3">
                  <div className={`w-4 h-4 rounded ${typeColors[type] || 'bg-gray-500'}`}></div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-700 dark:text-gray-300">
                        {typeLabels[type] || type}
                      </span>
                      <span className="font-semibold text-gray-900 dark:text-white">
                        {count} ({percentage}%)
                      </span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
