import { useState } from 'react'
import FieldLabelWithHelp from '@nidus/ui/FieldLabelWithHelp'
import { FieldHelpScope } from '@nidus/shared/context/FieldHelpContext'
import { Lightbulb, X, Edit2, Trash2, ArrowUp, CheckCircle } from 'lucide-react'

function LessonCardBody({ lesson, onEdit, onDelete, onEscalate, isEditing, onSave, onCancel, mode }) {
  const [formData, setFormData] = useState(lesson || {
    lesson_type: 'for_this_project',
    lesson_title: '',
    lesson_description: '',
    category: '',
    recommendation: '',
    preventive_action: ''
  })

  const handleSave = () => {
    onSave(formData)
  }

  if (isEditing) {
    return (
      <div className="border border-blue-300 dark:border-blue-700 rounded-lg p-4 bg-blue-50 dark:bg-blue-900/20">
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <FieldLabelWithHelp helpKey="sim.exception_report_lessons.lesson_type" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2" required>
                Lesson Type *
              </FieldLabelWithHelp>
              <select
                value={formData.lesson_type}
                onChange={(e) => setFormData(prev => ({ ...prev, lesson_type: e.target.value }))}
                className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              >
                <option value="for_this_project">For This Project</option>
                <option value="for_future_projects">For Future Projects</option>
                <option value="corporate">Corporate</option>
              </select>
            </div>
            <div>
              <FieldLabelWithHelp helpKey="sim.exception_report_lessons.category" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Category
              </FieldLabelWithHelp>
              <select
                value={formData.category || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value || null }))}
                className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              >
                <option value="">Select Category</option>
                <option value="planning">Planning</option>
                <option value="estimation">Estimation</option>
                <option value="risk_management">Risk Management</option>
                <option value="communication">Communication</option>
                <option value="resource">Resource</option>
                <option value="technical">Technical</option>
                <option value="process">Process</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>

          <div>
            <FieldLabelWithHelp helpKey="sim.exception_report_lessons.lesson_title" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2" required>
              Lesson Title *
            </FieldLabelWithHelp>
            <input
              type="text"
              value={formData.lesson_title}
              onChange={(e) => setFormData(prev => ({ ...prev, lesson_title: e.target.value }))}
              className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              placeholder="Lesson title"
            />
          </div>

          <div>
            <FieldLabelWithHelp helpKey="sim.exception_report_lessons.lesson_description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2" required>
              Lesson Description *
            </FieldLabelWithHelp>
            <textarea
              value={formData.lesson_description}
              onChange={(e) => setFormData(prev => ({ ...prev, lesson_description: e.target.value }))}
              rows={4}
              className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              placeholder="Describe the lesson learned..."
            />
          </div>

          <div>
            <FieldLabelWithHelp helpKey="sim.exception_report_lessons.recommendation" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Recommendation
            </FieldLabelWithHelp>
            <textarea
              value={formData.recommendation || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, recommendation: e.target.value }))}
              rows={3}
              className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              placeholder="Recommendations based on this lesson..."
            />
          </div>

          <div>
            <FieldLabelWithHelp helpKey="sim.exception_report_lessons.preventive_action" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Preventive Action
            </FieldLabelWithHelp>
            <textarea
              value={formData.preventive_action || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, preventive_action: e.target.value }))}
              rows={3}
              className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              placeholder="Actions to prevent this in the future..."
            />
          </div>

          <div className="flex justify-end space-x-2">
            <button
              onClick={onCancel}
              className="px-4 py-2 border rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Save
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-white dark:bg-gray-800">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center space-x-2 mb-2">
            <Lightbulb className="h-4 w-4 text-yellow-600" />
            <h4 className="font-semibold text-gray-900 dark:text-white">{lesson.lesson_title}</h4>
            <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded text-xs capitalize">
              {lesson.lesson_type?.replace('_', ' ')}
            </span>
            {lesson.is_escalated_corporate && (
              <span className="flex items-center space-x-1 px-2 py-1 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 rounded text-xs">
                <CheckCircle className="h-3 w-3" />
                <span>Escalated</span>
              </span>
            )}
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">{lesson.lesson_description}</p>
          
          {lesson.recommendation && (
            <div className="mb-2">
              <span className="text-xs font-medium text-gray-500">Recommendation:</span>
              <p className="text-sm text-gray-700 dark:text-gray-300">{lesson.recommendation}</p>
            </div>
          )}

          {lesson.preventive_action && (
            <div>
              <span className="text-xs font-medium text-gray-500">Preventive Action:</span>
              <p className="text-sm text-gray-700 dark:text-gray-300">{lesson.preventive_action}</p>
            </div>
          )}
        </div>

        {mode !== 'view' && (
          <div className="flex items-center space-x-2 ml-4">
            {onEscalate && !lesson.is_escalated_corporate && (
              <button
                onClick={onEscalate}
                className="p-2 text-green-600 hover:bg-green-100 dark:hover:bg-green-900 rounded"
                title="Escalate to corporate"
              >
                <ArrowUp className="h-4 w-4" />
              </button>
            )}
            <button
              onClick={onEdit}
              className="p-2 text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900 rounded"
              title="Edit"
            >
              <Edit2 className="h-4 w-4" />
            </button>
            <button
              onClick={onDelete}
              className="p-2 text-red-600 hover:bg-red-100 dark:hover:bg-red-900 rounded"
              title="Delete"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// v1345 slice 4 Simulator parity: field help (sim.* keys aliased to the Platform help).
const HELP_KEYS = [
  'sim.exception_report_lessons.lesson_type',
  'sim.exception_report_lessons.category',
  'sim.exception_report_lessons.lesson_title',
  'sim.exception_report_lessons.lesson_description',
  'sim.exception_report_lessons.recommendation',
  'sim.exception_report_lessons.preventive_action',
]

export default function LessonCard(props) {
  return (
    <FieldHelpScope helpKeys={HELP_KEYS}>
      <LessonCardBody {...props} />
    </FieldHelpScope>
  )
}
