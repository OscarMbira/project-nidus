/**
 * Lessons Report Lessons Section
 * Select and include lessons from Lessons Log
 */

import { useState, useEffect } from 'react'
import { Plus, X, AlertCircle, CheckCircle, Lightbulb } from 'lucide-react'
import { getLessonsInReport, syncLessonsFromLog, addLessonToReport, removeLessonFromReport, updateLessonInclusion } from '../../services/lessonsReportLessonService'
import { getLessonsByProject } from '../../services/lessonService'

export default function LessonsReportLessonsSection({
  reportId,
  projectId,
  lessonsLogId,
  readOnly = false
}) {
  const [reportLessons, setReportLessons] = useState([])
  const [availableLessons, setAvailableLessons] = useState([])
  const [loading, setLoading] = useState(false)
  const [showSyncModal, setShowSyncModal] = useState(false)
  const [syncFilters, setSyncFilters] = useState({
    effect_type: '',
    priority: '',
    category: ''
  })

  useEffect(() => {
    if (reportId && reportId !== 'new') {
      loadReportLessons()
    }
  }, [reportId])

  const loadReportLessons = async () => {
    try {
      setLoading(true)
      const result = await getLessonsInReport(reportId)
      if (result.success) {
        setReportLessons(result.data || [])
      }
    } catch (error) {
      console.error('Error loading report lessons:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSyncFromLog = async () => {
    try {
      setLoading(true)
      const result = await syncLessonsFromLog(reportId, syncFilters)
      if (result.success) {
        alert(`Synced ${result.data.added} lessons from log`)
        await loadReportLessons()
        setShowSyncModal(false)
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

  const handleAddLesson = async (lessonId) => {
    try {
      const lesson = availableLessons.find(l => l.id === lessonId)
      const result = await addLessonToReport(reportId, lessonId, {
        significance_level: lesson?.priority === 'high' || lesson?.priority === 'critical' ? 'high' : 'medium',
        section_in_report: lesson?.effect_type === 'positive' ? 'What Went Well' : 
                          lesson?.effect_type === 'negative' ? 'What Did Not Go Well' : 
                          'Other Lessons'
      })

      if (result.success) {
        await loadReportLessons()
      }
    } catch (error) {
      console.error('Error adding lesson:', error)
      alert('Error adding lesson: ' + error.message)
    }
  }

  const handleRemoveLesson = async (reportLessonId) => {
    if (!confirm('Remove this lesson from the report?')) return

    try {
      const result = await removeLessonFromReport(reportLessonId)
      if (result.success) {
        await loadReportLessons()
      }
    } catch (error) {
      console.error('Error removing lesson:', error)
      alert('Error removing lesson: ' + error.message)
    }
  }

  const getSignificanceColor = (level) => {
    switch (level) {
      case 'critical': return 'bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-200'
      case 'high': return 'bg-orange-100 dark:bg-orange-900/20 text-orange-800 dark:text-orange-200'
      case 'medium': return 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-200'
      default: return 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
    }
  }

  if (reportId === 'new') {
    return (
      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
        <p>Save the report first to add lessons</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <Lightbulb className="w-5 h-5" />
          Significant Lessons
        </h3>
        {!readOnly && (
          <div className="flex gap-2">
            <button
              onClick={() => setShowSyncModal(true)}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Sync from Log
            </button>
          </div>
        )}
      </div>

      {loading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        </div>
      ) : reportLessons.length === 0 ? (
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-8 text-center text-gray-500 dark:text-gray-400">
          <p>No lessons added to this report yet</p>
          {!readOnly && (
            <button
              onClick={() => setShowSyncModal(true)}
              className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
            >
              Sync Lessons from Log
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {reportLessons.map((reportLesson) => {
            const lesson = reportLesson.lesson
            return (
              <div
                key={reportLesson.id}
                className="border border-gray-200 dark:border-gray-700 rounded-lg p-4"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-mono text-sm text-gray-500">
                        {lesson?.lesson_reference || 'N/A'}
                      </span>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${getSignificanceColor(reportLesson.significance_level)}`}>
                        {reportLesson.significance_level}
                      </span>
                      <span className="text-xs text-gray-500">{reportLesson.section_in_report}</span>
                    </div>
                    <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
                      {lesson?.lesson_title || 'Untitled Lesson'}
                    </h4>
                    {reportLesson.inclusion_reason && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                        <strong>Inclusion Reason:</strong> {reportLesson.inclusion_reason}
                      </p>
                    )}
                    {lesson?.recommendations && (
                      <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-2">
                        {lesson.recommendations.substring(0, 200)}...
                      </p>
                    )}
                  </div>
                  {!readOnly && (
                    <button
                      onClick={() => handleRemoveLesson(reportLesson.id)}
                      className="ml-4 p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Sync Modal */}
      {showSyncModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold mb-4">Sync Lessons from Log</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Filter by Effect Type
                </label>
                <select
                  value={syncFilters.effect_type}
                  onChange={(e) => setSyncFilters({ ...syncFilters, effect_type: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="">All</option>
                  <option value="positive">Positive</option>
                  <option value="negative">Negative</option>
                  <option value="neutral">Neutral</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Filter by Priority
                </label>
                <select
                  value={syncFilters.priority}
                  onChange={(e) => setSyncFilters({ ...syncFilters, priority: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="">All</option>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>
            </div>
            <div className="flex gap-2 justify-end mt-6">
              <button
                onClick={() => setShowSyncModal(false)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleSyncFromLog}
                disabled={loading}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50"
              >
                {loading ? 'Syncing...' : 'Sync Lessons'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
