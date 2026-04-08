/**
 * Quality Expectation Form Component
 * Form for adding/editing quality expectations
 */

import { useState } from 'react'
import { X, Save } from 'lucide-react'
import { addExpectation, updateExpectation } from '../../services/ppdQualityExpectationsService'

export default function QualityExpectationForm({ ppdId, expectation = null, mode = 'create', onSave, onCancel }) {
  const [formData, setFormData] = useState({
    expectation_category: 'performance',
    expectation_description: '',
    priority: 'medium',
    source: '',
    standard_reference: '',
    display_order: 0
  })
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState({})

  useState(() => {
    if (expectation) {
      setFormData({
        expectation_category: expectation.expectation_category || 'performance',
        expectation_description: expectation.expectation_description || '',
        priority: expectation.priority || 'medium',
        source: expectation.source || '',
        standard_reference: expectation.standard_reference || '',
        display_order: expectation.display_order || 0
      })
    }
  }, [expectation])

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
    if (!formData.expectation_description.trim()) {
      setErrors({ expectation_description: 'Expectation description is required' })
      return
    }

    setSaving(true)
    try {
      let result
      if (mode === 'create') {
        result = await addExpectation(ppdId, formData)
      } else {
        result = await updateExpectation(expectation.id, formData)
      }

      if (result.success) {
        if (onSave) {
          onSave(result.data)
        }
      } else {
        alert('Error saving quality expectation: ' + result.error)
      }
    } catch (error) {
      console.error('Error saving quality expectation:', error)
      alert('Error saving quality expectation: ' + error.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          {mode === 'create' ? 'Add Quality Expectation' : 'Edit Quality Expectation'}
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
            Category <span className="text-red-500">*</span>
          </label>
          <select
            name="expectation_category"
            value={formData.expectation_category}
            onChange={handleChange}
            required
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="performance">Performance</option>
            <option value="reliability">Reliability</option>
            <option value="usability">Usability</option>
            <option value="security">Security</option>
            <option value="maintainability">Maintainability</option>
            <option value="portability">Portability</option>
            <option value="scalability">Scalability</option>
            <option value="compliance">Compliance</option>
            <option value="other">Other</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Expectation Description <span className="text-red-500">*</span>
          </label>
          <textarea
            name="expectation_description"
            value={formData.expectation_description}
            onChange={handleChange}
            required
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            placeholder="Describe the quality expectation..."
          />
          {errors.expectation_description && (
            <p className="mt-1 text-sm text-red-600">{errors.expectation_description}</p>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Source
            </label>
            <input
              type="text"
              name="source"
              value={formData.source}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              placeholder="Who/what is the source"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Standard Reference
          </label>
          <input
            type="text"
            name="standard_reference"
            value={formData.standard_reference}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            placeholder="Related standard if any"
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
            {saving ? 'Saving...' : mode === 'create' ? 'Add Expectation' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  )
}
