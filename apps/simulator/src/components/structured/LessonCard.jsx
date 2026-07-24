import { AlertCircle, CheckCircle, Lightbulb, ArrowUp } from 'lucide-react'

export default function LessonCard({ lesson, onEscalate, onEdit, onDelete, mode = 'view' }) {
  const getTypeIcon = (type) => {
    switch (type) {
      case 'positive':
        return <CheckCircle className="h-5 w-5 text-green-500" />
      case 'negative':
        return <AlertCircle className="h-5 w-5 text-red-500" />
      case 'suggestion':
        return <Lightbulb className="h-5 w-5 text-blue-500" />
      default:
        return <AlertCircle className="h-5 w-5 text-gray-400" />
    }
  }

  const getTypeColor = (type) => {
    switch (type) {
      case 'positive':
        return 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
      case 'negative':
        return 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200'
      case 'suggestion':
        return 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200'
      default:
        return 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
    }
  }

  return (
    <div className={`border rounded-lg p-4 ${
      lesson.lesson_type === 'positive'
        ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
        : lesson.lesson_type === 'negative'
        ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
        : 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
    }`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            {getTypeIcon(lesson.lesson_type)}
            <h4 className="font-semibold text-gray-900 dark:text-white">{lesson.lesson_title}</h4>
            <span className={`px-2 py-1 text-xs rounded ${getTypeColor(lesson.lesson_type)}`}>
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
            {!lesson.is_escalated && onEscalate && (
              <button
                onClick={() => onEscalate(lesson.id)}
                className="p-2 text-purple-600 hover:bg-purple-100 dark:hover:bg-purple-900/30 rounded"
                title="Escalate to Lessons Log"
              >
                <ArrowUp className="h-4 w-4" />
              </button>
            )}
            {onEdit && (
              <button
                onClick={() => onEdit(lesson)}
                className="p-2 text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded"
              >
                Edit
              </button>
            )}
            {onDelete && (
              <button
                onClick={() => onDelete(lesson.id)}
                className="p-2 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/30 rounded"
              >
                Delete
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
