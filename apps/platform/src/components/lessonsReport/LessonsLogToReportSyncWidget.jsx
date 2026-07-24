/**
 * Lessons Log to Report Sync Widget
 * Sync lessons from log to report
 */

import { useState } from 'react'
import { RefreshCw, Filter, CheckCircle } from 'lucide-react'
import { syncLessonsFromLog } from '../../services/lessonsReportLessonService'

export default function LessonsLogToReportSyncWidget({
  reportId,
  lessonsLogId,
  onSyncComplete
}) {
  const [loading, setLoading] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  const [filters, setFilters] = useState({
    effect_type: '',
    priority: '',
    category: ''
  })
  const [lastSyncResult, setLastSyncResult] = useState(null)

  const handleSync = async () => {
    try {
      setLoading(true)
      const result = await syncLessonsFromLog(reportId, filters)
      
      if (result.success) {
        setLastSyncResult(result.data)
        if (onSyncComplete) {
          onSyncComplete(result.data)
        }
        alert(`Synced ${result.data.added} lessons from log${result.data.skipped > 0 ? ` (${result.data.skipped} already included)` : ''}`)
        setShowFilters(false)
      } else {
        alert('Error syncing lessons: ' + result.error)
      }
    } catch (error) {
      console.error('Error syncing lessons:', error)
      alert('Error syncing lessons: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800 p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <RefreshCw className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          <h4 className="font-semibold text-blue-900 dark:text-blue-200">
            Sync Lessons from Log
          </h4>
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="px-3 py-1 text-sm border border-blue-300 dark:border-blue-700 rounded-lg text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-800 flex items-center gap-2"
        >
          <Filter className="w-4 h-4" />
          Filters
        </button>
      </div>

      <p className="text-sm text-blue-800 dark:text-blue-300 mb-3">
        Automatically sync lessons from the Lessons Log to this report. Filter by effect type, priority, or category.
      </p>

      {showFilters && (
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 mb-3 space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Effect Type
            </label>
            <select
              value={filters.effect_type}
              onChange={(e) => setFilters({ ...filters, effect_type: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="">All</option>
              <option value="positive">Positive</option>
              <option value="negative">Negative</option>
              <option value="neutral">Neutral</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Priority
            </label>
            <select
              value={filters.priority}
              onChange={(e) => setFilters({ ...filters, priority: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="">All</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Category
            </label>
            <select
              value={filters.category}
              onChange={(e) => setFilters({ ...filters, category: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="">All</option>
              <option value="process">Process</option>
              <option value="technical">Technical</option>
              <option value="resource">Resource</option>
              <option value="communication">Communication</option>
              <option value="stakeholder">Stakeholder</option>
              <option value="quality">Quality</option>
              <option value="schedule">Schedule</option>
              <option value="cost">Cost</option>
              <option value="risk">Risk</option>
              <option value="procurement">Procurement</option>
              <option value="other">Other</option>
            </select>
          </div>
        </div>
      )}

      {lastSyncResult && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3 mb-3">
          <div className="flex items-center gap-2 text-green-800 dark:text-green-200 text-sm">
            <CheckCircle className="w-4 h-4" />
            <span>
              Last sync: Added {lastSyncResult.added} lessons
              {lastSyncResult.skipped > 0 && ` (${lastSyncResult.skipped} already included)`}
            </span>
          </div>
        </div>
      )}

      <button
        onClick={handleSync}
        disabled={loading}
        className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50 flex items-center justify-center gap-2"
      >
        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        {loading ? 'Syncing...' : 'Sync Lessons'}
      </button>
    </div>
  )
}
