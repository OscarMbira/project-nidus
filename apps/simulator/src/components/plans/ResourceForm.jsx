/**
 * Resource Form Component
 */

import { useState, useEffect } from 'react'
import { X, Save } from 'lucide-react'
import { SmartAmountInput } from '../ui/SmartAmountInput'

const RESOURCE_TYPES = [
  { value: 'human', label: 'Human Resource' },
  { value: 'equipment', label: 'Equipment' },
  { value: 'material', label: 'Material' },
  { value: 'financial', label: 'Financial' },
  { value: 'other', label: 'Other' }
]

export default function ResourceForm({ resource, onSubmit, onCancel, planType }) {
  const [formData, setFormData] = useState({
    resource_type: 'human',
    resource_name: '',
    resource_description: '',
    quantity_required: '',
    unit_of_measure: '',
    cost_per_unit: '',
    availability_constraints: ''
  })

  useEffect(() => {
    if (resource) {
      setFormData({
        resource_type: resource.resource_type || 'human',
        resource_name: resource.resource_name || '',
        resource_description: resource.resource_description || '',
        quantity_required: resource.quantity_required || '',
        unit_of_measure: resource.unit_of_measure || '',
        cost_per_unit: resource.cost_per_unit || '',
        availability_constraints: resource.availability_constraints || ''
      })
    }
  }, [resource])

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!formData.resource_name) {
      alert('Resource name is required')
      return
    }
    onSubmit({
      ...formData,
      quantity_required: formData.quantity_required ? parseFloat(formData.quantity_required) : null,
      cost_per_unit: formData.cost_per_unit ? parseFloat(formData.cost_per_unit) : null
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Resource Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={formData.resource_name}
            onChange={(e) => setFormData({ ...formData, resource_name: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            placeholder="Enter resource name"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Resource Type
          </label>
          <select
            value={formData.resource_type}
            onChange={(e) => setFormData({ ...formData, resource_type: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            {RESOURCE_TYPES.map(type => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Quantity Required
          </label>
          <input
            type="number"
            step="0.01"
            value={formData.quantity_required}
            onChange={(e) => setFormData({ ...formData, quantity_required: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            placeholder="0.00"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Unit of Measure
          </label>
          <input
            type="text"
            value={formData.unit_of_measure}
            onChange={(e) => setFormData({ ...formData, unit_of_measure: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            placeholder="e.g., hours, days, units"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Cost per Unit
          </label>
          <SmartAmountInput
            value={formData.cost_per_unit ? parseFloat(formData.cost_per_unit) : null}
            onChange={(value) => setFormData({ ...formData, cost_per_unit: value })}
            placeholder="Enter cost (e.g., 500, 1k)"
            min={0}
          />
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Description
          </label>
          <textarea
            value={formData.resource_description}
            onChange={(e) => setFormData({ ...formData, resource_description: e.target.value })}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            placeholder="Enter resource description"
          />
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Availability Constraints
          </label>
          <textarea
            value={formData.availability_constraints}
            onChange={(e) => setFormData({ ...formData, availability_constraints: e.target.value })}
            rows={2}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            placeholder="Describe availability constraints"
          />
        </div>
      </div>

      <div className="flex justify-end gap-2">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            <X className="w-4 h-4 inline mr-2" />
            Cancel
          </button>
        )}
        <button
          type="submit"
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
        >
          <Save className="w-4 h-4 inline mr-2" />
          {resource ? 'Update' : 'Add'} Resource
        </button>
      </div>
    </form>
  )
}
