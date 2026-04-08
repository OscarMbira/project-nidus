import { useState, useEffect } from 'react'
import { BookOpen, Plus, Trash2 } from 'lucide-react'
import * as lessonService from '../../../services/highlightReportLessonService'

const LESSON_TYPES = [
  { value: 'what_went_well', label: 'What went well' },
  { value: 'what_could_improve', label: 'What could improve' },
  { value: 'recommendation', label: 'Recommendation' }
]

export default function HighlightReportLessonsSection({ reportId, mode }) {
  const [lessons, setLessons] = useState([])
  const [loading, setLoading] = useState(false)
  const [adding, setAdding] = useState(false)

  useEffect(() => {
    if (reportId) load()
  }, [reportId])

  const load = async () => {
    if (!reportId) return
    setLoading(true)
    try {
      const data = await lessonService.getLessons(reportId)
      setLessons(data || [])
    } catch (e) {
      console.warn('Load lessons:', e)
    } finally {
      setLoading(false)
    }
  }

  const handleAdd = async () => {
    if (!reportId || mode === 'view') return
    setAdding(true)
    try {
      await lessonService.addLesson(reportId, { lesson_title: 'New lesson', lesson_type: 'what_went_well' })
      await load()
    } catch (e) {
      console.warn('Add lesson:', e)
    } finally {
      setAdding(false)
    }
  }

  const handleUpdate = async (id, updates) => {
    if (mode === 'view') return
    try {
      await lessonService.updateLesson(id, updates)
      await load()
    } catch (e) {
      console.warn('Update lesson:', e)
    }
  }

  const handleDelete = async (id) => {
    if (mode === 'view') return
    try {
      await lessonService.deleteLesson(id)
      await load()
    } catch (e) {
      console.warn('Delete lesson:', e)
    }
  }

  const disabled = mode === 'view'

  return (
    <div className="space-y-6">
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2 flex items-center gap-2">
          <BookOpen className="h-4 w-4" />
          Lessons Learned
        </h3>
        <p className="text-sm text-blue-700 dark:text-blue-300">
          Lessons from this period. Sync from lessons log or add manually.
        </p>
      </div>

      {reportId && (
        <>
          {!disabled && (
            <button
              type="button"
              onClick={handleAdd}
              disabled={adding}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 text-sm"
            >
              <Plus className="h-4 w-4" />
              {adding ? 'Adding…' : 'Add lesson'}
            </button>
          )}

          {loading ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">Loading…</p>
          ) : lessons.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">No lessons added.</p>
          ) : (
            <div className="space-y-3">
              {lessons.map((l) => (
                <div
                  key={l.id}
                  className="rounded-lg border border-gray-200 dark:border-gray-600 p-4 grid grid-cols-1 md:grid-cols-12 gap-3 items-start"
                >
                  <div className="md:col-span-4">
                    <input
                      type="text"
                      value={l.lesson_title || ''}
                      onChange={(e) => handleUpdate(l.id, { lesson_title: e.target.value })}
                      disabled={disabled}
                      placeholder="Lesson title"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
                    />
                  </div>
                  <div className="md:col-span-3">
                    <select
                      value={l.lesson_type || 'what_went_well'}
                      onChange={(e) => handleUpdate(l.id, { lesson_type: e.target.value })}
                      disabled={disabled}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
                    >
                      {LESSON_TYPES.map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="md:col-span-4" />
                  <div className="md:col-span-1">
                    {!disabled && (
                      <button
                        type="button"
                        onClick={() => handleDelete(l.id)}
                        className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {!reportId && <p className="text-sm text-gray-500 dark:text-gray-400">Save the report first to add lessons.</p>}
    </div>
  )
}
