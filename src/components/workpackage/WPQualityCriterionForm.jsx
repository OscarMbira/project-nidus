/**
 * Work Package Quality Criterion Form Component
 * Form for adding/editing Work Package quality criteria
 */

import { useState, useEffect } from 'react'
import { X, Save } from 'lucide-react'
import { addQualityCriterion, updateQualityCriterion } from '../../services/wpQualityCriteriaService'

export default function WPQualityCriterionForm({ wpId, criterion = null, mode = 'create', onSave, onCancel }) {
  const [formData, setFormData] = useState({
    criteria_title: '',
    criteria_description: '',
    criteria_type: 'quality',
    quality_method: null,
    quality_responsible: '',
    quality_status: 'pending',
    quality_date: '',
    quality_result: '',
    display_order: 0
  })
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState({})

  useEffect(() => {
    if (criterion) {
      setFormData({
        criteria_title: criterion.criteria_title || '',
        criteria_description: criterion.criteria_description || '',
        criteria_type: criterion.criteria_type || 'quality',
        quality_method: criterion.quality_method || null,
        quality_responsible: criterion.quality_responsible || '',
        quality_status: criterion.quality_status || 'pending',
        quality_date: criterion.quality_date ? criterion.quality_date.split('T')[0] : '',
        quality_result: criterion.quality_result || '',
        display_order: criterion.display_order || 0
      })
    }
  }, [criterion])

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

    if (!formData.criteria_title.trim()) {
      setErrors({ criteria_title: 'Criteria title is required' })
      return
    }
    if (!formData.criteria_description.trim() || formData.criteria_description.trim().length < 20) {
      setErrors({ criteria_description: 'Criteria description must be at least 20 characters' })
      return
    }

    setSaving(true)
    try {
      let result
      if (mode === 'create') {
        result = await addQualityCriterion(wpId, formData)
      } else {
        result = await updateQualityCriterion(criterion.id, formData)
      }

      if (result.success) {
        if (onSave) {
          onSave(result.data)
        }
      } else {
        alert('Error saving quality criterion: ' + result.error)
      }
    } catch (error) {
      console.error('Error saving quality criterion:', error)
      alert('Error saving quality criterion: ' + error.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          {mode === 'create' ? 'Add Quality Criterion' : 'Edit Quality Criterion'}
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
            Criteria Title <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            name="criteria_title"
            value={formData.criteria_title}
            onChange={handleChange}
            required
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            placeholder="Enter criteria title"
          />
          {errors.criteria_title && (
            <p className="mt-1 text-sm text-red-600">{errors.criteria_title}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Criteria Description <span className="text-red-500">*</span>
          </label>
          <textarea
            name="criteria_description"
            value={formData.criteria_description}
            onChange={handleChange}
            required
            rows={4}
            minLength={20}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            placeholder="Describe the quality criterion in detail (minimum 20 characters)..."
          />
          {errors.criteria_description && (
            <p className="mt-1 text-sm text-red-600">{errors.criteria_description}</p>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Criteria Type
            </label>
            <select
              name="criteria_type"
              value={formData.criteria_type}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="functional">Functional</option>
              <option value="performance">Performance</option>
              <option value="quality">Quality</option>
              <option value="usability">Usability</option>
              <option value="security">Security</option>
              <option value="compliance">Compliance</option>
              <option value="operational">Operational</option>
              <option value="maintenance">Maintenance</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Quality Method
            </label>
            <select
              name="quality_method"
              value={formData.quality_method || ''}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="">None</option>
              <option value="review">Review</option>
              <option value="inspection">Inspection</option>
              <option value="testing">Testing</option>
              <option value="approval">Approval</option>
              <option value="audit">Audit</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Quality Responsible
          </label>
          <input
            type="text"
            name="quality_responsible"
            value={formData.quality_responsible}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            placeholder="Who is responsible for this quality check"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Quality Status
            </label>
            <select
              name="quality_status"
              value={formData.quality_status}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="pending">Pending</option>
              <option value="in_review">In Review</option>
              <option value="passed">Passed</option>
              <option value="failed">Failed</option>
              <option value="waived">Waived</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Quality Date
            </label>
            <input
              type="date"
              name="quality_date"
              value={formData.quality_date}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Quality Result
          </label>
          <textarea
            name="quality_result"
            value={formData.quality_result}
            onChange={handleChange}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            placeholder="Result of the quality check..."
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
            {saving ? 'Saving...' : mode === 'create' ? 'Add Criterion' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  )
}
