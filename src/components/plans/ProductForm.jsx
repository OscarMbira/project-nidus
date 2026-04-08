/**
 * Product Form Component
 */

import { useState, useEffect } from 'react'
import { X, Save } from 'lucide-react'

const PRODUCT_TYPES = [
  { value: 'deliverable', label: 'Deliverable' },
  { value: 'interim_product', label: 'Interim Product' },
  { value: 'management_product', label: 'Management Product' },
  { value: 'specialist_product', label: 'Specialist Product' },
  { value: 'other', label: 'Other' }
]

export default function ProductForm({ product, onSubmit, onCancel, workPackages = [], ppdCompositionItems = [] }) {
  const [formData, setFormData] = useState({
    product_name: '',
    product_description: '',
    product_type: 'deliverable',
    acceptance_criteria: '',
    planned_completion_date: '',
    linked_work_package_id: null,
    linked_ppd_composition_item_id: null
  })

  useEffect(() => {
    if (product) {
      setFormData({
        product_name: product.product_name || '',
        product_description: product.product_description || '',
        product_type: product.product_type || 'deliverable',
        acceptance_criteria: product.acceptance_criteria || '',
        planned_completion_date: product.planned_completion_date || '',
        linked_work_package_id: product.linked_work_package_id || null,
        linked_ppd_composition_item_id: product.linked_ppd_composition_item_id || null
      })
    }
  }, [product])

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!formData.product_name) {
      alert('Product name is required')
      return
    }
    onSubmit({
      ...formData,
      linked_work_package_id: formData.linked_work_package_id || null,
      linked_ppd_composition_item_id: formData.linked_ppd_composition_item_id || null
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Product Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={formData.product_name}
            onChange={(e) => setFormData({ ...formData, product_name: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            placeholder="Enter product name"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Product Type
          </label>
          <select
            value={formData.product_type}
            onChange={(e) => setFormData({ ...formData, product_type: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            {PRODUCT_TYPES.map(type => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Planned Completion Date
          </label>
          <input
            type="date"
            value={formData.planned_completion_date}
            onChange={(e) => setFormData({ ...formData, planned_completion_date: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Link to Work Package
          </label>
          <select
            value={formData.linked_work_package_id || ''}
            onChange={(e) => setFormData({ ...formData, linked_work_package_id: e.target.value || null })}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="">None</option>
            {workPackages.map(wp => (
              <option key={wp.id} value={wp.id}>
                {wp.work_package_name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Link to PPD Composition Item
          </label>
          <select
            value={formData.linked_ppd_composition_item_id || ''}
            onChange={(e) => setFormData({ ...formData, linked_ppd_composition_item_id: e.target.value || null })}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="">None</option>
            {ppdCompositionItems.map(item => (
              <option key={item.id} value={item.id}>
                {item.product_name}
              </option>
            ))}
          </select>
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Description
          </label>
          <textarea
            value={formData.product_description}
            onChange={(e) => setFormData({ ...formData, product_description: e.target.value })}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            placeholder="Enter product description"
          />
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Acceptance Criteria
          </label>
          <textarea
            value={formData.acceptance_criteria}
            onChange={(e) => setFormData({ ...formData, acceptance_criteria: e.target.value })}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            placeholder="Enter acceptance criteria"
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
          {product ? 'Update' : 'Add'} Product
        </button>
      </div>
    </form>
  )
}
