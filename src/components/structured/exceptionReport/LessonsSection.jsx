import { useState } from 'react'
import { Lightbulb, Plus, X, Edit2, ArrowUp } from 'lucide-react'
import { addLesson, updateLesson, deleteLesson, escalateLessonToCorporate } from '../../../services/exceptionReportLessonsService'
import LessonCard from './LessonCard'

export default function LessonsSection({ reportId, lessons, onLessonsChange, formData, onChange, errors, mode }) {
  const [editingLesson, setEditingLesson] = useState(null)
  const [showLessonForm, setShowLessonForm] = useState(false)

  const handleAddLesson = async (lessonData) => {
    if (!reportId) {
      // If report not saved yet, add to local state
      const newLesson = {
        id: `temp-${Date.now()}`,
        ...lessonData,
        display_order: lessons.length
      }
      onLessonsChange([...lessons, newLesson])
      setShowLessonForm(false)
      return
    }

    try {
      const newLesson = await addLesson(reportId, lessonData)
      onLessonsChange([...lessons, newLesson])
      setShowLessonForm(false)
    } catch (error) {
      console.error('Error adding lesson:', error)
      alert('Error adding lesson: ' + error.message)
    }
  }

  const handleUpdateLesson = async (lessonId, updates) => {
    if (!reportId) {
      onLessonsChange(lessons.map(lesson => lesson.id === lessonId ? { ...lesson, ...updates } : lesson))
      setEditingLesson(null)
      return
    }

    try {
      const updated = await updateLesson(lessonId, updates)
      onLessonsChange(lessons.map(lesson => lesson.id === lessonId ? updated : lesson))
      setEditingLesson(null)
    } catch (error) {
      console.error('Error updating lesson:', error)
      alert('Error updating lesson: ' + error.message)
    }
  }

  const handleDeleteLesson = async (lessonId) => {
    if (!confirm('Are you sure you want to delete this lesson?')) return

    if (!reportId) {
      onLessonsChange(lessons.filter(lesson => lesson.id !== lessonId))
      return
    }

    try {
      await deleteLesson(lessonId)
      onLessonsChange(lessons.filter(lesson => lesson.id !== lessonId))
    } catch (error) {
      console.error('Error deleting lesson:', error)
      alert('Error deleting lesson: ' + error.message)
    }
  }

  const handleEscalateToCorporate = async (lessonId) => {
    if (!reportId) return

    try {
      await escalateLessonToCorporate(lessonId)
      // Reload lessons to get updated corporate_lesson_id
      const updated = lessons.map(lesson => 
        lesson.id === lessonId ? { ...lesson, is_escalated_corporate: true } : lesson
      )
      onLessonsChange(updated)
    } catch (error) {
      console.error('Error escalating lesson:', error)
      alert('Error escalating lesson: ' + error.message)
    }
  }

  return (
    <div className="space-y-6">
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <Lightbulb className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
          <div>
            <h3 className="text-sm font-medium text-blue-900 dark:text-blue-100">Section 8: Lessons & Review</h3>
            <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
              Capture lessons learned from this exception
            </p>
          </div>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Lessons Summary
        </label>
        <textarea
          value={formData.lessons_summary || ''}
          onChange={(e) => onChange('lessons_summary', e.target.value)}
          disabled={mode === 'view'}
          rows={4}
          placeholder="Provide a summary of lessons learned..."
          className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Preventive Measures
        </label>
        <textarea
          value={formData.preventive_measures || ''}
          onChange={(e) => onChange('preventive_measures', e.target.value)}
          disabled={mode === 'view'}
          rows={4}
          placeholder="What could prevent this in the future..."
          className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600"
        />
      </div>

      <div className="space-y-4">
        <h4 className="text-sm font-semibold text-gray-900 dark:text-white">Individual Lessons</h4>
        {lessons.map((lesson) => (
          <LessonCard
            key={lesson.id}
            lesson={lesson}
            onEdit={mode !== 'view' ? () => setEditingLesson(lesson.id) : null}
            onDelete={mode !== 'view' ? () => handleDeleteLesson(lesson.id) : null}
            onEscalate={mode !== 'view' && !lesson.is_escalated_corporate ? () => handleEscalateToCorporate(lesson.id) : null}
            isEditing={editingLesson === lesson.id}
            onSave={(updates) => handleUpdateLesson(lesson.id, updates)}
            onCancel={() => setEditingLesson(null)}
            mode={mode}
          />
        ))}
      </div>

      {mode !== 'view' && (
        <div>
          {showLessonForm || editingLesson === 'new' ? (
            <LessonCard
              lesson={null}
              isEditing={true}
              onSave={handleAddLesson}
              onCancel={() => {
                setShowLessonForm(false)
                setEditingLesson(null)
              }}
              mode={mode}
            />
          ) : (
            <button
              onClick={() => {
                setShowLessonForm(true)
                setEditingLesson('new')
              }}
              className="w-full flex items-center justify-center space-x-2 px-4 py-3 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg text-gray-600 dark:text-gray-400 hover:border-blue-500 hover:text-blue-600 dark:hover:border-blue-400 dark:hover:text-blue-400 transition-colors"
            >
              <Plus className="h-5 w-5" />
              <span>Add Lesson</span>
            </button>
          )}
        </div>
      )}
    </div>
  )
}
