/**
 * Objective Form Component
 * Form for adding/editing PID objectives
 */

import { useState, useEffect } from 'react'
import { X, Save } from 'lucide-react'
import { addObjective, updateObjective } from '../../services/pidObjectivesService'

export default function ObjectiveForm({ pidId, objective = null, mode = 'create', onSave, onCancel }) {
  const [formData, setFormData] = useState({
    objective_title: '',
    objective_description: '',
    objective_category: 'business',
    priority: 'should_have',
    success_criteria: '',
    measurement_method: '',
    target_value: '',
    display_order: 0
  })
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState({})

  useEffect(() => {
    if (objective) {
      setFormData({
        objective_title: objective.objective_title || '',
        objective_description: objective.objective_description || '',
        objective_category: objective.objective_category || 'business',
        priority: objective.priority || 'should_have',
        success_criteria: objective.success_criteria || '',
        measurement_method: objective.measurement_method || '',
        target_value: objective.target_value || '',
        display_order: objective.display_order || 0
      })
    }
  }, [objective])

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[name]
        return newErrors
      })
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setErrors({})

    // Validation
    if (!formData.objective_title.trim()) {
      setErrors({ objective_title: 'Objective title is required' })
      return
    }
    if (!formData.objective_description.trim() || formData.objective_description.trim().length < 30) {
      setErrors({ objective_description: 'Objective description must be at least 30 characters' })
      return
    }

    setSaving(true)
    try {
      let result
      if (mode === 'create') {
        result = await addObjective(pidId, formData)
      } else {
        result = await updateObjective(objective.id, formData)
      }

      if (result.success) {
        if (onSave) {
          onSave(result.data)
        }
      } else {
        alert('Error saving objective: ' + result.error)
      }
    } catch (error) {
      console.error('Error saving objective:', error)
      alert('Error saving objective: ' + error.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          {mode === 'create' ? 'Add Objective' : 'Edit Objective'}
        </h3>
        {onCancel && (
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Objective Title <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            name="objective_title"
            value={formData.objective_title}
            onChange={handleChange}
            required
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            placeholder="Enter objective title"
          />
          {errors.objective_title && (
            <p className="mt-1 text-sm text-red-600">{errors.objective_title}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Objective Description <span className="text-red-500">*</span>
          </label>
          <textarea
            name="objective_description"
            value={formData.objective_description}
            onChange={handleChange}
            required
            rows={4}
            minLength={30}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            placeholder="Describe the objective in detail (minimum 30 characters)..."
          />
          {errors.objective_description && (
            <p className="mt-1 text-sm text-red-600">{errors.objective_description}</p>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Category
            </label>
            <select
              name="objective_category"
              value={formData.objective_category}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="business">Business</option>
              <option value="technical">Technical</option>
              <option value="quality">Quality</option>
              <option value="compliance">Compliance</option>
              <option value="stakeholder">Stakeholder</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Priority
            </label>
            <select
              name="priority"
              value={formData.priority}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="must_have">Must Have</option>
              <option value="should_have">Should Have</option>
              <option value="could_have">Could Have</option>
              <option value="wont_have">Won't Have</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Success Criteria
          </label>
          <textarea
            name="success_criteria"
            value={formData.success_criteria}
            onChange={handleChange}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            placeholder="How will success be measured for this objective..."
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Measurement Method
          </label>
          <textarea
            name="measurement_method"
            value={formData.measurement_method}
            onChange={handleChange}
            rows={2}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            placeholder="How this objective will be measured..."
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Target Value
          </label>
          <input
            type="text"
            name="target_value"
            value={formData.target_value}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            placeholder="Quantifiable target (e.g., 95%, 100 users, etc.)"
          />
        </div>

        <div className="flex items-center justify-end gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              Cancel
            </button>
          )}
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Saving...' : mode === 'create' ? 'Add Objective' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  )
}
