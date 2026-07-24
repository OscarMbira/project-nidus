import { useState, useEffect } from 'react'
import { supabase } from '../../services/supabaseClient'
import { X, Save, Target, CheckCircle } from 'lucide-react'
import { addCriteria, updateCriteria } from '../../services/ppdAcceptanceCriteriaService'

export default function AcceptanceCriteriaForm({ criterion, ppdId, onSave, onCancel }) {
  const [formData, setFormData] = useState({
    criteria_title: '',
    criteria_description: '',
    criteria_category: 'functional',
    stakeholder_group: 'all',
    priority: 'should_have',
    measurement_method: '',
    target_value: '',
    tolerance_lower: '',
    tolerance_upper: '',
    unit_of_measure: '',
    is_provable_in_project: true,
    proxy_measure: '',
    validation_notes: ''
  })
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState({})

  useEffect(() => {
    if (criterion) {
      setFormData({
        criteria_title: criterion.criteria_title || '',
        criteria_description: criterion.criteria_description || '',
        criteria_category: criterion.criteria_category || 'functional',
        stakeholder_group: criterion.stakeholder_group || 'all',
        priority: criterion.priority || 'should_have',
        measurement_method: criterion.measurement_method || '',
        target_value: criterion.target_value || '',
        tolerance_lower: criterion.tolerance_lower || '',
        tolerance_upper: criterion.tolerance_upper || '',
        unit_of_measure: criterion.unit_of_measure || '',
        is_provable_in_project: criterion.is_provable_in_project !== undefined ? criterion.is_provable_in_project : true,
        proxy_measure: criterion.proxy_measure || '',
        validation_notes: criterion.validation_notes || ''
      })
    }
  }, [criterion])

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    const fieldValue = type === 'checkbox' ? checked : value
    setFormData(prev => ({ ...prev, [name]: fieldValue }))
    
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

    // Validate
    const newErrors = {}
    if (!formData.criteria_title || formData.criteria_title.trim().length < 10) {
      newErrors.criteria_title = 'Title must be at least 10 characters'
    }
    if (!formData.criteria_description || formData.criteria_description.trim().length < 30) {
      newErrors.criteria_description = 'Description must be at least 30 characters'
    }
    if (formData.priority === 'must_have' && !formData.measurement_method) {
      newErrors.measurement_method = 'Must-have criteria must have measurement method'
    }
    if (!formData.is_provable_in_project && !formData.proxy_measure) {
      newErrors.proxy_measure = 'Proxy measure required if not provable in project'
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    try {
      setSaving(true)
      if (criterion) {
        await updateCriteria(criterion.id, formData)
      } else {
        await addCriteria(ppdId, formData)
      }
      onSave()
    } catch (error) {
      console.error('Error saving criterion:', error)
      alert('Error saving criterion: ' + error.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Target className="h-5 w-5 text-purple-600" />
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              {criterion ? 'Edit Acceptance Criterion' : 'Add Acceptance Criterion'}
            </h2>
          </div>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Criterion Title *
            </label>
            <input
              type="text"
              name="criteria_title"
              value={formData.criteria_title}
              onChange={handleChange}
              className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 ${
                errors.criteria_title ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
              }`}
              placeholder="Brief title for the criterion"
            />
            {errors.criteria_title && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.criteria_title}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Description *
            </label>
            <textarea
              name="criteria_description"
              value={formData.criteria_description}
              onChange={handleChange}
              rows={4}
              className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 ${
                errors.criteria_description ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
              }`}
              placeholder="Full description of the acceptance criterion (minimum 30 characters)"
            />
            {errors.criteria_description && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.criteria_description}</p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Category *
              </label>
              <select
                name="criteria_category"
                value={formData.criteria_category}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
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
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Stakeholder Group *
              </label>
              <select
                name="stakeholder_group"
                value={formData.stakeholder_group}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              >
                <option value="users">Users</option>
                <option value="operations">Operations</option>
                <option value="maintenance">Maintenance</option>
                <option value="management">Management</option>
                <option value="regulatory">Regulatory</option>
                <option value="all">All</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Priority *
              </label>
              <select
                name="priority"
                value={formData.priority}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              >
                <option value="must_have">Must Have</option>
                <option value="should_have">Should Have</option>
                <option value="could_have">Could Have</option>
                <option value="wont_have">Won't Have</option>
              </select>
            </div>
          </div>

          {/* Measurement Section */}
          <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4 border border-purple-200 dark:border-purple-800">
            <h3 className="text-sm font-semibold text-purple-900 dark:text-purple-300 mb-3">
              Measurability (Required for Must-Have Criteria)
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Measurement Method *
                  {formData.priority === 'must_have' && <span className="text-red-500"> *</span>}
                </label>
                <textarea
                  name="measurement_method"
                  value={formData.measurement_method}
                  onChange={handleChange}
                  rows={3}
                  className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 ${
                    errors.measurement_method ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                  }`}
                  placeholder="How will this criterion be measured?"
                />
                {errors.measurement_method && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.measurement_method}</p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Target Value
                  </label>
                  <input
                    type="text"
                    name="target_value"
                    value={formData.target_value}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                    placeholder="e.g., 99.9"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Unit of Measure
                  </label>
                  <input
                    type="text"
                    name="unit_of_measure"
                    value={formData.unit_of_measure}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                    placeholder="e.g., %, seconds, count"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Lower Tolerance
                  </label>
                  <input
                    type="text"
                    name="tolerance_lower"
                    value={formData.tolerance_lower}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                    placeholder="Minimum acceptable"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Upper Tolerance
                  </label>
                  <input
                    type="text"
                    name="tolerance_upper"
                    value={formData.tolerance_upper}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                    placeholder="Maximum acceptable"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Provability Section */}
          <div>
            <div className="flex items-center mb-3">
              <input
                type="checkbox"
                name="is_provable_in_project"
                checked={formData.is_provable_in_project}
                onChange={handleChange}
                className="h-4 w-4 text-blue-600 rounded border-gray-300"
              />
              <label className="ml-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                Can be proven during project
              </label>
            </div>

            {!formData.is_provable_in_project && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Proxy Measure *
                </label>
                <textarea
                  name="proxy_measure"
                  value={formData.proxy_measure}
                  onChange={handleChange}
                  rows={3}
                  className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 ${
                    errors.proxy_measure ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                  }`}
                  placeholder="If not directly provable, what proxy measure will be used?"
                />
                {errors.proxy_measure && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.proxy_measure}</p>
                )}
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Validation Notes
            </label>
            <textarea
              name="validation_notes"
              value={formData.validation_notes}
              onChange={handleChange}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              placeholder="Notes from validation"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg flex items-center gap-2 disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              {saving ? 'Saving...' : 'Save Criterion'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
