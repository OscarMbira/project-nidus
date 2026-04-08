import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'

import { usePlatformProjectId } from '../hooks/usePlatformProjectId.js'
import { ArrowLeft, Download, FileDown, Printer, FileText } from 'lucide-react'
import { getLessonsLogByProject } from '../services/lessonsLogService'
import { getLessonsByProject } from '../services/lessonService'
import { getLessonsSummary } from '../services/lessonService'
import { generateLessonsReport as generateReport } from '../services/lessonsReportService'
import { exportToPDF, exportToCSV, exportToExcel, generateLessonsReport } from '../utils/lessonExport'

export default function LessonsReport() {
  const { projectId, routeKey } = usePlatformProjectId()
  const navigate = useNavigate()
  const [log, setLog] = useState(null)
  const [lessons, setLessons] = useState([])
  const [summary, setSummary] = useState(null)
  const [report, setReport] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (projectId) {
      fetchData()
    }
  }, [projectId])

  const fetchData = async () => {
    try {
      setLoading(true)
      const [logResult, lessonsResult, summaryResult, reportResult] = await Promise.all([
        getLessonsLogByProject(projectId),
        getLessonsByProject(projectId, {}),
        getLessonsSummary(projectId),
        generateReport(projectId, {})
      ])

      if (logResult.success) {
        setLog(logResult.data)
      }

      if (lessonsResult.success) {
        setLessons(lessonsResult.data || [])
      }

      if (summaryResult.success) {
        setSummary(summaryResult.data)
      }

      if (reportResult.success) {
        setReport(reportResult.data)
      }
    } catch (error) {
      console.error('Error fetching report data:', error)
      alert('Error loading report: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleExportPDF = () => {
    if (log && lessons) {
      exportToPDF(log, lessons, summary)
    }
  }

  const handleExportCSV = () => {
    exportToCSV(lessons)
  }

  const handleExportExcel = () => {
    exportToExcel(lessons)
  }

  const handlePrint = () => {
    window.print()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto" />
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading Lessons Report...</p>
        </div>
      </div>
    )
  }

  if (!log) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center py-12">
          <p className="text-gray-500 dark:text-gray-400 mb-4">Lessons Log not found</p>
          <button
            onClick={() => navigate(`/app/projects/${projectId}/lessons`)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
          >
            Back to Lessons Log
          </button>
        </div>
      </div>
    )
  }

  const reportData = report || generateLessonsReport(log, lessons, summary)

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <button
        onClick={() => navigate(`/app/projects/${projectId}/lessons`)}
        className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4 flex items-center gap-2"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Lessons Log
      </button>

      {/* Header */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 mb-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              Lessons Log Report
            </h1>
            <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
              <span>Project: {log.project?.project_name || 'N/A'}</span>
              <span>Reference: {log.log_reference}</span>
              <span>Version: {log.version_number || '1.0'}</span>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handlePrint}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2"
            >
              <Printer className="h-4 w-4" />
              Print
            </button>
            <div className="relative group">
              <button
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                Export
              </button>
              <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
                <button
                  onClick={handleExportPDF}
                  className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2"
                >
                  <FileDown className="w-4 h-4" />
                  Export as PDF
                </button>
                <button
                  onClick={handleExportCSV}
                  className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2"
                >
                  <FileText className="w-4 h-4" />
                  Export as CSV
                </button>
                <button
                  onClick={handleExportExcel}
                  className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2"
                >
                  <FileText className="w-4 h-4" />
                  Export as Excel
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Summary Statistics */}
      {summary && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Summary Statistics</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">{summary.total_lessons || lessons.length}</div>
              <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">Total Lessons</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600 dark:text-green-400">{summary.positive_lessons || lessons.filter(l => l.effect_type === 'positive').length}</div>
              <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">Positive</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-red-600 dark:text-red-400">{summary.negative_lessons || lessons.filter(l => l.effect_type === 'negative').length}</div>
              <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">Negative</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-600 dark:text-purple-400">{summary.corporate_lessons || lessons.filter(l => l.is_corporate_lesson).length}</div>
              <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">Corporate</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-orange-600 dark:text-orange-400">{summary.actions_pending || 0}</div>
              <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">Actions Pending</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-gray-600 dark:text-gray-400">
                {lessons.filter(l => l.status === 'action_taken' || l.status === 'closed').length}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">Actions Taken</div>
            </div>
          </div>

          {/* Lessons by Category */}
          {summary.lessons_by_category && Object.keys(summary.lessons_by_category).length > 0 && (
            <div className="mt-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Lessons by Category</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {Object.entries(summary.lessons_by_category).map(([category, count]) => (
                  <div key={category} className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                    <div className="text-lg font-semibold text-gray-900 dark:text-white">{count}</div>
                    <div className="text-sm text-gray-600 dark:text-gray-400 capitalize">{category.replace(/_/g, ' ')}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Key Recommendations */}
      {reportData.keyRecommendations && reportData.keyRecommendations.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Key Recommendations</h2>
          <div className="space-y-3">
            {reportData.keyRecommendations.map((recommendation, index) => (
              <div key={index} className="border-l-4 border-blue-500 pl-4 py-2">
                <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{recommendation}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Actions Summary */}
      {reportData.actions && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Actions Summary</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                {reportData.actions.pending?.length || 0}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Pending</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {reportData.actions.in_progress?.length || 0}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">In Progress</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                {reportData.actions.completed?.length || 0}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Completed</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-600 dark:text-gray-400">
                {reportData.actions.cancelled?.length || 0}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Cancelled</div>
            </div>
          </div>
        </div>
      )}

      {/* All Lessons */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          All Lessons ({lessons.length})
        </h2>
        <div className="space-y-4">
          {lessons.length === 0 ? (
            <p className="text-center text-gray-500 dark:text-gray-400 py-8">No lessons found</p>
          ) : (
            lessons.map((lesson) => (
              <div
                key={lesson.id}
                className="border border-gray-200 dark:border-gray-700 rounded-lg p-4"
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">
                      {lesson.lesson_reference}: {lesson.lesson_title || lesson.title}
                    </h3>
                    <div className="flex items-center gap-2 mt-1 text-sm text-gray-600 dark:text-gray-400">
                      <span className="capitalize">{lesson.lesson_category || lesson.category}</span>
                      <span>•</span>
                      <span className="capitalize">{lesson.effect_type}</span>
                      <span>•</span>
                      <span className="capitalize">{lesson.priority}</span>
                    </div>
                  </div>
                </div>
                {lesson.recommendations && (
                  <div className="mt-2">
                    <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-2">
                      {lesson.recommendations}
                    </p>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
