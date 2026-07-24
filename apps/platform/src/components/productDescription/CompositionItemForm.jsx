/**
 * Composition Item Form Component
 */

import { useState, useEffect } from 'react'
import { X, Save } from 'lucide-react'
import { supabase } from '../../services/supabaseClient'

const SUB_PRODUCT_TYPES = [
  { value: 'component', label: 'Component' },
  { value: 'module', label: 'Module' },
  { value: 'feature', label: 'Feature' },
  { value: 'document', label: 'Document' },
  { value: 'service', label: 'Service' },
  { value: 'capability', label: 'Capability' },
  { value: 'other', label: 'Other' }
]

export default function CompositionItemForm({ item, onSubmit, onCancel, projectId }) {
  const [formData, setFormData] = useState({
    sub_product_name: '',
    sub_product_description: '',
    sub_product_type: 'component',
    linked_product_description_id: null,
    linked_product_deliverable_id: null,
    is_mandatory: true
  })
  const [productDescriptions, setProductDescriptions] = useState([])
  const [productDeliverables, setProductDeliverables] = useState([])

  useEffect(() => {
    if (item) {
      setFormData({
        sub_product_name: item.sub_product_name || '',
        sub_product_description: item.sub_product_description || '',
        sub_product_type: item.sub_product_type || 'component',
        linked_product_description_id: item.linked_product_description_id || null,
        linked_product_deliverable_id: item.linked_product_deliverable_id || null,
        is_mandatory: item.is_mandatory !== undefined ? item.is_mandatory : true
      })
    }
    if (projectId) {
      loadRelatedData()
    }
  }, [item, projectId])

  const loadRelatedData = async () => {
    try {
      const { data: pdData } = await supabase
        .from('product_descriptions')
        .select('id, product_title')
        .eq('project_id', projectId)
        .eq('is_deleted', false)
      setProductDescriptions(pdData || [])

      const { data: deliverableData } = await supabase
        .from('product_deliverables')
        .select('id, product_name')
        .eq('project_id', projectId)
        .eq('is_deleted', false)
      setProductDeliverables(deliverableData || [])
    } catch (error) {
      console.error('Error loading related data:', error)
    }
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!formData.sub_product_name) {
      alert('Sub-product name is required')
      return
    }
    onSubmit(formData)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Sub-Product Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={formData.sub_product_name}
            onChange={(e) => setFormData({ ...formData, sub_product_name: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            placeholder="Enter sub-product name"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Sub-Product Type
          </label>
          <select
            value={formData.sub_product_type}
            onChange={(e) => setFormData({ ...formData, sub_product_type: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            {SUB_PRODUCT_TYPES.map(type => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Link to Product Description
          </label>
          <select
            value={formData.linked_product_description_id || ''}
            onChange={(e) => setFormData({ ...formData, linked_product_description_id: e.target.value || null })}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="">None</option>
            {productDescriptions.map(pd => (
              <option key={pd.id} value={pd.id}>
                {pd.product_title}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Link to Product Deliverable
          </label>
          <select
            value={formData.linked_product_deliverable_id || ''}
            onChange={(e) => setFormData({ ...formData, linked_product_deliverable_id: e.target.value || null })}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="">None</option>
            {productDeliverables.map(deliverable => (
              <option key={deliverable.id} value={deliverable.id}>
                {deliverable.product_name}
              </option>
            ))}
          </select>
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Description
          </label>
          <textarea
            value={formData.sub_product_description}
            onChange={(e) => setFormData({ ...formData, sub_product_description: e.target.value })}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            placeholder="Enter sub-product description"
          />
        </div>

        <div className="md:col-span-2">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={formData.is_mandatory}
              onChange={(e) => setFormData({ ...formData, is_mandatory: e.target.checked })}
              className="mr-2"
            />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Mandatory (must be delivered)
            </span>
          </label>
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
          {item ? 'Update' : 'Add'} Item
        </button>
      </div>
    </form>
  )
}
