import { useState, useEffect } from 'react'
import { TrendingUp, Clock, Zap, Activity } from 'lucide-react'
import { getPerformanceMetrics } from '../../services/performanceService'

import { getDisplayRowNumber } from '../../utils/tableRowNumberUtils'
export default function PerformanceDashboard() {
  const [metrics, setMetrics] = useState(null)
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [dateRange, setDateRange] = useState('7d') // 7d, 30d, 90d

  useEffect(() => {
    loadMetrics()
  }, [dateRange])

  const loadMetrics = async () => {
    setLoading(true)
    try {
      const filters = getDateRangeFilters(dateRange)
      const result = await getPerformanceMetrics(filters)
      
      if (result.success) {
        setMetrics(result.data)
        setStats(result.stats)
      }
    } catch (error) {
      console.error('Error loading performance metrics:', error)
    } finally {
      setLoading(false)
    }
  }

  const getDateRangeFilters = (range) => {
    const now = new Date()
    const startDate = new Date()

    switch (range) {
      case '7d':
        startDate.setDate(now.getDate() - 7)
        break
      case '30d':
        startDate.setDate(now.getDate() - 30)
        break
      case '90d':
        startDate.setDate(now.getDate() - 90)
        break
      default:
        startDate.setDate(now.getDate() - 7)
    }

    return {
      start_date: startDate.toISOString(),
      end_date: now.toISOString()
    }
  }

  const formatTime = (ms) => {
    if (ms < 1000) return `${Math.round(ms)}ms`
    return `${(ms / 1000).toFixed(2)}s`
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Performance Dashboard
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Monitor application performance metrics
          </p>
        </div>

        {/* Date Range Selector */}
        <div className="mb-6">
          <div className="flex gap-2">
            {['7d', '30d', '90d'].map((range, index) => (
              <button
                key={range}
                onClick={() => setDateRange(range)}
                className={`px-4 py-2 rounded-lg ${
                  dateRange === range
                    ? 'bg-blue-600 text-white'
                    : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                Last {range === '7d' ? '7 days' : range === '30d' ? '30 days' : '90 days'}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="text-center py-8">
            <p className="text-gray-600 dark:text-gray-400">Loading performance metrics...</p>
          </div>
        ) : stats ? (
          <>
            {/* Summary Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {/* Page Load Time */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">Page Load Time</h3>
                  <Clock className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
                  {formatTime(stats.page_load.average)}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  {stats.page_load.count} requests
                </div>
                <div className="mt-2 text-xs text-gray-500 dark:text-gray-500">
                  Min: {formatTime(stats.page_load.min)} | Max: {formatTime(stats.page_load.max)}
                </div>
              </div>

              {/* API Response Time */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">API Response Time</h3>
                  <Zap className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
                  {formatTime(stats.api_call.average)}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  {stats.api_call.count} calls
                </div>
                <div className="mt-2 text-xs text-gray-500 dark:text-gray-500">
                  P95: {formatTime(stats.api_call.p95)} | P99: {formatTime(stats.api_call.p99)}
                </div>
              </div>

              {/* Component Render Time */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">Component Render</h3>
                  <Activity className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
                  {formatTime(stats.component_render.average)}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  {stats.component_render.count} renders
                </div>
                <div className="mt-2 text-xs text-gray-500 dark:text-gray-500">
                  P50: {formatTime(stats.component_render.p50)} | P95: {formatTime(stats.component_render.p95)}
                </div>
              </div>

              {/* Overall Performance */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">Performance Score</h3>
                  <TrendingUp className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                </div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
                  {(() => {
                    const pageLoadScore = stats.page_load.average < 2000 ? 100 : Math.max(0, 100 - (stats.page_load.average - 2000) / 20)
                    const apiScore = stats.api_call.average < 500 ? 100 : Math.max(0, 100 - (stats.api_call.average - 500) / 5)
                    const componentScore = stats.component_render.average < 100 ? 100 : Math.max(0, 100 - (stats.component_render.average - 100) / 2)
                    const overall = Math.round((pageLoadScore + apiScore + componentScore) / 3)
                    return overall
                  })()}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Overall performance
                </div>
                <div className="mt-2 text-xs text-gray-500 dark:text-gray-500">
                  Based on load, API, and render times
                </div>
              </div>
            </div>

            {/* Performance Targets */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-8">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Performance Targets</h2>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Page Load Time</span>
                  <span className={`text-sm font-medium ${
                    stats.page_load.average < 2000 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                  }`}>
                    {formatTime(stats.page_load.average)} / {formatTime(2000)} target
                  </span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${
                      stats.page_load.average < 2000 ? 'bg-green-600' : 'bg-red-600'
                    }`}
                    style={{ width: `${Math.min(100, (stats.page_load.average / 2000) * 100)}%` }}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">API Response Time</span>
                  <span className={`text-sm font-medium ${
                    stats.api_call.average < 500 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                  }`}>
                    {formatTime(stats.api_call.average)} / {formatTime(500)} target
                  </span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${
                      stats.api_call.average < 500 ? 'bg-green-600' : 'bg-red-600'
                    }`}
                    style={{ width: `${Math.min(100, (stats.api_call.average / 500) * 100)}%` }}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Component Render Time</span>
                  <span className={`text-sm font-medium ${
                    stats.component_render.average < 100 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                  }`}>
                    {formatTime(stats.component_render.average)} / {formatTime(100)} target
                  </span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${
                      stats.component_render.average < 100 ? 'bg-green-600' : 'bg-red-600'
                    }`}
                    style={{ width: `${Math.min(100, (stats.component_render.average / 100) * 100)}%` }}
                  />
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="text-center py-8">
            <p className="text-gray-600 dark:text-gray-400">No performance data available.</p>
          </div>
        )}
      </div>
    </div>
  )
}

