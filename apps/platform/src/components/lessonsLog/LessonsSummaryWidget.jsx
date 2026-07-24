/**
 * Lessons Summary Widget
 * Display lessons summary on project dashboard/detail page
 */

import { useState, useEffect } from 'react'
import { Lightbulb, TrendingUp, ArrowRight, AlertCircle } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { getLessonsSummary } from '../../services/lessonService'

export default function LessonsSummaryWidget({ projectId }) {
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    if (projectId) {
      loadSummary()
    }
  }, [projectId])

  const loadSummary = async () => {
    setLoading(true)
    try {
      const summaryResult = await getLessonsSummary(projectId)

      if (summaryResult.success) {
        setSummary(summaryResult.data)
      }
    } catch (error) {
      console.error('Error loading lessons summary:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!summary || (summary.total_lessons === 0 && !summary.actions_pending)) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Lightbulb className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Lessons Log</h3>
          </div>
          <button
            onClick={() => navigate(`/app/projects/${projectId}/lessons`)}
            className="text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
          >
            View Log
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400">No lessons logged yet</p>
      </div>
    )
  }

  const totalLessons = summary.total_lessons || 0
  const positiveLessons = summary.positive_lessons || 0
  const negativeLessons = summary.negative_lessons || 0
  const corporateLessons = summary.corporate_lessons || 0
  const actionsPending = summary.actions_pending || 0

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Lightbulb className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Lessons Log</h3>
        </div>
        <button
          onClick={() => navigate(`/app/projects/${projectId}/lessons`)}
          className="text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
        >
          View Log
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
        <div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{totalLessons}</p>
          <p className="text-xs text-gray-600 dark:text-gray-400">Total Lessons</p>
        </div>
        <div>
          <p className="text-2xl font-bold text-green-600 dark:text-green-400">{positiveLessons}</p>
          <p className="text-xs text-gray-600 dark:text-gray-400">Positive</p>
        </div>
        <div>
          <p className="text-2xl font-bold text-red-600 dark:text-red-400">{negativeLessons}</p>
          <p className="text-xs text-gray-600 dark:text-gray-400">Negative</p>
        </div>
        <div>
          <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">{corporateLessons}</p>
          <p className="text-xs text-gray-600 dark:text-gray-400">Corporate</p>
        </div>
      </div>

      {actionsPending > 0 && (
        <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-3">
          <div className="flex items-center gap-2 text-orange-800 dark:text-orange-200">
            <AlertCircle className="w-4 h-4" />
            <span className="text-sm font-medium">
              {actionsPending} action{actionsPending !== 1 ? 's' : ''} pending from lesson recommendations
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
