/**
 * Work Package Resource Form Component
 * Form for adding/editing Work Package resources
 */

import { useState, useEffect } from 'react'
import { X, Save } from 'lucide-react'
import { addResource, updateResource } from '../../services/wpResourcesService'

export default function WPResourceForm({ wpId, resource = null, mode = 'create', onSave, onCancel }) {
  const [formData, setFormData] = useState({
    resource_type: 'person',
    resource_name: '',
    resource_description: '',
    quantity_required: '',
    unit_of_measure: '',
    cost_estimate: '',
    cost_actual: '',
    allocated: false,
    allocation_date: '',
    display_order: 0
  })
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState({})

  useEffect(() => {
    if (resource) {
      setFormData({
        resource_type: resource.resource_type || 'person',
        resource_name: resource.resource_name || '',
        resource_description: resource.resource_description || '',
        quantity_required: resource.quantity_required || '',
        unit_of_measure: resource.unit_of_measure || '',
        cost_estimate: resource.cost_estimate || '',
        cost_actual: resource.cost_actual || '',
        allocated: resource.allocated || false,
        allocation_date: resource.allocation_date ? resource.allocation_date.split('T')[0] : '',
        display_order: resource.display_order || 0
      })
    }
  }, [resource])

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
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

    if (!formData.resource_name.trim()) {
      setErrors({ resource_name: 'Resource name is required' })
      return
    }

    setSaving(true)
    try {
      const submitData = {
        ...formData,
        quantity_required: formData.quantity_required ? parseFloat(formData.quantity_required) : null,
        cost_estimate: formData.cost_estimate ? parseFloat(formData.cost_estimate) : null,
        cost_actual: formData.cost_actual ? parseFloat(formData.cost_actual) : null
      }

      let result
      if (mode === 'create') {
        result = await addResource(wpId, submitData)
      } else {
        result = await updateResource(resource.id, submitData)
      }

      if (result.success) {
        if (onSave) {
          onSave(result.data)
        }
      } else {
        alert('Error saving resource: ' + result.error)
      }
    } catch (error) {
      console.error('Error saving resource:', error)
      alert('Error saving resource: ' + error.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          {mode === 'create' ? 'Add Resource' : 'Edit Resource'}
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Resource Type
            </label>
            <select
              name="resource_type"
              value={formData.resource_type}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="person">Person</option>
              <option value="equipment">Equipment</option>
              <option value="facility">Facility</option>
              <option value="material">Material</option>
              <option value="service">Service</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Resource Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="resource_name"
              value={formData.resource_name}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              placeholder="Enter resource name"
            />
            {errors.resource_name && (
              <p className="mt-1 text-sm text-red-600">{errors.resource_name}</p>
            )}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Resource Description
          </label>
          <textarea
            name="resource_description"
            value={formData.resource_description}
            onChange={handleChange}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            placeholder="Describe the resource..."
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Quantity Required
            </label>
            <input
              type="number"
              step="0.01"
              name="quantity_required"
              value={formData.quantity_required}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              placeholder="0.00"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Unit of Measure
            </label>
            <input
              type="text"
              name="unit_of_measure"
              value={formData.unit_of_measure}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              placeholder="e.g., hours, days, units"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Estimated Cost
            </label>
            <input
              type="number"
              step="0.01"
              name="cost_estimate"
              value={formData.cost_estimate}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              placeholder="0.00"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Actual Cost
            </label>
            <input
              type="number"
              step="0.01"
              name="cost_actual"
              value={formData.cost_actual}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              placeholder="0.00"
            />
          </div>
        </div>

        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              name="allocated"
              checked={formData.allocated}
              onChange={handleChange}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">Resource Allocated</span>
          </label>

          {formData.allocated && (
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Allocation Date
              </label>
              <input
                type="date"
                name="allocation_date"
                value={formData.allocation_date}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
          )}
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
            {saving ? 'Saving...' : mode === 'create' ? 'Add Resource' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  )
}
