import { useState, useEffect } from 'react'
import { AlertCircle, Plus, X, Edit2, ArrowUp } from 'lucide-react'
import { addLesson, updateLesson, escalateToLessonsLog } from '../../services/checkpointReportLessonsService'
import { supabase } from '../../services/supabaseClient'

export default function CurrentPeriodLessonsSection({ reportId, lessons, onLessonsChange, projectId, mode }) {
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [lessonsLogId, setLessonsLogId] = useState(null)
  const [newLesson, setNewLesson] = useState({
    lesson_title: '',
    lesson_description: '',
    lesson_type: 'positive',
    category: 'other',
    impact: 'medium',
    recommendation: ''
  })

  useEffect(() => {
    loadLessonsLog()
  }, [projectId])

  const loadLessonsLog = async () => {
    try {
      const { data } = await supabase
        .from('lessons_logs')
        .select('id')
        .eq('project_id', projectId)
        .eq('is_deleted', false)
        .single()
      
      if (data) {
        setLessonsLogId(data.id)
      }
    } catch (error) {
      console.error('Error loading lessons log:', error)
    }
  }

  const handleAdd = async () => {
    if (!newLesson.lesson_title.trim() || !newLesson.lesson_description.trim()) return

    try {
      const added = await addLesson(reportId, newLesson)
      onLessonsChange([...lessons, added])
      setNewLesson({
        lesson_title: '',
        lesson_description: '',
        lesson_type: 'positive',
        category: 'other',
        impact: 'medium',
        recommendation: ''
      })
      setShowAddForm(false)
    } catch (error) {
      console.error('Error adding lesson:', error)
      alert('Error adding lesson: ' + error.message)
    }
  }

  const handleUpdate = async (lessonId, updates) => {
    try {
      const updated = await updateLesson(lessonId, updates)
      onLessonsChange(lessons.map(l => l.id === lessonId ? updated : l))
      setEditingId(null)
    } catch (error) {
      console.error('Error updating lesson:', error)
      alert('Error updating lesson: ' + error.message)
    }
  }

  const handleEscalate = async (lessonId) => {
    if (!lessonsLogId) {
      alert('Lessons log not found for this project')
      return
    }

    if (!confirm('Escalate this lesson to the Lessons Log?')) return

    try {
      await escalateToLessonsLog(lessonId, lessonsLogId)
      await loadLessons()
      alert('Lesson escalated to Lessons Log successfully')
    } catch (error) {
      console.error('Error escalating lesson:', error)
      alert('Error escalating lesson: ' + error.message)
    }
  }

  const loadLessons = async () => {
    try {
      const { getLessons } = await import('../../services/checkpointReportLessonsService')
      const data = await getLessons(reportId)
      onLessonsChange(data)
    } catch (error) {
      console.error('Error loading lessons:', error)
    }
  }

  return (
    <div className="space-y-6">
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">Lessons Identified</h3>
        <p className="text-sm text-blue-700 dark:text-blue-300">
          Lessons learned during this reporting period. These can be escalated to the project Lessons Log.
        </p>
      </div>

      {lessons.length === 0 ? (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>No lessons identified yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {lessons.map((lesson) => (
            <div
              key={lesson.id}
              className={`border rounded-lg p-4 ${
                lesson.lesson_type === 'positive'
                  ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                  : lesson.lesson_type === 'negative'
                  ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                  : 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h4 className="font-semibold text-gray-900 dark:text-white">{lesson.lesson_title}</h4>
                    <span className={`px-2 py-1 text-xs rounded ${
                      lesson.lesson_type === 'positive'
                        ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
                        : lesson.lesson_type === 'negative'
                        ? 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200'
                        : 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200'
                    }`}>
                      {lesson.lesson_type}
                    </span>
                    <span className="px-2 py-1 text-xs rounded bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200">
                      {lesson.category}
                    </span>
                    {lesson.is_escalated && (
                      <span className="px-2 py-1 text-xs rounded bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200">
                        Escalated
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">{lesson.lesson_description}</p>
                  {lesson.recommendation && (
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      <strong>Recommendation:</strong> {lesson.recommendation}
                    </p>
                  )}
                </div>
                {mode !== 'view' && (
                  <div className="flex gap-2 ml-4">
                    {!lesson.is_escalated && lessonsLogId && (
                      <button
                        onClick={() => handleEscalate(lesson.id)}
                        className="p-2 text-purple-600 hover:bg-purple-100 dark:hover:bg-purple-900/30 rounded"
                        title="Escalate to Lessons Log"
                      >
                        <ArrowUp className="h-4 w-4" />
                      </button>
                    )}
                    <button
                      onClick={() => setEditingId(lesson.id)}
                      className="p-2 text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => onLessonsChange(lessons.filter(l => l.id !== lesson.id))}
                      className="p-2 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/30 rounded"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {mode !== 'view' && (
        <>
          {showAddForm ? (
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-gray-50 dark:bg-gray-900">
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Lesson Title *
                  </label>
                  <input
                    type="text"
                    value={newLesson.lesson_title}
                    onChange={(e) => setNewLesson({ ...newLesson, lesson_title: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    placeholder="Brief title for the lesson..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Description *
                  </label>
                  <textarea
                    value={newLesson.lesson_description}
                    onChange={(e) => setNewLesson({ ...newLesson, lesson_description: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    placeholder="Describe the lesson learned..."
                  />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Type
                    </label>
                    <select
                      value={newLesson.lesson_type}
                      onChange={(e) => setNewLesson({ ...newLesson, lesson_type: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    >
                      <option value="positive">Positive</option>
                      <option value="negative">Negative</option>
                      <option value="suggestion">Suggestion</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Category
                    </label>
                    <select
                      value={newLesson.category}
                      onChange={(e) => setNewLesson({ ...newLesson, category: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    >
                      <option value="process">Process</option>
                      <option value="technical">Technical</option>
                      <option value="resource">Resource</option>
                      <option value="communication">Communication</option>
                      <option value="quality">Quality</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Impact
                    </label>
                    <select
                      value={newLesson.impact}
                      onChange={(e) => setNewLesson({ ...newLesson, impact: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Recommendation
                  </label>
                  <textarea
                    value={newLesson.recommendation}
                    onChange={(e) => setNewLesson({ ...newLesson, recommendation: e.target.value })}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    placeholder="Recommendation based on this lesson..."
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleAdd}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
                  >
                    Add
                  </button>
                  <button
                    onClick={() => setShowAddForm(false)}
                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowAddForm(true)}
              className="w-full px-4 py-2 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg text-gray-600 dark:text-gray-400 hover:border-blue-500 hover:text-blue-600 dark:hover:text-blue-400 flex items-center justify-center gap-2"
            >
              <Plus className="h-5 w-5" />
              Add Lesson
            </button>
          )}
        </>
      )}
    </div>
  )
}
