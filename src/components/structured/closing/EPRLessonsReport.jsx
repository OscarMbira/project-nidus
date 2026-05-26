import { useState } from 'react'
import { Lightbulb, ArrowUp, Plus, X, Edit2 } from 'lucide-react'
import { addLesson, updateLesson, deleteLesson, escalateToCorporate } from '../../../services/eprLessonsService'

export default function EPRLessonsReport({ reportId, lessons, onLessonsChange, projectId, mode }) {
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [newLesson, setNewLesson] = useState({
    lesson_type: 'what_went_well',
    category: 'process',
    title: '',
    description: '',
    impact: 'medium',
    root_cause: '',
    recommendation: '',
    target_audience: 'project'
  })

  const handleAdd = async () => {
    if (!newLesson.title.trim() || !newLesson.description.trim()) return

    try {
      const added = await addLesson(reportId, newLesson)
      onLessonsChange([...lessons, added])
      setNewLesson({
        lesson_type: 'what_went_well',
        category: 'process',
        title: '',
        description: '',
        impact: 'medium',
        root_cause: '',
        recommendation: '',
        target_audience: 'project'
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

  const handleDelete = async (lessonId) => {
    if (!confirm('Delete this lesson?')) return

    try {
      await deleteLesson(lessonId)
      onLessonsChange(lessons.filter(l => l.id !== lessonId))
    } catch (error) {
      console.error('Error deleting lesson:', error)
      alert('Error deleting lesson: ' + error.message)
    }
  }

  const handleEscalate = async (lessonId) => {
    if (!confirm('Escalate this lesson to corporate lessons library?')) return

    try {
      await escalateToCorporate(lessonId)
      await loadLessons()
      alert('Lesson escalated to corporate lessons library successfully')
    } catch (error) {
      console.error('Error escalating lesson:', error)
      alert('Error escalating lesson: ' + error.message)
    }
  }

  const loadLessons = async () => {
    try {
      const { getLessons } = await import('../../../services/eprLessonsService')
      const data = await getLessons(reportId)
      onLessonsChange(data)
    } catch (error) {
      console.error('Error loading lessons:', error)
    }
  }

  const getLessonTypeColor = (type) => {
    switch (type) {
      case 'what_went_well':
        return 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
      case 'what_went_badly':
        return 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200'
      case 'recommendation':
        return 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200'
      default:
        return 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
    }
  }

  const whatWentWell = lessons.filter(l => l.lesson_type === 'what_went_well')
  const whatWentBadly = lessons.filter(l => l.lesson_type === 'what_went_badly')
  const recommendations = lessons.filter(l => l.lesson_type === 'recommendation')

  return (
    <div className="space-y-6">
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">Lessons Report</h3>
        <p className="text-sm text-blue-700 dark:text-blue-300">
          Document what went well, what went badly, and recommendations for future projects. Lessons can be escalated to the corporate lessons library.
        </p>
      </div>

      {/* Summary */}
      {lessons.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
            <h4 className="font-semibold text-green-900 dark:text-green-100 mb-1">What Went Well</h4>
            <p className="text-2xl font-bold text-green-600 dark:text-green-400">{whatWentWell.length}</p>
          </div>
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <h4 className="font-semibold text-red-900 dark:text-red-100 mb-1">What Went Badly</h4>
            <p className="text-2xl font-bold text-red-600 dark:text-red-400">{whatWentBadly.length}</p>
          </div>
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-1">Recommendations</h4>
            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{recommendations.length}</p>
          </div>
        </div>
      )}

      {/* Lessons List */}
      {lessons.length === 0 ? (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          <Lightbulb className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>No lessons identified yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {lessons.map((lesson, index) => (
            <div
              key={lesson.id}
              className={`border rounded-lg p-4 ${
                lesson.lesson_type === 'what_went_well'
                  ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                  : lesson.lesson_type === 'what_went_badly'
                  ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                  : 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h4 className="font-semibold text-gray-900 dark:text-white">{lesson.title}</h4>
                    <span className={`px-2 py-1 text-xs rounded ${getLessonTypeColor(lesson.lesson_type)}`}>
                      {lesson.lesson_type.replace('_', ' ')}
                    </span>
                    <span className="px-2 py-1 text-xs rounded bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200">
                      {lesson.category}
                    </span>
                    {lesson.is_escalated_corporate && (
                      <span className="px-2 py-1 text-xs rounded bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200">
                        Escalated
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">{lesson.description}</p>
                  {lesson.recommendation && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                      <strong>Recommendation:</strong> {lesson.recommendation}
                    </p>
                  )}
                  {lesson.root_cause && (
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      <strong>Root Cause:</strong> {lesson.root_cause}
                    </p>
                  )}
                </div>
                {mode !== 'view' && (
                  <div className="flex gap-2 ml-4">
                    {!lesson.is_escalated_corporate && (
                      <button
                        onClick={() => handleEscalate(lesson.id)}
                        className="p-2 text-purple-600 hover:bg-purple-100 dark:hover:bg-purple-900/30 rounded"
                        title="Escalate to Corporate"
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
                      onClick={() => handleDelete(lesson.id)}
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
                    Lesson Type *
                  </label>
                  <select
                    value={newLesson.lesson_type}
                    onChange={(e) => setNewLesson({ ...newLesson, lesson_type: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  >
                    <option value="what_went_well">What Went Well</option>
                    <option value="what_went_badly">What Went Badly</option>
                    <option value="recommendation">Recommendation</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Title *
                  </label>
                  <input
                    type="text"
                    value={newLesson.title}
                    onChange={(e) => setNewLesson({ ...newLesson, title: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Description *
                  </label>
                  <textarea
                    value={newLesson.description}
                    onChange={(e) => setNewLesson({ ...newLesson, description: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  />
                  </div>
                <div className="grid grid-cols-2 gap-3">
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
                      <option value="people">People</option>
                      <option value="technology">Technology</option>
                      <option value="planning">Planning</option>
                      <option value="execution">Execution</option>
                      <option value="risk">Risk</option>
                      <option value="quality">Quality</option>
                      <option value="stakeholder">Stakeholder</option>
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
                      <option value="critical">Critical</option>
                    </select>
                  </div>
                </div>
                {newLesson.lesson_type === 'what_went_badly' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Root Cause
                    </label>
                    <textarea
                      value={newLesson.root_cause}
                      onChange={(e) => setNewLesson({ ...newLesson, root_cause: e.target.value })}
                      rows={2}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    />
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Recommendation
                  </label>
                  <textarea
                    value={newLesson.recommendation}
                    onChange={(e) => setNewLesson({ ...newLesson, recommendation: e.target.value })}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
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
